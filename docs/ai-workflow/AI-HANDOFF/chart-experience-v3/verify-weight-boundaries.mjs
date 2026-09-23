/**
 * Independent lead KG0 confirmation: deterministic property and decoded-storage probes.
 * Usage: node verify-weight-boundaries.mjs <build-root>
 * Imports only the pure weight module. No database, application startup or file writes.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
assert.ok(process.argv[2], 'Explicit build root required');
const {convertWeight, normalizeWeightEntry, projectStoredWorkoutWeight} =
  await import(pathToFileURL(resolve(process.argv[2], 'shared/units/weight.mjs')).href);
const near = (actual, expected) => {
  assert.equal(typeof actual, 'number');
  assert.ok(Math.abs(actual - expected) <= 1e-12 * Math.max(1, Math.abs(expected)));
};

test('confirm 20,000 deterministic masses preserve entry and round-trip identity', () => {
  let seed = 0x12345678;
  for(let i=0;i<10000;i++) {
    seed = (Math.imul(seed,1664525) + 1013904223) >>> 0;
    const mass = seed / 4294967296 * 999999;
    for(const unit of ['kg','lb']) {
      const other = unit === 'kg' ? 'lb' : 'kg';
      const converted = convertWeight(mass,unit,other);
      near(convertWeight(converted,other,unit),mass);
      const normalized = normalizeWeightEntry(mass,unit);
      assert.equal(normalized.enteredWeight,mass);
      assert.equal(normalized.enteredWeightUnit,unit);
    }
  }
});

test('confirm mixed-unit synthetic volume is independent of selected display unit', () => {
  const rows = Array.from({length:1000},(_,i)=>({enteredWeight:(i+1)/10,
    enteredWeightUnit:i%2 ? 'kg' : 'lb',reps:i%12+1}));
  const volume = unit => rows.reduce((sum,row)=>sum+projectStoredWorkoutWeight(row,unit).value*row.reps,0);
  near(convertWeight(volume('lb'),'lb','kg'),volume('kg'));
});

test('confirm missing and malformed decoded pairs never acquire legacy units', () => {
  for(const value of [undefined,null,0,1,'100',false,Infinity,NaN]) {
    for(const unit of [undefined,null,'kg','lb','lbs','KG']) {
      const row = {weight:900,enteredWeight:value,enteredWeightUnit:unit};
      const expected = value == null && unit == null ? 'unknown-unit'
        : typeof value === 'number' && Number.isFinite(value) && value >= 0
          && ['lb','kg'].includes(unit) ? 'known' : 'invalid';
      assert.equal(projectStoredWorkoutWeight(Object.freeze(row),'kg').status,expected);
    }
  }
});

test('confirm JSON decimal strings require explicit adapter decoding', () => {
  const raw = JSON.parse('{"weight":220.462262,"enteredWeight":"100.000000","enteredWeightUnit":"kg"}');
  assert.equal(projectStoredWorkoutWeight(raw,'kg').status,'invalid');
  const decoded = {...raw,enteredWeight:100};
  assert.deepEqual(projectStoredWorkoutWeight(decoded,'kg'),{status:'known',value:100,unit:'kg'});
  assert.equal(raw.enteredWeight,'100.000000');
});

test('confirm arithmetic boundaries do not silently produce zero or Infinity', () => {
  for(const exponent of [-323,-300,-100,0,100,300,308]) {
    const value = 10 ** exponent;
    for(const unit of ['lb','kg']) {
      const result = convertWeight(value,unit,unit === 'lb' ? 'kg' : 'lb');
      assert.ok(result === null || (Number.isFinite(result) && result > 0));
    }
  }
  assert.equal(convertWeight(Number.MIN_VALUE,'lb','kg'),null);
  assert.equal(convertWeight(Number.MAX_VALUE,'kg','lb'),null);
  assert.equal(convertWeight(Number.MIN_VALUE,'kg','kg'),Number.MIN_VALUE);
  assert.equal(convertWeight(0,'lb','kg'),0);
});
