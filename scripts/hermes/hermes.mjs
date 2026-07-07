#!/usr/bin/env node
/**
 * hermes.mjs — the discoverability dispatcher (Delivery Quartet Q-4, 7★ UX-5).
 * `node scripts/hermes/hermes.mjs help` renders the command vocabulary straight
 * from registry.generated.json (E1's machine-readable registry — one source of
 * truth, zero hand-mirrored command lists). A row is "runnable" when a script
 * matching the command name exists by convention (<name>.mjs in this dir);
 * everything else is honestly marked spec'd-not-built. Help only, by design —
 * an exec map would be a hand-mirrored constant (the exact E1 sin).
 */
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

export function renderHelp() {
  const reg = JSON.parse(fs.readFileSync(path.join(HERE, 'registry.generated.json'), 'utf8'));
  const commands = Array.isArray(reg) ? reg : reg.commands || [];
  const rows = commands.map((c) => {
    const file = `${c.name}.mjs`;
    const runnable = fs.existsSync(path.join(HERE, file));
    return {
      name: c.name, tier: c.tier, sw: c.killSwitch || 'none',
      run: runnable ? `node scripts/hermes/${file}` : '(spec’d — not built yet)',
      desc: String(c.description || '').slice(0, 70),
    };
  });
  const w = (k) => Math.max(...rows.map((r) => r[k].length), 4);
  const line = (r) => `${r.name.padEnd(w('name'))}  ${r.tier.padEnd(4)}  ${r.sw.padEnd(w('sw'))}  ${r.run.padEnd(w('run'))}  ${r.desc}`;
  return [
    `Hermes OS commands (${rows.length} registered — registry.generated.json is the source of truth)`,
    line({ name: 'NAME', tier: 'TIER', sw: 'KILL-SWITCH', run: 'RUN', desc: 'DESCRIPTION' }),
    ...rows.map(line),
    '',
    'Also: switches.mjs status|flip · queue.mjs create|list|approve|deny|arm|execute|revoke · receipt-write.mjs init|write|list',
  ].join('\n');
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/').split('/').pop());
if (isMain) {
  console.log(renderHelp());
}
