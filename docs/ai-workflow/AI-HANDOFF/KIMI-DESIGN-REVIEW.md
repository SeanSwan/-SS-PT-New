# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** C:\tmp\swan-launch-readiness-review-packet-2026-07-26.md
**Seed:** (none)
**Tokens:** 770 in / 4074 out | **Cost:** ~$0.0634 | **Wall:** 131.7s

---

# Kimi K3 — Hostile Launch-Readiness Review: sswanstudios.com

**Verdict up front: `organic content after fixes`.** The site is not broken, but it is *unsharable*. You are about to run a YouTube acquisition campaign into a funnel where every link unfurls broken, every crawler sees a shell, and the flagship CTA dead-ends into a generic contact form. That is burning Sean's comeback story for nothing.

---

## 1. Finding-by-Finding Validation

| # | Finding | Verdict | Severity | Notes |
|---|---------|---------|----------|-------|
| 1 | Sitemap/robots point to `swanstudios.com`, stale `lastmod` 2025-01-10 | **VALID — P0** | Critical (SEO/trust) | Every canonical signal tells Google the *wrong domain is canonical*. You risk indexing a domain you don't control the narrative on, or splitting authority. Stale `lastmod` says "abandoned." |
| 2 | No canonical URLs, generic meta description on multiple pages, **relative OG image** | **VALID — P0** | Critical (conversion) | Relative OG images **do not render** on YouTube descriptions, Twitter/X, Discord, iMessage. Every shared link during the campaign unfurls as a sad gray card with "Revolutionary gamified fitness social ecosystem…" — copy that also reads as AI-generated boilerplate and actively damages premium positioning. |
| 3 | Crawler scores 46/F, sees only SPA shell | **VALID with caveat** | Critical (SEO) | **Not a false positive.** Google renders JS eventually; social/OG crawlers, LinkedIn, and most audit tools do not. For a content-driven acquisition play, first-paint HTML must carry real content and meta. |
| 4 | Two `<main>` landmarks, one H1 | **VALID — P1** | High (a11y/SEO) | Violates landmark uniqueness (WCAG 1.3.1 / 4.1.2 in practice). Screen-reader users get ambiguous navigation; crawlers get conflicting content signals. One H1 is fine. |
| 5 | Security headers on API but absent on HTML document | **VALID — P1** | High (production risk/trust) | **Not a Cloudflare false positive** — this is a config gap: API responses are likely getting headers from the app server, HTML is served via CDN/static path with no transform rule. Missing CSP on the HTML doc is the one that matters most (XSS surface). HSTS must be on the apex HTML response to count. |
| 6 | "Book your free assessment" → generic contact form; wizard not public | **VALID — P0** | Critical (conversion) | This is the single worst conversion leak in the packet. The campaign's entire CTA promise ("free assessment") routes to a form that is not an assessment. Bait-and-switch feel = trust destruction on premium-priced training. |
| 7 | Video Library renders `0 PUBLISHED VIDEOS / 0 COLLECTIONS / No Videos Found` | **VALID — P0** | Critical (trust) | You are launching a *video comeback campaign* that links to a page advertising that you have zero videos. This is self-sabotage. Either ship content or kill the route. |
| 8 | ~15-field signup before account creation | **VALID — P1** | High (conversion) | Industry data is unambiguous: every field past ~5 costs double-digit percentage completion. A premium funnel should be email → password → magic link, with progressive profiling *after* first value delivery. |
| 9 | 401 console noise for `/api/subscriptions/status` when logged out | **VALID — P2** | Medium (production risk) | Not a security hole, but it's sloppy: unauthenticated clients should never fire the request. It also fingerprint-reveals your subscription endpoint to anyone poking devtools. |
| 10 | 670KB JS entry + **reachable source map in production** | **VALID — P1** | High (production risk/perf) | The source map is the bigger problem — you're shipping your entire front-end source, comments included, to the public. 670KB entry on mobile 4G is ~2–4s of parse alone before React hydrates. |
| 11 | 414px: no horizontal overflow, ≥44px touch targets | **VALIDATED — PASS** | — | Good. Extend verification to 320px (iPhone SE 1st gen still exists) before claiming it. |

**False-positive check:** None of the findings are SPA/Cloudflare artifacts. The closest is #3, and it stands because OG/social crawlers genuinely don't execute JS. #5 is a genuine header gap, not a measurement error.

---

## 2. Severity Ranking (Impact-Weighted)

1. **P0 — Broken link unfurling + wrong-domain sitemap** (#1, #2, #3): the campaign's distribution layer is dead on arrival.
2. **P0 — CTA bait-and-switch** (#6): the funnel's terminus doesn't deliver the promise.
3. **P0 — Empty Video Library** (#7): contradicts the campaign's core message.
4. **P1 — 15-field signup** (#8): leaks whatever traffic survives the above.
5. **P1 — Source map exposure + 670KB bundle** (#10): IP leak + mobile perf.
6. **P1 — Duplicate `<main>` + missing HTML security headers** (#4, #5).
7. **P2 — 401 console noise** (#9).

### Single highest-impact improvement

**Server-inject per-route `<title>`, meta description, canonical, and absolute-URL OG tags, and fix the sitemap/robots domain — in the same deploy.** This is one workstream (edge HTML transform or prerender step), it's cheap, and it un-breaks every link Sean will share for the entire campaign. Nothing else compounds like this.

---

## 3. Smallest Safe Fix Sequence Before First YouTube CTA

Ordered so each step is independently shippable, ≤1 day each:

**Step 1 — Domain truth (config, ~30 min)**
```text
# public/robots.txt
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /admin
Sitemap: https://sswanstudios.com/sitemap.xml
```
Regenerate `sitemap.xml` against `https://sswanstudios.com`, set `lastmod` to actual deploy dates, add 301s from any live `swanstudios.com` routes if that domain is still reachable.

**Step 2 — Meta injection (the big one).** If full SSR isn't feasible this week, use a prerender pass (react-snap / Puppeteer build step) or a Cloudflare HTMLRewriter/Worker that injects per-route tags. Minimum per route:
```html
<title>Book a Free Movement Assessment | SwanStudios</title>
<meta name="description" content="[unique, human-written, ≤155 chars]">
<link rel="canonical" href="https://sswanstudios.com/store">
<meta property="og:image" content="https://sswanstudios.com/og/store.png"> <!-- ABSOLUTE -->
```
Kill the "Revolutionary gamified fitness social ecosystem" copy everywhere. Write descriptions like a human selling premium coaching.

**Step 3 — Fix the assessment CTA.** Either (a) expose the movement-analysis wizard as a public route `/assessment` with auth deferred to *after* results are shown, or (b) retitle the button "Contact us" until it is. Do not ship the campaign with the current mismatch.

**Step 4 — Video Library gate.** Publish ≥3 real videos before linking the route from nav/footer/campaign pages, or return 404 + remove links. An honest absence beats an advertised zero.

**Step 5 — Landmark + source map (one commit each).**
```tsx
// AppShell.tsx — exactly ONE <main>
<Main id="main-content">{outlet}</Main>
// The nested page component must use <section> / <div>, never <main>.
```
```js
// vite.config.ts / webpack: production
build: { sourcemap: false } // or 'hidden' + upload to Sentry, delete from CDN
```

**Step 6 — Signup triage.** Cut to: first name, email, password (3 fields). Everything else moves to post-signup onboarding steps (one component per step, keeps each file ≤300 lines). Style per Crystalline Swan tokens:
```tsx
const Field = styled.input`
  min-height: 44px; /* touch target floor — already passing at 414px, verify at 320px */
  background: ${({ theme }) => theme.colors.surface.raised};
  color: ${({ theme }) => theme.colors.text.primary}; /* verify 4.5:1 against raised surface */
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.accent.primary}; }
  @media (prefers-reduced-motion: reduce) { transition: none; }
`;
```

**Step 7 — Hygiene.** Gate `/api/subscriptions/status` behind `if (hasToken)`; split the bundle (route-level `React.lazy`, target ≤200KB initial); add CSP/HSTS/XFO/`Referrer-Policy` to HTML responses via Cloudflare Transform Rules.

---

## 4. Design-System Enforcement Checklist (for the fix PRs)

- **Dark-first Crystalline Swan:** all new surfaces pull from `theme.colors`, zero hardcoded hex. Audit the signup/wizard forms specifically — forms are where hardcoded `#fff`/`#000` leaks hide. Verify 4.5:1 on all body text and 3:1 on large text/icons against the dark surfaces.
- **styled-components only:** no inline `style={{}}`, no CSS modules creeping in.
- **Victory for any progress/transformation charts** in the campaign pages — do not hand-roll SVG line charts. Wrap `VictoryChart` in a styled container with `min-height: 44px` interactive elements and a `<table>` or visually-hidden data summary for screen readers (canvas/SVG charts are not accessible by default).
- **Responsive proof at 320/375/414/768/1024/1440/2560/3840:** 320 is the untested risk — 15-field forms and wizard steps will overflow there first. At 2560/3840, cap content at a max-width container (`~1440px`) or the hero type scale will look absurd.
- **Reduced motion:** every `framer-motion` animation and CSS transition gated:
```tsx
const shouldReduce = useReducedMotion(); // framer-motion
animate={shouldReduce ? {} : { opacity: [0, 1] }}
```
  Non-negotiable for a health-adjacent product — vestibular triggers on a fitness transformation page is a bad look.
- **≤300 lines/file:** the wizard especially — split into `WizardShell.tsx`, `steps/StepN.tsx`, `wizardMachine.ts`.

---

## 5. Marketing Asset Requirements (Truthful, No Client Likenesses)

Achievable without consent risk or fabrication:

1. **Sean's own transformation footage/photos** — swimming, training, gym b-roll. His own likeness, his own story. *All numeric claims need his factual sign-off (see §6).*
2. **Real product screen recordings** — actual UI, real (his own) data. Never mockups populated with fake clients.
3. **Founder-narrated Victory-chart progress visualizations** of *Sean's* metrics — visually on-brand, inherently truthful.
4. **Absolute-path OG images per route** (1200×630): dark Crystalline Swan background, wordmark, one-line human value prop. No stock-photo bodies, no implied "clients."
5. **Facility/space b-roll** for the comeback narrative — establishes premium positioning without people.
6. **Explicitly excluded:** client before/afters, client names, screenshots of client dashboards, testimonial quotes — none of this exists with consent on file, per the packet. Do not invent it. "No testimonials yet" is survivable; fabricated ones are an FTC problem and a brand-killer.

---

## 6. Claims Requiring Sean's Confirmation or Consent

- **All transformation specifics:** starting/current weight, body composition, timelines, any medical or health-condition language ("reversed," "cured," "off medication" — these are the dangerous ones; keep to effort/consistency framing unless documented).
- **"AI-powered personal training and nutrition planning"** (current meta description): confirm the product actually does this today, at the tier prospects will hit. If it's roadmap, the claim is deceptive advertising exposure.
- **Any client results, counts, or retention numbers** used in video scripts — requires written client consent per individual, or aggregate-anonymized framing Sean can substantiate.
- **Pricing statements in video CTAs** — store currently hides prices from logged-out users; if videos quote prices, the public store must show them or the mismatch reads as a dark pattern.
- **"Free assessment"** — confirm it's genuinely free with no card required, since that's the campaign's primary promise.

---

## Bottom Line

Gate: **organic content after fixes.** Complete Steps 1–5 (roughly 3–5 engineering days) before the first video description carries a link. The story is the asset — right now the site actively contradicts it at every touchpoint: wrong domain in the sitemap, dead OG cards, a video page with zero videos, and a CTA that doesn't deliver what it promises. Fix the distribution layer first; everything else is rounding.
