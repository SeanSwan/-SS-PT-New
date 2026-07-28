# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** .ai-workflow/fusion/orig-site-prompt.md
**Seed:** (none)
**Tokens:** 2466 in / 8037 out · **Cost:** ~$0.1280 · **Wall:** 258.2s

---

# Kimi K3 Review: SwanStudios Transformation Prompt
## Verdict up front

This is a strong **operations brief wearing a design brief's clothes**. As a production-safety framework for dashboards and workflows, it's genuinely excellent. As a brief for the homepage, about page, and contact page — the three pages that *are* the brand — it's missing the entire layer that makes marketing surfaces convert: **narrative, emotion, motion language, and a codified Crystalline Swan identity**. It says "block generic design" but gives the AI zero material to be non-generic *with*. An AI told "be premium" with no brand system will produce dark-mode-glassmorphism-gradient slop. Every time.

---

## ✅ What It Gets Right (keep all of this)

- **Piece-by-piece, production-safe sequencing.** No big-bang redesign. Correct.
- **Caller-path-first rule.** "Start from the real user path" is the single best line in the doc.
- **Revenue-first ordering.** Homepage in Phase 1 is correct.
- **Output discipline.** Findings → plan → changes → verification → risks. Keep forever.
- **Fix-now vs phase-later separation.** Prevents scope explosion.
- **The per-surface task prompt template.** Real scaffolding, not vibes.
- **Rule #6's *intent*.** Anti-generic is the right instinct — it's just unarmed.

---

## ⚠️ Where It Fails Home / About / Contact

1. **The Crystalline Swan is never mentioned.** Your #1 brand asset — the design lens that makes SwanStudios look like *SwanStudios* — appears nowhere in the brief. This is the fatal gap. The brief must *codify* the lens: palette, materials, motion, typography, motifs.
2. **No narrative architecture.** These three pages are a *scroll story*, not surfaces to audit. The doc has no concept of hook → tension → proof → invitation. Dashboards get audited; stories get *directed*.
3. **No emotional targets.** The doc defines business goals (onboard, sell) but never defines what a visitor must *feel* at each scroll depth. Emotion is the conversion mechanism.
4. **No signature-moment thinking.** The doc's "every tab, enterprise quality" uniformity actually flattens ambition. Premium marketing pages need **one unforgettable peak per page**, not consistent adequacy.
5. **No motion spec, no performance budget.** "Premium" on the modern web is 60% motion choreography. Nothing on easing, duration, scroll-driven reveal, `prefers-reduced-motion` fallbacks, LCP/CLS/INP budgets. Performance appears only in Phase 6 polish — for animation-heavy pages, that's way too late.
6. **SEO is Phase 4 — but these pages ARE the SEO foundation.** Schema (Organization, Person, LocalBusiness), OG images, E-E-A-T on About, Core Web Vitals. Must be baked into the build, not bolted on.
7. **"Preserve mobile usability" is defensive.** Fitness discovery traffic is majority mobile. The brief must say **mobile-first storytelling, thumb-zone CTAs, sticky mobile CTA, reduced motion complexity on small screens**.
8. **No offer clarity requirement.** A homepage can't convert if the brief doesn't force the decision: *one primary offer, one primary CTA* — book a call? apply? buy a package? This is a pre-design blocker and the doc never asks for it.
9. **No instrumentation.** How do we know the new homepage works? Scroll depth, CTA click-through, form completion, voice-note usage. The brief never demands measurement, so redesigns ship unfalsifiable.
10. **No copy/voice guidelines.** Premium design dies on generic copy. Sean's voice — precise, warm, zero fitness-bro cliché — must be a written rule.
11. **Home/About/Contact are treated as three pages. They're one funnel.** Home hooks → About builds trust → Contact converts. The brief should design them as a **trilogy** with a shared motif that hands off between pages.

---

## 🔮 The Upgrade: The Marketing Surfaces Addendum

Add this layer *on top of* the existing doc. Keep the operating rules; add the story layer.

### 1. Codify the Crystalline Swan lens (so "premium" is constrained, not vibes)
- **Materials:** cut crystal, refracted light, deep-space violet/indigo base, ice-blue highlights, opalescent gradients (violet → cyan → white), **one warm accent (gold or rose) reserved exclusively for CTAs**. Restraint = premium.
- **Motion law: "Glide, don't bounce."** Swans glide; crystal refracts. Long ease-out curves (400–900ms), staggered reveals (60–90ms), light-like transitions. No springy cartoon physics on marketing pages (springs belong in the app's gamification layer).
- **Signature motif:** *the facet* — crystal shards that assemble into the swan mark, and *the Light Thread* — a refracted beam that travels down the page with scroll and visually hands off between the three pages.
- **Typography:** one display face + one utilitarian grotesque, display sizes 80–140px desktop, tight tracking, ruthless whitespace.
- **Action:** audit the existing theme/tokens in the codebase; whatever crystalline system exists gets *elevated to the marketing layer* and named in the brief.

### 2. The Trilogy framing
| Page | Role | Emotional target | Job |
|---|---|---|---|
| **Home** | The Hook | Awe → recognition → desire | Route + convert cold traffic in 5 seconds |
| **About** | The Deepener | Trust → respect → aspiration | E-E-A-T, founder myth, feed YouTube engine |
| **Contact** | The Threshold | Calm → safety → commitment | Lowest-friction conversion |

### 3. Budgets (non-negotiable, checked at every gate)
- LCP < 2.0s on 4G mobile · CLS < 0.05 · INP < 200ms
- Hero animation budgeted (canvas-first, video lazy, fonts subset)
- `prefers-reduced-motion` → static crystalline hero that is *still beautiful*
- AA contrast on every glass surface (frosted panels need scrims — glass morphism fails contrast by default)
- Full keyboard flow + focus-visible on all animated elements

### 4. Pre-design blockers (report first, per Rule #7)
1. **Offer decision:** one primary CTA. Book a call vs. apply vs. buy — pick before pixels.
2. **Asset inventory:** real transformation photos, testimonial permissions, headshots, YouTube links. No assets = no premium.
3. **Contact endpoint reality:** where does a lead *actually land* — email, CRM, Hermes? Form must verify end-to-end in production.

---

## 📄 Page Blueprints

### HOME — "The Assembly"

**Scroll story:**
1. **Hero (the peak):** Crystal shards drift in darkness and *assemble into the swan mark* as light refracts through it — canvas/WebGL on desktop, optimized lottie/canvas-lite on mobile. Headline: one bold claim about transformation. Dual CTA: **Book a Free Session** (warm gold) / **Explore the Method** (ghost). Light subtly follows cursor on desktop.
2. **The Pain:** kinetic-type empathy beat — "You're not lazy. Your plan is." Agitate, then pivot.
3. **The Method:** 3–4 crystal facet cards (Training / Nutrition / Accountability / AI Coaching). Horizontal scroll section desktop, stacked cards mobile.
4. **Proof:** transformation gallery + stat counters + testimonial wall. Real faces, real numbers, permission-secured.
5. **The Platform Tease (the moat):** "Your progress builds your world." Avatar/streak/companion preview — **no competitor can show this**. Phase-later framing: tease, don't overpromise.
6. **Offer stack preview** → routes to store.
7. **Final CTA:** full-bleed crystalline dawn. One word: **"Begin."**

**Signature moment:** *The Light Thread* — the refracted beam from the hero travels down the entire page with scroll, splitting into facets at each CTA. It makes the page feel *alive* and it continues onto About and Contact, stitching the trilogy.

**Mobile:** simplified assembly (fast, no jank), sticky bottom CTA bar after 30% scroll depth, thumb-zone targets ≥44px, reduced particle density. **Desktop:** full canvas hero, cursor refraction, horizontal method section.

**SEO/tracking:** Organization + LocalBusiness + WebSite schema, crystalline OG image, `cta_hero_click`, scroll depth 25/50/75/100, method-card engagement, final CTA conversion.

---

### ABOUT — "Two Worlds, One System"

**Scroll story:**
1. **Hero:** portrait refracted through crystal duotone. Headline on the *real differentiator*: **the coach who engineered his own AI platform.** Nobody else in fitness can say this.
2. **Origin timeline:** transformation → trainer → builder. Sticky timeline rail desktop, vertical stack mobile.
3. **Manifesto:** "What I believe" — short kinetic statements, first-person, zero third-person bio stiffness.
4. **Credentials & numbers:** certifications, client results, years. E-E-A-T fuel.
5. **The Vision:** where SwanStudios is going (Swan Coach, avatar world) — positions Sean as a *founder*, not a local trainer for hire.
6. **Content bridge:** latest YouTube embeds — feeds the organic engine directly.
7. **CTA:** "Train with me."

**Signature moment:** *The Merge* — split scene: left is Sean the coach (gym, human warmth), right is Sean the builder (code, crystal wireframes). As you scroll, the two halves converge into one portrait: **"Coach. Engineer. One system."** Ownable, true, unforgettable. Mobile: crossfade instead of parallax merge.

**SEO/tracking:** Person schema + `sameAs` (YouTube, socials), real name, OG variant. Track YouTube click-outs (that's a *win*, not a leak), timeline depth, CTA.

---

### CONTACT — "The Threshold"

Design intent: **contrast**. Home is energy; Contact is still water. Calm converts at the point of commitment.

**Structure:**
1. **Hero:** quiet crystal. "Let's talk about your goals."
2. **Three doors:** (a) **Book a free consult** (calendar embed), (b) **Apply for coaching** (qualifying flow), (c) **Quick question** (short form *or voice note*).
3. **Conversational form:** one question at a time, visible progress — not a name/email/message graveyard.
4. **Reassurance rail:** response-time promise ("I reply within 24 hours"), what-happens-next 3-step (you reach out → I reply → we talk), objection FAQ (pricing range, commitment, online vs in-person).
5. **Final beat:** the Light Thread settles into stillness around the submit button.

**Signature moment (the differentiator):** *Speak, don't type.* A **voice-note-first contact option** — record 60 seconds in-browser; the waveform *crystallizes into a swan facet* as you speak. This is Rule #14 (dictation-first) applied to a marketing surface, it feeds the real Audio Intelligence pipeline, and no competitor has it. Text fallback always, for accessibility. On mobile this is *more* natural, not less.

**Mobile:** giant record button, sticky "Book a call," doors as stacked cards. **Desktop:** conversational form + calendar side-by-side.

**SEO/tracking:** ContactPage schema + contactPoint. Track door selection, form start/complete, **voice-note usage rate**, calendar bookings. Verify end-to-end: the lead must actually land in the pipeline (email/Hermes), confirmed in production.

---

## 🏗 Build Order

1. **Foundation sprint (before any page):** crystal design tokens, motion tokens, shared primitives (LightThread, FacetCard, RevealText, CrystalButton), reduced-motion provider, font/image pipeline, schema + OG components. *Exit: tokens render in isolation, budgets measurable.*
2. **Contact first.** Smallest surface, highest conversion leverage, lowest risk. Proves the primitive system in production and opens a revenue path immediately. *Exit: lead verified end-to-end; CWV green.*
3. **Home — the flagship.** Uses everything, adds the hero canvas + Light Thread. Biggest engineering lift, biggest payoff. *Exit: LCP < 2.0s on 4G mobile with hero live; CTA events firing.*
4. **About.** Reuses timeline/reveal primitives, adds The Merge + YouTube bridge. *Exit: Person schema validates, E-E-A-T signals complete.*
5. **Measure + polish pass:** instrumentation review, CWV audit, OG previews, sitemap submit, A/B the hero headline + primary CTA copy. *This is where "premium" gets proven instead of asserted.*

Rationale: smallest-to-largest risk curve, consistent with your own Phase 1 ordering — but it front-loads the *design system* so no page ships as a one-off.

---

## 📋 Paste This Into the Master Prompt

```text
MARKETING SURFACES ADDENDUM (home / about / contact):
- These three pages are ONE funnel: Home hooks → About deepens trust → Contact converts.
  Design them as a trilogy stitched by the Light Thread motif.
- Codify the Crystalline Swan lens before designing: crystal facets, refracted light,
  opalescent violet/cyan/white, ONE warm CTA accent, display typography, motion law:
  "Glide, don't bounce" (400–900ms ease-out, 60–90ms staggers, no springs).
- Every page gets: a named scroll-story arc, an emotional target per scroll depth,
  ONE signature moment (Home: The Assembly + Light Thread / About: The Merge /
  Contact: voice-note-first "Speak, don't type"), and a single primary CTA — if the
  offer isn't crisp, report it as a blocker before pixels.
- Budgets are gates, not polish: LCP < 2.0s on 4G mobile, CLS < 0.05, INP < 200ms,
  prefers-reduced-motion static variant that still looks premium, AA contrast on all
  glass (use scrims), full keyboard flow.
- Bake in SEO now: Organization/LocalBusiness (home), Person + sameAs (about),
  ContactPage (contact), per-page OG images, sitemap.
- Instrument everything: scroll depth, CTA clicks, form start/complete, voice-note
  usage, calendar bookings. Verify leads land in the real pipeline end-to-end.
- Copy voice: confident, precise, warm, first-person, zero fitness-bro clichés.
```

---

**Bottom line:** the original doc protects the machine. This upgrade makes the storefront *unmissable*. Keep the operating rules verbatim, bolt on the story layer, and the trilogy becomes the sharpest expression of the Crystalline Swan lens — a homepage that assembles itself out of light, an about page only Sean could own, and a contact page where people literally *speak* their goals into the crystal.
