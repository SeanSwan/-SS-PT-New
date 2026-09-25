/**
 * fleetMeasure — drive the browser and measure the fleet, once.
 * @module scripts/swan-brain-console/fleetMeasure
 *
 * WHY THIS IS SEPARATE FROM `shot-diff.mjs`
 * Two subjects. `shot-diff.mjs` owns the PROCESS contract: argv, the attempt lifecycle, the
 * publication fence, the lock, the exit code. This module owns the one thing that needs a live
 * browser — navigate, prove it is the right application, reconcile the population, screenshot
 * each variant, decide each verdict. Splitting them is the sixth time Rule 4's 300 lines has
 * forced a split in this subsystem and, as with the other five, the boundary is a real one
 * rather than a line count: everything here can fail, and everything in `shot-diff.mjs` is
 * ordering.
 *
 * THE ORDERING INSIDE IT IS THE POINT, AND IT IS WHY IT CANNOT BE REARRANGED
 *   1. IDENTITY before measurement. A stray dev server on the same port yields either a confusing
 *      selector timeout or, far worse, a baseline set recorded from the WRONG APPLICATION — which
 *      then looks authoritative and fails every future comparison for the wrong reason.
 *   2. POPULATION before measurement. The DOM is the SUBJECT, so it cannot also be the
 *      DENOMINATOR. Until round 11 the id list came only from the page, so a filtered harness URL
 *      produced a one-row run whose missing variants were absent from the measurement AND from the
 *      total alike: `failed` stayed 0 and the artifact still declared `gate: 'three-worlds-render'`.
 *   3. A COMPLETE GENERATION before measurement, in compare mode. See below — this is round 15.
 *   4. BASELINES ARE STAGED, THEN PUBLISHED AS ONE GENERATION (round 14, Astra J03). `--update`
 *      used to write each authoritative PNG the moment its screenshot was taken, so a run that
 *      died on the seventh variant had already replaced the first six, and the next comparison
 *      would use a mixture of two generations. Astra reproduced it — `alpha.png` new, `beta.png`
 *      old, attempt failed. The screenshots are already in memory, so staging costs one array.
 *
 * ROUND 15 (Astra K04) — STAGING NARROWED THE WINDOW; IT DID NOT CLOSE IT.
 * Astra executed the residual: two screenshots succeed, the SECOND baseline write throws ENOSPC,
 * and the baseline set is left `alpha` = new, `beta` = old — a mixed generation, with nothing in
 * the artifact recording it. Staging moved the write loop after the browser work, which shrinks
 * the window to the loop, but a loop that dies still leaves the mixture, and the next COMPARE run
 * reads it as authoritative. Astra offered two repairs: publish immutable generations behind one
 * pointer, or add a durable marker that every comparison refuses until a complete update repairs
 * it. This module takes the second, because the first needs a directory layout the workflow and
 * `gallery-verify.mjs` both read from.
 *
 * THE MARKER. Before the first baseline byte is written, an `INCOMPLETE_GENERATION` file is
 * written into the baseline directory; it is removed only after the LAST baseline is written. A
 * compare run refuses outright while it exists. So the failure is no longer silent and it is no
 * longer transient: the mixture is NAMED on disk, every later comparison refuses rather than
 * comparing against it, and only a complete `--update` clears it. That is the property staging
 * alone could not provide — the marker survives the crash that staging could not prevent.
 *
 * WHAT IS STILL NOT CLAIMED: the publish loop is still not atomic. A crash leaves the marker and
 * a partial generation; what it cannot do is leave a partial generation that anything will read.
 *
 * BOUNDS: needs a live harness and Chromium in production. Every boundary that touches the
 * filesystem or the browser is INJECTABLE (`deps`), which is round 15's K05: a guard that asserts
 * source text can stay green after the behaviour is deleted, so the guards for this module drive
 * it through these seams instead. Defaults are the real implementations.
 */
import { createRequire } from 'node:module';
import {
  readFileSync, existsSync, writeFileSync, mkdirSync, unlinkSync,
} from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { HARNESS_TITLE } from './harnessIdentity.mjs';
import { classifyComparison } from './baselineComparison.mjs';
import { measureDiff } from './pixelDiff.mjs';
// The population decision is pure and shared with the suite, so this call site cannot drift from
// the rule it claims to enforce. All this module does is act on the answer.
import { planPopulation } from './renderResult.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const require = createRequire(resolve(REPO, 'frontend', 'noop.cjs'));
const { chromium } = require('playwright');

/** The durable mixed-generation marker (round 15, Astra K04). One name, one meaning. */
export const INCOMPLETE_GENERATION = '.incomplete-generation.json';

/** The default filesystem boundary. Injected by the suite so a guard can drive the failure. */
export const DEFAULT_IO = Object.freeze({
  existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync,
});

/**
 * Drive the browser and measure the fleet.
 *
 * Everything that can fail happens in here, which is why it is a function: `runAttempt` needs one
 * thing it can invoke and catch, and `main()` needs to be left with nothing to get wrong about
 * ordering. Returns `{ results, population }`; `population` is `null` when the run never got far
 * enough to reconcile one.
 *
 * `deps` is the round-15 K05 seam: `{ launch, io, measure }`. Production passes nothing and gets
 * the real Playwright launcher, `node:fs` and the real pixel comparison. The suite passes doubles
 * and asserts the refusals, the recorded failures and the writes that must NOT happen — because a
 * guard that reads this file as text cannot tell the difference between a rule and a comment.
 */
export async function measureFleet({
  opts, baselineDir, expectedIds,
  deps = {},
}) {
  const {
    launch = () => chromium.launch(),
    io = DEFAULT_IO,
    measure = measureDiff,
    now = () => new Date(),
  } = deps;

  const browser = await launch();
  const results = [];
  let population = null;
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(opts.url, { waitUntil: 'networkidle' });

    /*
     * IDENTITY BEFORE MEASUREMENT (see the module header). A hard stop, not a warning: a baseline
     * set recorded from the wrong app looks like a reference and fails every future comparison
     * for the wrong reason.
     */
    const title = await page.title();
    if (!(await page.content()).includes(HARNESS_TITLE)) {
      throw new Error(
        `${opts.url} is not the Three.js fleet QA harness (title ${JSON.stringify(title)}). `
          + 'Refusing to measure or record baselines against the wrong application.',
      );
    }

    // Wait for the fleet to have actually mounted, rather than trusting networkidle: the harness
    // boots worlds after load, and screenshotting too early would bake a blank frame into the set.
    await page.waitForSelector('[data-world] .frame', { timeout: 60_000 });
    const ids = await page.evaluate(
      () => [...document.querySelectorAll('[data-world]')]
        .map((c) => c.getAttribute('data-world') ?? c.querySelector('[data-world-id]')?.getAttribute('data-world-id'))
        .filter(Boolean),
    );
    if (ids.length === 0) throw new Error('the harness rendered no variants — refusing to write an empty baseline set');

    // POPULATION BEFORE MEASUREMENT (see the module header).
    const plan = planPopulation({ expected: expectedIds, measured: ids, update: opts.update });
    population = plan.population;
    if (plan.refusal) throw new Error(plan.refusal);
    results.push(...plan.rows);

    /*
     * A COMPLETE GENERATION BEFORE MEASUREMENT (round 15, Astra K04).
     *
     * Checked here, before a single pixel is compared, and checked ONLY in compare mode: an
     * update run is the thing that REPAIRS the marker, so it must be allowed to proceed. The
     * refusal is the whole point of the marker — a comparison against a mixture of two baseline
     * generations produces a verdict about neither, and it would look exactly like a real one.
     */
    const markerPath = join(baselineDir, INCOMPLETE_GENERATION);
    if (!opts.update && io.existsSync(markerPath)) {
      let detail = 'the marker file could not be read';
      try {
        detail = String(io.readFileSync(markerPath, 'utf8')).replace(/\s+/g, ' ').slice(0, 400);
      } catch { /* the message below is still true without it */ }
      throw new Error(
        `the baseline set is an INCOMPLETE GENERATION — ${markerPath} exists, so a previous `
          + '--update died partway through publishing baselines and the directory holds a mixture '
          + `of two generations. Refusing to compare against it. Marker: ${detail}`,
      );
    }

    // STAGED, NOT WRITTEN IN PLACE (see the module header, point 4).
    const staged = [];
    for (const id of ids) {
      const shot = await page.locator(`[data-world="${id}"] .frame`).screenshot();
      const dataUrl = `data:image/png;base64,${shot.toString('base64')}`;
      const file = join(baselineDir, `${id}.png`);

      if (opts.update) {
        staged.push({ file, shot });
        results.push({ id, status: 'written', detail: `baseline staged (${shot.length} bytes)` });
        continue;
      }

      const baselineExists = io.existsSync(file);
      let diffRatio = null;
      let reason = '';
      if (baselineExists) {
        const measured = await measure(
          page, dataUrl, `data:image/png;base64,${io.readFileSync(file).toString('base64')}`,
        );
        if (measured.ok) diffRatio = measured.ratio;
        else reason = measured.reason;
      }
      const verdict = reason
        ? { status: 'unreadable', detail: reason }
        : classifyComparison({ baselineExists, diffRatio, maxDiffPixelRatio: opts.maxDiffPixelRatio });
      results.push({ id, ...verdict });
    }

    /*
     * THE GENERATION IS PUBLISHED BEFORE THIS FUNCTION RETURNS, AND THE ARTIFACT IS WRITTEN BY
     * `main()` AFTER IT RETURNS. So by the time anything can read `status: "written"`, the bytes
     * are on disk. The ORDERING is the claim; the wording of the row is not.
     *
     * ROUND 15 (Astra K04) — THE MARKER IS WRITTEN BEFORE THE FIRST BYTE AND REMOVED AFTER THE
     * LAST. That ordering is the repair: if any write throws, the marker is still on disk when the
     * process dies, so the next compare run refuses instead of comparing a mixture. Writing the
     * marker after the loop would mark nothing; removing it inside the loop would clear it before
     * the generation was complete.
     */
    if (staged.length > 0) {
      io.mkdirSync(baselineDir, { recursive: true });
      io.writeFileSync(markerPath, JSON.stringify({
        marker: 'incomplete-generation',
        writtenAt: now().toISOString(),
        variants: staged.map(({ file }) => file),
        count: staged.length,
        detail: 'a baseline update started and did not finish; compare runs refuse until a '
          + 'complete --update clears this file',
      }, null, 2));
      for (const { file, shot } of staged) io.writeFileSync(file, shot);
      io.unlinkSync(markerPath);
    }
  } finally {
    await browser.close();
  }
  return { results, population };
}
