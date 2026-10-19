/* One-way bootstrap. Source app is only used for reads; destination is allowlisted. */
const fs = require('node:fs');
const admin = require('firebase-admin');
const {DocumentReference} = require('firebase-admin/firestore');
const SOURCE = 'bussiness-card-bda7f';
const TARGET = 'flexpayz-app-dev';
const SOURCE_BUCKET = `${SOURCE}.appspot.com`;
const TARGET_BUCKET = `${TARGET}.firebasestorage.app`;

function validateEnvironment(env) {
  if (env.PROJECT_ID !== TARGET) throw new Error(`PROJECT_ID must be ${TARGET}.`);
  if (!env.GOOGLE_APPLICATION_CREDENTIALS || !env.SOURCE_GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('Both source and destination credential paths are required. See docs/firebase-development.md.');
  }
  if (env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST || env.FIREBASE_STORAGE_EMULATOR_HOST || env.STORAGE_EMULATOR_HOST) {
    throw new Error('Unset emulator environment variables before copying cloud data.');
  }
}
function readCredential(file, project) {
  const credential = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (credential.project_id !== project) throw new Error(`Credential must belong to ${project}.`);
  return admin.credential.cert(credential);
}
function rewriteString(value) {
  if (value.startsWith(`gs://${SOURCE_BUCKET}/`)) return value.replace(`gs://${SOURCE_BUCKET}/`, `gs://${TARGET_BUCKET}/`);
  let url;
  try { url = new URL(value); } catch { return value; }
  if (url.hostname === 'flexpayz.com' || url.hostname === 'www.flexpayz.com' ||
      url.hostname === `${SOURCE}.web.app` || url.hostname === `${SOURCE}.firebaseapp.com`) {
    url.protocol = 'https:';
    url.host = `${TARGET}.web.app`;
    return url.toString();
  }
  const firebasePath = `/v0/b/${SOURCE_BUCKET}/o/`;
  const gcsPath = `/${SOURCE_BUCKET}/`;
  const firebase = url.hostname === 'firebasestorage.googleapis.com' && url.pathname.startsWith(firebasePath);
  const gcs = url.hostname === 'storage.googleapis.com' && url.pathname.startsWith(gcsPath);
  const virtual = url.hostname === `${SOURCE_BUCKET}.storage.googleapis.com`;
  if (!firebase && !gcs && !virtual) return value;
  if ([...url.searchParams.keys()].some(key => /^(x-goog-|signature$|googleaccessid$)/i.test(key))) {
    throw new Error('Signed production Storage URL found; regenerate it for dev before copying.');
  }
  if (virtual) url.hostname = `${TARGET_BUCKET}.storage.googleapis.com`;
  else url.pathname = url.pathname.replace(SOURCE_BUCKET, TARGET_BUCKET);
  return url.toString();
}
function transform(value, targetDb) {
  if (typeof value === 'string') return rewriteString(value);
  if (value instanceof DocumentReference) return targetDb.doc(value.path);
  if (Array.isArray(value)) return value.map(item => transform(item, targetDb));
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, transform(item, targetDb)]));
  }
  // Preserve native Timestamp, GeoPoint, Buffer and other Firestore values.
  return value;
}
function userInput(user) {
  return {
    uid: user.uid,
    ...(user.email ? {email: user.email, password: 'test123', emailVerified: user.emailVerified} : {}),
    ...(user.displayName ? {displayName: user.displayName} : {}),
    ...(user.photoURL ? {photoURL: rewriteString(user.photoURL)} : {}),
    ...(user.phoneNumber ? {phoneNumber: user.phoneNumber} : {}),
    disabled: user.disabled,
  };
}
async function* users(auth) {
  let token;
  do {
    const page = await auth.listUsers(1000, token);
    yield* page.users;
    token = page.pageToken;
  } while (token);
}
const READ_BATCH_SIZE = 100;
const REQUEST_CONCURRENCY = 10;

// Wait for every in-flight operation before surfacing an error. Never skip failures.
async function mapBounded(items, operation) {
  const results = [];
  for (let offset = 0; offset < items.length; offset += REQUEST_CONCURRENCY) {
    const settled = await Promise.allSettled(items.slice(offset, offset + REQUEST_CONCURRENCY)
      .map(item => Promise.resolve().then(() => operation(item))));
    const failed = settled.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
    results.push(...settled.map(result => result.value));
  }
  return results;
}
async function retryRead(operation, label, {
  wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
  log = console.warn,
} = {}) {
  const attempts = 4;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try { return await operation(); } catch (error) {
      const transient = [4, 8, 14, 'DEADLINE_EXCEEDED', 'RESOURCE_EXHAUSTED', 'UNAVAILABLE', 'ETIMEDOUT', 'ECONNRESET']
        .includes(error.code) || /^Total timeout of API google\.firestore\./.test(error.message || '');
      if (!transient || attempt === attempts) throw error;
      const delay = 1000 * 2 ** (attempt - 1);
      log(`[${new Date().toISOString()}] ${label}: temporary read failure; retry ${attempt}/${attempts - 1} in ${delay / 1000}s`);
      await wait(delay);
    }
  }
}
function failureMessage(writesStarted) {
  return writesStarted
    ? 'Copying had started; destination may be partial. Inspect it before any reset; this script will not overwrite it.'
    : 'Inventory/preflight failed before copying started. This run made no cloud writes. You can rerun the same command.';
}
async function* documents(db, {includeMail = false} = {}) {
  async function* visit(collection) {
    // Preserve discovery of subcollections whose parent document is missing.
    const references = await retryRead(() => collection.listDocuments(), 'Listing document references');
    for (let offset = 0; offset < references.length; offset += READ_BATCH_SIZE) {
      const batch = references.slice(offset, offset + READ_BATCH_SIZE);
      const snapshots = await retryRead(() => db.getAll(...batch), 'Reading document batch');
      // getAll need not return snapshots in request order.
      const byPath = new Map(snapshots.map(snapshot => [snapshot.ref.path, snapshot]));
      if (byPath.size !== batch.length || batch.some(ref => !byPath.has(ref.path))) {
        throw new Error('Incomplete Firestore batch read; refusing to skip documents.');
      }
      const children = await mapBounded(batch, reference => retryRead(() => reference.listCollections(), 'Checking subcollections'));
      for (let index = 0; index < batch.length; index++) {
        const snapshot = byPath.get(batch[index].path);
        if (snapshot.exists) yield snapshot;
        for (const child of children[index]) yield* visit(child);
      }
    }
  }
  for (const collection of await retryRead(() => db.listCollections(), 'Listing root collections')) {
    if (collection.id === 'mail' && !includeMail) continue; // Never replay production email.
    yield* visit(collection);
  }
}
async function copyDocuments(sourceDb, targetDb, onComplete) {
  let pending = [];
  const write = async snapshot => {
    await targetDb.doc(snapshot.ref.path).create(transform(snapshot.data(), targetDb));
    onComplete();
  };
  for await (const snapshot of documents(sourceDb)) {
    pending.push(snapshot);
    if (pending.length === REQUEST_CONCURRENCY) {
      await mapBounded(pending, write);
      pending = [];
    }
  }
  await mapBounded(pending, write);
}
function createProgress(log = console.log, now = Date.now) {
  let stage = 'Starting', completed = 0, lastProgress = now();
  const report = () => log(`[${new Date(now()).toISOString()}] ${stage}: ${completed} completed; ${Math.floor((now() - lastProgress) / 1000)}s since last progress`);
  return {
    stage(label) { stage = label; completed = 0; lastProgress = now(); report(); },
    tick() { completed++; lastProgress = now(); },
    report,
  };
}
function parseArgs(args) {
  let apply = false, only, resumeAuth = false, resumeStorage = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--apply' && !apply) apply = true;
    else if (arg === '--resume-storage' && !resumeStorage) resumeStorage = true;
    else if (arg === '--resume-auth' && !resumeAuth) resumeAuth = true;
    else if (arg === '--only' && only === undefined) {
      only = args[++index];
      if (!['auth', 'firestore', 'storage'].includes(only)) {
        throw new Error('--only requires auth, firestore or storage.');
      }
    } else throw new Error(`Unsupported or repeated argument: ${arg}. Use [--only auth|firestore|storage] [--apply].`);
  }
  if (resumeAuth && only !== 'auth') throw new Error('--resume-auth requires --only auth.');
  if (resumeStorage && only !== 'storage') throw new Error('--resume-storage requires --only storage.');
  return {apply, services: only ? [only] : ['auth', 'firestore', 'storage'], ...(resumeAuth ? {resumeAuth: true} : {}), ...(resumeStorage ? {resumeStorage: true} : {})};
}
function planAuthResume(sourceUsers, targetUsers) {
  const sourceByUid = new Map(sourceUsers.map(user => [user.uid, user]));
  const targetByUid = new Map(targetUsers.map(user => [user.uid, user]));
  const email = user => (user.email || '').trim().toLowerCase();
  const emailOwners = new Map(), phoneOwners = new Map();
  for (const user of sourceUsers) {
    for (const [value, owners, label] of [[email(user), emailOwners, 'email'], [user.phoneNumber, phoneOwners, 'phone']]) {
      if (value && owners.has(value)) throw new Error(`Duplicate source ${label}; resolve before resuming.`);
      if (value) owners.set(value, user.uid);
    }
  }
  for (const user of targetUsers) {
    const source = sourceByUid.get(user.uid);
    if (!source) throw new Error('Destination contains a UID absent from production; inspect before resuming.');
    if (email(source) !== email(user) || (source.phoneNumber || '') !== (user.phoneNumber || '')) {
      throw new Error('Source/destination identity mismatch; refusing to resume.');
    }
  }
  return sourceUsers.map(user => ({user, exists: targetByUid.has(user.uid)}));
}
async function applyAuthPlan(plan, auth, onComplete) {
  for (const {user, exists} of plan) {
    if (!exists) await auth.createUser(userInput(user));
    // Also repair a prior interruption between createUser and custom-claim assignment.
    await auth.setCustomUserClaims(user.uid, user.customClaims || null);
    onComplete();
  }
}
function verifyStorageMetadata(source, target) {
  if (!source.crc32c || !target.crc32c || source.crc32c !== target.crc32c || String(source.size) !== String(target.size)) {
    throw new Error('Storage content mismatch or missing checksum; refusing to skip or overwrite an existing file.');
  }
  for (const field of ['contentType', 'cacheControl', 'contentDisposition', 'contentEncoding']) {
    if ((source[field] || '') !== (target[field] || '')) throw new Error(`Storage ${field} mismatch; inspect before resuming.`);
  }
  const normalized = metadata => JSON.stringify(Object.entries(metadata || {}).sort(([a], [b]) => a.localeCompare(b)));
  if (normalized(source.metadata) !== normalized(target.metadata)) throw new Error('Storage custom metadata/download-token mismatch; inspect before resuming.');
}
async function planStorageResume(sourceBucket, targetBucket, onComplete) {
  const sourceFiles = [], targetFiles = new Map();
  for await (const file of sourceBucket.getFilesStream()) sourceFiles.push(file);
  for await (const file of targetBucket.getFilesStream()) targetFiles.set(file.name, file);
  const sourceNames = new Set(sourceFiles.map(file => file.name));
  for (const name of targetFiles.keys()) {
    if (!sourceNames.has(name)) throw new Error('Destination Storage contains a file absent from production; inspect before resuming.');
  }
  return mapBounded(sourceFiles, async file => {
    const [metadata] = await file.getMetadata();
    const existing = targetFiles.get(file.name);
    if (existing) {
      const [targetMetadata] = await existing.getMetadata();
      verifyStorageMetadata(metadata, targetMetadata);
    }
    onComplete();
    return {name: file.name, metadata, exists: Boolean(existing)};
  });
}
async function transferStorageFile(file, destination, metadata, ifGenerationMatch = 0) {
  await new Promise((resolve, reject) => {
    const input = file.createReadStream({decompress: false});
    const output = destination.createWriteStream({
      resumable: true,
      validation: 'crc32c',
      preconditionOpts: {ifGenerationMatch},
      metadata: {
        contentType: metadata.contentType,
        ...(metadata.cacheControl ? {cacheControl: metadata.cacheControl} : {}),
        ...(metadata.contentDisposition ? {contentDisposition: metadata.contentDisposition} : {}),
        ...(metadata.contentEncoding ? {contentEncoding: metadata.contentEncoding} : {}),
        metadata: metadata.metadata || {},
      },
    });
    input.on('error', error => { output.destroy(); reject(error); });
    output.on('error', error => { input.destroy(); reject(error); });
    output.on('finish', resolve);
    input.pipe(output);
  });
  const [written] = await destination.getMetadata();
  verifyStorageMetadata(metadata, written);
}
async function assertEmpty(auth, db, bucket, stage = () => {}, services = ['auth', 'firestore', 'storage']) {
  if (services.includes('auth')) {
    stage('Checking destination Authentication');
    if ((await auth.listUsers(1)).users.length) throw new Error('Destination Auth is not empty. No writes performed.');
  }
  if (services.includes('firestore')) {
    stage('Checking destination Firestore');
    if ((await retryRead(() => db.listCollections(), 'Listing root collections')).length) throw new Error('Destination Firestore is not empty. No writes performed.');
  }
  if (services.includes('storage')) {
    stage('Checking destination Storage');
    const [files] = await bucket.getFiles({maxResults: 1, autoPaginate: false});
    if (files.length) throw new Error('Destination Storage is not empty. No writes performed.');
  }
}
async function main(state) {
  const {apply, services, resumeAuth = false, resumeStorage = false} = parseArgs(process.argv.slice(2));
  const selected = service => services.includes(service);
  console.log(`Mode: ${apply ? 'APPLY' : 'READ-ONLY inventory'} | ${SOURCE} -> ${TARGET} | Services: ${services.join(", ")}`);
  validateEnvironment(process.env);
  const source = admin.initializeApp({projectId: SOURCE, credential: readCredential(process.env.SOURCE_GOOGLE_APPLICATION_CREDENTIALS, SOURCE)}, 'copy-source');
  const target = admin.initializeApp({projectId: TARGET, credential: readCredential(process.env.GOOGLE_APPLICATION_CREDENTIALS, TARGET)}, 'copy-target');
  const progress = createProgress();
  const heartbeat = setInterval(progress.report, 10000);
  heartbeat.unref();
  try {
    const sourceAuth = source.auth(), targetAuth = target.auth();
    const sourceDb = source.firestore(), targetDb = target.firestore();
    const sourceBucket = source.storage().bucket(SOURCE_BUCKET), targetBucket = target.storage().bucket(TARGET_BUCKET);
    let authPlan, storagePlan;
    if (resumeAuth) {
      progress.stage('Checking Auth resume identities');
      const sourceUsers = [], targetUsers = [];
      for await (const user of users(sourceAuth)) sourceUsers.push(user);
      for await (const user of users(targetAuth)) targetUsers.push(user);
      authPlan = planAuthResume(sourceUsers, targetUsers);
      console.log(`Auth resume: ${targetUsers.length} existing, ${authPlan.filter(item => !item.exists).length} to create. Existing accounts retained; custom claims synchronized.`);
    } else if (resumeStorage) {
      progress.stage('Verifying existing Storage files for resume');
      storagePlan = await planStorageResume(sourceBucket, targetBucket, progress.tick);
      console.log(`Storage resume: ${storagePlan.filter(item => item.exists).length} verified existing, ${storagePlan.filter(item => !item.exists).length} to copy.`);
    } else {
      await assertEmpty(targetAuth, targetDb, targetBucket, progress.stage, services);
    }
    const counts = {
      ...(selected('auth') ? {users: 0, withoutEmail: 0, disabled: 0, mfa: 0} : {}),
      ...(selected('firestore') ? {documents: 0} : {}),
      ...(selected('storage') ? {files: 0} : {}),
    };
    if (selected('auth')) {
      progress.stage('Counting production Auth users');
      for await (const user of users(sourceAuth)) {
        progress.tick();
        counts.users++;
        if (!user.email) counts.withoutEmail++;
        if (user.disabled) counts.disabled++;
        if (user.multiFactor?.enrolledFactors?.length) counts.mfa++;
        userInput(user);
      }
      progress.report();
    }
    if (selected('firestore')) {
      progress.stage('Counting production Firestore documents (including subcollections)');
      for await (const doc of documents(sourceDb)) { transform(doc.data(), targetDb); counts.documents++; progress.tick(); }
      progress.report();
    }
    if (selected('storage')) {
      progress.stage('Counting production Storage files');
      if (storagePlan) counts.files = storagePlan.length;
      else for await (const file of sourceBucket.getFilesStream()) { counts.files++; progress.tick(); }
      progress.report();
    }
    console.log(JSON.stringify({source: SOURCE, target: TARGET, services, counts, excluded: selected('firestore') ? ['mail'] : [], apply}, null, 2));
    if (!apply) { console.log('Read-only inventory complete. No cloud data was changed.'); return; }
    state.writesStarted = true;
    if (selected('storage')) {
      progress.stage('Copying Storage files to dev');
      if (storagePlan) {
        for (const item of storagePlan) {
          if (!item.exists) {
            const file = sourceBucket.file(item.name, {generation: item.metadata.generation});
            await transferStorageFile(file, targetBucket.file(item.name), item.metadata);
          }
          progress.tick();
        }
      } else {
        for await (const file of sourceBucket.getFilesStream()) {
          const [metadata] = await file.getMetadata();
          const pinned = sourceBucket.file(file.name, {generation: metadata.generation});
          await transferStorageFile(pinned, targetBucket.file(file.name), metadata);
          progress.tick();
        }
      }
      progress.report();
    }
    if (selected('auth')) {
      progress.stage('Copying Auth users to dev');
      if (resumeAuth) {
        await applyAuthPlan(authPlan, targetAuth, progress.tick);
      } else {
        for await (const user of users(sourceAuth)) {
          await targetAuth.createUser(userInput(user));
          if (user.customClaims) await targetAuth.setCustomUserClaims(user.uid, user.customClaims);
          progress.tick();
        }
      }
      progress.report();
    }
    if (selected('firestore')) {
      progress.stage('Copying Firestore documents to dev');
      await copyDocuments(sourceDb, targetDb, progress.tick);
      progress.report();
    }
    console.log(`Selected services complete: ${services.join(', ')}. Verify user/product access and media after all required services are copied.`);
  } finally {
    clearInterval(heartbeat);
    progress.stage('Closing Firebase connections');
    await Promise.all([source.delete(), target.delete()]);
  }
}
if (require.main === module) {
  const state = {writesStarted: false};
  main(state).catch(error => {
    console.error(error.message);
    console.error(failureMessage(state.writesStarted));
    process.exitCode = 1;
  });
}
module.exports = {SOURCE, TARGET, SOURCE_BUCKET, TARGET_BUCKET, readCredential, users, validateEnvironment, rewriteString, transform, userInput, assertEmpty, createProgress, documents, mapBounded, copyDocuments, retryRead, failureMessage, parseArgs, planAuthResume, applyAuthPlan, verifyStorageMetadata, planStorageResume, transferStorageFile};
