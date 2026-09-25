/**
 * pixelDiff — measure how much two rendered PNGs differ, IN THE PAGE.
 * @module scripts/swan-brain-console/pixelDiff
 *
 * WHY THE COMPARISON RUNS IN THE BROWSER
 * `shot-diff.mjs` compares today's render of each variant against a stored baseline. D20
 * recorded that no comparator exists in this repo (`pixelmatch`/`pngjs`/`odiff`/`resemble`
 * appear in neither manifest) and that `toHaveScreenshot` needs Playwright Test's runner, which
 * a standalone script is not. Rather than add a dependency, the comparison runs on a canvas in
 * the page — using the same rasteriser that drew the screenshot, which is the only way the two
 * images are guaranteed to be in the same colour space.
 *
 * WHY IT IS ITS OWN MODULE
 * Round 11. Extracting this from `shot-diff.mjs` was forced by Rule 4 — the population
 * reconciliation for finding F04 pushed that file to 309 lines — but the split is a real one
 * rather than a line-shuffling exercise. The subsystem now has three subjects, each with a
 * different test story:
 *
 *   `baselineComparison.mjs`  the DECISION — pure, pinned exhaustively by a unit suite
 *   `renderResult.mjs`        the ARTIFACT — pure, and the contract with the console
 *   `pixelDiff.mjs`           the MEASUREMENT — needs a live page, so only a harness run can
 *   `shot-diff.mjs`           the ORCHESTRATION — launches the browser and applies the three
 *
 * A size mismatch is reported as `{ ok: false }` and NOT as a ratio of 0: two images of
 * different dimensions have no meaningful ratio, and 0 is the value that means "identical".
 * Collapsing them would turn a broken screenshot into a passing comparison.
 *
 * BOUNDS: no module state, no clock. Takes the page as an argument.
 */
import { CHANNEL_DELTA } from './baselineComparison.mjs';

/**
 * The fraction of differing pixels between two PNG data URLs, measured in `page`.
 *
 * Returns `{ ok: true, total, differing, ratio }` or `{ ok: false, reason }`. It never returns
 * a ratio it could not measure — the caller turns `ok: false` into the `unreadable` status,
 * which is a failure of the run.
 */
export async function measureDiff(page, currentDataUrl, baselineDataUrl) {
  return page.evaluate(async ([a, b, delta]) => {
    const load = (src) => new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('image decode failed'));
      img.src = src;
    });
    let ia;
    let ib;
    try {
      [ia, ib] = await Promise.all([load(a), load(b)]);
    } catch (err) {
      return { ok: false, reason: String(err && err.message ? err.message : err) };
    }
    if (ia.width !== ib.width || ia.height !== ib.height) {
      return { ok: false, reason: `size mismatch ${ia.width}x${ia.height} vs ${ib.width}x${ib.height}` };
    }
    const w = ia.width;
    const h = ia.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const read = (img) => {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, w, h).data;
    };
    const da = read(ia);
    const db = read(ib);
    let differing = 0;
    for (let i = 0; i < da.length; i += 4) {
      if (
        Math.abs(da[i] - db[i]) > delta
        || Math.abs(da[i + 1] - db[i + 1]) > delta
        || Math.abs(da[i + 2] - db[i + 2]) > delta
      ) differing += 1;
    }
    return { ok: true, total: w * h, differing, ratio: differing / (w * h) };
  }, [currentDataUrl, baselineDataUrl, CHANNEL_DELTA]);
}
