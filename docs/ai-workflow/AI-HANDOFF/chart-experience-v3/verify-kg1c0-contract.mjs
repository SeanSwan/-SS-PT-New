/**
 * Lead-owned hostile probes for KG1c0; synthetic pure code only.
 * node verify-kg1c0-contract.mjs <isolated-build-root> <typescript-directory>
 * Compiles real module consumers without disk output; transpiles the actual draft module
 * in memory, resolving its real relative imports. Never imports application startup/DB.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
const [rootArg, compilerArg] = process.argv.slice(2);
assert.ok(rootArg && compilerArg, 'Explicit isolated root and TypeScript directory required');
const root = resolve(rootArg);
const ts = createRequire(import.meta.url)(resolve(compilerArg));
const shared = resolve(root, 'shared/units/workoutWeightWrite.mjs');
const declaration = resolve(root, 'shared/units/workoutWeightWrite.d.mts');
const draftPath = resolve(root, 'frontend/src/components/DashBoard/Pages/admin-clients/components/workoutWeightDraft.ts');
for(const name of ['workoutWeightDraft.js','workoutWeightDraft.test.js']) {
  assert.equal(existsSync(resolve(dirname(draftPath),name)),false,`${name} must not shadow authoritative TypeScript`);
}
const {parseWorkoutWeightOperation: parse} = await import(pathToFileURL(shared).href);
const input = readFileSync(draftPath, 'utf8');
const emitted = ts.transpileModule(input, {compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, strict: true,
}}).outputText.replace(/from\s+(['"])(\.[^'"]+)\1/g,
  (_, quote, specifier) => `from ${JSON.stringify(pathToFileURL(resolve(dirname(draftPath), specifier)).href)}`);
const draftApi = await import(`data:text/javascript;base64,${Buffer.from(emitted).toString('base64')}`);
const {createNewWorkoutWeightDraft: fresh, createExistingWorkoutWeightDraft: existing,
  setWorkoutWeightDisplayUnit: toggle, editWorkoutWeightText: edit,
  workoutWeightDraftOperation: save} = draftApi;
const entered = (n, unit='kg') => ({mode:'enter', enteredWeight:n, enteredWeightUnit:unit});
const row = (n=100, unit='kg') => ({id:7, weight:220.46226218487757,
  enteredWeight:n, enteredWeightUnit:unit});
const freeze = draft => Object.freeze({...draft, source:draft.source ? Object.freeze({...draft.source}) : null});

test('lead WO: accessors/symbols/inheritance cannot inject or execute', () => {
  let reads=0;
  const getter = Object.defineProperty({mode:'enter',enteredWeightUnit:'kg'}, 'enteredWeight',
    {enumerable:true,get(){reads++;return 100;}});
  const cases = [getter, Object.create(entered(100)), {...entered(100),[Symbol('private')]:1},
    {...entered(100),weight:100}, {...entered(100),constructor:1},
    Object.defineProperty(entered(100), 'hidden', {value:1})];
  for(const value of cases) assert.equal(parse(value),null);
  assert.equal(reads,0);
  const nullPrototype=Object.assign(Object.create(null),entered(100));
  assert.deepEqual(parse(nullPrototype),entered(100));
  assert.notEqual(parse(nullPrototype),nullPrototype);
});

test('lead WO: exact numeric and persisted-identity limits', () => {
  for(const value of [0,-0,0.000001,1.123456,999999.999999])
    assert.deepEqual(parse(entered(value)),entered(value===0?0:value));
  for(const value of [1e-7,1.0000001,1000000,-1,Infinity,NaN,'100',null,true])
    assert.equal(parse(entered(value)),null);
  for(const logId of [-1,0,1.1,'7',Number.MAX_SAFE_INTEGER+1,null])
    assert.equal(parse({mode:'preserve-recorded',logId}),null);
  assert.deepEqual(parse({mode:'preserve-recorded',logId:7}),{mode:'preserve-recorded',logId:7});
  assert.equal(parse({mode:'preserve-recorded',logId:7,enteredWeightUnit:'kg'}),null);
});

test('lead WD: 2000 synthetic source pairs survive repeated toggles exactly', () => {
  for(let i=1;i<=1000;i++) for(const unit of ['kg','lb']) {
    const value=i/10;
    let draft=edit(fresh(unit),String(value));
    for(let j=0;j<12;j++) draft=toggle(freeze(draft),j%2?'kg':'lb');
    assert.deepEqual(save(draft),entered(value,unit));
  }
});

test('lead WD: existing toggles preserve row identity rather than rounded source', () => {
  const sourceRow=Object.freeze(row());
  let draft=existing(sourceRow,'kg');
  const snapshot=JSON.stringify(draft);
  const converted=toggle(freeze(draft),'lb');
  assert.equal(JSON.stringify(draft),snapshot);
  assert.equal(converted.source.value,100);
  assert.equal(converted.source.unit,'kg');
  assert.notEqual(Number(converted.text),100);
  assert.deepEqual(save(converted),{mode:'preserve-recorded',logId:7});
  assert.deepEqual(sourceRow,row());
});

test('lead WD: new source never reparses overprecision display on save', () => {
  const converted=toggle(edit(fresh('kg'),'100'),'lb');
  assert.ok(converted.text.split('.')[1].length>6);
  assert.deepEqual(save(converted),entered(100));
  assert.equal(save(edit(converted,converted.text)),null,'explicit excessive-precision re-entry rejects');
  assert.deepEqual(save(edit(converted,'220.46')),entered(220.46,'lb'));
});

test('lead WD: unknown zero and unknown 82 never become bodyweight or inferred kg', () => {
  for(const weight of [0,82]) {
    let draft=existing({id:7,weight,enteredWeight:null,enteredWeightUnit:null},null);
    draft=toggle(freeze(draft),'kg');
    assert.equal(draft.status,'unknown-unit');
    assert.equal(draft.source,null);
    assert.equal(draft.text,String(weight));
    assert.deepEqual(save(draft),{mode:'preserve-recorded',logId:7});
    assert.deepEqual(save(edit(draft,String(weight))),entered(weight));
  }
});

test('lead WD: invalid edits lose stale valid source and cannot fall back to preserve', () => {
  for(const text of ['', ' ', 'bad','1e2','-1','1,000','1,5','١٢','1.0000000']) {
    const changed=edit(existing(row(),'kg'),text);
    assert.equal(changed.source,null);
    assert.equal(changed.weightEdited,true);
    assert.equal(save(toggle(freeze(changed),'lb')),null);
    assert.equal(changed.text,text);
  }
});

test('lead WD: missing explicit unit does not default, including unit chosen after invalid edit', () => {
  const invalid=edit(fresh(null),'100');
  assert.equal(save(invalid),null);
  assert.equal(save(toggle(invalid,'kg')),null);
  assert.deepEqual(save(edit(toggle(invalid,'kg'),'100')),entered(100));
  assert.equal(save(fresh('lbs')),null);
});

test('lead WD: strict decoded storage boundary rejects partial, strings and UI IDs', () => {
  for(const invalid of [{...row(),id:-1},{...row(),id:0},{...row(),enteredWeight:'100.000000'},
    {...row(),enteredWeight:null},{...row(),enteredWeightUnit:null},
    {...row(),enteredWeight:0.0000001},{...row(),weight:Infinity},
    {id:7,weight:82}]) assert.equal(existing(invalid,'kg'),null);
});

test('lead WD: accepted human decimals produce exact canonical operations', () => {
  for(const [text,value] of [['.5',.5],['1.',1],['0001.25',1.25],[' 10.5 ',10.5],
    ['0.000001',.000001],['999999.999999',999999.999999]])
    assert.deepEqual(save(edit(fresh('lb'),text)),entered(value,'lb'));
});

test('lead types: actual .mjs consumers in NodeNext/Bundler plus negative controls', () => {
  const virtual=resolve(root,'shared/units/lead-weight-write-probe.mts');
  const source=`import {parseWorkoutWeightOperation, type WorkoutWeightOperation} from './workoutWeightWrite.mjs';
const operation: WorkoutWeightOperation|null = parseWorkoutWeightOperation({});
if(operation?.mode==='enter'){const n:number=operation.enteredWeight; const u:'lb'|'kg'=operation.enteredWeightUnit;
// @ts-expect-error entered operation must not carry arbitrary row IDs
operation.logId;}
if(operation?.mode==='preserve-recorded'){const id:number=operation.logId;
// @ts-expect-error preserve operation cannot replace a stored weight
operation.enteredWeight;}
// @ts-expect-error parsing may fail
const bad: WorkoutWeightOperation = parseWorkoutWeightOperation(null);`;
  for(const mode of ['NodeNext','Bundler']) for(const hide of [false,true]) {
    const options={strict:true,noEmit:true,skipLibCheck:true,types:[],target:ts.ScriptTarget.ES2022,
      module:mode==='NodeNext'?ts.ModuleKind.NodeNext:ts.ModuleKind.ESNext,
      moduleResolution:mode==='NodeNext'?ts.ModuleResolutionKind.NodeNext:ts.ModuleResolutionKind.Bundler};
    const host=ts.createCompilerHost(options);
    const get=host.getSourceFile.bind(host), read=host.readFile.bind(host), exists=host.fileExists.bind(host);
    const hidden=name=>hide&&resolve(name)===declaration;
    host.fileExists=name=>!hidden(name)&&(resolve(name)===virtual||exists(name));
    host.readFile=name=>hidden(name)?undefined:resolve(name)===virtual?source:read(name);
    host.getSourceFile=(name,language,...rest)=>hidden(name)?undefined:resolve(name)===virtual
      ?ts.createSourceFile(virtual,source,language,true):get(name,language,...rest);
    const errors=ts.getPreEmitDiagnostics(ts.createProgram([virtual],options,host));
    if(hide) assert.ok(errors.some(e=>e.code===7016),`${mode}: missing declaration must fail`);
    else assert.deepEqual(errors.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')),[],mode);
  }
});

test('lead types: actual frontend draft implementation, native tests and typed consumer compile', () => {
  const virtual=resolve(dirname(draftPath),'lead-weight-draft-probe.ts');
  const source=`import {createNewWorkoutWeightDraft, editWorkoutWeightText,
  workoutWeightDraftOperation, type WorkoutWeightDraft} from './workoutWeightDraft';
const draft: WorkoutWeightDraft = editWorkoutWeightText(createNewWorkoutWeightDraft('kg'),'100');
const operation = workoutWeightDraftOperation(draft);
// @ts-expect-error canonical units only
createNewWorkoutWeightDraft('lbs');
if(operation?.mode==='enter'){const mass:number=operation.enteredWeight;}`;
  const options={strict:true,noEmit:true,skipLibCheck:true,types:[],target:ts.ScriptTarget.ES2022,
    module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler};
  const host=ts.createCompilerHost(options);
  const get=host.getSourceFile.bind(host),read=host.readFile.bind(host),exists=host.fileExists.bind(host);
  host.fileExists=name=>resolve(name)===virtual||exists(name);
  host.readFile=name=>resolve(name)===virtual?source:read(name);
  host.getSourceFile=(name,language,...rest)=>resolve(name)===virtual
    ?ts.createSourceFile(virtual,source,language,true):get(name,language,...rest);
  const nativeTest=resolve(dirname(draftPath),'workoutWeightDraft.test.ts');
  const errors=ts.getPreEmitDiagnostics(ts.createProgram([virtual,nativeTest],options,host));
  assert.deepEqual(errors.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')),[]);
});
