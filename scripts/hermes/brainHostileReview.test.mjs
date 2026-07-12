/**
 * brainHostileReview.test.mjs - release-blocking regressions found in the V1/V2 hostile review.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureLanes, seedSwitches, writeReceipt } from './hermesRunsLib.mjs';
import { gatherBrainData, renderBrainView } from './brain-view.mjs';
import { cameraClientJs } from './brainCamera.mjs';

const DAY='2026-07-01';
const NOW=`${DAY}T08:00:00Z`;
const receipt=(root,over={})=>writeReceipt(root,{who:'harness/hermes-doctor',what:'hermes-doctor (T0)',target:'self',when:NOW,'approved-by':'n/a',outcome:'ok - healthy',evidence:'x',...over});
function fresh(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'hermes-hostile-'));const swFile=path.join(root,'switches.json');ensureLanes(root);seedSwitches(swFile);return{root,swFile};}

// RED evidence before repair: a hidden phone graph has width 0, and zoomAt divided by it,
// producing translate(NaN NaN) when + was pressed from Overview.
test('camera ignores hidden-pane zoom and re-applies/centers when Graph becomes visible',()=>{
  const js=cameraClientJs('[]');
  assert.match(js,/if\(!pane\.clientWidth\)\{return;\}/);
  assert.match(js,/tab-graph/);
  assert.match(js,/scrollLeft/);
  assert.match(js,/addEventListener\('change'/);
  assert.match(js,/cancelAnimationFrame/);
  assert.match(js,/pointercancel/);
});

test('phone tabs expose native radio semantics and a visible keyboard focus path',()=>{
  const {root,swFile}=fresh();receipt(root);
  const html=fs.readFileSync(renderBrainView(root,swFile,DAY,{now:NOW}).path,'utf8');
  for(const id of ['overview','graph','detail']) assert.match(html,new RegExp(`id="tab-${id}"[^>]*aria-label="${id[0].toUpperCase()+id.slice(1)}`));
  assert.ok(!/role="tab"|aria-pressed=/.test(html));
  assert.match(html,/#tab-graph:focus-visible~\.phone-tabs label\[for="tab-graph"\]/);
  assert.match(html,/@media\(max-width:700px\)[\s\S]*\.tab-radio\{display:block/);
});

test('interactive graph nodes render a 44px-class hit target instead of focusing tiny skill dots',()=>{
  const {root,swFile}=fresh();receipt(root);
  const html=fs.readFileSync(renderBrainView(root,swFile,DAY,{now:NOW}).path,'utf8');
  assert.match(html,/class="node-hit"[^>]*r="32"[^>]*tabindex="0"/);
  assert.ok(!/class="node [^"]*"[^>]*tabindex="0"/.test(html),'visual bulbs are not the undersized focus target');
});

test('future-dated snapshots warn instead of being silently clamped to current',()=>{
  const {root,swFile}=fresh();receipt(root);
  const now='2026-06-30T08:00:00Z';
  const data=gatherBrainData(root,swFile,DAY,{now});
  assert.equal(data.dataDateOffsetDays,-1);
  assert.notEqual(data.health,'green');
  const html=fs.readFileSync(renderBrainView(root,swFile,DAY,{now}).path,'utf8');
  assert.match(html,/DATA DATE IS 1 DAY AHEAD/);
});

test('density copy has no replacement question marks and unknown deltas are not invented as zero',()=>{
  const {root,swFile}=fresh();receipt(root);
  const html=fs.readFileSync(renderBrainView(root,swFile,DAY,{now:NOW}).path,'utf8');
  assert.ok(!/ UTC \? |approval \? median|silent day \?/.test(html));
  assert.equal((html.match(/class="delta unavailable">&mdash;<\/div>/g)||[]).length,5);
});

test('launcher checks the remote main ref rather than trusting a stale local tracking ref',()=>{
  const here=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
  const cmd=fs.readFileSync(path.join(here,'Hermes-Command-Center.cmd'),'utf8');
  assert.match(cmd,/ls-remote origin refs\/heads\/main/);
  assert.match(cmd,/RUNTIME VERSION UNKNOWN/);
});
test('graph controls belong to the visible pane instead of the horizontally panned canvas',()=>{
  const {root,swFile}=fresh();receipt(root);
  const html=fs.readFileSync(renderBrainView(root,swFile,DAY,{now:NOW}).path,'utf8');
  assert.ok(html.indexOf('id="ann"') < html.indexOf('class="viewctl"'));
  assert.match(html,/#tab-graph:checked~\.main \.viewctl\{position:fixed/);
});
test('HUD chrome CSS parses and fault dots do not collide with metric deltas',()=>{
  const {root,swFile}=fresh();receipt(root);
  const html=fs.readFileSync(renderBrainView(root,swFile,DAY,{now:NOW}).path,'utf8');
  assert.ok(!html.includes('))66'),'no invalid alpha suffix after a CSS variable');
  assert.match(html,/color-mix\(in srgb,var\(--tc,var\(--chip-edge\)\) 40%,transparent\)/);
  assert.match(html,/\.tile\.bad \.dotp\{background:var\(--c-fault\)\}/);
  assert.match(html,/\.tile\.warn \.dotp\{background:var\(--c-routine\)\}/);
  assert.match(html,/\.tile\.bad \.dotp,\.tile\.warn \.dotp\{[^}]*bottom:var\(--s3\)/);
});