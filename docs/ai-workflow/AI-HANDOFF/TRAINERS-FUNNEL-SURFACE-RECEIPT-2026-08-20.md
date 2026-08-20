# CANONICAL SURFACE RECEIPT — the trainer funnel

> ## ✅ RESOLVED — Sean chose **option C**, and it is built (2026-08-20)
>
> Sean, same day: *"I wanted to go ahead and choose c, your recommendation, and everything else you recommend as well as the colors that you recommend too as well."*
>
> **Shipped:** the contact API now carries the declared intent, so a trainer inquiry lands in the CRM tagged **`prism:intent:trainer`** instead of only as prose in `Lead.notes`. Both contact forms send it; the vocabulary has one definition shared by both public funnels; the value is allowlisted server-side. `GET /api/leads/stats` returns a **`byIntent`** tally beside the existing `byChannel` one, computed from rows that endpoint already fetches — so the count is free, not a new query. The new page's second door is wired to `/contact?intent=trainer` and the gate fails if it regresses.
>
> **One inch short, deliberately.** No UI renders `byIntent` yet. `MarketingCommandOverview.tsx` already fetches this exact response and already renders `byChannel` in the same shape, so the tile is a small mirror — but it is a design-placement call in a file near the 300-line cap, and building it blind is the failure this project keeps paying for. **That is the recommended next slice**, not an oversight.
>
> **Not** done, deliberately: option **A** (no live UX change — he chose C) and option **B** (`/trainers` page — still gated on his approval of a build). `HomePage.V4` untouched.
>
> The findings below are preserved **as written at the time of discovery.** Individual claims that C has since resolved are marked inline — history is annotated, not rewritten.

**Corrects §8 item 3 of `FRONT-PAGE-MASTER-HANDOFF-2026-08-20.md`.** Read this before building `/trainers`.

- **Date:** 2026-08-20 · **Author:** Claude Opus 5 · **Worktree:** `c:/tmp/sspt-atelier-studio` @ `feat/front-page-atelier-run`
- **Branch freshness:** **5 behind** `origin/main` as of `dd319fd88` (2026-08-19 20:21) — verified via `git rev-list --left-right --count origin/main...HEAD`, not assumed. This base is current; re-run the command rather than trusting this line, the *ahead* count moves with every commit including the ones that wrote this receipt.
- **No runtime file was modified to produce this receipt** (the investigation was read-only). Option C shipped afterwards, in separate commits — see the RESOLVED banner above.

---

## 1 · THE CORRECTION

The master handoff states:

> *"`main-routes.tsx:388` is the only public signup route and `OptimizedSignupModal` offers no trainer role… The highest-value click on the new page currently lands a professional in a client signup form."*

**The first half is true. The conclusion is false.** No trainer CTA on the live site points at the signup form.

| Handoff claim | Verified reality |
|---|---|
| Trainer click "lands in a *client* signup form" | ❌ **False.** Every trainer CTA routes to `/contact`. |
| No public `/trainers` route exists | ✅ True — `grep` over `main-routes.tsx` returns zero (control: 20+ `trainer` hits in the same file, so the probe works). |
| `OptimizedSignupModal` offers no trainer role | ✅ True — `OptimizedSignupModal.tsx:1217-1218` offers only `user` and `client`; help text at `:1221` reads *"Trainer accounts are created by SwanStudios staff."* |
| Trainer funnel must be built from scratch | ❌ **False.** A working trainer funnel already exists: intent-carrying links → contact form → CRM lead. ⚠ But see §2c — the intent survives only as **free text in `Lead.notes`**, never as a structured tag. The funnel is complete; its *instrumentation* is not. |

**Why the conclusion is false — file:line evidence:**

| # | Evidence | Meaning |
|---|---|---|
| 1 | `HeroSection.tsx:41` — `label: 'Trainer Staff Review', to: '/contact'` | Hero trainer CTA → `/contact` |
| 2 | `TrainersSection.tsx:127` — `onClick={() => navigate('/contact')}` | Recruitment CTA → `/contact` |
| 3 | `PrismCapture.tsx:176` — `<TrainerLink to="/contact?intent=trainer">` | Prism trainer link (**pre**-capture) → `/contact` **carrying intent** |
| 4 | `PrismRefraction.tsx:132` — `<RaySecondaryLink to="/contact?intent=trainer">` | Prism trainer ray (**post**-capture success state) → same destination |
| 5 | `ContactV3.tsx:879` — `intent === 'trainer' ? 'Trainer inquiry' : …` | **This is the live one.** `/contact` mounts `ContactV3`; it reads the intent and pre-fills the subject |
| 6 | `contactpage/vnext/ContactForm.tsx:144` | Same logic, but **dormant** — playground-only, not on the public route (see §3). Listed to show the pattern is duplicated, not as live evidence. |

**Sibling sweep (Rule 54), search run and fully enumerated.** `cd frontend` first — these resolve `src/` relative to it, and without the `cd` they die with `grep: src: No such file or directory` (repo gotcha #1):
```
cd c:/tmp/sspt-atelier-studio/frontend
grep -rnE "(Become|Join|Apply|I'm a|As a).{0,30}[Tt]rainer|[Tt]rainer.{0,25}(signup|sign up|apply|join|register)" src --include=*.tsx --include=*.ts
grep -rnE "signup.{0,40}trainer|trainer.{0,40}signup" src --include=*.tsx
```
First returns 9 hits: **2 public** (`prismCopy.ts:16,23`), 7 admin/dashboard internals. Second returns **zero** — probe validated by a control of identical regex shape (`signup.{0,40}client`) which returns `GalleryPage.tsx:1282`, so the zero is real and not a broken pattern. **No trainer-adjacent link to `/signup` exists anywhere in the frontend.**

**This routing is deliberate and test-locked.** `trainerRecruitmentLinks.contract.test.ts` asserts trainer interest must NOT reach `/signup?role=trainer` — a public visitor self-registering as `trainer` is privilege escalation. Executed this session: **4/4 PASS**.

> ⚠ **Building `/signup?role=trainer` — or any public self-serve trainer role — will fail this gate, correctly.** Any `/trainers` page must terminate in a *lead*, never in a privileged account.

---

## 2 · THE REAL GAP (narrower, and it is real)

The backend already accepts a trainer intent:

```js
// backend/routes/leadCaptureRoutes.mjs:32 — AS FOUND (this literal has since moved; see below)
const INTENTS = new Set(['book', 'trainer', 'spectrum']);
```
> Post-C: the literal moved to `CAPTURE_INTENTS` in `leadCaptureShared.mjs`, and this line now reads `new Set(CAPTURE_INTENTS)` — one vocabulary shared by both public funnels, so they cannot drift into tagging the same thing differently.

It validates it, and tags the CRM lead `prism:intent:trainer` (`leadCaptureRoutes.mjs:158`). Mounted at `core/routes.mjs:762` → `POST /api/leads/capture`.

**But no frontend call site ever sends it.**

```js
// PrismCapture.tsx:149 — the ONLY submit path
void submit(value, 'spectrum');   // always 'spectrum', never 'trainer'
```

`usePrismCapture.ts:88` forwards whatever it is given; `PrismIntent` (line 14) types all three. So:

- **`intent:'trainer'` is reachable-but-unreached backend code.** No lead in the CRM can currently carry the `prism:intent:trainer` tag.
- **Both trainer touchpoints link out rather than capture**, and they fail differently:
  - **Pre-capture** (`PrismCapture.tsx:176`): the visitor has typed nothing yet, is navigated away, and must type their email into the full contact form. **Email dropped.**
  - **Post-capture** (`PrismRefraction.tsx:132`): the visitor has *already* submitted — but as `'spectrum'` (`PrismCapture.tsx:149`). They then self-identify as a trainer by clicking the ray, and we already hold their email. **Email captured, but mis-tagged `spectrum`.** We are told they are a trainer and record that they are not.
- Trainer leads are therefore indistinguishable in the CRM from generic submissions by any structured field. **There is no subject column** — see §2c for where the signal actually lands.

**That is the actual funnel leak** — not a wrong form, but a dropped email on one path and a knowingly mis-tagged lead on the other.

### 2b · The new front page — the handoff's concern was real *here*

The handoff's phrase was *"the highest-value click **on the new page**."* That is a different surface from the live site, and on it the concern holds:

- `Main.dc.html` chapter **THE FORK** renders `IF YOU ARE A TRAINER OR A CREATOR`.
- Every link in the artboard was `href="#"`. The second door had **no destination at all** — the design said so itself, in-artboard: *"⚠ The second door has no destination yet — /trainers capture funnel is a hard dependency (F5)."*

> **✅ RESOLVED by option C.** The door is now `href="/contact?intent=trainer"`, the stale F5 note is replaced by one describing the real destination, and `gate-8run.mjs` asserts the **href attribute** (proven to fail by injecting the regression — an earlier version of that check matched the explanatory prose instead of the link and false-passed).

So the new page's trainer door is genuinely undestined. What is wrong is only the *inference* about where it would land. It would not fall back to the client signup form; a working, intent-carrying destination already exists and is one `to=` away.

### 2c · Where the trainer signal actually ends up

Traced to the database, because "the intent is carried" is worth nothing if it dies at the API boundary. It nearly does:

- `contactRoutes.mjs:152` accepts **only** `{ name, email, message, consultationType, priority }`. There is **no `subject` field and no `intent` field** in the contact API.
- Both forms survive this by folding the subject into the message text — `ContactV3.tsx:925` and `ContactForm.tsx:187`, identically:
  ```js
  message: message + (subject ? `\n\nSubject: ${subject}` : ''),
  ```
- The submission then reaches `captureLeadFromContact` (`contactRoutes.mjs:209`), so a CRM lead **is** created.
- That message becomes the lead's **`notes`** column verbatim — `leadCaptureService.mjs:92`, `notes: formData?.message || null`.

**Net:** a trainer inquiry does land in the CRM, but its only trainer marker is the literal string `Subject: Trainer inquiry` sitting inside `Lead.notes`. It is **not** a tag, not a field, not an enum — it is prose in a free-text column. Counting trainer leads today requires a full-text scan of `notes`, and any wording change silently breaks the count. Meanwhile `prism:intent:trainer` — the structured tag built for exactly this, already validated and written by the capture route — has zero senders.

> **✅ RESOLVED by option C.** `captureLeadFromContact` now accepts an allowlisted `intent` and folds `prism:intent:trainer` into `contactTags`, so the tag lands on both new and repeat leads through the path that was already there. The signal is a queryable JSONB tag, not prose. The `notes` text still carries the subject line as before — nothing was removed, a structured field was added alongside it.

> Note for whoever implements option C: `Lead` has **no metadata column** (`leadCaptureService.mjs:167`, citing rule 58). `tags` is the only structured channel available, which is why the capture route uses `mergeLeadTags`. Option C therefore means threading `intent` through the contact API (`contactRoutes.mjs:152` currently drops it) and tagging via the same helper — a small backend change plus one frontend field, **not** a pure frontend edit. It is invisible to users, but it is not free.

That is the sharpest form of the finding: **the structured channel exists and is empty; the signal travels as free text in a comment box.**

---

## 3 · SURFACE CLASSIFICATION (Rule 27)

| Surface | Path | Class | Evidence |
|---|---|---|---|
| Public lead capture API | `backend/routes/leadCaptureRoutes.mjs` | **canonical** | mounted `core/routes.mjs:762`; flag `PRISM_CAPTURE_ENABLED` |
| Prism capture UI | `components/marketing/PrismCapture/` | **canonical** | mounted in `HomePage.V4.tsx:75`, `HomeVNext.tsx:62` |
| Contact intake (V3) | `pages/contactpage/ContactV3.tsx` | **canonical** | `main-routes.tsx:396` mounts `ContactPage` → lazy-loads `ContactV3` at `:90` (`ContactV2` is the error fallback at `:92`) |
| Contact intake (vNext) | `pages/contactpage/vnext/ContactForm.tsx` | **dormant (playground-only)** | reachable only via `DesignPlayground/playgroundRegistry.ts:52` → `ContactVNext.tsx:17`. **Not** on the public route. |
| Prism trainer ray (post-capture) | `PrismRefraction.tsx:132` | **canonical** | rendered in the success state |
| `intent:'trainer'` branch | `leadCaptureShared.mjs` `CAPTURE_INTENTS` | **canonical** *(was dormant)* | now the shared vocabulary for BOTH funnels; the contact path sends it via `contactRoutes.mjs` → `captureLeadFromContact` |
| `/trainers` route | — | **does not exist** | zero matches, probe validated |
| New page's second door | `Main.dc.html`, THE FORK | **wired (design only)** | `href="/contact?intent=trainer"`, gated; still a design artboard, not shipped UI |
| Trainer self-signup | — | **prohibited** | contract test, 4/4 PASS |

---

## 4 · OPTIONS FOR SEAN — this is a scope call, not an engineering one

**A · Capture inline (smallest).** Trainer ray opens the same email field and posts `intent:'trainer'` instead of navigating away. Activates the dormant tag; stops discarding the email. Touches one file. ⚠ Changes **live** UX — `HomePage.V4` mounts `PrismCapture`.

**B · Build `/trainers` (handoff's original).** A real recruitment landing page — the 15% / $1,000-cap economics, "your clients stay yours," then the email field posting `intent:'trainer'`. Gives the new front page a genuine second door. Larger; needs design; must terminate in a lead, never an account.

**C · Leave routing, fix tagging only.** Keep both link-outs; make `/contact?intent=trainer` submissions carry `prism:intent:trainer` into the CRM. Zero visible change, restores attribution. Smallest possible. Strongest on the **post-capture** path, where the visitor has already told us they are a trainer and we record `spectrum` anyway.

**Recommended: C now, B when the front page is approved.** C is invisible and reversible and makes trainer leads countable — which is what tells you whether B is worth building. A changes live UX for a funnel whose volume is currently unmeasured. Building B first means designing a recruitment page without knowing how many trainers ever knock.

**Whichever is chosen, the new page's second door needs a `to=`** — that is one line once the destination is decided, and it is the same decision as A/B/C, not a separate one.

---

## 5 · WHAT I VERIFIED, AND HOW

**Every command below was executed this session. Paths are repo-root-relative and run from `c:/tmp/sspt-atelier-studio` unless the command itself `cd`s** — the one block that needs a different directory says so, because an earlier draft of this table shipped commands that errored from root and hostile round 6 caught it.

| Check | Command | Result |
|---|---|---|
| No `/trainers` route | `grep -rn "trainers" frontend/src/routes/main-routes.tsx` | 0 hits |
| ↳ probe validated | same file, `grep -in "trainer"` | 20+ hits → the zero above is real, not a broken probe |
| Signup roles | `grep -n 'option value=' frontend/src/pages/OptimizedSignupModal.tsx` | only `user` (`:1217`), `client` (`:1218`) |
| Capture mounted | `grep -rn leadCaptureRoutes backend/core/routes.mjs` | `:256` import, `:762` mount |
| Intent senders | `grep -n "submit(" PrismCapture.tsx` | one call, `'spectrum'` |
| Contract test | 4 assertions executed directly via node | **4/4 PASS** |
| Branch freshness | `git rev-list --left-right --count origin/main...HEAD` | `5` behind (ahead count drifts per commit — re-run, don't cite) |
| Contact API fields | `grep -n "req.body" backend/routes/contactRoutes.mjs` | no `subject`, no `intent` |
| Subject survives as text | `ContactV3.tsx:925`, `ContactForm.tsx:187` | folded into `message` |
| Lead actually created | `contactRoutes.mjs:209` | `captureLeadFromContact` reached |
| Every cited line number | `grep -n` on each symbol individually | **3 of my own citations were wrong — corrected** |

**Citation correction (hostile round 2, on my own work).** My first draft cited `OptimizedSignupModal.tsx:1215-1216`, `leadCaptureRoutes.mjs:33`, and `leadCaptureRoutes.mjs:163` from unnumbered `head`/`sed` output — I inferred the numbers instead of asking for them. All three were wrong (true: `:1217-1218`, `:32`, `:158`). Corrected by `grep -n` on each symbol. Noted rather than quietly fixed, because this receipt exists to correct a document that was confidently wrong, and it would be worth nothing if it repeated the method that produced the error.

**And then I repeated it.** Round 2 fixed the bad line numbers *in §2* and I moved on. Round 10 found `leadCaptureRoutes.mjs:33` still sitting in the §3 table — the same wrong number, in the same document, two sections below the paragraph I had just written about getting line numbers wrong. I had fixed the instance I was looking at instead of sweeping for siblings, which is Rule 20 and is the specific discipline this repo already has a rule for. The fix that finally worked was mechanical, not resolutional: sweep every wrong citation across `docs/` and confirm zero *live* hits remain. Re-running that sweep is cheaper than re-reading the document.

⚠ **A naive `grep -rn "leadCaptureRoutes.mjs:33" docs/` reports hits and looks like a defect. It is not** — this section quotes the wrong numbers on purpose. My first attempt at documenting the sweep tried to skip-list those paragraphs and *still* failed, because the skip-list paragraph itself contains the strings. A skip-list rots on the next edit. Scope structurally instead — sweep only the claim region (§1–§4), never the meta region:

```
cd c:/tmp/sspt-atelier-studio
python -c "
import io
p='docs/ai-workflow/AI-HANDOFF/TRAINERS-FUNNEL-SURFACE-RECEIPT-2026-08-20.md'
ls=io.open(p,encoding='utf-8').read().split(chr(10))
claims=ls[:next(i for i,l in enumerate(ls) if l.startswith('## 5'))]
for b in ['leadCaptureRoutes.mjs:33','leadCaptureRoutes.mjs:163','OptimizedSignupModal.tsx:1215']:
    print(b, [i+1 for i,l in enumerate(claims) if b in l] or 'clean')
print('CONTROL :32 ->', [i+1 for i,l in enumerate(claims) if 'leadCaptureRoutes.mjs:32' in l])
"
```
Expect `clean` on all three, and a **non-empty** CONTROL — the control is what proves the sweep can see claim-region citations at all, so the three zeros mean absence rather than a broken filter. Verified this session: all clean, control `[56, 117]`. This was the third time in one session that an alarming count came from an imprecise instrument rather than a real defect, which is why the control line is not optional.

**Test-delta disclosure:** no test was written, modified, or re-anchored. The 4/4 above is the *existing* contract test's own assertions, executed unchanged. `vitest` cannot run in this worktree — no `node_modules` — so the assertions were executed directly in node against the same source files by the same `readFileSync` + substring logic. This is the test's actual mechanism, not a re-implementation of its intent.

**Not verified:** no browser journey, no live API call. `PRISM_CAPTURE_ENABLED` state in production is **unknown** — the endpoint 404s when off, so the funnel may be dark right now. Check before valuing any option above.
