/**
 * catalogue.mjs — the brand kits the Atelier can render for. DATA, not behaviour.
 * ============================================================================
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * The studio was asked to serve the OTHER websites Sean builds, not only
 * SwanStudios. Until now `workspaceId` was accepted by every endpoint, threaded
 * through every service, and used for exactly one thing: a free-text tag on the
 * asset row (`workspace:whatever-you-typed`). Nothing validated it and nothing
 * READ it, so a render for another site was judged by SwanStudios' brand laws
 * and dressed in SwanStudios' palette. A workspace that changes nothing about
 * the output is a label, not a workspace.
 *
 * A brand kit is the answer to "what does this site look like, and which rules
 * judge it". Picking one changes the prompt and the law profile; that is the
 * whole point, and it is why this is data rather than a dropdown.
 *
 * ── MIRRORS THE PROVIDER CATALOGUE DELIBERATELY ────────────────────────────
 * Same split the video and image lanes already prove: this file is DATA (which
 * brands exist, what each looks like), `registry.mjs` next door is BEHAVIOUR.
 * Adding a site must never mean editing selection or prompt code.
 *
 * ── WHY A MODULE AND NOT A TABLE ───────────────────────────────────────────
 * A brand kit is a decision about how work should look, made once and reviewed
 * like code. It is not user data. Giving it a table would mean a migration, a
 * CRUD surface, and an audit story for something that changes when Sean starts a
 * new site — a few times a year, by editing one object. If brand kits ever
 * become per-tenant and user-editable, THAT is the trigger for a table; it is
 * not this slice, and it is not close.
 *
 * ── WHAT IS DELIBERATELY NOT HERE ──────────────────────────────────────────
 * Only two kits ship: `swanstudios`, whose palette and laws are already written
 * down and verifiable, and `universal`, which is deliberately neutral. Sean's
 * other sites are NOT invented here. A brand kit is a claim about how someone's
 * brand looks, and guessing one would put fabricated art direction in front of a
 * model with Sean's name on the output. Adding a real one is the object below
 * plus his answers — see `docs/ai-workflow/brainstorms/` when that grill happens.
 *
 * ── PALETTE IS WORDS, NOT HEX ──────────────────────────────────────────────
 * A diffusion model reads "midnight sapphire, ice-wing cyan glow" and cannot do
 * anything with `#002060`. The hex values stay in the design system where the
 * CSS needs them; what lives here is the language a model can act on. Keeping
 * both would be two sources of truth for one palette, and the drift would be
 * silent — the render would simply look slightly wrong forever.
 */

/** @typedef {'full'|'universal'} LawProfileId */

export const DEFAULT_BRAND_KIT = 'swanstudios';

export const BRAND_KITS = Object.freeze({
  swanstudios: Object.freeze({
    id: 'swanstudios',
    name: 'SwanStudios',
    // `full` keeps every law, including the three that are SwanStudios-specific:
    // the gold allowlist, the banned-facet list, and optics-not-creatures. Those
    // laws exist to protect THIS brand and are wrong for anyone else's.
    lawProfile: 'full',
    aspectDefault: '16:9',
    // Read by a model, so these are the palette's NAMES, not its hex codes.
    // NO GOLD HERE, DELIBERATELY, AND IT COST A TEST TO LEARN IT. The first draft of
    // this kit listed "gilded fern gold used sparingly" — the palette does contain it —
    // and every single brief was then refused by LAW2, the gold allowlist. The law was
    // right and the kit was wrong: gold is permitted in four UI places (PR numeral and
    // delta, hairline filigree, focus ring, one badge), none of which is a subject in a
    // generated image. A palette entry that exists for CSS is not automatically art
    // direction, and the brand's own law is the thing that knows the difference.
    paletteWords: Object.freeze([
      'midnight sapphire blue dominant', 'royal depth blue surfaces',
      'ice-wing cyan glow accents',
      'frost white highlights', 'obsidian black ground',
    ]),
    styleAnchors: Object.freeze([
      'frozen enchanted forest meeting a deep-ocean luxury vault',
      'cinematic, dark-first, high contrast',
      'crystalline refraction and cold rim light',
    ]),
    // `negativeSlot` absent = keep the compiler's own kill-list, which IS the Swan one.
    // (Not to be confused with the additive `negative` field the first draft carried and
    // which was removed for being dormant — this replaces a slot the compiler already
    // owns, so its `honorsNegativePrompt` capability gate still decides emission.)
    // NO `negative` FIELD, DELIBERATELY. The first draft carried one, and nothing
    // consumed it — a dormant field, which is the same defect class as a dormant
    // control: it looks like configuration and changes nothing. Worse, wiring it
    // naively would have BYPASSED a gate that already exists: swanPromptCompiler
    // owns the negative slot and only emits it when a provider's
    // `honorsNegativePrompt` capability is 'verified', precisely so a provider that
    // merely CLAIMS support cannot drop it silently. Brand-level negatives belong
    // behind that gate or nowhere.
  }),

  universal: Object.freeze({
    id: 'universal',
    name: 'Universal (no brand laws)',
    // Drops the three SwanStudios-specific laws. This is the profile any site
    // that is not SwanStudios should render under — judging someone else's brand
    // by Swan's gold allowlist produces refusals that mean nothing to them.
    lawProfile: 'universal',
    aspectDefault: '16:9',
    paletteWords: Object.freeze([]),
    styleAnchors: Object.freeze([]),
    // THE SIBLING THE LAW PROFILE ALONE DID NOT FIX. Dropping SwanStudios' LAWS was only
    // half the job: the compiler injects a hardcoded kill-list into every render, and its
    // own comment says those bans "are most of what separates Swan output". So a site that
    // is not SwanStudios was still forbidden literal creature form — the swan-is-never-a-
    // bird rule — and fantasy wallpaper, and glassmorphism, which are Swan taste and not
    // anyone else's. What survives here is only what is universally an artifact rather
    // than a style: a watermark and stray text are defects on any brand's image.
    negativeSlot: 'watermark, text artifacts',
  }),
});

export const BRAND_KIT_IDS = Object.freeze(Object.keys(BRAND_KITS));
