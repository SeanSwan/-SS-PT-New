/**
 * Lead KG1a confirmation using real CLI children from an unrelated cwd.
 * Requires the explicitly named synthetic cluster to be running; never skips.
 * Usage: node verify-kg1a-runtime.mjs <build-root> <exact-owned-data-directory>
 * No writes or server start/stop. Each child timeout10s; no retries.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
assert.ok(process.argv[2] && process.argv[3], 'Explicit build root and data directory required');
const cli = resolve(process.argv[2], 'backend/scripts/chart-unit-db-preflight.mjs');
const directory = resolve(process.argv[3]);
const base = {host:'127.0.0.1',port:'55439',database:'chart_weight_synthetic',
  user:'chart_unit_test','data-directory':directory};
function run(overrides={},environment={}) {
  const args = Object.entries({...base,...overrides}).flatMap(([key,value])=>[`--${key}`,value]);
  const result = spawnSync(process.execPath,[cli,...args],{cwd:tmpdir(),encoding:'utf8',
    windowsHide:true,timeout:10000,env:{...process.env,...environment}});
  assert.equal(result.error,undefined); assert.equal(result.signal,null);
  return result;
}
test('RT01 real readonly identity succeeds outside repository cwd',()=>{
  const result=run(); assert.equal(result.status,0);assert.equal(result.stderr,'');
  assert.deepEqual(JSON.parse(result.stdout),{status:'verified',database:base.database,
    user:base.user,host:base.host,port:55439,timeZone:'UTC',readOnly:true});
  assert.ok(!result.stdout.toLowerCase().includes(directory.toLowerCase()));
});
test('RT02 actual directory comparison follows platform case semantics',()=>{
  const result=run({'data-directory':process.platform==='win32' ? directory.toUpperCase() : directory});
  assert.equal(result.status,0); assert.equal(JSON.parse(result.stdout).readOnly,true);
});
test('RT03 wrong expected directory is rejected after actual readonly identity query',()=>{
  const wrong=join(dirname(directory),'not-the-owned-parent','chart-weight-db-20260904');
  const result=run({'data-directory':wrong});
  assert.equal(result.status,1);assert.equal(result.stdout,'');
  assert.equal(result.stderr.trim(),'CHART_UNIT_DB_PROBE_FAILED');
});
test('RT04 ambient default connection sentinel is rejected without disclosure',()=>{
  const result=run({},{DATABASE_URL:'SYNTHETIC_PRIVATE_DETAIL'});
  assert.equal(result.status,1);assert.equal(result.stdout,'');
  assert.equal(result.stderr.trim(),'CHART_UNIT_DB_AMBIENT_CONFIG');
  assert.ok(!result.stderr.includes('SYNTHETIC_PRIVATE_DETAIL'));
});
test('RT05 default port and nonfixture database never become a fallback',()=>{
  for(const overrides of [{port:'5432'},{database:'not-the-synthetic-db'},{host:'localhost'}]) {
    const result=run(overrides);
    assert.equal(result.status,1);assert.equal(result.stdout,'');
    assert.equal(result.stderr.trim(),'CHART_UNIT_DB_TARGET_REJECTED');
  }
});
