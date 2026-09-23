/** Lead-owned DG01-DG09 acceptance. Explicit build root; injected fake DB only, no app imports. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
assert.ok(process.argv[2], 'Explicit build root required');
const helperPath = resolve(process.argv[2], 'backend/tests/helpers/chartUnitDbGuard.mjs');
const helperUrl = pathToFileURL(helperPath).href;
let api;
try { api = await import(helperUrl); } catch(error) {
  if(error.code !== 'ERR_MODULE_NOT_FOUND' || error.url !== helperUrl) throw error;
}
const need = () => {assert.ok(api, 'EXPECTED RED: chartUnitDbGuard.mjs is not implemented');return api;};
const target = Object.freeze({host:'127.0.0.1',port:55439,database:'chart_weight_synthetic',
  user:'chart_unit_test',dataDirectory:resolve(dirname(fileURLToPath(import.meta.url)),
    '../../../../tmp/qa/chart-weight-db-20260904')});
const row = () => ({...target,listenAddresses:'127.0.0.1',timeZone:'UTC',readOnly:'on'});
const rejected = {message:'CHART_UNIT_DB_TARGET_REJECTED'};
const failed = {message:'CHART_UNIT_DB_PROBE_FAILED'};
function fixture({rows=[row()],connectError=false,queryError=false,endError=false}={}) {
  const calls = {factory:0,connect:0,query:0,end:0,config:null,sql:null};
  return {calls,options:{environment:{},createClient(config) {
    calls.factory++; calls.config=config;
    return {
      async connect(){calls.connect++;if(connectError) throw new Error('SYNTHETIC_PRIVATE_DETAIL');},
      async query(sql){calls.query++;calls.sql=sql;if(queryError) throw new Error('SYNTHETIC_PRIVATE_DETAIL');return {rows};},
      async end(){calls.end++;if(endError) throw new Error('SYNTHETIC_PRIVATE_DETAIL');},
    };
  }}};
}

test('DG01 exact frozen target validates without mutation',()=>{
  const valid=need().validateChartUnitDbTarget(target);
  assert.deepEqual(valid,target); assert.notEqual(valid,target);
});
test('DG02 malformed targets fail closed',()=>{
  const validate=need().validateChartUnitDbTarget;
  const values=[null,undefined,[],{},new Date(),{...target,extra:true},
    {...target,host:'localhost'},{...target,host:'192.0.2.1'},
    {...target,port:'55439'},{...target,port:5432},{...target,database:'default'},
    {...target,user:'default'},{...target,dataDirectory:'relative'},
    {...target,dataDirectory:resolve('wrong-directory')},
    ...[null,undefined,0,true,[],{}].map(dataDirectory=>({...target,dataDirectory}))];
  for(const key of Object.keys(target)) {const missing={...target};delete missing[key];values.push(missing);}
  for(const value of values) assert.throws(()=>validate(value),rejected);
});
test('DG03 ambient DB config fails before client construction',async()=>{
  const probe=need().probeChartUnitDbTarget;
  for(const key of ['DATABASE_URL','PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD',
    'PGSERVICE','PGSERVICEFILE','PGSSLMODE','PGOPTIONS','PG_HOST','PG_PORT','PG_DB','PG_USER','PG_PASSWORD']) {
    const f=fixture();
    await assert.rejects(()=>probe(target,{...f.options,environment:{[key]:'SYNTHETIC_PRIVATE_DETAIL'}}),
      {message:'CHART_UNIT_DB_AMBIENT_CONFIG'});
    assert.equal(f.calls.factory,0); assert.equal(f.calls.query,0);
  }
});
test('DG04 wrong target never constructs client',async()=>{
  const f=fixture();
  await assert.rejects(()=>need().probeChartUnitDbTarget({...target,port:5432},f.options),rejected);
  assert.equal(f.calls.factory,0);
});
test('DG05 explicit configuration and one readonly identity query',async()=>{
  const f=fixture(); const result=await need().probeChartUnitDbTarget(target,f.options);
  assert.deepEqual(result,{status:'verified',database:target.database,user:target.user,
    host:target.host,port:target.port,timeZone:'UTC',readOnly:true});
  assert.equal(f.calls.factory,1);assert.equal(f.calls.connect,1);assert.equal(f.calls.query,1);assert.equal(f.calls.end,1);
  assert.equal(f.calls.config.password,'');assert.equal(f.calls.config.ssl,false);
  assert.equal(f.calls.config.connectionTimeoutMillis,2000);
  assert.equal(f.calls.config.query_timeout,2000);assert.equal(f.calls.config.statement_timeout,2000);
  assert.equal(f.calls.config.options,'-c default_transaction_read_only=on -c timezone=UTC');
  assert.equal(f.calls.config.application_name,'swan-chart-unit-preflight');
  assert.equal(f.calls.config.connectionString,undefined);
  assert.match(f.calls.sql,/^\s*SELECT\b/i);
  assert.match(f.calls.sql,/host\(inet_server_addr\(\)\)/i,
    'Real PostgreSQL inet::text includes /32; select host(inet_server_addr())');
});
test('DG06 all identity mismatches and row counts reject',async()=>{
  const probe=need().probeChartUnitDbTarget;
  const wrong={database:'default',user:'default',host:'192.0.2.1',port:5432,
    dataDirectory:resolve('wrong-directory'),listenAddresses:'*',timeZone:'local',readOnly:'off'};
  const rows=[[],[row(),row()],...Object.entries(wrong).map(([k,v])=>[{...row(),[k]:v}])];
  for(const r of rows){const f=fixture({rows:r});await assert.rejects(()=>probe(target,f.options),failed);assert.equal(f.calls.end,1);}
});
test('DG07 connect/query errors are sanitized and close exactly once',async()=>{
  for(const key of ['connectError','queryError']) {
    const f=fixture({[key]:true});
    await assert.rejects(()=>need().probeChartUnitDbTarget(target,f.options),failed);
    assert.equal(f.calls.end,1);
  }
});
test('DG08 cleanup failure cannot become success',async()=>{
  const f=fixture({endError:true});
  await assert.rejects(()=>need().probeChartUnitDbTarget(target,f.options),failed);
  assert.equal(f.calls.end,1);
});
test('DG09 helper does not statically load app configuration or DB driver',()=>{
  need(); const source=readFileSync(helperPath,'utf8');
  assert.doesNotMatch(source,/from\s+['"][^'"]*(?:database\.mjs|dotenv|models\/|^pg)['"]/m);
  assert.doesNotMatch(source,/from\s+['"]pg['"]/);
});
