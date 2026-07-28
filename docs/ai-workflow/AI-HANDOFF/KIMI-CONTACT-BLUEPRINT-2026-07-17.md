# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** .ai-workflow/fusion/kimi-contact.md
**Seed:** (none)
**Tokens:** 1391 in / 7292 out · **Cost:** ~$0.1136 · **Wall:** 236.0s

---

# HOSTILE REVIEW — Contact Page Refactor Blueprint (ContactV3 → V4)

**(a) VERDICT: SHIP-WITH-CHANGES** — the process skeleton (flag, additive backend, slices, de-Galaxy) is correct, but the brief is conversion-blind and signature-blind on the one page whose entire job is conversion and brand impression. Two amendments are blocking before Slice 1.

---

## (b) Design weaknesses — most severe first

**1. No signature moment is specified — this is how you get Framer-template output.**
"Cinematic ScrollReveal" is the single most generic premium-web pattern alive. Every AI-generated SaaS page fades sections up on scroll. The brief invokes "the Crystallize" as the brand signature and then never assigns it to anything on this page. A contact page has exactly one emotional peak: the instant a lead hits send. Unpinned, the builder delivers parallax orbs + fade-ups + a green checkmark toast. That's a prettier corpse of the current page.

**2. Conversion is never mentioned. On a lead-capture page.**
The word "conversion" appears zero times. No field-count decision (every field past 3 costs completion), no funnel events, no measurement tied to the feature flag — so the "reversible" A/B proves nothing. You'll flip V4 on, feel good about the glow, and have no idea whether it captures more leads than V3. Reversibility without measurement is vanity engineering.

**3. The 1193-line monolith is a Galaxy-rot crime scene, and the de-Galaxy plan isn't operationalized.**
A 1193-line Galaxy-era styled-components file *will* contain hardcoded hex, duplicated styled blocks, and — near-certainly — `#00FFFF`-family fallbacks buried in `var()` calls, which the brief bans but never enforces mechanically. "Fail-closed de-Galaxy check" is a vibe until it's a CI grep. Blocking amendment: a banned-pattern gate (`#0a0a1a`, `#00FFFF`, `#7851A9`, case-insensitive, including inside `var()` fallbacks) that fails the build. Without it, Galaxy survives exactly where you banned it — in the fallbacks nobody reads.

**4. Motion is mandated but unconstrained — a jank/noise generator.**
"Full cinematic alive/scroll-story/parallax" with no budget guarantees parallax + shimmer + glow + reveal firing simultaneously, 25fps on a mid-tier Android, and — worst — parallax layers fighting the mobile keyboard's visual-viewport resize while the user is *typing in the form*. The brief demands `prefers-reduced-motion` "honored" but never specifies the reduced variant of a single effect. And the Two-Speed law is misapplied if "full cinematic" reaches the form zone itself: story above the fold, **calm in the form**. A form that moves while you type is a form that loses leads.

**5. CTA hierarchy and the accent system are unpinned.**
The submit button is the page's reason to exist and the brief never invokes **Dual-Button Glow** for it, never states primary/secondary hierarchy (scroll-to-form hero CTA vs. inline form), and never says where gold — "the rare luxury accent" — actually lands. Unpinned luxury accents become gold confetti. Pin it: primary submit = blue bg → purple glow; secondary "book a call" = purple bg → cyan glow; gold appears in exactly one place (see d).

**6. "Optics-not-creatures" is asserted but the hero visual isn't named.**
Absent a pinned concept, the builder reaches for a literal swan SVG or stock feather imagery — instant brand violation, and the most common failure mode on this exact brand. The hero must be an abstract refraction lens: a prism shard / caustic light field. Say it in the blueprint or see a bird.

---

## (c) Implementation-fidelity attacks

**File decomposition — named boundaries, since "decompose" without a map is a non-plan:**
- `ContactV4.tsx` — orchestrator, ≤180 lines
- `contactV4.styles.ts` — layout primitives, ≤240
- `components/HeroLens.tsx` ≤140 · `components/TrustLedger.tsx` ≤160 · `components/ContactForm.tsx` ≤280 · `components/CrystallizeSuccess.tsx` ≤150 · `components/ScrollStory.tsx` ≤220
- `hooks/useContactSubmit.ts` (state machine: `idle → validating → submitting → success | error`) ≤120 · `hooks/useScrollReveal.ts` ≤90
- `motion/contactMotion.ts` ≤110 · `copy/contactCopy.ts` ≤90

12 files, all under cap. Any builder PR with a 301st line fails review.

**styled-components correctness:** transient props only (`$glow`, `$state`) — a 1193-line legacy file almost certainly leaks props to the DOM. All color via `var(--token, #crystalline-fallback)`; a named fallback table per token, zero raw hex outside that table. No theme-via-props mixing with var() — pick the var() contract.

**Responsive demanded values the blueprint must pin:**
- **320:** padding 16px, H1 28px, parallax OFF, glow layers static at opacity 0.4, zero fixed-height story sections (the #1 overflow-x source at 320)
- **375/414:** padding 20px, H1 32px, form full-bleed
- **768:** form column 560px centered, trust strip → 2-col
- **1024:** split hero (copy left / lens right), form 600px
- **1440:** container max 1280px
- **2560/3840:** container max 1440px, content scale frozen at 1440 values — background light field scales, typography does not. Full-bleed body text at 4K is unreadable and this class of page always ships it.

**Touch/focus/a11y — concrete:** inputs min-height 48px (44 is floor, not target), submit 56px full-width on mobile, icon links 44×44. Focus-visible: 2px ice-cyan outline, 2px offset, `0 0 0 4px` cyan-at-15% halo. On submit error: focus moves to first invalid field + `role="alert"` summary; success region is `role="status"`. Labels must be real `<label>` — the monolith almost certainly uses placeholder-as-label, which fails WCAG and murders mobile UX. `autocomplete="name|email"`, `inputmode="email"` — non-negotiable on a lead form. Acceptance gate: `axe-core` clean + no nested interactives (no `<a>` in `<button>`, no onClick divs) + HTML validator pass. Contrast: body text ≥7:1 on obsidian, muted/labels ≥4.5:1 at their rendered size — ghost-gray 13px labels on obsidian fail, and this theme invites them.

**Reduced-motion spec (name it or it ships broken):** parallax→static; reveals→instant `opacity:1`; Crystallize→150ms crossfade to a static crystal glyph; error shake→border color only. All in `contactMotion.ts` behind the media query, not scattered in components.

**Backend honesty:** `POST /api/contact` is real — but honeypot/timing anti-spam and 429 rate-limit are **NEW backend surfaces** and must be flagged as such (additive middleware, flag-gated). Spec the response contract: `200 {id}`, `422 {fieldErrors}`, `429 + Retry-After` with copy. Double-submit idempotency: disable + in-flight guard, not "hope." And resolve the PII tension: this form *collects* PII by design — the blueprint needs data-minimization copy and a retention line in the privacy microcopy, or legal debt accrues.

**Language/credentials gate:** copy deck uses "26+ years / NASM-protocol" verbatim; "stretching/flexibility" only. Put both strings in the acceptance test as a literal grep — copy regressions survive code review, grep doesn't.

---

## (d) The ONE highest-impact change: **The Crystallize Submit.**

Make the success state the signature moment, because it's the only moment a contact page has. On valid submit: the form's field-borders collapse as light toward center (transform-only, `scale(0.9)→1`, 500ms, `cubic-bezier(0.22,1,0.36,1)`), a crystal shard forms and rotates 45°→0°, refracting ice-cyan→wing-purple across two 300ms stops — then **one** gold seam sweeps the facet (the page's single gold appearance), resolving into confirmation copy + the secondary booking CTA. Total 900ms, transform/opacity only, GPU-safe, fully token-driven (`--lens-*`) so Appearance Studio re-skins it. Reduced-motion: 150ms crossfade to the static glyph.

Why this wins: every competitor's contact page is interchangeable until the send. This encodes the brand promise — *effort crystallized into achievement* — at the exact conversion instant. It's the difference between a page and a SwanStudios page.

---

## (e) Where a design-savvy competitor out-builds you

- **Instrumentation:** they ship field-level funnel events (`field_focus`, `field_error`, `submit_attempt`, `crystallize_complete`, flag-exposure) and *know* V4 converts. You ship a flag with no meter.
- **Mobile conversion discipline:** `inputmode`/`autocomplete`, 48px inputs, inline validation on blur — they get the lead from the phone in the parking lot; you get a beautiful abandonment.
- **A pipeline, not a dead end:** their success state carries a response-time promise ("replies within 1 business day") and a calendar deep-link. Yours says "thanks."
- **Restraint at the form:** they keep cinema above the fold and stillness at the keyboard. Your brief, read literally, animates the surface the user is trying to type on — and loses the lead to the calm page.
- **Performance taste:** they ship <1.5s LCP while cinematic pages ship 4MB of glow PNGs and full-screen `blur(60px)`. Cap blur radii ≤24px on full-viewport layers, limit `backdrop-filter` to the form card, WebP/AVIF or pure-CSS light.

**Blocking amendments before Slice 1:** (1) pin the Crystallize Submit + Dual-Button Glow + single-gold rule into the brief; (2) add the de-Galaxy CI grep gate; (3) add the analytics event spec to the flag. Then build.
