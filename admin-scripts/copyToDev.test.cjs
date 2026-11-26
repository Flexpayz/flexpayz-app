const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Timestamp, GeoPoint} = require('firebase-admin/firestore');
const {validateEnvironment, rewriteString, transform, userInput} = require('./copyToDev.cjs');
const env = {PROJECT_ID: 'flexpayz-app-dev', GOOGLE_APPLICATION_CREDENTIALS: 'dev.json', SOURCE_GOOGLE_APPLICATION_CREDENTIALS: 'prod.json'};
test('rejects production, missing credentials and emulator routing', () => {
  assert.doesNotThrow(() => validateEnvironment(env));
  assert.throws(() => validateEnvironment({...env, PROJECT_ID: 'bussiness-card-bda7f'}));
  assert.throws(() => validateEnvironment({...env, GOOGLE_APPLICATION_CREDENTIALS: ''}));
  assert.throws(() => validateEnvironment({...env, FIRESTORE_EMULATOR_HOST: 'localhost:8080'}));
});
test('rewrites only recognized source URLs and preserves download tokens', () => {
  const source = 'https://firebasestorage.googleapis.com/v0/b/bussiness-card-bda7f.appspot.com/o/images%2Fa.jpg?alt=media&token=abc';
  assert.equal(rewriteString(source), source.replace('bussiness-card-bda7f.appspot.com', 'flexpayz-app-dev.firebasestorage.app'));
  assert.equal(rewriteString('https://flexpayz.com/show-product?product_id=abc'), 'https://flexpayz-app-dev.web.app/show-product?product_id=abc');
  assert.equal(rewriteString('https://example.com/bussiness-card-bda7f.appspot.com'), 'https://example.com/bussiness-card-bda7f.appspot.com');
  assert.throws(() => rewriteString('https://storage.googleapis.com/bussiness-card-bda7f.appspot.com/a?X-Goog-Signature=abc'));
});
test('preserves native data types in nested documents', () => {
  const timestamp = Timestamp.now(), point = new GeoPoint(1, 2), bytes = Buffer.from('test');
  const input = {timestamp, list: [{point, bytes, url: 'gs://bussiness-card-bda7f.appspot.com/a'}]};
  const result = transform(input, {});
  assert.equal(result.timestamp, timestamp);
  assert.equal(result.list[0].point, point);
  assert.equal(result.list[0].bytes, bytes);
  assert.equal(result.list[0].url, 'gs://flexpayz-app-dev.firebasestorage.app/a');
});
test('preserves UID and disabled state while setting only email accounts a password', () => {
  assert.deepEqual(userInput({uid: 'a', email: 'a@example.com', emailVerified: true, disabled: true}), {uid: 'a', email: 'a@example.com', password: 'test123', emailVerified: true, disabled: true});
  assert.deepEqual(userInput({uid: 'b', disabled: false}), {uid: 'b', disabled: false});
});
test('rejects each nonempty destination service before copy', async () => {
  const {assertEmpty} = require('./copyToDev.cjs');
  const auth = {listUsers: async () => ({users: []})};
  const db = {listCollections: async () => []};
  const bucket = {getFiles: async () => [[]]};
  await assert.doesNotReject(() => assertEmpty(auth, db, bucket));
  await assert.rejects(() => assertEmpty({listUsers: async () => ({users: [{}]})}, db, bucket), /Auth is not empty/);
  await assert.rejects(() => assertEmpty(auth, {listCollections: async () => [{}]}, bucket), /Firestore is not empty/);
  await assert.rejects(() => assertEmpty(auth, db, {getFiles: async () => [[{}]]}), /Storage is not empty/);
});
test('progress distinguishes completed work from waiting without exposing records', () => {
  const {createProgress} = require('./copyToDev.cjs');
  let time = 0;
  const logs = [];
  const progress = createProgress(line => logs.push(line), () => time);
  progress.stage('Counting documents');
  progress.tick();
  time = 20000;
  progress.report();
  assert.match(logs.at(-1), /Counting documents: 1 completed; 20s since last progress/);
  progress.tick();
  progress.report();
  assert.match(logs.at(-1), /2 completed; 0s since last progress/);
  progress.stage('Counting files');
  assert.match(logs.at(-1), /Counting files: 0 completed; 0s since last progress/);
});

function fixture(total = 205) {
  const reads = [], checked = [];
  const leaf = {path: 'products/missing/nested/child', listCollections: async () => []};
  const nested = {id: 'nested', listDocuments: async () => [leaf]};
  const refs = Array.from({length: total}, (_, i) => ({
    path: `products/${i}`,
    listCollections: async () => { checked.push(i); return []; },
  }));
  refs.push({path: 'products/missing', listCollections: async () => [nested]});
  const db = {
    listCollections: async () => [
      {id: 'products', listDocuments: async () => refs},
      {id: 'mail', listDocuments: async () => { throw new Error('Mail must not be read'); }},
    ],
    getAll: async (...batch) => {
      reads.push(batch.length);
      return batch.map(ref => ({ref, exists: ref.path !== 'products/missing', data: () => ({url: 'gs://bussiness-card-bda7f.appspot.com/a'})})).reverse();
    },
  };
  return {db, reads, checked};
}
test('batched traversal reads every document and orphan subcollection despite unordered results', async () => {
  const {documents} = require('./copyToDev.cjs');
  const {db, reads, checked} = fixture();
  const paths = [];
  for await (const doc of documents(db)) paths.push(doc.ref.path);
  assert.equal(paths.length, 206);
  assert.equal(new Set(paths).size, 206);
  assert.ok(paths.includes('products/missing/nested/child'));
  assert.ok(!paths.includes('products/missing'));
  assert.equal(checked.length, 205);
  assert.deepEqual(reads, [100, 100, 6, 1]);
});
test('bounded operations cap concurrency and await in-flight work on failure', async () => {
  const {mapBounded} = require('./copyToDev.cjs');
  let active = 0, peak = 0, started = 0;
  await assert.rejects(() => mapBounded(Array.from({length: 25}, (_, i) => i), async i => {
    started++; active++; peak = Math.max(peak, active);
    try {
      if (i === 0) throw new Error('permission denied');
      await new Promise(resolve => setImmediate(resolve));
    } finally { active--; }
  }), /permission denied/);
  assert.equal(active, 0);
  assert.equal(started, 10);
  assert.ok(peak <= 10);
});
test('incomplete reads and failed subcollection checks stop traversal', async () => {
  const {documents} = require('./copyToDev.cjs');
  const consume = async db => { for await (const doc of documents(db)) void doc; };
  const {db} = fixture(1);
  db.getAll = async () => [];
  await assert.rejects(() => consume(db), /Incomplete/);
  const broken = fixture(1).db;
  broken.listCollections = async () => [{id: 'products', listDocuments: async () => [
    {path: 'products/0', listCollections: async () => { throw new Error('subcollection unavailable'); }},
  ]}];
  await assert.rejects(() => consume(broken), /subcollection unavailable/);
});
test('copy preserves paths and transformations, counts only successful creates, rejects failures', async () => {
  const {copyDocuments} = require('./copyToDev.cjs');
  const written = new Map();
  let completed = 0;
  const target = {doc: path => ({create: async data => {
    assert.ok(!written.has(path));
    written.set(path, data);
  }})};
  await copyDocuments(fixture(21).db, target, () => completed++);
  assert.equal(completed, 22);
  assert.equal(written.size, 22);
  assert.equal(written.get('products/20').url, 'gs://flexpayz-app-dev.firebasestorage.app/a');
  await assert.rejects(() => copyDocuments(fixture(1).db,
    {doc: () => ({create: async () => { throw new Error('already exists'); }})},
    () => { throw new Error('Must not count failed writes'); }), /already exists/);
});
test('temporary reads retry with bounded backoff and return the complete result', async () => {
  const {retryRead} = require('./copyToDev.cjs');
  let calls = 0;
  const delays = [], logs = [];
  const result = await retryRead(async () => {
    if (++calls < 4) throw Object.assign(new Error('timeout'), {code: 4});
    return ['complete batch'];
  }, 'Reading', {wait: async delay => delays.push(delay), log: line => logs.push(line)});
  assert.deepEqual(result, ['complete batch']);
  assert.deepEqual(delays, [1000, 2000, 4000]);
  assert.equal(logs.length, 3);
});
test('retry exhaustion propagates timeout and permanent errors fail immediately', async () => {
  const {retryRead} = require('./copyToDev.cjs');
  for (const [error, expectedCalls] of [
    [new Error('Total timeout of API google.firestore.v1.Firestore exceeded 60000 milliseconds'), 4],
    [Object.assign(new Error('permission denied'), {code: 7}), 1],
  ]) {
    let calls = 0;
    await assert.rejects(() => retryRead(async () => { calls++; throw error; }, 'Reading',
      {wait: async () => {}, log: () => {}}), error);
    assert.equal(calls, expectedCalls);
  }
});
test('failure guidance distinguishes preflight from potentially partial writes', () => {
  const {failureMessage} = require('./copyToDev.cjs');
  assert.match(failureMessage(false), /no cloud writes/);
  assert.match(failureMessage(true), /destination may be partial/);
});
test('service flags support separate inventory and apply while preserving default all', () => {
  const {parseArgs} = require('./copyToDev.cjs');
  assert.deepEqual(parseArgs([]), {apply: false, services: ['auth', 'firestore', 'storage']});
  for (const service of ['auth', 'firestore', 'storage']) {
    assert.deepEqual(parseArgs(['--only', service]), {apply: false, services: [service]});
    assert.deepEqual(parseArgs(['--apply', '--only', service]), {apply: true, services: [service]});
    assert.deepEqual(parseArgs(['--only', service, '--apply']), {apply: true, services: [service]});
  }
  for (const args of [['--only'], ['--only', 'typo'], ['--only', 'auth', '--only', 'storage'], ['--apply', '--apply'], ['--typo']]) {
    assert.throws(() => parseArgs(args));
  }
});
test('selected destination checks never access other services, even if populated or unavailable', async () => {
  const {assertEmpty} = require('./copyToDev.cjs');
  const unavailable = new Proxy({}, {get() { throw new Error('Unselected service accessed'); }});
  await assertEmpty({listUsers: async () => ({users: []})}, unavailable, unavailable, () => {}, ['auth']);
  await assertEmpty(unavailable, {listCollections: async () => []}, unavailable, () => {}, ['firestore']);
  await assertEmpty(unavailable, unavailable, {getFiles: async () => [[]]}, () => {}, ['storage']);
  await assert.rejects(() => assertEmpty(unavailable, {listCollections: async () => [{}]}, unavailable, () => {}, ['firestore']), /Firestore is not empty/);
});
test('Auth resume is restricted to auth and rejects ambiguous identities', () => {
  const {parseArgs, planAuthResume} = require('./copyToDev.cjs');
  assert.equal(parseArgs(['--only', 'auth', '--resume-auth']).resumeAuth, true);
  assert.throws(() => parseArgs(['--resume-auth']));
  assert.throws(() => parseArgs(['--only', 'firestore', '--resume-auth']));
  const a = {uid: 'a', email: 'a@example.com'}, b = {uid: 'b', email: 'b@example.com'};
  assert.deepEqual(planAuthResume([a,b], [a]).map(item => item.exists), [true,false]);
  assert.throws(() => planAuthResume([a,b], [{...a, email: b.email}]), /mismatch/);
  assert.throws(() => planAuthResume([a], [b]), /absent/);
  assert.throws(() => planAuthResume([a,{...b,email:'A@example.com'}], []), /Duplicate/);
});
test('Auth resume creates only missing UIDs and repairs interrupted claims', async () => {
  const {applyAuthPlan} = require('./copyToDev.cjs');
  const created = [], claims = []; let completed = 0;
  await applyAuthPlan([
    {user:{uid:'existing',customClaims:{role:'system-admin'}},exists:true},
    {user:{uid:'missing',email:'a@example.com',disabled:false},exists:false},
  ], {createUser:async data=>created.push(data),setCustomUserClaims:async(...args)=>claims.push(args)},()=>completed++);
  assert.equal(created.length,1);
  assert.equal(created[0].uid,'missing');
  assert.equal(created[0].password,'test123');
  assert.deepEqual(claims,[['existing',{role:'system-admin'}],['missing',null]]);
  assert.equal(completed,2);
});
test('Storage resume accepts only matching bytes and copied metadata', () => {
  const {parseArgs, verifyStorageMetadata} = require('./copyToDev.cjs');
  assert.equal(parseArgs(['--only','storage','--resume-storage']).resumeStorage, true);
  assert.throws(() => parseArgs(['--only','auth','--resume-storage']));
  const data = {crc32c:'crc',size:'10',contentType:'image/png',metadata:{firebaseStorageDownloadTokens:'token'}};
  assert.doesNotThrow(() => verifyStorageMetadata(data,{...data,generation:'different'}));
  for (const patch of [{crc32c:'wrong'},{crc32c:undefined},{size:'11'},{contentType:'text/plain'},{metadata:{}}]) {
    assert.throws(() => verifyStorageMetadata(data,{...data,...patch}));
  }
});
test('Storage resume plans missing files and refuses unrelated destination files', async () => {
  const {planStorageResume} = require('./copyToDev.cjs');
  const data = {crc32c:'crc',size:'10'};
  const file = name => ({name,getMetadata:async()=>[data]});
  const bucket = files => ({async *getFilesStream(){yield* files;}});
  let checked = 0;
  const plan = await planStorageResume(bucket([file('a'),file('b')]),bucket([file('a')]),()=>checked++);
  assert.deepEqual(plan.map(item=>item.exists),[true,false]);
  assert.equal(checked,2);
  await assert.rejects(()=>planStorageResume(bucket([file('a')]),bucket([file('other')]),()=>{}),/absent/);
});
test('Storage transfers are create-only, preserve bytes and verify completed upload', async () => {
  const {Readable,Writable} = require('node:stream');
  const {transferStorageFile} = require('./copyToDev.cjs');
  const metadata={crc32c:'crc',size:'4',contentType:'text/plain'};
  let options, received='';
  const source={createReadStream: opts=>{assert.equal(opts.decompress,false);return Readable.from(['test']);}};
  const destination={
    createWriteStream:opts=>{options=opts;return new Writable({write(chunk,encoding,done){received+=chunk.toString();done();}});},
    getMetadata:async()=>[metadata],
  };
  await transferStorageFile(source,destination,metadata);
  assert.deepEqual(options.preconditionOpts,{ifGenerationMatch:0});
  assert.equal(options.validation,'crc32c');
  assert.equal(received,'test');
  destination.getMetadata=async()=>[{...metadata,crc32c:'wrong'}];
  await assert.rejects(()=>transferStorageFile(source,destination,metadata),/mismatch/);
});
