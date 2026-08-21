/**
 * critic-fixtures.mjs — planted-defect pairs for critic calibration (S6).
 * =======================================================================
 * Split from critic.mjs to keep both files under the 300-line cap (Rule 4), and
 * because fixture DATA and cage LOGIC have no business sharing a file.
 *
 * Each pair is a clean page and a page with ONE known, deterministically
 * measurable defect, so the correct answer is known by construction rather than
 * by opinion. `expect_meter` names the meter that must FAIL on the defective
 * side — the assertion that keeps this set honest (browser.test.mjs M7).
 * Validate the set before trusting any calibration result: a defect that does
 * not actually register would certify a blind seat.
 */

const CTA = '<a data-cta style="display:inline-block;min-width:44px;min-height:44px;color:#0A0A0F;background:#60C0F0;">Book</a>';
const CLEAN_BODY = `<section data-zone="hero" style="padding:32px;background:#003080;">
  <h1 style="color:#E0ECF4;font-size:2rem;">Train with SwanStudios</h1>
  <p style="color:#E0ECF4;">Sessions from $110.</p>${CTA}</section>`;

export function plantedDefectPairs() {
  // NOTE: `main{overflow-x:clip}` is the house fix for the gummy-scroll bug, and
  // it CLIPS horizontal overflow — which silently disarmed the overflow pair's
  // own planted defect. The overflow pair therefore renders unclipped, so its
  // defect is real. Caught by the calibration-set validator (M7), which exists
  // precisely because an invisible defect would certify a blind seat.
  const page = (body) => `<style>html,body{margin:0;padding:0}main{overflow-x:clip}</style><main style="background:#0A0A0F;font-family:sans-serif;">${body}</main>`;
  const unclipped = (body) => `<style>html,body{margin:0;padding:0}</style><main style="background:#0A0A0F;font-family:sans-serif;">${body}</main>`;
  const clean = page(CLEAN_BODY);
  return [
    {
      id: 'overflow',
      expect_meter: 'browser:overflow@375',
      clean: { id: 'overflow-clean', html: unclipped(CLEAN_BODY) },
      defective: { id: 'overflow-bad', html: unclipped(`${CLEAN_BODY}<div style="width:2000px;height:20px;background:#003080;"></div>`) },
    },
    {
      id: 'contrast',
      expect_meter: 'browser:computed_contrast@375',
      clean: { id: 'contrast-clean', html: clean },
      defective: { id: 'contrast-bad', html: page(`<section data-zone="hero" style="padding:32px;background:#003080;">
        <h1 style="color:#0A3A7A;font-size:2rem;">Train with SwanStudios</h1>${CTA}</section>`) },
    },
    {
      id: 'card-sprawl',
      expect_meter: 'slop:hero_triple_card',
      clean: { id: 'sprawl-clean', html: clean },
      defective: { id: 'sprawl-bad', html: page(`<section data-zone="hero" style="padding:32px;background:#003080;">
        <h1 style="color:#E0ECF4;">Packages</h1>
        <div data-card style="color:#E0ECF4;background:#141419;padding:16px;">3 month</div>
        <div data-card style="color:#E0ECF4;background:#141419;padding:16px;">6 month</div>
        <div data-card style="color:#E0ECF4;background:#141419;padding:16px;">12 month</div>${CTA}</section>`) },
    },
    {
      id: 'infinite-motion',
      expect_meter: 'motion:infinite_above_fold@375',
      clean: { id: 'motion-clean', html: clean },
      defective: { id: 'motion-bad', html: `<style>@keyframes pulse{from{opacity:.4}to{opacity:1}}</style>${page(`${CLEAN_BODY}<div data-zone="amb" style="animation:pulse 2s linear infinite;height:60px;background:#003080;"></div>`)}` },
    },
  ];
}
