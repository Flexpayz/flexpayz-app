/* Explicit, destructive-to-dev mirror. No production write clients are passed to apply. */
const admin = require('firebase-admin');
const {Timestamp, GeoPoint, DocumentReference, VectorValue} = require('firebase-admin/firestore');
const {
  SOURCE, TARGET, SOURCE_BUCKET, TARGET_BUCKET, readCredential, validateEnvironment,
  users, documents, transform, userInput, planAuthResume, mapBounded, createProgress,
  verifyStorageMetadata, transferStorageFile,
} = require('./copyToDev.cjs');

function parseArgs(args) {
  let apply = false, only, confirmation;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--apply' && !apply) apply = true;
    else if (args[i] === '--only' && only === undefined) {
      only = args[++i];
      if (!['auth', 'firestore', 'storage'].includes(only)) throw new Error('--only requires auth, firestore or storage.');
    } else if (args[i] === '--confirm-project' && confirmation === undefined) {
      confirmation = args[++i];
      if (confirmation !== TARGET) throw new Error(`Confirmation must be ${TARGET}.`);
    } else throw new Error('Unsupported/repeated argument. Use [--only auth|firestore|storage] [--apply --confirm-project flexpayz-app-dev].');
  }
  if (apply && confirmation !== TARGET) throw new Error(`Applying deletes dev data. Supply --confirm-project ${TARGET}.`);
  return {apply, services: only ? [only] : ['auth', 'firestore', 'storage']};
}
// Tagged values avoid false equality between maps, arrays and native Firestore types.
function canonical(value) {
  if (value === null) return ['null'];
  if (value instanceof Timestamp) return ['timestamp', value.seconds, value.nanoseconds];
  if (value instanceof GeoPoint) return ['point', value.latitude, value.longitude];
  if (value instanceof DocumentReference) return ['reference', value.firestore.projectId, value.path];
  if (VectorValue && value instanceof VectorValue) return ['vector', value.toArray()];
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return ['bytes', Buffer.from(value).toString('base64')];
  if (Array.isArray(value)) return ['array', value.map(canonical)];
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return ['map', Object.keys(value).sort().map(key => [key, canonical(value[key])])];
  }
  if (['string', 'number', 'boolean'].includes(typeof value)) return [typeof value, String(value)];
  throw new Error('Unsupported Firestore value in mirror comparison; no records will be skipped.');
}
const equalData = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

function diffMaps(source, target, equal) {
  const plan = {create: [], update: [], remove: [], unchanged: 0};
  for (const [key, desired] of source) {
    if (!target.has(key)) plan.create.push({key, desired});
    else if (equal(desired, target.get(key))) plan.unchanged++;
    else plan.update.push({key, desired, previous: target.get(key)});
  }
  for (const [key, previous] of target) if (!source.has(key)) plan.remove.push({key, previous});
  return plan;
}
function summary(plan) {
  return {create: plan.create.length, update: plan.update.length, delete: plan.remove.length, unchanged: plan.unchanged};
}
async function collectDocuments(db, targetDb, source, progress) {
  const result = new Map();
  for await (const doc of documents(db, {includeMail: !source})) {
    result.set(doc.ref.path, {data: source ? transform(doc.data(), targetDb) : doc.data(), updateTime: doc.updateTime});
    progress.tick();
  }
  return result;
}
async function collectFiles(bucket, progress) {
  const files = [];
  for await (const file of bucket.getFilesStream()) files.push(file);
  const entries = await mapBounded(files, async file => {
    const [metadata] = await file.getMetadata();
    if (!metadata.crc32c || metadata.size === undefined || !metadata.generation) throw new Error('Missing Storage checksum, size or generation.');
    progress.tick();
    return [file.name, metadata];
  });
  return new Map(entries);
}
function sameFile(source, target) {
  try { verifyStorageMetadata(source, target); return true; } catch { return false; }
}
async function replaceDocument(db, item) {
  const ref = db.doc(item.key);
  await db.runTransaction(async tx => {
    const current = await tx.get(ref);
    if (!current.exists || !current.updateTime.isEqual(item.previous.updateTime)) {
      throw new Error('Dev document changed after planning. Rerun preview before applying.');
    }
    // Full replacement removes fields introduced only during dev testing.
    tx.set(ref, item.desired.data);
  });
}
async function applyFirestore(plan, db, progress) {
  await mapBounded(plan.create, async item => { await db.doc(item.key).create(item.desired.data); progress.tick(); });
  await mapBounded(plan.update, async item => { await replaceDocument(db, item); progress.tick(); });
  await mapBounded(plan.remove, async item => {
    await db.doc(item.key).delete({lastUpdateTime: item.previous.updateTime});
    progress.tick();
  });
}
async function applyStorage(plan, sourceBucket, targetBucket, progress) {
  // Source bucket is read-only; generations pin the objects inspected during planning.
  for (const item of [...plan.create, ...plan.update]) {
    await transferStorageFile(
      sourceBucket.file(item.key, {generation: item.desired.generation}),
      targetBucket.file(item.key), item.desired, item.previous?.generation || 0,
    );
    progress.tick();
  }
  for (const item of plan.remove) {
    await targetBucket.file(item.key, {preconditionOpts: {ifGenerationMatch: item.previous.generation}}).delete();
    progress.tick();
  }
}
async function applyAuth(sourceUsers, targetUsers, auth, progress) {
  // Rebuild with preserved UIDs: avoids email/phone swaps and clears dev providers/MFA.
  // Delete individually so failures cannot be hidden inside a bulk result.
  for (const user of targetUsers) { await auth.deleteUser(user.uid); progress.tick(); }
  for (const user of sourceUsers) {
    await auth.createUser(userInput(user));
    await auth.setCustomUserClaims(user.uid, user.customClaims || null);
    progress.tick();
  }
}
async function main(state) {
  const {apply, services} = parseArgs(process.argv.slice(2));
  validateEnvironment(process.env);
  console.log(`${apply ? 'APPLY MIRROR' : 'READ-ONLY MIRROR PREVIEW'}: ${SOURCE} -> ${TARGET}; ${services.join(', ')}`);
  const source = admin.initializeApp({projectId: SOURCE, credential: readCredential(process.env.SOURCE_GOOGLE_APPLICATION_CREDENTIALS, SOURCE)}, 'mirror-source');
  const target = admin.initializeApp({projectId: TARGET, credential: readCredential(process.env.GOOGLE_APPLICATION_CREDENTIALS, TARGET)}, 'mirror-target');
  const progress = createProgress();
  const timer = setInterval(progress.report, 10000);
  try {
    const plans = {}, report = {};
    if (services.includes('auth')) {
      progress.stage('Planning Auth rebuild');
      const sourceUsers = [], targetUsers = [];
      for await (const user of users(source.auth())) { userInput(user); sourceUsers.push(user); progress.tick(); }
      for await (const user of users(target.auth())) { targetUsers.push(user); progress.tick(); }
      planAuthResume(sourceUsers, []); // Reject duplicate source email/phone before deleting anything.
      const sourceIds = new Set(sourceUsers.map(u => u.uid));
      const targetIds = new Set(targetUsers.map(u => u.uid));
      plans.auth = {sourceUsers, targetUsers};
      report.auth = {
        create: sourceUsers.filter(u => !targetIds.has(u.uid)).length,
        rebuildSameUid: sourceUsers.filter(u => targetIds.has(u.uid)).length,
        deleteDevOnly: targetUsers.filter(u => !sourceIds.has(u.uid)).length,
        totalAccountsDeletedBeforeRebuild: targetUsers.length,
        totalAccountsCreated: sourceUsers.length,
        withoutEmail: sourceUsers.filter(u => !u.email).length,
      };
    }
    if (services.includes('firestore')) {
      progress.stage('Reading production Firestore for mirror');
      const desired = await collectDocuments(source.firestore(), target.firestore(), true, progress);
      progress.stage('Reading dev Firestore for mirror');
      const existing = await collectDocuments(target.firestore(), target.firestore(), false, progress);
      plans.firestore = diffMaps(desired, existing, (a, b) => equalData(a.data, b.data));
      report.firestore = summary(plans.firestore);
    }
    if (services.includes('storage')) {
      progress.stage('Reading production Storage metadata');
      const desired = await collectFiles(source.storage().bucket(SOURCE_BUCKET), progress);
      progress.stage('Reading dev Storage metadata');
      const existing = await collectFiles(target.storage().bucket(TARGET_BUCKET), progress);
      plans.storage = diffMaps(desired, existing, sameFile);
      report.storage = summary(plans.storage);
    }
    console.log(JSON.stringify({source: SOURCE, target: TARGET, apply, plan: report, mail: 'Excluded from source; removed from dev when mirroring Firestore'}, null, 2));
    if (!apply) { console.log('Preview complete. No cloud writes performed.'); return; }
    // All selected services must finish planning before the first mutation.
    state.writesStarted = true;
    if (plans.storage) {
      progress.stage('Mirroring dev Storage');
      await applyStorage(plans.storage, source.storage().bucket(SOURCE_BUCKET), target.storage().bucket(TARGET_BUCKET), progress);
    }
    if (plans.auth) {
      progress.stage('Rebuilding dev Auth (same UIDs, test123 for email accounts)');
      await applyAuth(plans.auth.sourceUsers, plans.auth.targetUsers, target.auth(), progress);
    }
    if (plans.firestore) {
      progress.stage('Mirroring dev Firestore');
      await applyFirestore(plans.firestore, target.firestore(), progress);
    }
    progress.report();
    console.log('Mirror finished. Sign in again and verify dev user access, records and media.');
  } finally {
    clearInterval(timer);
    await Promise.all([source.delete(), target.delete()]);
  }
}
if (require.main === module) {
  const state = {writesStarted: false};
  main(state).catch(error => {
    console.error(error.message);
    console.error(state.writesStarted
      ? 'Mirror stopped after writes began. Dev may be partial; run a new preview before retrying. Never run concurrent mirrors/copies of the same service.'
      : 'Mirror preview failed before writes. No cloud data was changed.');
    process.exitCode = 1;
  });
}
module.exports = {parseArgs, canonical, equalData, diffMaps, summary, sameFile, replaceDocument, applyFirestore, applyStorage, applyAuth};
