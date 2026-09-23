#!/usr/bin/env node
/** Read-only installation audit: ordered manifests, saved originals, isolated
 * restore copies, current target hashes and visible naming. No config output.
 * Pass manifests oldest first. This proves file integrity, not runtime loading.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const paths = process.argv.slice(2);
assert(paths.length, 'Pass installation manifests oldest first.');
const hash = data => createHash('sha256').update(data).digest('hex');
const latest = new Map();
let originals = 0;
for (const path of paths) {
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(manifest.status, 'INSTALLED_READBACK_VERIFIED');
  for (const entry of manifest.entries) {
    if (entry.existed) {
      const saved = join(dirname(path), entry.backup);
      assert.equal(hash(readFileSync(saved)), entry.beforeSha256, 'Saved original hash changed.');
      const restored = [saved + '.restore-check', saved.replace(/\.original$/, '.restore-check')]
        .find(existsSync);
      assert(restored, 'Isolated restore copy missing.');
      assert.equal(hash(readFileSync(restored)), entry.beforeSha256, 'Restore copy hash changed.');
      originals++;
    }
    latest.set(entry.path, entry);
  }
}
for (const entry of latest.values()) {
  const bytes = readFileSync(entry.path);
  assert.equal(hash(bytes), entry.afterSha256, `Installed file drift: ${entry.path}`);
  assert(!bytes.toString('utf8').includes('Makeer Blueprints'), `Old visible name: ${entry.path}`);
}
console.log(JSON.stringify({ manifests: paths.length, originalsAndRestoresVerified: originals,
  installedTargetsVerified: latest.size, visibleName: 'Mega Blueprints',
  limitation: 'File integrity only; verify native loading separately.' }, null, 2));
