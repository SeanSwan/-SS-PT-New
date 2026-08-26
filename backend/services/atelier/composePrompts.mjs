/**
 * composePrompts.mjs — turning a brief or a taste corpus into the prompts a lane runs.
 *
 * Split from composeStills at the 300-line cap. It is the last thing in that file that was
 * not orchestration, and it is the half that a review round found drifting from its async
 * twin twice — so it is worth being a named unit that someone can diff against
 * localBatchRunner rather than a paragraph in the middle of a longer function.
 */

import { promptsFromBrief, promptsFromTaste, LAW_PROFILES } from './promptSources.mjs';
import { applyBrandKit } from '../../../shared/brandKits/registry.mjs';
import { capabilities as hostedCaps } from '../../../shared/providers/openrouterModels.mjs';
import { seedFor } from './composeLimits.mjs';
import * as local from './localStillLane.mjs';

/** @returns {{ prompts: any[], tasteMeta: object }} */
export async function buildPrompts({ promptSource, brief, req, kit, lawProfile, count, key, lane, model, compiler, env, tasteDeps }) {
  let prompts; let tasteMeta = {};
    if (promptSource === 'taste') {
    // Judged by the KIT's own laws, not the merged ones. The override may relax what the
    // COMPILER enforces, but the taste corpus is Swan's and the laws that guard it are
    // not a request parameter — otherwise the refusal above is closed while the judging
    // behind it stays open.
    const t = await promptsFromTaste({ count, aspect: brief.aspect || req.aspect, seed: seedFor(key, 0), cinematic: !!req.cinematic, mode: req.mode, lawProfile: kit.lawProfileFromKit }, { env, ...tasteDeps });
    prompts = t.prompts; tasteMeta = { tasteSeed: t.tasteSeed, lawRejected: t.lawRejected, tasteDropped: t.dropped,
      // The profile that actually JUDGED, not the merged one. Reporting the override
      // here while judging by the kit made the metadata disagree with the decision it
      // was describing — and metadata is read precisely when someone is asking why.
      lawProfile: kit.lawProfileFromKit };
    } else {
    const caps = lane === 'hosted' ? hostedCaps(model) : { provider: local.STILL_PROVIDER, promptStyle: 'sentence' };
    // Kit language joins HERE, after the length gate, so the limit judges the operator's
    // own words rather than the brand's.
    // The kit may REPLACE the compiler's hardcoded kill-list, which is a Swan kill-list.
    // Dropping Swan's laws was only half of "render for another site" — the negatives
    // rode along regardless. An explicit caller override still wins, same as lawProfile.
    const b = promptsFromBrief({
      ...brief,
      // The top-level aspect overrides the brief's, exactly as the taste path already
      // reads it. Without this the key hashed a field the output ignored, so two
      // identical images got different keys and never coalesced.
      aspect: brief.aspect || req.aspect,
      text: applyBrandKit(brief.text, kit),
      slotOverrides: {
        ...(kit.negativeSlot ? { negative: kit.negativeSlot } : {}),
        ...(brief.slotOverrides || {}),
      },
      // The laws this brand is NOT judged by. Without this the compiler applied every
      // law to every brand, and a non-Swan site could not render a creature — LAW4
      // exists to protect the Swan mark and means nothing to anyone else.
      lawProfileDrop: LAW_PROFILES[lawProfile] || [],
    }, caps, count, compiler);
    prompts = b.prompts.map((p) => ({ ...p, compiled: b.compiled }));
    }
  return { prompts, tasteMeta };
}
