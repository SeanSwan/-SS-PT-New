/** Scoped, hash-checked installation primitives; no shell execution or network. */
import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export const BEGIN = '<!-- MAKEER-BLUEPRINTS:BEGIN -->';
export const END = '<!-- MAKEER-BLUEPRINTS:END -->';
export const sha = x => createHash('sha256').update(x).digest('hex');
export const read = path => existsSync(path) ? readFileSync(path) : null;

export function managed(text, policy) {
  const block = `${BEGIN}\n${policy.trim()}\n${END}`;
  const start = text.indexOf(BEGIN), end = text.indexOf(END);
  if (start >= 0 || end >= 0) {
    if (start < 0 || end < start || text.indexOf(BEGIN, start + BEGIN.length) >= 0 || text.indexOf(END, end + END.length) >= 0) {
      throw Error('Ambiguous managed policy markers; refusing replacement.');
    }
    return text.slice(0, start) + block + text.slice(end + END.length);
  }
  return `${block}\n\n${text}`;
}

export function mergeHooks(config, command, codex = false) {
  if (!config || Array.isArray(config) || typeof config !== 'object') throw Error('Invalid hook config.');
  const output = structuredClone(config);
  output.hooks ??= {};
  if (typeof output.hooks !== 'object' || Array.isArray(output.hooks)) throw Error('Invalid hooks object.');
  const groups = output.hooks.UserPromptSubmit ?? [];
  if (!Array.isArray(groups)) throw Error('Invalid UserPromptSubmit entries.');
  const owned = c => typeof c === 'string' && c.replaceAll('\\', '/').includes('/build-protocol/prompt-hook.mjs');
  const kept = groups.map(group => {
    if (!Array.isArray(group.hooks)) throw Error('Invalid hook group.');
    return { ...group, hooks: group.hooks.filter(h => !owned(h.command)) };
  }).filter(group => group.hooks.length);
  const hook = { type: 'command', command, timeout: 5 };
  if (codex) Object.assign(hook, { statusMessage: 'Checking Mega Blueprints activation', additionalContextLimit: 4000 });
  kept.push({ hooks: [hook] });
  output.hooks.UserPromptSubmit = kept;
  return output;
}

export function assertWithin(root, target) {
  const base = realpathSync(root);
  const rel = relative(base, resolve(target));
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw Error(`Target outside allowed root: ${target}`);
  let ancestor = resolve(target);
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  const actualRel = relative(base, realpathSync(ancestor));
  if (actualRel === '..' || actualRel.startsWith(`..${sep}`) || isAbsolute(actualRel)) throw Error(`Symlink escapes allowed root: ${target}`);
}

export function applyTargets(targets, { backupRoot, allowedRoots, beforeWrite } = {}) {
  // All input values are captured before any mutation; a concurrent source edit
  // stops the install instead of becoming an accidental last-writer win.
  const changes = targets.map(t => ({ ...t, content: Buffer.from(t.content), before: read(t.path) }))
    .filter(t => !t.before?.equals(t.content));
  if (!changes.length) return { changed: 0, manifest: null };
  for (const item of changes) {
    if ('expectedBefore' in item && item.expectedBefore !== (item.before ? sha(item.before) : null)) {
      throw Error(`Concurrent modification before snapshot: ${item.path}`);
    }
    if (!allowedRoots.some(root => { try { assertWithin(root, item.path); return true; } catch { return false; } })) {
      throw Error(`Unapproved installation target: ${item.path}`);
    }
  }
  const backup = join(backupRoot, `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID().slice(0, 8)}`);
  mkdirSync(backup, { recursive: true });
  const entries = changes.map((t, i) => ({ path: resolve(t.path), existed: Boolean(t.before),
    beforeSha256: t.before ? sha(t.before) : null, afterSha256: sha(t.content),
    backup: t.before ? `${i}.original` : null }));
  for (let i = 0; i < changes.length; i++) if (changes[i].before) {
    const saved = join(backup, entries[i].backup);
    writeFileSync(saved, changes[i].before, { flag: 'wx', mode: 0o600 });
    if (sha(readFileSync(saved)) !== entries[i].beforeSha256) throw Error('Backup hash mismatch.');
    const restored = `${saved}.restore-check`;
    copyFileSync(saved, restored);
    if (sha(readFileSync(restored)) !== entries[i].beforeSha256) throw Error('Restore hash mismatch.');
  }
  const manifest = join(backup, 'manifest.json');
  const receipt = { version: 1, status: 'SNAPSHOT_VERIFIED', createdAt: new Date().toISOString(), entries };
  writeFileSync(manifest, JSON.stringify(receipt, null, 2), { flag: 'wx', mode: 0o600 });
  beforeWrite?.();
  for (const item of changes) {
    const current = read(item.path);
    if ((current ? sha(current) : null) !== (item.before ? sha(item.before) : null)) throw Error(`Concurrent modification: ${item.path}`);
  }
  for (const item of changes) {
    const current = read(item.path);
    if ((current ? sha(current) : null) !== (item.before ? sha(item.before) : null)) throw Error(`Concurrent modification: ${item.path}`);
    mkdirSync(dirname(item.path), { recursive: true });
    const temp = `${item.path}.makeer-${randomUUID()}.tmp`;
    writeFileSync(temp, item.content, { flag: 'wx' });
    renameSync(temp, item.path);
    if (sha(readFileSync(item.path)) !== sha(item.content)) throw Error(`Read-back mismatch: ${item.path}`);
  }
  receipt.status = 'INSTALLED_READBACK_VERIFIED';
  writeFileSync(manifest, JSON.stringify(receipt, null, 2), { mode: 0o600 });
  return { changed: changes.length, manifest };
}
