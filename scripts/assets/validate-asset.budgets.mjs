/**
 * validate-asset.budgets.mjs — the budgets rule, moved out of validate-asset.rules.mjs on
 * 2026-08-26 when the bake-absence check pushed that file over the repo's 300-line cap.
 *
 * Same contract as the parent: E()/W() are the caller's collectors, ctx.root is the repo root the
 * commit-existence probe runs in, `entry` is the registry row (for the budgetPriors warning).
 */
import { execFileSync } from 'node:child_process';

export function checkBudgets(manifest, entry, ctx, E, W) {
  // --- budgets: the fabricated-number rule --------------------------------
  const b = manifest.budgets;
  if (b === undefined) {
    E('budgets missing — declare null (unmeasured) rather than omitting the field');
  } else if (b !== null) {
    if (typeof b !== 'object') E('budgets must be null or an object with measurement provenance');
    else {
      for (const k of ['tool', 'command', 'date', 'commit']) {
        if (!b[k]) E(`budgets.${k} is required — a bare number with no measurement provenance is a fabricated number acquiring authority (registry budgetPolicy)`);
      }
      const nums = ['lod0Triangles', 'lod1Triangles', 'lod2Triangles', 'textureMB'];
      for (const k of nums) if (b[k] !== undefined && typeof b[k] !== 'number') E(`budgets.${k} must be a number`);
      // TRUTH check 1: the commit must exist. `"commit": "deadbeef"` is a lie a shape check accepts
      // (Ox, Kimi, Grok, HY3, DeepSeek — branch gate 2026-08-25).
      if (b.commit && !/^[0-9a-f]{7,40}$/i.test(String(b.commit))) E(`budgets.commit is not a git object id: ${b.commit}`);
      else if (b.commit) {
        try { execFileSync('git', ['cat-file', '-e', `${b.commit}^{commit}`], { cwd: ctx.root, stdio: 'ignore' }); }
        catch { E(`budgets.commit ${b.commit} is not a commit in this repository — provenance names a commit that does not exist`); }
      }
      // BAKE ABSENCE (handoff 2026-08-26 s9): swan_pipe has no texture bake stage, so measure-glb
      // truthfully reports textureMB 0 (embedded bytes). A future reader takes a bare 0 as "measured
      // and tiny", not "stage never ran". A zero must therefore SAY why - unable-to-verify is an
      // ERROR here, never a silent number.
      if (b.textureMB === 0 && typeof b.bake !== 'string') {
        E('budgets.textureMB is 0 with no budgets.bake - declare bake: "not-baked" (or the bake tool) so the zero records a missing stage, not a measured budget');
      }
      if (b.bake !== undefined && typeof b.bake !== 'string') E('budgets.bake must be a string');
      // sanity: the P0 incident was a 4MB texture budget on a 1500-tri asset
      if (typeof b.textureMB === 'number' && typeof b.lod0Triangles === 'number' && b.lod0Triangles < 3000 && b.textureMB > 2) {
        W(`textureMB ${b.textureMB} on a ${b.lod0Triangles}-tri asset looks implausible — sanity-check before promoting`);
      }
    }
  }
  if (b === null && entry?.budgetPriors) W('budgets null (unmeasured) — priors are advisory and MUST NOT be enforced');
}
