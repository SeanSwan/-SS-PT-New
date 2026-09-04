/** SCU documentation verifier and bounded evidence collector.
 * Run from the isolated repo root. Only writes inside this package/evidence.
 * Optional --browser MODULE_ROOT uses installed Playwright; no network assets.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const packet = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(packet, 'evidence');
mkdirSync(out, { recursive: true });
const hash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const reports = [];
for (const [file, exit, passed, failed] of [
  ['baseline.test.mjs', 0, 12, 0], ['integration.red.test.mjs', 0, 5, 0],
]) {
  const r = spawnSync(process.execPath, ['--test', path.join(packet, 'tests', file)],
    { cwd: root, encoding: 'utf8', timeout: 30000 });
  const log = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  writeFileSync(path.join(out, `${file}.log`), log);
  assert.equal(r.status, exit, `${file}: unexpected exit or harness failure`);
  assert.match(log, new RegExp(`# pass ${passed}\\b`));
  assert.match(log, new RegExp(`# fail ${failed}\\b`));
  reports.push({ file, exit: r.status, passed, failed });
}
let linkCount = 0, mermaidCount = 0;
for (const file of readdirSync(packet).filter((p) => p.endsWith('.md'))) {
  const text = readFileSync(path.join(packet, file), 'utf8');
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(https?:|#)/.test(target)) continue;
    const p = path.resolve(packet, target.split('#')[0]);
    assert.ok(existsSync(p), `${file}: missing local link ${target}`);
    linkCount++;
  }
  const fences = [...text.matchAll(/^```/gm)].length;
  assert.equal(fences % 2, 0, `${file}: unpaired Markdown fence`);
  for (const block of text.matchAll(/```mermaid\n([\s\S]*?)\n```/g)) {
    assert.match(block[1], /^(flowchart|sequenceDiagram|stateDiagram-v2|erDiagram)\b/);
    mermaidCount++;
  }
}
const sources = [
  'frontend/src/hooks/useCoachCommand.ts',
  'frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenter.actions.ts',
  'frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandLogEntry.tsx',
  'frontend/src/components/CoachDock/useSurfaceCoachDock.ts',
  'frontend/src/components/CoachConfirm/ConfirmationSheet.tsx',
  'backend/services/ai/operationSigning.mjs',
  'backend/services/ai/renderDigest.mjs',
  'backend/services/ai/commandExecutor.mjs',
  'backend/services/ai/coachActionProposalPersistenceService.mjs',
  'backend/models/AiCommandAuditLog.mjs',
];
writeFileSync(path.join(out, 'source-hashes.json'), JSON.stringify({
  baseline: 'bfc7a789869384e48116c5f0f091913865fdc575',
  files: sources.map((source) => ({ source, sha256: hash(path.join(root, source)) })),
}, null, 2));
const browserArg = process.argv.indexOf('--browser');
const captures = [];
if (browserArg !== -1) {
  const require = createRequire(path.join(process.argv[browserArg + 1], 'package.json'));
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const [width, height] of [[414, 896], [1440, 1000], [2560, 1440], [3840, 2160]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(pathToFileURL(path.join(packet, 'wireframes.html')).href);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, `static wireframe overflow at ${width}`);
      const file = `wireframe-${width}.png`;
      await page.screenshot({ path: path.join(out, file), fullPage: true });
      captures.push({ width, height, file, horizontalOverflow: overflow });
      await page.close();
    }
  } finally { await browser.close(); }
}
const result = {
  verifiedAt: new Date().toISOString(), reports, localLinks: linkCount,
  mermaidBlocks: mermaidCount, mermaidValidation: 'fences and diagram types only; no Mermaid parser',
  captures, browserScope: 'Static synthetic wireframe only; not production UI',
};
writeFileSync(path.join(out, 'verification.json'), JSON.stringify(result, null, 2));
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
