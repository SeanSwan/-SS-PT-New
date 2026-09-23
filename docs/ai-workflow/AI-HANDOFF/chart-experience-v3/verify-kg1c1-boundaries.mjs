/** Lead-owned adversarial pure API/revision probes; real modules, synthetic schema-shaped inputs. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
assert.ok(process.argv[2],'Explicit isolated build root required');
const root=resolve(process.argv[2]);
const importModule=name=>import(pathToFileURL(resolve(root,`backend/services/workout/${name}.mjs`)));
const {parseWorkoutHistoryEditBody:parse}=await importModule('workoutHistoryEditContract');
const {buildWorkoutEditRevision:revision}=await importModule('workoutHistoryEditRevision');
const {buildWorkoutHistoryResponse:dto}=await importModule('workoutHistoryEditDto');
const {editWorkoutHistory}=await importModule('workoutHistoryEditService');
const h1=`h1:${'a'.repeat(64)}`;
const row=(id=7)=>({id,weightOperation:{mode:'preserve-recorded',logId:id},changes:{}});
const body=()=>({weightContractVersion:1,baseRevision:h1,rows:[row()],deletedLogIds:[]});
const invalid=input=>assert.throws(()=>parse(input),e=>[422,426].includes(e.statusCode));

test('lead C4 unknown keys fail at every wire boundary',()=>{
  for(const key of ['__proto__','constructor','prototype','weight','source','id']) {
    const b=body();Object.defineProperty(b,key,{value:1,enumerable:true});invalid(b);
  }
  for(const level of ['row','changes','operation']) {
    const b=body(),target=level==='row'?b.rows[0]:level==='changes'?b.rows[0].changes:b.rows[0].weightOperation;
    Object.defineProperty(target,'enteredWeightUnit',{value:'kg',enumerable:true});invalid(b);
  }
});
test('lead C4 inherited fields and getters do not become a payload or execute',()=>{
  let reads=0;
  for(const key of ['rows','baseRevision','weightContractVersion']) {
    const b=body();Object.defineProperty(b,key,{get(){reads++;return key==='rows'?[row()]:h1;},enumerable:true});invalid(b);
  }
  invalid(Object.create(body()));assert.equal(reads,0);
});
test('lead C4 explicit entries preserve numeric boundaries without string coercion',()=>{
  for(const value of [0,0.000001,999999.999999]) {
    const b=body();b.rows[0].weightOperation={mode:'enter',enteredWeight:value,enteredWeightUnit:'kg'};
    assert.equal(parse(b).rows[0].weightOperation.enteredWeight,value);
  }
  for(const value of [null,'100',true,Infinity,NaN,-1,0.0000001,1000000]) {
    const b=body();b.rows[0].weightOperation={mode:'enter',enteredWeight:value,enteredWeightUnit:'kg'};invalid(b);
  }
});
test('lead C4 bounded field validation catches inclusive limits and wrong primitive types',()=>{
  for(const changes of [{reps:100000},{rest:86400},{rpe:10},{tempo:'x'.repeat(20)},{notes:'x'.repeat(10000)}]) {
    const b=body();b.rows[0].changes=changes;assert.deepEqual(parse(b).rows[0].changes,changes);
  }
  for(const changes of [{reps:'8'},{reps:null},{reps:100001},{rest:86401},{rpe:11},{rest:1.5},
    {tempo:'x'.repeat(21)},{notes:'x'.repeat(10001)},{exerciseNote:[]},{notes:{}}]) {
    const b=body();b.rows[0].changes=changes;invalid(b);
  }
});
test('lead C4 UI identity cannot become server identity, preserve must match row',()=>{
  for(const id of [-1,0,'7',null,1.2,Number.MAX_SAFE_INTEGER+1]) {const b=body();b.rows=[row(id)];invalid(b);}
  const b=body();b.rows[0].weightOperation.logId=8;invalid(b);
});
test('lead C4 parser neither mutates caller nor retains nested references',()=>{
  const b=body();b.rows[0].changes={notes:'unchanged'};const before=JSON.stringify(b);
  const p=parse(b);p.rows[0].changes.notes='different';p.deletedLogIds.push(99);
  assert.equal(JSON.stringify(b),before);
});
const s={id:'00000000-0000-4000-8000-000000000001',userId:42,title:'Synthetic',date:'2026-09-01T12:00:00.000Z',
  totalWeight:0,totalReps:8,totalSets:1,updatedAt:'2026-09-01T12:01:00.000Z'};
const l={id:7,sessionId:s.id,exerciseName:'Bench',circuitName:'A',circuitOrder:1,exerciseRole:'primary',
  setNumber:1,reps:8,weight:220.46226218487757,enteredWeight:'100.000000',enteredWeightUnit:'kg',
  tempo:'2/1/2',rest:60,rpe:7,notes:'set',exerciseNote:'group',setType:'working',isometricHoldSeconds:1,
  createdAt:'2026-09-01T12:00:00.000Z',updatedAt:'2026-09-01T12:01:00.000Z'};
const WorkoutSession={rawAttributes:Object.fromEntries(Object.keys(s).map(k=>[k,{}]))};
const WorkoutLog={rawAttributes:Object.fromEntries(Object.keys(l).map(k=>[k,{}]))};
const args=(logs=[l],session=s)=>({WorkoutSession,WorkoutLog,logs,session});
const changedValue=(key,value)=>{
  if(key==='enteredWeight')return '101.000000';
  if(key==='enteredWeightUnit')return 'lb';
  if(key==='setType')return 'dropset';
  if(key==='exerciseRole')return 'core';
  if(/At$/.test(key)||key==='date')return '2026-09-01T12:02:00.000Z';
  if(key==='sessionId'||(key==='id'&&typeof value==='string'))return '00000000-0000-4000-8000-000000000002';
  return typeof value==='number'?value+1:`${value}-changed`;
};
test('lead C1 revision is order stable but binds every source and metadata field',()=>{
  const a=args([l,{...l,id:8}]),b=args([{...l,id:8},l]);assert.equal(revision(a),revision(b));
  const initial=revision(args());
  for(const key of Object.keys(l)) {
    const changed={...l,[key]:changedValue(key,l[key])};
    assert.notEqual(revision(args([changed])),initial,key);
  }
  for(const key of Object.keys(s)) {
    const changed={...s,[key]:changedValue(key,s[key])};
    assert.notEqual(revision(args([l],changed)),initial,key);
  }
});
test('lead C1 DECIMAL and Date database serialization round-trips revision',()=>{
  const decoded={...l,enteredWeight:100,createdAt:new Date(l.createdAt),updatedAt:new Date(l.updatedAt)};
  const session={...s,date:new Date(s.date),updatedAt:new Date(s.updatedAt)};
  assert.equal(revision(args([decoded],session)),revision(args()));
});
test('lead C1 invalid pairs block edit revision instead of becoming valid unknowns',()=>{
  for(const fields of [{enteredWeight:'1e2'},{enteredWeight:null},{enteredWeightUnit:null},
    {enteredWeight:'NaN'},{enteredWeight:'0.0000001'},{enteredWeightUnit:'lbs'}]) {
    const result=dto(args([{...l,...fields}]));
    assert.equal(result.editable,false);assert.equal(result.editRevision,null);
  }
  const valid=dto(args([{...l,enteredWeight:null,enteredWeightUnit:null,weight:0}]));
  assert.equal(valid.editable,true);assert.equal(valid.logs[0].enteredWeight,null);
  assert.equal(valid.logs[0].enteredWeightUnit,null);
});

test('lead C2 actual service must not rewrite rounded FLOAT aggregates on a preserve-only save',async()=>{
  const updates=[];
  const session={...s,totalWeight:1763.6981,async update(changes){updates.push(changes);Object.assign(this,changes);this.updatedAt='2026-09-01T12:03:00.000Z';}};
  const log={...l,weight:220.46226};
  const models={
    User:{findByPk:async()=>({id:42})},
    WorkoutSession:{...WorkoutSession,findOne:async()=>session},
    WorkoutLog:{...WorkoutLog,findAll:async()=>[log]},
  };
  const before=revision({...models,session,logs:[log]});
  const result=await editWorkoutHistory({models,sequelize:{transaction:run=>run({LOCK:{UPDATE:'UPDATE'}})},
    clientId:42,sessionId:s.id,body:{...body(),baseRevision:before}});
  assert.deepEqual(updates,[],'No-op must not silently rewrite source-derived session totals');
  assert.equal(result.editRevision,before);
});
