/**
 * brainDensity.test.mjs — V2 digest-to-cockpit density contract.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureLanes, writeReceipt } from './hermesRunsLib.mjs';
import { renderDensitySvg, buildHealthHistory } from './brainDensity.mjs';

const DAY='2026-07-10';
const density={
  when:'2026-07-10T12:00:00Z', counts:{T0:4,T1:2,T2:1,T3:0,T4:0},
  clusters:[['broker/telegram',6]], floodHit:[{}], unparseable:[{}], tierless:[{}], chainBroken:[{}],
  actorRows:[['hermes/runner',8],['harness/doctor',3]],
  queueEntries:[{id:'Q-1',action:'send_message',expiresAt:'2026-07-10T13:00:00Z'}],
};

test('V2 density SVG renders five tier rings including dashed zero T4 plus thorns/crack/countdown/actors',()=>{
  const html=renderDensitySvg(density);
  assert.equal((html.match(/class="tier-ring/g)||[]).length,5);
  assert.match(html,/data-tier="T4"[^>]*stroke-dasharray/);
  assert.match(html,/class="refusal-thorn flood"/);
  assert.match(html,/class="integrity-crack"/);
  assert.match(html,/class="approval-countdown"/);
  assert.equal((html.match(/class="actor-satellite"/g)||[]).length,2);
});

test('V2 health history classifies 30 real calendar cells without inventing data',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'brain-health-')); ensureLanes(root);
  writeReceipt(root,{who:'hermes/runner',what:'health-sweep (T0)',target:'self',when:`${DAY}T08:00:00Z`,'approved-by':'n/a',outcome:'ok — green',evidence:'x'});
  writeReceipt(root,{who:'hermes/runner',what:'health-sweep (T0)',target:'self',when:'2026-07-09T08:00:00Z','approved-by':'n/a',outcome:'partial — attention',evidence:'x'});
  writeReceipt(root,{who:'hermes/runner',what:'health-sweep (T0)',target:'self',when:'2026-07-08T08:00:00Z','approved-by':'n/a',outcome:'failed — fault',evidence:'x'});
  const rows=buildHealthHistory(root,DAY);
  assert.equal(rows.length,30);
  assert.deepEqual(rows.slice(-3).map(x=>x.state),['red','amber','green']);
  assert.equal(rows[0].state,'no-data');
});
