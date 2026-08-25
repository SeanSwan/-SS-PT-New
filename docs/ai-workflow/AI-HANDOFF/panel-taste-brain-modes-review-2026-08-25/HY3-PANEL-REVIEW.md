# Hostile-review packet — Swan Taste Brain: partner mode + client mode, and the road to an everyday "click-click-click" a… — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-taste-brain-modes-review-2026-08-25/PACKET.md
**Seed:** (none)
**Tokens:** 4290 in / 8725 out | **Cost:** ~$0.0052 | **Wall:** 141.0s | **finish_reason:** stop

---

## VERDICT
REVISE — The partner-Midlibrary checkbox breaches the licence containment law and the described frontend ignores binding styled-components/Victory rules, so the foundation is unsafe for daily multi-user use until those are corrected.

## BLOCKERS
1. **P0** — Licence containment leak: partner (non-owner) is offered “include Midlibrary — this desktop only” (§2 page copy), but §1 states Midlibrary “never shown to anyone but the owner on loopback”. Inputs: partner selects checkbox + creates project with `pool:'full'` (allowed because `createProject` only refuses `client+full`) → `poolFor()` returns Midlibrary ids/urls to partner’s grid, violating licence. Evidence: §2 `lib/projects.mjs` `createProject: client + pool 'full' → refused` (implies partner+full allowed) and §2 `probe.html` copy “partner-only checkbox ‘include Midlibrary — this desktop only’” vs §1 `Midlibrary reference images … licence: never leaves the machine, never shown to anyone but the owner on loopback`.

2. **P0** — Binding house-rule violation: UI is built as plain HTML/JS (`ui.html` 159 lines, `probe.html` + `probe.js`, `bundle.html`) with no mention of styled-components, Victory charts, Crystalline Swan palette `var(--token,#fallback)`, or Dual-Button Glow. Rules state “styled-components only (no MUI); Victory charts only; Crystalline Swan palette via var(--token,#fallback); Dual-Button Glow” as non-negotiable. Evidence: §1 `ui.html, 159 lines`; §2 `probe.html + shared probe.js`; §2 `bundle.html` — zero compliance evidenced.

3. **P1** — Event-write race / idempotency gap: `eventId = sha256(session|type|sorted ids|presentedAt)` (§2 `lib/events.mjs` validateEvent) uses `presentedAt` which may differ on retry, breaking idempotency; concurrent `POST /api/event` appends to same `<session>.jsonl` with no file-lock or atomic-write mentioned → interleaved or lost events on double-click. Evidence: §2 `lib/events.mjs` `appendEvent(e, dir)` and eventId formula.

## ATTACKS
- **Correctness:**
  - Happy-path-only: Proofs test 414px controls but never exercise partner+Midlibrary (the leak above) nor partner-alone offline bundle reload on iOS Safari (§3 gap 6).
  - Null/undefined: `if (e.profileId !== undefined) need(...)` implies `profileId` optional, yet `profileOf(e)` / `eventsDirFor(profileOf(e), projectOf(e))` would receive `undefined` → likely throws or writes to wrong memory. Unhandled path.
  - Stale state: Compiler priors come from project’s own theme words, “never owner’s themes.md” (§2 `lib/profile.mjs`); editing theme words after events compiled yields stale brief with no invalidation described.
  - Off-by-one: `DONE_FLOOR` partner/client “8 grids/40 judgements” vs 12-up grid; progress math may count grids not judgements, misreporting completion at 4 grids.
  - Unhandled error: Origin gate “Host must name the server; Origin absent or own-page” (§2 `lib/routes-modes.mjs`) does not specify behaviour when `Host` header missing entirely.

- **Security:**
  - Authz/scope leak: Partner+full pool is permitted (see Blocker 1) — an IDOR-style cross-licence exposure.
  - Injection: Bundle JSON escapes only `<` (`replace(/</g,'\\u003c')`); `>` or `]]>` not neutralised, though risk low in loopback.
  - Replay/idempotency: `presentedAt` in eventId (above) defeats duplicate suppression on network retry.
  - Multi-tenant: `poolFor` uses `profile !== 'client'` to allow full mix, so `partner` gets Midlibrary; no server-side enforce that `source===profileId` for bundle import beyond client check (relies on `validateEvent`).
  - DoS: `/api/event` append-only jsonl unbounded; 64KB/event cap but no total cap on loopback disk.

- **Data-truth / schema drift:**
  - `generate.mjs` reads `taste.loved` from `loved-srefs.md` but compiled `taste-profile.json` (evidence srefs, proposedAvoids) is unreferenced (§3 gap 1) — field drift between markdown and compiled profile.
  - `candidates` are `ids + http(s) URLs` but `picks` add `credit, pageUrl` (§2 `lib/profile.mjs`); consumer shape drift if brief expects exact candidate schema.
  - Frontend response-shape: `/api/profile` returns `picks` with `id,url,credit,pageUrl`; `/brief` readout assumed same but not verified in tests.

## HIGHEST RISK
The partner-Midlibrary licence breach (Blocker 1) is the single most dangerous item: it exposes the owner’s licensed third-party archive to a non-owner, creating legal liability and breaking the foundational containment law. Cheapest de-risk: remove the partner checkbox and harden `poolFor` to `full = isDefaultNamespace(profile, project) || (pj?.pool === 'full' && profile === 'sean')` (reject partner full at compute time, not just create), then add a test asserting `GET /api/probe?profile=partner&project=...` returns zero Midlibrary hosts even if `project.json` is manually edited to `pool:'full'`.

## CONFIDENCE
Could NOT verify from the document alone: actual implementation of `allowNonSean()`, `profileOf()`, `projectOf()` in `lib/events.mjs`; contents of `SHAREABLE_COLLECTIONS` and `DEFAULT_MIX` in `lib/projects.mjs`; whether `probe.html` checkbox is already wired or just planned (proof section never tests partner+Midlibrary); whether any CSS uses styled-components or the Crystalline Swan palette vars; and whether `appendEvent` uses atomic writes. Evidence to settle: pull repo, grep for `styled-components` import and `var(--` tokens; run `test-modes.mjs` with a partner project forced to `pool:'full'` and assert `/api/probe` response contains zero `midlibrary` collection entries; inspect `lib/events.mjs` for `fs.appendFileSync` vs locked write. I am explicitly uncertain whether the packet’s “partner-only checkbox” is merged code or a spec intent — my P0 rests on the literal §2 description, and a confident wrong call here would be worse than flagging the gap.
