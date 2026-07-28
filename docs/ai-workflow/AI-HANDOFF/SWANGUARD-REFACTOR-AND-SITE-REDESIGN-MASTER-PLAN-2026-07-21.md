---
decision: Two-workstream program — (1) SwanGuard hostile refactor, (2) SwanStudios photographic-luxury site redesign re-opened by Sean
status: open
supersedes: none
---

# SwanGuard Refactor + SwanStudios Photographic-Luxury Redesign — Master Plan
**Date:** 2026-07-21 · **Author:** Fable 5 (Final Decider) · **Requested by:** Sean (voice directive)
**Companion docs:** `SWANGUARD-KIMI-HOSTILE-REFACTOR-REVIEW-2026-07-21.md` (Kimi K3 verdict), Kimi packet in session scratchpad

> Sean's directive (2026-07-21): SwanGuard is "extremely ugly… so many buttons that don't make sense… mobile swipe controls visible on desktop." Run a Kimi hostile refactor review + AI Village, then an ultimate refactor keeping the heart and soul of the app. AND re-open the full-site redesign: "National Geographic style, ultra-4K, professional, $50k–$100k website look" driven by Mobbin MCP + the Swan design brain. **This explicitly re-opens the design-overhaul program Sean parked on 2026-07-21 (vNext rejection) with a NEW direction — the old vNext designs stay dead.**

---

## Workstream 1 — SwanGuard Ultimate Refactor

### Target
`C:\tmp\swanguard-production-completion-20260714` @ `c0045c8` ("family-first-intelligence-command-center", apps/web + apps/api). NOTE: tree currently has uncommitted modifications (apps/api config/tests, App.tsx, action registries) — another agent's in-flight work. Refactor must claim a clean state first (Rule 67 discipline applies even off-SS-PT).

### Fable audit — all [VERIFIED] by file read 2026-07-21
1. **152 distinct `data-action-id` buttons** app-wide; 10 `actionRegistry*.ts` files exist to catalog them. Desktop screenshot shows walls of identical panels with "Load X / Compile now / Route to workspaces" pills — an ops console, not a family product. Root cause: every capability was shipped as a manual button instead of an automated or contextual affordance.
2. **Mobile gesture UI on desktop:** `HoldActionCompass` ("Up: brief / Right: next / Left: acknowledge / Down: open / Hold / arrows") renders unconditionally in **8 screen decks** (e.g. `CommandScreenDeck.tsx:166-177`); `ScreenActionCompass.styles.ts` has only a ≤720px layout variant, never a desktop hide.
3. **Mystery chrome:** the whole workspace is wrapped in `TvTreehouseFrame` — a skeuomorphic retro TV cabinet in a treehouse with era buttons (`oak-1984`/`graphite-1996`/`glass-2026`) and decorative tuning knobs that only swap cabinet material. These are the "what is this doing" controls.
4. **Module sprawl:** 14+ flat modules in one rail (Command, Creator Board, Family Trust, Fair Access, Readiness, Civic Intel, Comment Intel, Influence Intel, Intel Wiki, Hermes, Trust Safety, Marketplace, Impact, Owner Console). Real 390px probe: nav modules 03–08 sit off-screen at x=360–991.
5. **Developer language in product UI:** raw permission strings (`influence:evidence_intake:create`), boundary badges, receipt/ledger jargon as user-facing copy.
6. **Design monotony:** one dark-green flat-card language, identical gray pills, no hierarchy between kill-switches and trivia, no imagery, no signature moment.
7. **Scale:** ~61 non-test components, ~10.7k component lines, biggest files at the 300-line cap; strong test/smoke suites exist to lean on.

### Refactor doctrine (Fable)
- **Heart and soul to preserve:** the safety/trust architecture (owner gates, kill switches, approvals, receipts, fail-closed connectors) and the intelligence briefs (daily brief, readiness, civic/official sources). That is the product: *a calm, trustworthy family intelligence briefing with an owner-controlled safety spine.*
- **Kill/demote:** manual "Load X" buttons (auto-load on mount + refresh affordance), gesture compass on desktop (keyboard shortcuts + visible buttons on hover), TV Treehouse chrome (kill or reduce to an opt-in easter-egg theme), raw permission strings in copy (humanize; keep technical detail behind a "details" disclosure).
- **Target IA:** collapse 14 modules → ~5 spaces: **Today (brief+alerts) · Intelligence (civic/comment/influence/wiki) · Family (trust/fair access/readiness/marketplace) · Hermes · Owner (console/kill switches/grants/observability)**. Final grouping arbitrated against Kimi's answer.
- **Interaction model:** desktop = pointer+keyboard, actions contextual to content; mobile = bottom tab bar + real swipe gestures on decks; gesture hints only on touch devices.
- **Button budget:** each screen ≤5 primary actions visible; everything else contextual or automated. Success metric: 152 registered actions → ≤60, with the top tasks ≤2 clicks.

### Sequenced slices (each independently shippable, hostile-reviewed per Rule 61)
1. **S1 — De-uglify shell:** hide gesture compass on non-touch devices, auto-load all "Load X" panels, fix mobile nav overflow. (Highest visible impact, lowest risk.)
2. **S2 — IA collapse:** 14 modules → 5 spaces, new nav (desktop rail + mobile tabs).
3. **S3 — Copy humanization pass:** kill developer jargon from user-facing surfaces; technical detail behind disclosures.
4. **S4 — Visual reskin:** apply the chosen design language (Kimi direction + Swan design brain adaptation, distinct SwanGuard identity), one signature moment.
5. **S5 — TV Treehouse resolution:** kill/easter-egg per Kimi + Sean verdict.
6. **S6 — Action-registry rationalization:** collapse registries, delete dead actions, re-verify test suites.
Each slice: local gates (workspace tests, tsc, build, smokes) → hostile pass → commit; batch-push per Rule 70.

### Kimi K3 verdict (2026-07-21, ~$0.08) + Fable arbitration
Full review: `SWANGUARD-KIMI-HOSTILE-REFACTOR-REVIEW-2026-07-21.md`. **Kimi: REBUILD-SHELL-KEEP-CORE** — keep the trust engine (permission/ledger/receipts spine, "a family trust engine" is the soul), demolish the entire presentation layer.

**Fable arbitration — ADOPT Kimi's plan with these rulings:**
- **IA: ADOPT Kimi's 3 destinations + 2 utilities** (Today / Intel / Trust + Inbox + Settings) over my 5-space draft — it's the same content, tighter. Creator Board / Marketplace / Impact iceboxed behind flags; Owner Console dissolves into Settings; Hermes becomes the Inbox; Readiness becomes a status card on Today.
- **Compass: ADOPT delete-everywhere** (not hide-on-desktop, my draft). Replacements per breakpoint: ⌘K palette + keyboard on desktop; bottom tabs, swipe-to-dismiss, hold-to-confirm on mobile; gesture gating by `(hover:hover) and (pointer:fine)`, never width.
- **Action diet: ADOPT the ~12-primary-intent budget** (my ≤60 was the total including contextual survivors — compatible: ~60 Load-X buttons deleted → auto-load; ~40 consequential survive contextually; ~30 collapse to overflow; ~20 banished to Settings→Advanced; 10 registries → 1).
- **TV Treehouse: ADOPT clean kill** (both reviewers; my easter-egg option withdrawn — Kimi's "that's how it survives and rots" argument wins). Salvage only the `glass-2026` material as tokens. **Sean holds veto** since it's someone's darling.
- **Visual identity: ADOPT "family watchtower at night"** — obsidian base + guardian amber + signal teal, serif display + grotesk, photographic Morning Brief as the signature moment. Distinct from SwanStudios crystalline gym identity; same production bar.
- **Slices: ADOPT Kimi's 0–8 sequence** (supersedes my S1–S6): 0 hygiene/clean-tree claim → 1 The Purge (delete frame+compass, auto-load everything) → 2 IA collapse → 3 action diet + ⌘K → 4 visual tokens → 5 signature Morning Brief → 6 Trust redesign + human copy → 7 Intel consolidation → 8 polish.
- **Guardrails bound into every slice:** two-pass deletion (flag-hide → delete next slice) + grep-or-die reference scans; **Critical Action SLA** (kill switch/approve/revoke ≤2 interactions from anywhere, scripted task test per slice); structural anti-sprawl (nav hard cap 3, action-budget lint on `data-action-id` count, feature freeze during slices 1–8).

### Review chain
Kimi K3 hostile review ✅ → Fable arbitration ✅ (above) → **AI Village full run (paid, Rule 16 — awaiting Sean's explicit go, see §3)** → free triangle ratify → final Fable synthesis → build.

---

## Workstream 2 — SwanStudios Photographic-Luxury Site Redesign (re-opened)

### Direction (the new bet, replacing rejected vNext)
Move sswanstudios.com from "component-built first-website look" to **cinematic photographic luxury**: full-bleed National-Geographic-grade imagery (lush rainforest, arctic/crystalline landscapes, dramatic athletes), editorial serif drama over imagery, calm minimal chrome, few buttons, everything breathing. The Crystalline Swan palette stays the foundation (dark-first, Midnight Sapphire/Ice Wing/Gilded Fern) — what changes is that **photography becomes the primary surface** and UI recedes to glass layers over it.

### Mobbin evidence pulled 2026-07-21 (patterns to steal)
- [komoot](https://mobbin.com/screens/87ae8f33-08b6-4f52-a135-bcebf0a3c1e7) — full-bleed forest photo hero, tiny centered logo + one-line promise + 2 buttons. The whole pitch is the image.
- [Sana AI "Renaissance Edition"](https://mobbin.com/screens/5e1c0b13-5c50-4cab-8fa5-816163eeb2d9) — painterly sky + centered serif; near-zero chrome; pure atmosphere.
- [Origin](https://mobbin.com/screens/340f550c-1db9-4e13-b8f7-f4975de2be16) — sky photography + italic serif headline + single input CTA; premium finance feel maps well to premium training.
- [Adaline](https://mobbin.com/screens/199b187e-8677-4956-a892-ce1d57da12da) — misty landscape as full ground layer, product copy floats above.
- [lululemon](https://mobbin.com/screens/219c9819-15a2-4144-b3ca-3e2f89c53d38) — editorial athlete photography with giant overlay type; retail-grade art direction for the training/store surfaces.
- [Open (subscription)](https://mobbin.com/screens/084d5db1-92f7-45dd-8fde-76e63893d492) — editorial photography + type-forward pricing; model for packages/pricing pages.
- Ultrahuman (via Mobbin dark-mode collection) — dark luxury health-data UI; model for dashboard-adjacent public surfaces.

### Asset strategy (the real bottleneck)
A $100k look is 80% imagery. Sources, in order: (1) Seedance 2.0 cinematic loops + stills via `seedance-swan-cinematic-video` (hero loops, ambient b-roll per SWAN-ASSET-STORYBOARDING archetypes); (2) licensed 4K nature photography (curated set, consistent grade: cold crystalline + lush emerald, gold accents); (3) real Sean/client training photography (editorial grade) for authenticity surfaces. All assets on R2; scroll-video hero uses the canvas frame-scrub technique already researched.

### Program shape (gated, Village-eligible at ratify point)
1. **P0 — Direction ratify:** 2–3 concept directions (per rule 40 ideation gate) built as static hero comps of the homepage only, using real candidate imagery. Sean picks. (This is where the last program died — vNext skipped taste-proof on real imagery. Do not code past P0 without Sean's YES on a comp.)
2. **P1 — Homepage cinematic rebuild** (hero + narrative arc per SWAN-CINEMATIC-DESIGN-SYSTEM B2).
3. **P2 — Store/packages + pricing** (lululemon/Open editorial pattern; conversion copy via `copy-tournament`).
4. **P3 — Auth/onboarding + public pages** (login as a moment, not a form).
5. **P4 — Logged-in shell reskin** (photography recedes, Aurora Console skin + lens system carries; keep data surfaces calm).
Each phase: swan-design-router → build → responsive matrix → hostile design critique → closeout.

---

## §3 — AI Village run — COMPLETE (2026-07-21, $0.79, 17/19 validators, 3/3 debates consensus)
Ran `--mode plan` over this doc. Full outputs: `AI-Village-Documentation/validation-prompts/latest/` (synthesis.md, architecture-plan.md, design-specification.md, security-plan.md). Opus judge verdict: **Approve to proceed to S0/P0, gated on resolving the pre-Slice-1 decisions below.** The arbitration rulings were confirmed sound; risk is entirely in unspecified implementation detail.

### BLOCKING GATES — resolve before Slice 1 (Village consensus, Fable-adopted)
1. **Action contract first.** Create the `ActionDescriptor` type + a **static, tree-shakable action manifest** as the FIRST file. Resolves the Slice 3/6 sequencing conflict (⌘K needs a registry to read before Slice 6 deletes registries) + circular-import risk. All 8 decks get one `<ContextualActionBar>` contract so compass-delete + replacement is one atomic change per deck.
2. **Action-id DB audit.** `SELECT COUNT(*)` every `data-action-id` to be deleted/renamed against `action_receipts`/ledger/grant tables. Two-pass: rename slice N, delete slice N+1 after zero-orphan confirm. Grep alone insufficient.
3. **Three-tier auto-load.** safety-critical (kill-switch/trust — load first, block render on failure, never stale) / primary (Morning Brief — parallel, skeleton, degrade) / supplementary (marketplace/impact — lazy on tab). Back with a **BFF aggregate endpoint** for Today + **stale-while-revalidate** for intel feeds. Load-test 50 concurrent before Slice 1 ships. (Auto-load-on-mount was the single most-cited risk: 6–42 simultaneous requests.)
4. **TvTreehouseFrame = two-commit kill.** Extract `glass-2026` salvageable tokens → verify no context consumers → delete. Deleting in one shot triggers runtime errors from descendants reading its context.
5. **Trust state = single source of truth** with cross-space invalidation on any kill-switch/grant mutation, optimistic locking (`version`/`updated_at`), atomic audit-receipt writes. Add a concurrent-mutation case to the per-slice Critical Action SLA test.
6. **Verify "no backend changes" per-endpoint.** Confirm each endpoint returns the exact shape the new UI needs — especially the Morning Brief photographic hero URL, **likely absent today**. Add server-side pagination/search for Intel + Hermes.

### ENFORCE THROUGHOUT (Village floor)
- **A11y:** 4.5:1 contrast matrix across all themes incl. Dual-Button Glow states; 44px; `prefers-reduced-motion` wrapping every glow/scrub/transition; visible-close-button gesture fallbacks for screen readers; CSS custom properties only; WCAG 2.2 `:focus-visible`→brand glow.
- **Perf:** responsive `srcset` (4K desktop / ≤1080p mobile), WebP/AVIF, lazy-load, canvas frame-scrub over `<video>` with immutable cache headers; `backdrop-filter` on top-level containers only (nested = exponential GPU paint); bundle math tracked.
- **File budget:** pre-decompose Morning Brief + Homepage Hero into sub-components + `.styles.ts` BEFORE building; ESLint ≤300-line rule. ~30% of files projected at cap risk.
- **Error boundaries:** safety-critical surfaces (AlertSurface, KillSwitchPanel) fail-**open** with a visible message, never blank/hide.
- **Data safety:** R2 lifecycle (30-day draft expiry) + deletion cascades; client-photo written-consent + non-public ACLs before any P1 upload (PII/GDPR); Morning Brief 90-day retention + hard-delete; verify soft-delete `WHERE deleted_at IS NULL` filters on all iceboxed-module reads; pre-flight PII redaction + CI gate before any external-LLM call.
- **Mobile edge:** 320px tab-bar flex-wrap, keyboard `scrollIntoView` for CTAs, RTL logical properties, `react-window` for Intel Wiki; iOS Safari guard (no `hover`, autoplay block → compass never mounts, hero needs interaction-gated fallback).

### PLAN BLIND SPOTS TO ADD (Village)
Concrete test/QA strategy (visual-regression + endpoint contract tests + concurrent-mutation + a11y automation); production rollback path per slice for the safety-critical trust spine; user-state migration (saved views, notif settings) through the 14→5 IA collapse; **SEO-equity preservation** for the sswanstudios.com rebuild (URL structure, structured data, meta); the WS1-vs-WS2 repo/deploy boundary + exact P4 "logged-in shell" scope (genuine ambiguity — SwanGuard and SwanStudios are SEPARATE repos; P4 refers to the SwanStudios SaaS shell).

### Deferred (do NOT un-icebox): Creator Board, Marketplace, Impact + all agentic-AI/wearable/voice/FHIR proposals — expand scope, contradict the plan's own risk discipline.

### Remaining review step
Per Tier-3 rule, Village output chains into a **free triangle ratify** (Claude+Codex+Gemini) before Fable closes — pending (needs Codex on the board). Fable has already adopted the 6 gates as binding regardless.

## Next slice (Rule 60)
**Sean's GO/NO-GO on the Village run + P0 concept-comp approval path** — then S1 (de-uglify shell) can start immediately as it is direction-independent.
