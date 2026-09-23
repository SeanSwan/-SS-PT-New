/** Lead-owned real mapper probes. Bundle in memory; no emitted JS or application startup. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root=resolve(process.argv[2]||'');
assert.ok(process.argv[2], 'Explicit isolated build root required');
const require=createRequire(resolve(root,'frontend/package.json'));
const esbuild=require('esbuild');
const entry=resolve(root,'frontend/src/hooks/analytics/workoutAnalyticsData.ts');
const result=await esbuild.build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {mapWorkoutSessions}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const revision=`h1:${'a'.repeat(64)}`;
const base={id:12,exerciseName:'Bench press',setNumber:2,reps:8,weight:220.46226218487757,
  enteredWeight:'100.000000',enteredWeightUnit:'kg',circuitName:'A',circuitOrder:2,
  exerciseRole:'primary',setType:'dropset',isometricHoldSeconds:15,
  notes:'set note',exerciseNote:'group note',createdAt:'2026-09-01T12:00:00.000Z',updatedAt:'2026-09-01T12:01:00.000Z'};
const decode=(log=base)=>mapWorkoutSessions([{id:'00000000-0000-4000-8000-000000000001',
  title:'Synthetic training',date:'2026-09-01T12:00:00.000Z',duration:30,intensity:null,
  status:'completed',totalSets:1,totalReps:8,totalWeight:1763.6980974790205,editRevision:revision,logs:[log]}])[0];

test('lead C1 SQL source pair and original identity survive real analytics mapper',()=>{
  const decoded=decode();
  assert.equal(decoded.editRevision,revision);
  assert.equal(decoded.logs[0].id,12);
  assert.equal(decoded.logs[0].enteredWeight,100);
  assert.equal(decoded.logs[0].enteredWeightUnit,'kg');
  assert.equal(decoded.logs[0].weight,base.weight);
});
test('lead C1 all circuit, set and source metadata survive real analytics mapper',()=>{
  const log=decode().logs[0];
  for(const key of ['circuitName','circuitOrder','exerciseRole','setType','isometricHoldSeconds',
    'notes','exerciseNote','createdAt','updatedAt']) assert.equal(log[key],base[key],key);
});
test('lead C1 null pair is explicit unknown even for zero and huge raw legacy load',()=>{
  for(const weight of [0,82,2000000]) {
    const log=decode({...base,weight,enteredWeight:null,enteredWeightUnit:null}).logs[0];
    assert.equal(log.enteredWeight,null);assert.equal(log.enteredWeightUnit,null);
    assert.equal(log.weight,weight);
  }
});
test('lead C1 strict decoder rejects malformed SQL numbers rather than inventing a valid pair',()=>{
  for(const enteredWeight of ['', ' ','1e2','Infinity','100kg','-1','1000000.000000','0.0000001',true,[],{}]) {
    const log=decode({...base,enteredWeight}).logs[0];
    assert.ok(!(typeof log.enteredWeight==='number' && Number.isFinite(log.enteredWeight)
      && log.enteredWeightUnit==='kg'),`Invalid source became valid: ${JSON.stringify(enteredWeight)}`);
    assert.equal(log.weightStatus,'invalid','Invalid source must retain a blocking status');
  }
});
test('lead C1 backend-sanitized invalid marker remains invalid through frontend mapper',()=>{
  const log=decode({...base,enteredWeight:null,enteredWeightUnit:null,weightStatus:'invalid'}).logs[0];
  assert.equal(log.weightStatus,'invalid');
});
test('lead C1 mapper does not modify source DTO or relabel historical values',()=>{
  const frozen=Object.freeze({...base,enteredWeight:null,enteredWeightUnit:null});
  const snapshot=JSON.stringify(frozen);decode(frozen);
  assert.equal(JSON.stringify(frozen),snapshot);
});
test('lead C1 actual backend DTO flows through actual frontend mapper without losing invalid-state or revision',async()=>{
  const {buildWorkoutHistoryResponse}=await import(pathToFileURL(resolve(root,'backend/services/workout/workoutHistoryEditDto.mjs')));
  for(const [pair,expected] of [[{enteredWeight:'100.000000',enteredWeightUnit:'kg'},'known'],
    [{enteredWeight:null,enteredWeightUnit:null},'unknown-unit'],
    [{enteredWeight:'1e2',enteredWeightUnit:'kg'},'invalid']]) {
    const server=buildWorkoutHistoryResponse({WorkoutSession:null,WorkoutLog:null,
      session:{id:'00000000-0000-4000-8000-000000000001',date:'2026-09-01T12:00:00.000Z',title:'Synthetic'},
      logs:[{...base,...pair}]});
    const [client]=mapWorkoutSessions([server]);
    assert.equal(client.logs[0].weightStatus,expected);
    assert.equal(client.editable,expected!=='invalid');
    assert.equal(client.editRevision,server.editRevision);
    if(expected==='known')assert.equal(client.logs[0].enteredWeight,100);
  }
});
