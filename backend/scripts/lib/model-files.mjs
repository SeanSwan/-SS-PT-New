/**
 * ============================================================================
 * FILE: lib/model-files.mjs
 * PURPOSE: The ONE subject list both database audits examine.
 * ADDED: 2026-07-29 (audit-script hostile round 16)
 * ============================================================================
 *
 * WHY THIS EXISTS: audit-model-health (can it READ?) and audit-write-paths (can it INSERT?) must
 * examine the SAME universe of model files, or a model can be visible to one audit and invisible
 * to the other with nobody noticing. That is not hypothetical: model-health filtered on
 * `/^[A-Z]/` ("models are PascalCase") while write-paths took every .mjs, so `models/contact.mjs`
 * — a real, live, initialized model — was write-audited but never read-audited, and appeared in
 * neither model-health's results nor its skip list. Two hand-maintained copies of the walk can
 * drift apart again; one shared function cannot.
 *
 * RULES ENCODED HERE (the lessons both audits paid for separately):
 *   - Recurse. models/social/ and models/financial/ hold 34 model files; a flat readdirSync
 *     silently examined only the top level while reporting a complete-looking total.
 *   - No case filter. Every .mjs is a candidate; a non-model lands in the caller's VISIBLE skip
 *     list instead of vanishing. An invisible skip is indistinguishable from a subject that does
 *     not exist.
 *   - Only the known wiring files are excluded, by exact name.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Files in models/ that are wiring, not models. Exact names only — never a pattern. */
const NOT_MODELS = new Set(['index.mjs', 'associations.mjs', 'setupAssociations.mjs']);

/** Every candidate model file under modelsDir, recursive, sorted for stable output. */
export function collectModelFiles(modelsDir) {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.mjs') && !NOT_MODELS.has(entry.name)) files.push(full);
    }
  };
  walk(modelsDir);
  files.sort();
  return files;
}
