import { resolve, sep } from 'node:path';

/**
 * forgeConfig.mjs — the handful of defaults that change what every generation
 * does, kept in one place so a drive-by edit cannot flip one by accident.
 */

/**
 * KILL-LIST PROMPT INJECTION — DEFAULT OFF.
 *
 * The compiler can append "Rendering constraints — avoid: iridescent gradient,
 * glassmorphism, literal creature form, …" to every prompt. Those bans are most
 * of what separates Swan output from stock AI art, and the parameter channel for
 * them is dead twice over, so inlining them was a reasonable idea.
 *
 * IT IS OFF BECAUSE ITS EFFECT IS UNMEASURED, AND THE ERROR COSTS ARE ASYMMETRIC.
 * Measured across 3 briefs / 12 images, arms differing only by this clause:
 * acceptance 3/3 both, palette identical, and the clause costs ~7% MORE per
 * image. What is NOT measured is whether telling a caption-trained model to
 * avoid a noun makes it fixate on that noun — a documented failure mode.
 *
 *   ON and bad   -> every run between merge and the ruling is contaminated, and
 *                   the blind pairs themselves become suspect.
 *   OFF and good -> we lose a ~7% cost premium we were paying anyway.
 *
 * The expensive error is ON-and-bad. So: off, until measured.
 *
 * GATE CONDITION FOR FLIPPING THIS — not "someone thinks it looks better":
 * Sean's blind-pair ruling on the 6 images generated 2026-08-12
 * (`.ai-workflow/forge-runs/ab-avoid/`), recorded via `forge review-answer`.
 * A default with a named gate is a decision; a bare `true` is an accident.
 */
export const KILL_LIST_ENABLED = process.env.FORGE_KILL_LIST === '1';

/**
 * Where generated artifacts may live. Used as a hard allowlist by the pruner —
 * the only code here that deletes anything — so a mistyped `--root` cannot point
 * destruction at an arbitrary directory.
 */
export const ARTIFACT_ROOT = '.ai-workflow/forge-runs';

/**
 * HARD ROOT ALLOWLIST — the only thing standing between a mistyped `--root` and
 * an arbitrary directory being emptied.
 *
 * "Dry-run by default" and "I tested it in a temp folder" are not controls; they
 * are habits, and habits do not survive a tired operator at 1am. This is a code
 * path that cannot be argued with: the resolved deletion target must sit inside
 * `.ai-workflow/forge-runs/`, or the script refuses. There is no flag to
 * override it, because a flag is just a slower way to make the mistake.
 */
export function assertInsideArtifactRoot(targetDir, root) {
  const allowed = resolve(root, ARTIFACT_ROOT);
  const target = resolve(targetDir);
  if (target !== allowed && !target.startsWith(allowed + sep)) {
    throw new Error(`REFUSING: ${target} is outside the artifact root ${allowed}. `
      + 'This script only ever deletes generated Forge images.');
  }
  return target;
}
