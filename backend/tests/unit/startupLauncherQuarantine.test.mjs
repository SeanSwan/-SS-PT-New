/**
 * FILE: startupLauncherQuarantine.test.mjs
 * PURPOSE: Prevent disabled PLAUD launchers from remaining executable Startup-folder entries.
 * CONTRACT: Installer quarantine destinations must be outside the Windows Startup folder.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as nodeTest } from 'node:test';
import assert from 'node:assert/strict';

// Dual-runner shim (mirrors tests/unit/clientPhotoUploadGate.test.mjs).
// A bare `import test from 'node:test'` registers zero Vitest suites, so the
// whole file reported "No test suite found in file" and counted as a failed
// suite — a permanent red that hid the quarantine assertions below. Still
// runnable standalone with:
//   node --test backend/tests/unit/startupLauncherQuarantine.test.mjs
const isVitest = Boolean(process.env.VITEST || process.env.VITEST_WORKER_ID);
const test = isVitest ? (await import('vitest')).it : nodeTest;

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const installers = [
  'scripts/launchers/Install-Swan-Applaud-Autostart.ps1',
  'scripts/launchers/Install-Swan-Plaud-Official-Autostart.ps1',
];

for (const relativePath of installers) {
  test(`${relativePath} quarantines disabled entries outside Startup`, () => {
    const source = readFileSync(join(repoRoot, relativePath), 'utf8');

    assert.match(source, /Get-RetiredLauncherRoot/);
    assert.match(source, /GetFolderPath\("Desktop"\)/);
    assert.match(source, /_retired-launchers/);
    assert.doesNotMatch(source, /Join-Path\s+\$startup\s+[^\r\n]*\.disabled-/i);
  });
}
