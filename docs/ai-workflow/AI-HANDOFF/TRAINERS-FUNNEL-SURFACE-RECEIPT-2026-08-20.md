# CANONICAL SURFACE RECEIPT — the trainer funnel

**Corrects §8 item 3 of `FRONT-PAGE-MASTER-HANDOFF-2026-08-20.md`.** Read this before building `/trainers`.

- **Date:** 2026-08-20 · **Author:** Claude Opus 5 · **Worktree:** `c:/tmp/sspt-atelier-studio` @ `feat/front-page-atelier-run`
- **Branch freshness:** 5 behind / 20 ahead of `origin/main` (verified, not assumed) — this base is current.
- **Nothing shipped. No runtime file was modified to produce this receipt.**

---

## 1 · THE CORRECTION

The master handoff states:

> *"`main-routes.tsx:388` is the only public signup route and `OptimizedSignupModal` offers no trainer role… The highest-value click on the new page currently lands a professional in a client signup form."*

**The first half is true. The conclusion is false.** No trainer CTA on the live site points at the signup form.

| Handoff claim | Verified reality |
|---|---|
| Trainer click "lands in a *client* signup form" | ❌ **False.** Every trainer CTA routes to `/contact`. |
| No public `/trainers` route exists | ✅ True — `grep` over `main-routes.tsx` returns zero (control: 20+ `trainer` hits in the same file, so the probe works). |
| `OptimizedSignupModal` offers no trainer role | ✅ True — `OptimizedSignupModal.tsx:1215-1216` offers only `user` and `client`. |
| Trainer funnel must be built from scratch | ❌ **False.** An intent-tagged trainer funnel already exists end to end. |

**Why the conclusion is false — file:line evidence:**

| # | Evidence | Meaning |
|---|---|---|
| 1 | `HeroSection.tsx:41` — `label: 'Trainer Staff Review', to: '/contact'` | Hero trainer CTA → `/contact` |
| 2 | `TrainersSection.tsx:127` — `onClick={() => navigate('/contact')}` | Recruitment CTA → `/contact` |
| 3 | `PrismCapture.tsx:176` — `<TrainerLink to="/contact?intent=trainer">` | Prism trainer ray → `/contact` **carrying intent** |
| 4 | `ContactV3.tsx:879` — `intent === 'trainer' ? 'Trainer inquiry' : …` | Contact page **reads** the intent, pre-fills the subject |
| 5 | `contactpage/vnext/ContactForm.tsx:144` | Same, on the vNext form |

**This routing is deliberate and test-locked.** `trainerRecruitmentLinks.contract.test.ts` asserts trainer interest must NOT reach `/signup?role=trainer` — a public visitor self-registering as `trainer` is privilege escalation. Executed this session: **4/4 PASS**.

> ⚠ **Building `/signup?role=trainer` — or any public self-serve trainer role — will fail this gate, correctly.** Any `/trainers` page must terminate in a *lead*, never in a privileged account.

---

## 2 · THE REAL GAP (narrower, and it is real)

The backend already accepts a trainer intent:

```js
// backend/routes/leadCaptureRoutes.mjs:33
const INTENTS = new Set(['book', 'trainer', 'spectrum']);
```

It validates it, and tags the CRM lead `prism:intent:trainer` (`leadCaptureRoutes.mjs:163`). Mounted at `core/routes.mjs:762` → `POST /api/leads/capture`.

**But no frontend call site ever sends it.**

```js
// PrismCapture.tsx:148-149 — the ONLY submit path
const onSubmit = (value: string) => {
  void submit(value, 'spectrum');   // ← always 'spectrum', never 'trainer'
};
```

`usePrismCapture.ts:88` forwards whatever it is given; `PrismIntent` (line 14) types all three. So:

- **`intent:'trainer'` is reachable-but-unreached backend code.** No lead in the CRM can currently carry the `prism:intent:trainer` tag.
- **The trainer ray is a link-out, not a capture.** A trainer who clicks "I'm a trainer" is *navigated away* and must retype their email into the full contact form. The highest-intent click on the page is the one that discards the most.
- Trainer leads are therefore indistinguishable in the CRM from generic contact submissions, except by subject-line text.

**That is the actual funnel leak** — not a wrong form, but a dropped email and an untagged lead.

---

## 3 · SURFACE CLASSIFICATION (Rule 27)

| Surface | Path | Class | Evidence |
|---|---|---|---|
| Public lead capture API | `backend/routes/leadCaptureRoutes.mjs` | **canonical** | mounted `core/routes.mjs:762`; flag `PRISM_CAPTURE_ENABLED` |
| Prism capture UI | `components/marketing/PrismCapture/` | **canonical** | mounted in `HomePage.V4.tsx:75`, `HomeVNext.tsx:62` |
| Contact intake (V3) | `pages/contactpage/ContactV3.tsx` | **canonical** | reads `?intent=` at :878 |
| Contact intake (vNext) | `pages/contactpage/vnext/ContactForm.tsx` | **competing/ambiguous** | duplicate intent-seeding logic at :143 — two forms, one contract |
| `intent:'trainer'` branch | `leadCaptureRoutes.mjs:33` | **dormant** | validated + tagged, **zero senders** |
| `/trainers` route | — | **does not exist** | zero matches, probe validated |
| Trainer self-signup | — | **prohibited** | contract test, 4/4 PASS |

---

## 4 · OPTIONS FOR SEAN — this is a scope call, not an engineering one

**A · Capture inline (smallest).** Trainer ray opens the same email field and posts `intent:'trainer'` instead of navigating away. Activates the dormant tag; stops discarding the email. Touches one file. ⚠ Changes **live** UX — `HomePage.V4` mounts `PrismCapture`.

**B · Build `/trainers` (handoff's original).** A real recruitment landing page — the 15% / $1,000-cap economics, "your clients stay yours," then the email field posting `intent:'trainer'`. Gives the new front page a genuine second door. Larger; needs design; must terminate in a lead, never an account.

**C · Leave routing, fix tagging only.** Keep the link-out; make `/contact?intent=trainer` submissions carry `prism:intent:trainer` into the CRM. Zero visible change, restores attribution. Smallest possible.

**Recommended: C now, B when the front page is approved.** C is invisible and reversible and makes trainer leads countable — which is what tells you whether B is worth building. A changes live UX for a funnel whose volume is currently unmeasured.

---

## 5 · WHAT I VERIFIED, AND HOW

| Check | Command | Result |
|---|---|---|
| No `/trainers` route | `grep -rn "trainers" frontend/src/routes/main-routes.tsx` | 0 hits |
| ↳ probe validated | same file, `grep -in "trainer"` | 20+ hits → the zero above is real, not a broken probe |
| Signup roles | `sed -n '1205,1230p' OptimizedSignupModal.tsx` | only `user`, `client` |
| Capture mounted | `grep -rn leadCaptureRoutes backend/core/routes.mjs` | `:256` import, `:762` mount |
| Intent senders | `grep -n "submit(" PrismCapture.tsx` | one call, `'spectrum'` |
| Contract test | 4 assertions executed directly via node | **4/4 PASS** |
| Branch freshness | `git rev-list --left-right --count origin/main...HEAD` | `5  20` |

**Test-delta disclosure:** no test was written, modified, or re-anchored. The 4/4 above is the *existing* contract test's own assertions, executed unchanged. `vitest` cannot run in this worktree — no `node_modules` — so the assertions were executed directly in node against the same source files by the same `readFileSync` + substring logic. This is the test's actual mechanism, not a re-implementation of its intent.

**Not verified:** no browser journey, no live API call. `PRISM_CAPTURE_ENABLED` state in production is **unknown** — the endpoint 404s when off, so the funnel may be dark right now. Check before valuing any option above.
