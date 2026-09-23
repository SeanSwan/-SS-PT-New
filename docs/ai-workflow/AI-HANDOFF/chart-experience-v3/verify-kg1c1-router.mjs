/** Lead-owned real router topology probe. Synthetic auth adapters, NOT real JWT/DB auth proof. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
assert.ok(process.argv[2],'Explicit isolated root required');
const root=resolve(process.argv[2]);
const require=createRequire(resolve(root,'backend/package.json'));
const express=require('express');
const {createWorkoutHistoryRouter}=await import(pathToFileURL(resolve(root,'backend/routes/workoutHistoryRoutes.mjs')));
const calls=[];
const protect=(req,res,next)=>{
  if(!req.headers['x-fixture-role'])return res.status(401).end();
  req.user={role:req.headers['x-fixture-role']};next();
};
const authorize=roles=>{
  assert.deepEqual(roles,['admin','trainer']);
  return(req,res,next)=>roles.includes(req.user?.role)?next():res.status(403).end();
};
const handler=(req,res)=>{
  calls.push(`${req.method}:${req.params.clientId}:${req.params.sessionId||''}`);
  res.json({fixtureHandler:true});
};
const app=express();
app.use('/api/admin',createWorkoutHistoryRouter({protect,authorize,getClientWorkouts:handler,editWorkout:handler}));
app.use('/api/admin',(req,res,next)=>req.headers['x-fixture-role']==='admin'?next():res.status(403).send('old admin shadow'));
app.use('/api/admin',(_req,res)=>res.status(410).send('conditional MCP catch-all fixture'));
const server=app.listen(0,'127.0.0.1');
await new Promise((ok,no)=>{server.once('listening',ok);server.once('error',no);});
const url=`http://127.0.0.1:${server.address().port}/api/admin`;
const request=(path,method='GET',role='trainer')=>fetch(url+path,{method,headers:role?{'x-fixture-role':role}:{}});

test('lead C7 actual early router permits only its exact GET/PATCH through synthetic shadows',async()=>{
  for(const role of ['admin','trainer']) for(const [method,path] of [
    ['GET','/clients/42/workouts'],['PATCH','/clients/42/workouts/00000000-0000-4000-8000-000000000001']]) {
    const response=await request(path,method,role);assert.equal(response.status,200);
    assert.equal((await response.json()).fixtureHandler,true);
  }
});
test('lead C7 unrelated destructive/create/admin routes still fall through unchanged',async()=>{
  const before=calls.length;
  for(const [method,path] of [['POST','/clients/42/workouts'],['POST','/clients/42/workouts/backfill/commit'],
    ['DELETE','/clients/42/workouts/s/logs/12'],['GET','/clients/42'],['PATCH','/clients/42/workouts/s/extra']]) {
    assert.equal((await request(path,method,'trainer')).status,403);
    assert.equal((await request(path,method,'admin')).status,410);
  }
  assert.equal(calls.length,before,'History handler must not take unrelated requests');
});
test('lead C7 missing/unsupported fixture role does not reach handlers',async()=>{
  const before=calls.length;
  for(const role of [null,'client','user']) {
    assert.equal((await request('/clients/42/workouts','GET',role)).status,role?403:401);
    assert.equal((await request('/clients/42/workouts/s','PATCH',role)).status,role?403:401);
  }
  assert.equal(calls.length,before);
});
test('lead C7 runtime source wires factory before first global admin mount and removes duplicate registrations',()=>{
  const core=readFileSync(resolve(root,'backend/core/routes.mjs'),'utf8');
  const old=readFileSync(resolve(root,'backend/routes/adminWorkoutLoggerRoutes.mjs'),'utf8');
  const mount=core.indexOf('createWorkoutHistoryRouter(');
  const shadow=core.search(/app\.use\(['"]\/api\/admin['"],\s*adminRoutes\)/);
  assert.ok(mount>=0&&shadow>=0&&mount<shadow,'Actual factory must mount before first admin-only router');
  assert.match(core,/import\s*\{[^}]*createWorkoutHistoryRouter[^}]*\}[^;]*workoutHistoryRoutes\.mjs/);
  assert.doesNotMatch(old,/router\.(get|patch)\(['"]\/clients\/:clientId\/workouts(?:\/:sessionId)?['"]/);
  assert.match(old,/router\.delete\(/,'Existing DELETE remains in old router');
});
test.after(async()=>{server.closeAllConnections();await new Promise((ok,no)=>server.close(e=>e?no(e):ok()));});
