/**
 * dep-drift.mjs — when a manifest and the packages on disk disagree.
 * ============================================================================
 *
 * ── THE FAILURE THIS EXISTS TO MAKE LOUD ────────────────────────────────────
 * On 2026-09-01, twelve backend suites — four of them security probes — had never
 * executed on this machine. `jose` and `sanitize-html` were declared in the atelier
 * worktree's `package.json` and absent from `node_modules`, so those files could not be
 * LOADED. Vitest reported them as failing FILES and counted zero of their tests, which is
 * indistinguishable from ordinary failure unless you read the error text.
 *
 * The cause was not a forgotten install. **Worktrees share `node_modules` but not
 * `package.json`.** `backend/node_modules` in every shared worktree is a symlink to the
 * MAIN checkout's, and the main checkout sits on a branch 2303 commits behind origin/main
 * whose manifest predates both packages. The tree that OWNS the folder had never heard of
 * them, so no install run from there could ever have produced them.
 *
 * ── AND THE HALF THAT SURVIVES THE FIX ──────────────────────────────────────
 * Installing them fixed today. It did not fix tomorrow: they now exist on disk while being
 * declared in NO manifest the owning checkout reads, so the next `npm ci` there deletes
 * them and the twelve suites silently stop loading again. That is the more dangerous state,
 * because everything looks healthy right up until it does not.
 *
 * So there are TWO findings here, and conflating them would lose the important one:
 *
 *   missing  declared and not installed. Broken NOW. Loud, and cheap to fix.
 *   atRisk   installed, declared HERE, but absent from the manifest of the checkout that
 *            owns the shared folder. Works today ONLY because someone installed it by
 *            hand. A clean install over there removes it.
 *
 * `atRisk` is the one worth having a detector for. `missing` you would eventually notice.
 *
 * ── WHY THIS FUNCTION TAKES DATA AND NOT A FILESYSTEM ───────────────────────
 * Pure in, findings out — so a test can put it in every state that matters without
 * building a directory tree per case. The caller does the fs work, which is also the part
 * that has to fail open: a gate that throws on a missing folder is a gate that gets
 * removed.
 */

/**
 * @param {object} input
 * @param {Record<string,string>} input.declared      name -> range, from THIS manifest
 * @param {(name: string) => boolean} input.isInstalled  resolves like Node does
 * @param {Set<string>|null} input.ownerDeclared      names the owning checkout declares,
 *                                                    or null when the folder is not shared
 * @returns {{ missing: string[], atRisk: string[] }}
 */
export function classifyDeps({ declared = {}, isInstalled, ownerDeclared = null } = {}) {
  const names = Object.keys(declared).sort();
  const missing = [];
  const atRisk = [];

  for (const name of names) {
    const installed = isInstalled(name);
    if (!installed) {
      missing.push(name);
      continue;
    }
    // Only meaningful when the folder is SHARED. An unshared node_modules cannot be
    // reinstalled out from under this manifest, so nothing here is at risk — and
    // reporting it anyway would be the noise that gets a gate ignored.
    if (ownerDeclared && !ownerDeclared.has(name)) atRisk.push(name);
  }

  return { missing, atRisk };
}

/**
 * The finding text. Separated so a test can assert what an operator is actually told —
 * a detector that fires correctly and explains badly still costs someone an afternoon.
 *
 * Returns [] when there is nothing to say, so the caller can spread it unconditionally.
 */
export function describeDepDrift({ label, missing = [], atRisk = [], ownerPath = null } = {}) {
  const out = [];

  if (missing.length) {
    out.push(
      `${label}: ${missing.length} declared dependenc${missing.length === 1 ? 'y is' : 'ies are'} ` +
      `NOT INSTALLED — ${missing.join(', ')}. Files importing them cannot LOAD, and a test ` +
      'runner reports that as a failing file with zero tests, which reads exactly like an ' +
      'ordinary failure. Install before trusting any suite result.'
    );
  }

  if (atRisk.length) {
    out.push(
      `${label}: ${atRisk.length} package${atRisk.length === 1 ? '' : 's'} installed here ` +
      `but declared in NO manifest the owning checkout reads — ${atRisk.join(', ')}. ` +
      `node_modules is shared with ${ownerPath || 'another checkout'}, whose package.json ` +
      'predates them, so they exist only because someone installed them by hand. A clean ' +
      'install or `npm ci` there DELETES them and the affected suites silently stop ' +
      'loading. Durable fix: the owning checkout moves to a branch that declares them.'
    );
  }

  return out;
}
