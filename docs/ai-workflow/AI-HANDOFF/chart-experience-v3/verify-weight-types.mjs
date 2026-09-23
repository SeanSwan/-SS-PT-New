/**
 * Lead-owned KG0 type gate: compile actual virtual consumers, not declarations alone.
 * Usage: node verify-weight-types.mjs <build-root> <installed-typescript-directory>
 * Explicit local inputs only; no output files, database, environment loading or installs.
 * Two compiler modes plus declaration-removal negative controls; throws on any mismatch.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const [rootArg, compilerArg] = process.argv.slice(2);
assert.ok(rootArg && compilerArg, 'Explicit build root and TypeScript directory required');
const ts = createRequire(import.meta.url)(resolve(compilerArg));
const root = resolve(rootArg);
const file = resolve(root, 'shared/units/virtual-type-probe.mts');
const declaration = resolve(root, 'shared/units/weight.d.mts');
assert.ok(existsSync(declaration), 'weight.d.mts must exist');
assert.ok(!existsSync(resolve(root, 'shared/units/weight.mjs.d.ts')), 'No competing declaration');

const source = `import {convertWeight,projectStoredWorkoutWeight,
  normalizeWeightEntry,canonicalWeightUnit} from './weight.mjs';
const n: number|null = convertWeight(100,'kg','lb');
const unit: 'lb'|'kg'|null = canonicalWeightUnit('lb');
const entry = normalizeWeightEntry(100,'kg');
if(entry){const kg:number=entry.kilograms; const lb:number=entry.legacyPounds;}
const p = projectStoredWorkoutWeight({weight:100},'kg');
if(p.status==='known'){const value:number=p.value; const unit:'lb'|'kg'=p.unit;}
if(p.status==='unknown-unit'){const value:null=p.value; const unit:'lb'|'kg'=p.unit;}
if(p.status==='invalid'){const value:null=p.value; const unit:'lb'|'kg'|null=p.unit;}
// @ts-expect-error projection may not contain a number
const invalid: number = p.value;
// @ts-expect-error conversion can fail
const invalidConversion: number = convertWeight('100','kg','lb');
`;

function diagnostics(mode, hideDeclaration) {
  const options = {strict:true,noEmit:true,skipLibCheck:true,types:[],
    module:mode === 'NodeNext' ? ts.ModuleKind.NodeNext : ts.ModuleKind.ESNext,
    moduleResolution:mode === 'NodeNext' ? ts.ModuleResolutionKind.NodeNext : ts.ModuleResolutionKind.Bundler};
  const host = ts.createCompilerHost(options);
  const originalGet = host.getSourceFile.bind(host);
  const originalExists = host.fileExists.bind(host);
  const originalRead = host.readFile.bind(host);
  const hidden = name => hideDeclaration && resolve(name) === declaration;
  host.fileExists = name => !hidden(name) && (resolve(name) === file || originalExists(name));
  host.readFile = name => hidden(name) ? undefined : resolve(name) === file ? source : originalRead(name);
  host.getSourceFile = (name, language, ...rest) => hidden(name) ? undefined
    : resolve(name) === file ? ts.createSourceFile(file, source, language, true)
    : originalGet(name, language, ...rest);
  return ts.getPreEmitDiagnostics(ts.createProgram([file], options, host));
}

for(const mode of ['NodeNext','Bundler']) {
  const actual = diagnostics(mode, false);
  assert.deepEqual(actual.map(d=>({code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' ')})), [], mode);
  const negative = diagnostics(mode, true).map(d=>d.code);
  assert.ok(negative.includes(7016), `${mode}: hiding declaration must break module types`);
  assert.ok(negative.includes(2578), `${mode}: untyped any must break expected narrowing assertions`);
  console.log(`${mode}: PASS; virtual missing-declaration negative control detected TS7016/TS2578`);
}
console.log('KG0 type gates: 2/2 modes and 2/2 negative controls PASS');
