const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Timestamp, GeoPoint} = require('firebase-admin/firestore');
const {
  parseArgs, equalData, diffMaps, summary, applyFirestore, applyAuth, applyStorage,
} = require('./mirrorToDev.cjs');
const progress = {tick() {}};

test('mirror defaults to preview and apply requires explicit dev project confirmation', () => {
  assert.deepEqual(parseArgs([]), {apply: false, services: ['auth','firestore','storage']});
  assert.deepEqual(parseArgs(['--only','storage']), {apply:false,services:['storage']});
  assert.equal(parseArgs(['--apply','--confirm-project','flexpayz-app-dev']).apply,true);
  for (const args of [['--apply'], ['--apply','--confirm-project','bussiness-card-bda7f'], ['--only'], ['--only','bad'], ['--resume-auth'], ['--apply','--apply']]) {
    assert.throws(()=>parseArgs(args));
  }
});
test('mirror plans additions, full replacements and dev-only deletions', () => {
  const source = new Map([['new',{x:1}],['changed',{x:1}],['same',{b:2,a:1}]]);
  const target = new Map([['changed',{x:1,devField:true}],['same',{a:1,b:2}],['devOnly',{}],['mail/queued',{}]]);
  const plan = diffMaps(source,target,equalData);
  assert.deepEqual(summary(plan),{create:1,update:1,delete:2,unchanged:1});
  assert.deepEqual(plan.update[0].desired,{x:1});
  assert.deepEqual(plan.remove.map(item=>item.key),['devOnly','mail/queued']);
});
test('Firestore comparisons preserve native type distinctions and nanoseconds', () => {
  const stamp = new Timestamp(1,2);
  assert.ok(equalData({stamp,point:new GeoPoint(1,2),bytes:Buffer.from('abc')}, {bytes:Buffer.from('abc'),point:new GeoPoint(1,2),stamp:new Timestamp(1,2)}));
  assert.ok(!equalData(stamp,new Timestamp(1,3)));
  assert.ok(!equalData([1,2],{'0':1,'1':2}));
  assert.ok(!equalData(NaN,null));
  assert.ok(!equalData(Infinity,-Infinity));
});
test('Firestore updates replace fields and deletes use inspected update times', async () => {
  const time = new Timestamp(1,2), operations=[];
  const db={
    doc:path=>({path,create:async data=>operations.push(['create',path,data]),delete:async opts=>operations.push(['delete',path,opts])}),
    runTransaction:async callback=>callback({get:async()=>({exists:true,updateTime:time}),set:(ref,data)=>operations.push(['replace',ref.path,data])}),
  };
  await applyFirestore({
    create:[{key:'items/a',desired:{data:{fresh:true}}}],
    update:[{key:'items/b',desired:{data:{only:'source'}},previous:{updateTime:time}}],
    remove:[{key:'items/c',previous:{updateTime:time}}],
  },db,progress);
  assert.deepEqual(operations,[['create','items/a',{fresh:true}],['replace','items/b',{only:'source'}],['delete','items/c',{lastUpdateTime:time}]]);
  db.runTransaction=async callback=>callback({get:async()=>({exists:true,updateTime:new Timestamp(2,0)}),set:()=>assert.fail('Must not overwrite a concurrent edit')});
  await assert.rejects(()=>applyFirestore({create:[],update:[{key:'items/b',previous:{updateTime:time},desired:{data:{}}}],remove:[]},db,progress),/changed after planning/);
});
test('Auth rebuild retains UIDs, dev password, disabled state and claims', async () => {
  const calls=[];
  const auth={deleteUser:async uid=>calls.push(['delete',uid]),createUser:async user=>calls.push(['create',user]),setCustomUserClaims:async(uid,claims)=>calls.push(['claims',uid,claims])};
  await applyAuth([{uid:'same',email:'same@example.com',emailVerified:true,disabled:true,customClaims:{role:'system-admin'}}], [{uid:'same'},{uid:'dev-only'}], auth, progress);
  assert.deepEqual(calls.slice(0,2),[['delete','same'],['delete','dev-only']]);
  assert.equal(calls[2][1].uid,'same');
  assert.equal(calls[2][1].password,'test123');
  assert.equal(calls[2][1].disabled,true);
  assert.deepEqual(calls[3],['claims','same',{role:'system-admin'}]);
});
test('Auth delete failure stops rebuild rather than claiming success', async () => {
  await assert.rejects(()=>applyAuth([{uid:'source'}],[{uid:'dev'}],{
    deleteUser:async()=>{throw Error('denied');},createUser:async()=>assert.fail('must not continue'),
  },progress),/denied/);
});
test('Storage mirror pins source and destination generations, and prunes conditionally', async () => {
  const {Readable,Writable}=require('node:stream');
  const sourceCalls=[],destCalls=[];
  const meta={generation:'source-gen',crc32c:'crc',size:'4',contentType:'text/plain'};
  const source={file:(name,opts)=>{sourceCalls.push([name,opts]);return {createReadStream:()=>Readable.from(['test'])};}};
  const target={file:(name,fileOptions)=>({
    createWriteStream:opts=>{destCalls.push(['write',name,opts.preconditionOpts]);return new Writable({write(c,e,done){done();}});},
    getMetadata:async()=>[meta],delete:async()=>destCalls.push(['delete',name,fileOptions.preconditionOpts]),
  })};
  await applyStorage({create:[{key:'new',desired:meta}],update:[{key:'changed',desired:meta,previous:{generation:'old-gen'}}],remove:[{key:'dev-only',previous:{generation:'delete-gen'}}]},source,target,progress);
  assert.deepEqual(sourceCalls,[['new',{generation:'source-gen'}],['changed',{generation:'source-gen'}]]);
  assert.deepEqual(destCalls,[['write','new',{ifGenerationMatch:0}],['write','changed',{ifGenerationMatch:'old-gen'}],['delete','dev-only',{ifGenerationMatch:'delete-gen'}]]);
});
test('mail traversal is opt-in for dev pruning and still excluded from production copy', async () => {
  const {documents}=require('./copyToDev.cjs');
  const ref={path:'mail/queued',listCollections:async()=>[]};
  const db={listCollections:async()=>[{id:'mail',listDocuments:async()=>[ref]}],getAll:async()=>[{ref,exists:true}]};
  const paths=[];
  for await (const doc of documents(db)) paths.push(doc.ref.path);
  assert.deepEqual(paths,[]);
  for await (const doc of documents(db,{includeMail:true})) paths.push(doc.ref.path);
  assert.deepEqual(paths,['mail/queued']);
});
