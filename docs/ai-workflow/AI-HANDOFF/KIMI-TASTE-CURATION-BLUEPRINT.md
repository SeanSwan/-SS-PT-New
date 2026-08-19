# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** ./docs/ai-workflow/brainstorms/swan-taste-curation-panel-brief-2026-08-14.md
**Seed:** (none)
**Tokens:** 1976 in / 16129 out | **Cost:** ~$0.2479 | **Wall:** 600.6s | **finish_reason:** stop

---

# KIMI K3 — HOSTILE REVIEW: Swan Brain Taste-Curation Brief

**Verdict: REJECT AS WRITTEN, APPROVE CONDITIONALLY.** §3's constraint-verification-from-live-schemas is exemplary work. But §4's BROWSE step violates this brief's own binding constraints on every touch breakpoint, and the brief builds capture infrastructure while admitting the consumption contract — the thing that determines the schema — is "unanswered." That is inverted. Detail below.

---

## 1. Weaknesses ranked by severity

| # | Sev | Weakness | What it breaks |
|---|-----|----------|----------------|
| W1 | **BLOCKER** | BROWSE is keyboard-only (`J/K/F/X/1-5/type-to-annotate`) | 44px touch floor at 320/375/414/768; WCAG 2.1.4 (single-char shortcuts); unusable on 4 of 9 mandated widths |
| W2 | **BLOCKER** | §6 Q1 (how taste enters generation) deferred while HARVEST/CAPTURE is spec'd | Ledger schema will be wrong; guaranteed re-annotation pass |
| W3 | HIGH | Local HTML gallery = shadow design system | Untokenized colors, no styled-components, no reduced-motion handling, second review UI after the brief itself says "do not invent a second one" |
| W4 | HIGH | "Motion" query angle is incoherent | `search_screens`/`search_sections` return static images. Motion cannot be harvested from screenshots. The angle list was not checked against the medium |
| W5 | HIGH | `exclude_screen_ids` caps at **100**; "repeat until he has seen everything relevant" is unbounded | Silent dedup failure past 100; `search_flows` hard-ceilings at page 20 × 10 = 200 flows. Keep-rate stats and any dwell telemetry get corrupted by dupes |
| W6 | HIGH | Falsifiability (#3) has no metric, baseline, or gate — and raw "hit rate" is a trap | If Sean keeps 15% of refs, a brain that predicts "discard everything" scores 85% and gets certified. Metric must survive class skew |
| W7 | MED | Schema gaps in the ledger row | No `schemaVersion` (brief itself demands cross-session compounding and versioning), no `sessionId`, no `predicted` (holdout impossible), no `source`, no dwell timestamps — so the "50 refs in ~2 minutes" mandate (#5) is currently **unmeasurable** |
| W8 | MED | Internal contradiction: §2 wants per-item "what specifically you like" on 50 items; #5 wants 50 refs in ~2 minutes | 50 free-text annotations cannot fit 120 seconds. One of these loses; nobody said which |
| W9 | MED | No verification mechanism for the stated constraints | Tokens, 4.5:1, reduced-motion, 44px are aspirations without CI. Worse: in `var(--token, #fallback)`, the **fallback** is what renders when token loading fails — nobody requires fallbacks to pass contrast |
| W10 | LOW | Spec drift + missing decomposition | Brief lists 9 widths (adds 1920) vs the governing 8; no breakpoint token source. No component split proving ≤300 lines. Ceiling protection (#8) has no schema home |
| W11 | HIGH | No grill exit condition (brief admits this) | "Long deep conversations" without a budget is an interrogation Sean abandons. This is §6's question; I'm converting it to a defect because a shipped gate is mandatory, not discussable |

---

## 2. Single highest-impact improvement

**Invert the sequence. Slice 0 = consumption contract, before any UI or harvest code.** W1 is the top *severity* — but its fix is prescribed and local. W2 invalidates the data layer the entire loop exists to feed. Decide the consumer first, and DISTIL, CAPTURE, and the falsification gate all become deterministic.

**Slice 0 artifact — `taste.profile.json` (the ONLY thing the router/Forge ever reads):**

```json
{
  "schemaVersion": 1,
  "updatedAt": "2025-01-01T00:00:00Z",
  "verdictCount": 0,
  "trust": "cold",
  "eval": { "cohensKappa": 0, "balancedAccuracy": 0, "holdoutSize": 0 },
  "axes": {
    "density":   { "value": -0.4, "confidence": 0.7 },
    "motion":    { "value": 0.8,  "confidence": 0.3 },
    "typography":{ "value": 0.6,  "confidence": 0.5 },
    "colour":    { "value": -0.2, "confidence": 0.6 },
    "layout":    { "value": 0.5,  "confidence": 0.4 }
  },
  "doNot": ["heavy drop shadows", "pastel gradients", "hero stock imagery"],
  "ceiling": { "cinematic": "authored-only", "workhorse": "mobbin-eligible" },
  "provenance": [
    { "refId": "mb_8123", "mobbinUrl": "https://mobbin.com/…", "whyTags": ["layout","density"] }
  ]
}
```

**Ledger row v1 — fixes W7, W8, enables W6:**


> ⛔ **SUPERSEDED 2026-08-19.** This row type shipped instead as the Swan Atelier Studio's
> `rejection-log.jsonl` (`scripts/design-brain/log-atelier-session.mjs`), whose ruling of
> record forbids a second ledger. **Do not implement the interface below.** Revised plan:
> `SWAN-TASTE-NEXT-SLICE-HANDOFF-2026-08-19.md`. §4's decisions are retained but PROVISIONAL
> — they were never re-derived against the shipped row's `skeleton_id` / `lever_deltas` /
> `axes_to_flip` channels.

```ts
type Verdict = 'keep' | 'discard' | 'skip';
type QueryAngle = 'layout' | 'typography' | 'colour' | 'density' | 'imagery';
type WhyTag = QueryAngle | 'craft' | 'motion';   // motion = interview-sourced only

interface TasteVerdictRow {
  schemaVersion: 1;
  sessionId: string;
  batchId: string;
  refId: string;
  source: 'screen' | 'section' | 'flow';
  mobbinUrl: string;          // rendered as an attribution link everywhere the image appears
  angle: QueryAngle;
  verdict: Verdict;           // AUTHORITATIVE scale — kills the keep/discard vs 1–5 ambiguity
  rating?: 1|2|3|4|5;         // keeps only, optional refinement
  whyTags: WhyTag[];          // one-tap chips — the fast "why"
  whyText?: string;           // optional, ≤280 chars — the deep "why"
  predicted?: Verdict;        // set ONLY on holdout items
  shownAt: number;
  verdictAt: number;          // dwell = verdictAt - shownAt → the 2-minute mandate becomes measurable
  createdAt: string;
}
```

W8 resolution, stated as a rule: **fast pass is keep/discard/skip only; annotation happens on keepers afterward.** Interrogating 6 keepers is deep. Interrogating 50 items is a form.

---

## 3. Builder-exact corrections

### C1 — Kill keyboard-only; ship one dual-input `ReviewDeck` (fixes W1, W3)

Component tree with line budgets (≤300/file enforced):

```
src/features/taste/
  ReferenceReviewDeck.tsx   ~200  mode: 'taste' | 'forge' ← Forge reuses THIS. One deck.
  ReviewDeckCard.tsx         ~90  role="gridcell", img alt={`${app} — ${screen}`}, lazy
  VerdictControls.tsx       ~110  Keep / Discard / Skip
  RatingControl.tsx          ~70  5 × ★, keeps only
  WhyChips.tsx               ~80  one-tap multi-select, 44px
  useReviewShortcuts.ts      ~90  scoped, disable-able
  useReducedMotion.ts        ~25
  *.styles.ts                each co-located, token-vars only
```

Hard rules:
- **Touch:** every action ≥44×44px; primary actions (Keep/Discard) 48px. Rating row = 5×44 + 4×8px gaps = 252px — fits 320px with 16px gutters. Mobile (≤414) is **not a shrunken grid**; it's a single-card deck with a bottom-anchored 48px Keep/Discard pair.
- **Shortcut scoping (WCAG 2.1.4):** in `useReviewShortcuts.ts`:
  ```ts
  const t = e.target as HTMLElement;
  if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
  ```
  Plus a persisted "disable single-key shortcuts" setting. `A` opens annotation; while open, all letter shortcuts are suspended.
- **Focus:** roving tabindex on the grid (`role="grid"`), `:focus-visible` ring `outline: 2px solid var(--accent-focus, #7FB3FF); outline-offset: 2px;` (8.9:1 vs surface — passes 3:1 non-text).
- **Status (WCAG 4.1.3):** `aria-live="polite"` region: "Kept 4 of 50, batch 2."
- **Reduced motion:** card transitions = instant opacity swap under reduce; `scroll-behavior: auto` override; flow/animated ref previews default paused with a play control (WCAG 2.2.2).

Desktop 1440 / mobile 375:

```
┌── Swan Brain · Taste S3 ────────── Batch 2 · refs 51–100 ──────┐    ┌─ Batch 2 · 34/50 ─┐
│ ████████░░░░ 38%  Kept 6 · Skipped 5                           │    │ ┌───────────────┐ │
├──────────────┬─────────────────────────────────────────────────┤    │ │   REF CARD    │ │
│ ACTIVE CARD  │ grid(role=grid) 5col/44px gaps                  │    │ │     (img)     │ │
│ (focus ring) │ ┌───┐┌───┐┌───▣┐┌───┐┌───┐                     │    │ └───────────────┘ │
│              │ └───┘└───┘└────┘└───┘└───┘                     │    │ mobbin.com/… ↗    │
│ [Keep][Discard][Skip]  48px                                    │    │ ★★★★★ (opt, 44) │
│ ★★★★★ (keeps)  Why: [layout][type][colour][density][craft]    │    │ ┌───────┐┌──────┐│
│ Note (opt 280) ┌──────────────────┐  mobbin.com/… ↗            │    │ │DISCARD││ KEEP │││ 48px
├────────────────┴───────────────────────────────────────────────┤    │ └───────┘└──────┘│
│ J/K move · F keep · X discard · 1-5 · A note · ? help          │    │ Skip ▸ (44px)     │
│ shortcuts off while typing (2.1.4)                             │    └───────────────────┘
└────────────────────────────────────────────────────────────────┘      375px
```

### C2 — One token source, and lint the fallbacks (fixes W9, W10)

`src/styles/tokens.ts` is the only place hex may exist; it emits `:root` custom properties (`color-scheme: dark`), styled-components consume `var(--token, #fallback)`, and any static export injects the same emitted block. CI: grep for hex outside `tokens.ts` → fail; contrast audit that checks **each fallback literal** against `--swan-bg` (fallbacks render when tokens fail):

| Pair (fallback vs `#0B0F1A`) | Ratio | Use |
|---|---|---|
| `--swan-text: #E8EDF7` | ≈16.3:1 | body |
| `--swan-text-muted: #9AA7C0` | ≈7.9:1 | metadata, attribution |
| `--accent-focus: #7FB3FF` | ≈8.9:1 | links, focus ring |

Reconcile width drift by canon: `BREAKPOINTS = { xs:320, sm:375, md:414, tablet:768, laptop:1024, desktop:1440, wide:1920, uhd:2560, '4k':3840 }` — union of both spec lists, one source, Playwright tests all nine.

### C3 — Harvest fixes (fixes W4, W5)

- **Platform is required** by `search_screens` — default `platform: 'web'` in harvest config; `ios` only on explicit request. Unspecified = schema failure today.
- **Drop the "motion" angle.** Angles = layout / typography / colour / density / imagery (screens express all five). Motion taste comes from the GRILL conversation + flow *step structure*, stored as `motion` axis with `provenance: interview`. Static pixels can't carry it (W4).
- **Dedup past the 100-cap:** persist a per-intent `seenSet` in the ledger (unbounded). Each call sends the 100 most-recent seen ids; filter responses against the full set client-side. Batch = **50 post-dedup**, quota 10/angle, rebalance quotas by per-angle keep-rate between batches.
- **Stopping condition replaces "until he has seen everything":** keep-rate <10% in two consecutive batches → DISTIL offers wrap-up. Flows hard-cap at 200 regardless; state it.

### C4 — Falsification math (fixes W6)

Holdout of 10 unseen refs (drawn from **unseen angles**, else the eval leaks) after every 50 verdicts per surface type. Gate on **Cohen's κ ≥ 0.3** (or balanced accuracy ≥ 0.65) against a base-rate predictor — never raw hit rate (W6's 85%-by-always-discard trap). Trust states: `cold` (<20 verdicts, advisory-only) → `warm` (50+ and κ≥0.3) → `hot` (κ≥0.5). Chart: `TasteTrustChart.tsx` (~90 lines) — Victory `VictoryLine` (session κ) + `VictoryBar` (keep-rate per angle), `animate={reducedMotion ? false : { duration: 300 }}`, sized via ResizeObserver (Victory does not auto-size), visually-hidden data table fallback.

### C5 — Grill exit condition (fixes W11)

Three shipped mechanisms, not discussion items: (1) question budget chip "3 / ≤7" per surface, configurable in `taste.config.ts`; (2) every question renders **[Use recommended]** as a 44px+ one-tap primary (this is the existing grill-me recommended answer, promoted); (3) persistent top-right **BUILD NOW** escape, 44px, always visible. Counter-proposals log as ledger rows with `verdict: accepted|rejected` — rejected alternatives are taste data (#7, endorsed). Telemetry on `questionsAnswered/budget`; if abandonment >30%, the budget drops.

### C6 — Corrected flow

```
MODE GATE → GRILL (≤7 q, BUILD NOW, recommended one-tap)
         → SLICE 0: ratify taste.profile.json + row schema   ← NEW GATE
         → HARVEST (5 angles × ≤30, seenSet >100-safe, post-dedup batch of 50, platform:'web')
         → BROWSE (dual-input ReviewDeck, /admin/taste, tokens, axe-clean)
         → CAPTURE (fast pass → annotate keepers; dwell timestamps)
         → DISTIL (ledger-ONLY input — model never re-pulls rejected images;
                   proposal → Sean confirms/corrects → correction logged as row)
         → HOLDOUT every 50 (κ gate)
         → CREATE (router consumes artifact ONLY; concept cites refIds)
```

### C7 — Verification suite (fixes W9)

Playwright matrix at all 9 widths + `reducedMotion: 'reduce'` context asserting zero animation and every `[data-touch]` ≥44px via `getBoundingClientRect`; jest-axe on ReviewDeck (0 violations); contrast-audit script in CI as above.

---

## 4. §6 open questions — settled, not scheduled

| Question | Decision |
|---|---|
| How taste enters generation | Router pre-brief consuming `taste.profile.json`. Not compiler slots (freezes taxonomy too early); retrieval only if κ plateaus |
| Where browsing happens | In-app `/admin/taste/[batchId]`. Holdout + ledger need server state anyway; static HTML is false "zero infra." Forge keeps its contact sheet until it adopts `ReviewDeck` |
| "Why" capture | Hybrid: one-tap chips + optional ≤280-char text, keepers-only annotation |
| Profile currency | Append-only rows; DISTIL weights by 90-day half-life; explicit axis reset bumps `profileVersion` |
| Verdicts to trust | **50 per surface type + κ ≥ 0.3.** Number stated, test defined |
| Owner module | New `swan-brain/taste`; Forge imports the UI; router consumes the artifact. Single artifact handoff |
| Interrogation exit | C5's budget + escapes, shipped |

## 5. Independently shippable slices

| # | Slice | Exit criteria (measurable) |
|---|---|---|
| 0 | ⛔ **SUPERSEDED 2026-08-19 — do NOT build this.** The row type shipped as the Atelier's `rejection-log.jsonl`; a ruling of record forbids a second ledger. Revised Slice 0′ (reason capture → reader → distiller → consumer) is in `SWAN-TASTE-NEXT-SLICE-HANDOFF-2026-08-19.md`. Slices 1–6 below are UNREVIEWED against the Atelier — re-check before building any of them. | — |
| 1 | Harvest module | 5 angles, 150 raw → 0 dupes across a 150-id seenSet despite the 100-cap |
| 2 | `ReviewDeck` UI | 50 refs verdicted ≤2:30 by dwell timestamps; axe 0; all targets ≥44px @375; reduce = no motion |
| 3 | Distill loop | Ledger-only input; correction rows logged; profile artifact updates |
| 4 | Holdout + trust gating | κ computed, `TasteTrustChart` renders, cold/warm/hot enforced |
| 5 | Grill upgrade | Budget chip, BUILD NOW, one-tap recommended, counter-proposal rows |
| 6 | Provenance | Every Forge concept emits a ref-citation block with mobbin_url links |

Re-verdict: **approve conditional on Slice 0 landing first and C1's dual-input deck replacing keyboard-only.** Everything else in §4 survives hostile review; the loop logic is sound — it was the constraints compliance and sequencing that weren't.
