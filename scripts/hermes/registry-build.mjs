#!/usr/bin/env node
/**
 * registry-build.mjs — generate / validate scripts/hermes/registry.generated.json
 * FROM the canon docs (E1, finding G-1).
 *
 * The parser IS the validator: an invalid doc row (missing field, phantom switch,
 * duplicate name) makes this exit non-zero — you cannot generate a broken registry.
 *   node scripts/hermes/registry-build.mjs            # regenerate the committed JSON
 *   node scripts/hermes/registry-build.mjs --check    # drift check, no write (CI)
 *
 * Deterministic: no timestamps, doc-order preserved — same docs → byte-identical JSON.
 */
import fs from 'node:fs';
import { buildRegistryFromDocs, GENERATED_JSON } from './registryLib.mjs';

export function runBuild(argv = []) {
  const check = argv.includes('--check');
  const reg = buildRegistryFromDocs();
  const json = JSON.stringify(reg, null, 2) + '\n';
  const existing = fs.existsSync(GENERATED_JSON) ? fs.readFileSync(GENERATED_JSON, 'utf8') : null;
  const counts = `${reg.commands.length} commands · ${reg.denied.length} denied · ${reg.switches.length} switches`;
  if (check) {
    // Semantic compare (canonical JSON), not raw bytes — immune to CRLF/indent so
    // a core.autocrlf checkout can't report false drift. Both objects are built in
    // the same key order, so compact stringify is a stable equality check.
    if (!existing) throw new Error('registry.generated.json missing — run: node scripts/hermes/registry-build.mjs');
    if (JSON.stringify(JSON.parse(existing)) !== JSON.stringify(reg)) {
      throw new Error('registry.generated.json is STALE vs the canon docs — run: node scripts/hermes/registry-build.mjs');
    }
    return [`in sync (${counts})`];
  }
  fs.writeFileSync(GENERATED_JSON, json);
  return [`wrote ${GENERATED_JSON}`, counts];
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/').split('/').pop());
if (isMain) {
  try {
    for (const line of runBuild(process.argv.slice(2))) console.log(line);
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
}
