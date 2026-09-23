/** Lead-owned KG0 acceptance. Explicit build root; no database, env or app startup. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const buildRoot = process.argv[2];
if (!buildRoot) throw new Error('Pass the explicit implementation root');
const target = pathToFileURL(resolve(buildRoot, 'shared/units/weight.mjs'));
let module;
try { module = await import(target.href); } catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND' || error.url !== target.href) throw error;
}
const api = () => { assert.ok(module, 'EXPECTED RED: shared/units/weight.mjs is not implemented'); return module; };
const close = (actual, expected) => {
  assert.equal(typeof actual, 'number');
  assert.ok(Math.abs(actual - expected) <= 1e-12 * Math.max(1, Math.abs(expected)), `${actual} vs ${expected}`);
};
test('KG01 pounds convert without early rounding', () => {
  close(api().convertWeight(100, 'lb', 'kg'),45.359237);
  close(api().convertWeight(1600, 'lb', 'kg'),725.747792);
});
test('KG02 kilograms convert without early rounding', () => {
  close(api().convertWeight(100, 'kg', 'lb'),220.46226218487757);
});
test('KG03 identity and zero are validated', () => {
  assert.equal(api().convertWeight(12.345678,'kg','kg'),12.345678);
  assert.equal(api().convertWeight(0,'lb','kg'),0);
  assert.equal(Object.is(api().convertWeight(-0,'kg','lb'),-0),false);
});
test('KG04 invalid values and units never coerce', () => {
  for (const value of [null,undefined,'100',true,NaN,Infinity,-Infinity,-1]) {
    assert.equal(api().convertWeight(value,'kg','lb'),null);
    assert.equal(api().normalizeWeightEntry(value,'kg'),null);
  }
  for (const unit of [null,undefined,'lbs','KG',' kg','stone',true]) {
    assert.equal(api().convertWeight(100,unit,'lb'),null);
    assert.equal(api().convertWeight(100,'kg',unit),null);
  }
});
test('KG05 repeat conversion preserves physical mass', () => {
  for (const value of [0,0.000001,0.125,12.345678,100,999999.999999]) {
    for(const unit of ['kg','lb']) {
      let current=value;
      const other=unit==='kg'?'lb':'kg';
      for(let i=0;i<50;i++) current=api().convertWeight(api().convertWeight(current,unit,other),other,unit);
      close(current,value);
    }
  }
});
test('KG06 aliases require an explicit legacy boundary', () => {
  assert.equal(api().canonicalWeightUnit('lb'),'lb');
  assert.equal(api().canonicalWeightUnit('kg'),'kg');
  assert.equal(api().canonicalWeightUnit('lbs'),null);
  assert.equal(api().canonicalWeightUnit('lbs',true),'lb');
  assert.equal(api().canonicalWeightUnit('lbs','true'),null);
  for(const unit of ['KG',' lb',null]) assert.equal(api().canonicalWeightUnit(unit,true),null);
});
test('KG07 legacy values remain unknown, never guessed', () => {
  const project=api().projectStoredWorkoutWeight;
  assert.deepEqual(project({weight:100},'kg'),{status:'unknown-unit',value:null,unit:'kg'});
  assert.deepEqual(project({weight:100,enteredWeight:null,enteredWeightUnit:null},'lb'),{status:'unknown-unit',value:null,unit:'lb'});
  assert.deepEqual(project({weight:999,enteredWeight:100,enteredWeightUnit:'kg'},'kg'),{status:'known',value:100,unit:'kg'});
  for(const row of [null,[],{}, {enteredWeight:100}, {enteredWeightUnit:'kg'}, {enteredWeight:'100',enteredWeightUnit:'kg'}]) {
    if(row && !Array.isArray(row) && Object.keys(row).length===0) {
      assert.equal(project(row,'kg').status,'unknown-unit');
    } else assert.equal(project(row,'kg').status,'invalid');
  }
  assert.deepEqual(project({enteredWeight:1,enteredWeightUnit:'kg'},'lbs'),{status:'invalid',value:null,unit:null});
});
test('KG08 original entry and immutable projection survive', () => {
  const entry=api().normalizeWeightEntry(100,'kg');
  assert.equal(entry.enteredWeight,100);
  assert.equal(entry.enteredWeightUnit,'kg');
  close(entry.kilograms,100);
  close(entry.legacyPounds,220.46226218487757);
  const row=Object.freeze({weight:999,enteredWeight:100,enteredWeightUnit:'kg'});
  close(api().projectStoredWorkoutWeight(row,'lb').value,220.46226218487757);
  assert.equal(row.weight,999);
  assert.equal(api().convertWeight(Number.MAX_VALUE,'kg','lb'),null);
  assert.equal(api().normalizeWeightEntry(Number.MAX_VALUE,'kg'),null);
  assert.equal(api().convertWeight(Number.MIN_VALUE,'lb','kg'),null);
  assert.equal(api().normalizeWeightEntry(Number.MIN_VALUE,'lb'),null);
});
