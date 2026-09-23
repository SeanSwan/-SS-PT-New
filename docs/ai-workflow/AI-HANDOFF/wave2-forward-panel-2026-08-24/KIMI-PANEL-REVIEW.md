# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/WAVE2-FORWARD-REVIEW-PACKET-2026-08-24.md
**Seed:** (none)
**Tokens:** 20106 in / 3096 out | **Cost:** ~$0.1068 | **Wall:** 94.1s | **finish_reason:** stop

---

## VERDICT: The gate logic is hardened, but the privacy layer still fails by shape — a denylist with a regex safety net cannot keep the consent copy true, and the frontend leaks the same data through URLs the backend never sees.

## A. REMAINING DEFECTS (ranked by severity)

**A1 — CRITICAL: `teachPrompt` ships client state in query strings (Slice 6 is worse than scoped).**
`buildClientOverviewCoachPath` interpolates level, streak, XP, progress %, and booking status into `?teachPrompt=`. That string lands in: browser history, server access logs, `Referer` headers to any third-party asset on the coach page, analytics beacons, and crash reporters (Sentry captures URLs by default). The de-identification service is irrelevant here — this data never touches it. The consent copy says "training-relevant data is sent alongside a stable client ID" to the *AI provider*; it says nothing about broadcasting a health-adjacent snapshot to every log pipeline. Failure path: client clicks "Coach This" → URL with `streakDays=14; 62% to next level` is in nginx logs and Sentry breadcrumbs forever. **This is the single highest-impact fix** (see B1).

**A2 — HIGH: `scanAndRedactPII` regexes are declared inside the loop but that's the least of it — the phone regex mangles training data.**
`PHONE_REGEX = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g` matches any 10-digit sequence. A free-text note like "rowed 2000m in 8:30, did 3 sets of 10 at 135" — no. But "HR 145-155 for 30 min, total 3456789012 steps this week" or a long unspaced number in a measurements note gets `[REDACTED_PHONE]` injected into workout context, silently corrupting coach input. Worse: it does NOT match international formats (`+44 ...`), so a UK client's phone in a note flows through while a US-formatted *non*-phone gets redacted. Asymmetric in exactly the wrong direction. Fix: require boundary context (label proximity: `phone|tel|call|text me at`), or drop phone redaction to the allowlist DTO (B2) where free-text notes are structurally excluded.

**A3 — HIGH: `classifyKey` safety override is name-based, so a nested `measurements` key anywhere is exempt — including `lifestyle.supplementMeasurements`.**
`SAFETY_KEY_NAMES` is built from last path segments. Any key literally named `measurements`, `pain`, or `conditions` at ANY depth bypasses the gate. Conversely `sleepApnea` is kept (correct) but `apneaSleep` — same clinical fact, reversed word order — contains only... `apnea` is unknown → 'ambiguous' → kept. OK. But `sleepScore` where `score` is in LIFESTYLE_WORDS → gated. Fine. The real hole: `supplemental` is in LIFESTYLE_WORDS, so `supplementalOxygen` = [supplemental, oxygen] → `oxygen` unknown → kept. Good. But `supplementalOxygenLog` = [supplemental, oxygen, log] → still unknown → kept. Narrow escape. The fragile one: `stressLog` gated, `stressFractureLog` kept — correct today, but one vocabulary addition (`fracture` someone adds thinking of "stress fracture recovery notes" as lifestyle) gates a contraindication. The asymmetry comment claims unknown=KEEP is safe, but the vocabulary set is editable and the edit direction that hurts someone is *adding* words. Add a test fixture pinning every TRAINING_SAFETY-adjacent clinical compound (`stressFracture`, `sleepApnea`, `supplementalOxygen`) against future LIFESTYLE_WORDS edits.

**A4 — MEDIUM: `deIdentify` name-leak check (step 4) only checks `client.name`, not free-text.**
`originalName` "Margaret Chen" typed into `training.notes` ("Margaret Chen prefers mornings") survives everything — not in DIRECT_IDENTIFIER_PATHS, not email/phone/SSN shaped. The consent copy's warning about notes is honest, but the leak check gives false confidence. Until B2 lands, add: scan all string values for `originalName` and `originalPreferred` tokens (case-insensitive, word-boundary) and redact. Cheap, catches the most likely identifier.

**A5 — MEDIUM: `requireAiConsent` trusts `req.body.userId` for non-client roles with no assignment check.**
`targetUserId = rawUserId` for any non-'client' role. A trainer can probe consent status of arbitrary users (403 vs. pass oracle), and worse — the consent check passes against the *target's* profile while `protect()` authenticated the *trainer*. If any downstream controller uses `req.aiConsentProfile` (attached for target) but acts on `req.user`, consent is checked against the wrong human. Also `req.body?.userId || req.user?.id` reads body before role resolution — a client sending `userId: <other>` with role 'client' is caught by the ternary, but role values other than the exact string 'client' (e.g. 'user' — which `loadConversationMembers` maps to 'client'!) fall to `null` → 400, or worse, if any role like 'user' exists in Users, `requesterRole === 'client'` is false and `rawUserId` is honored → **clients with role 'user' can pass any userId**. The messaging repo explicitly maps `role = 'user'` → client, proving 'user' exists in the schema. Verify and fix: resolve role through the same normalization.

**A6 — MEDIUM: socket `send_message` lane check runs entitlement resolution per message.**
Comment says throttle-first, and it is — but `checkMessageRate` limits are presumably generous (human typing rate). A scripted emit loop under the limit still forces 3 DB round-trips per message. Cache entitlement + counterparties per socket connection with a 60s TTL; invalidate on `assignment_changed` event. Also: `isRelationshipWriteAllowed` re-queries membership even though `isActiveParticipant` just ran — pass the membership result through.

**A7 — LOW: MessagingView `MessagingShell` uses `100vh` — broken on iOS Safari with chrome; use `100dvh` with `vh` fallback. `SummaryMetrics` at 320px: `repeat(3, minmax(96px, 1fr))` = 288px + gaps + padding overflows a 320px viewport before the 520px breakpoint collapses it. Breakpoint should be 768px or use `auto-fit`.**

**A8 — LOW: `StateAction` hover glow `rgba(139,92,246,0.35)` on `#60C0F0` — verify 4.5:1 for `#0A0A0F` text on `#60C0F0` (passes, ~7:1) but `--text-secondary #A2B3C6` on `#0A0A0F` is ~7.5:1, fine; `--text-muted rgba(224,236,244,0.68)` on `#1A1A24` computes to ~#9FB0C0 → ~6:1, passes but fragile — pin computed hex in tokens, not alpha-over-unknown-surface.**

## B. THE FORWARD BLUEPRINT

### B1 — CoachContextEnvelope (kills A1; this is THE next build)

Replace all 4 query-string producers with a server-held envelope; the URL carries only an opaque ID.

```mermaid
sequenceDiagram
  participant UI as Producer (4 sites)
  participant API as POST /api/coach/context
  participant Store as coach_context_envelopes (TTL 15min)
  participant Coach as /coach-assistant?ctx=:id
  UI->>API: {intent, source, returnTo, snapshot{...}}
  API->>Store: INSERT (id=uuidv4, user_id, payload, expires_at)
  API-->>UI: {contextId}
  UI->>Coach: navigate ?ctx=<uuid>
  Coach->>API: GET /api/coach/context/:id
  API->>API: assert req.user.id === envelope.user_id; assert not expired; DELETE on read (single-use)
  API-->>Coach: payload (never in URL, history, or referer)
```

Schema: `id uuid pk, user_id int fk, payload jsonb, created_at, expires_at, consumed_at`. Single-use + 15-min TTL + owner-only read. Acceptance criteria: (1) grep finds zero `teachPrompt=` in `new URLSearchParams` calls; (2) Playwright test asserts `window.location.search` contains only `ctx=<uuid>`; (3) expired/foreign ID → 404, not 403 (no oracle); (4) envelope payload passes through `deIdentify` before prompt assembly. Effort: 2 slices, ~400 lines.

### B2 — Outbound Allowlist DTO (kills A2/A3/A4 class permanently)

The denylist has now failed four times by shape (path list → category matcher → arrays → vocabulary). Stop patching it. Define `CoachPayloadDto`:

```ts
// backend/dto/coachPayload.dto.mjs — the ONLY shape that may leave
export const COACH_PAYLOAD_SCHEMA = Object.freeze({
  alias: 'string', age: 'number?', goals: 'string[]?',
  injuries: 'string[]?', conditions: 'string[]?',
  measurements: { height: 'number?', weight: 'number?', bodyFat: 'number?' },
  trainingHistory: 'object?', fitnessLevel: 'string?',
});
// builder: pick(payload, schema) — anything not named does not exist.
```

`deIdentify` becomes `buildCoachPayload(raw)` — constructive, not subtractive. Free-text notes are excluded *by construction*; the consent copy's "avoid names in notes" warning can be deleted because notes never leave. Keep `scanAndRedactPII` as defense-in-depth on the DTO output only. Acceptance: contract test serializes every User model field and asserts non-allowlisted fields are absent; the four historical regression fixtures (medicalConditions, array-nested sleep, stressEchocardiogram, avgSleepHours) all pass against the DTO.

### B3 — "Today" Home recomposition (Slice 10/11) — wireframe

```
┌─────────────────────────────────────────┐ 320–768: single column, cards stack
│ TODAY · Tue, Aug 26          [Coach ◆]  │ ≥1024: 12-col grid, 8/4 split
├──────────────────────────┬──────────────┤
│ ▶ NEXT ACTION (hero)     │ STREAK  14d  │
│ Upper Body B · 45 min    │ XP ▓▓▓░ 62%  │
│ [Start] [Ask Coach] 44px │ Next: Lvl 9  │
├──────────────────────────┴──────────────┤
│ PROGRESS STORY (Victory)                │
│ <VictoryChart> area: sessions/wk 12wk   │
│ + VictoryScatter: pain flags overlay    │
├─────────────────────────────────────────┤
│ MESSAGES (unread 2) · BOOK (next open)  │
└─────────────────────────────────────────┘
```

Rules: one hero action (decided server-side via B1 envelope), Victory for all charts, `prefers-reduced-motion` swaps area-chart animation for instant render, all touch targets ≥44px, tokens only (`--accent-primary`, no hex in components), each card ≤300 lines in `components/Today/{HeroAction,StreakTile,ProgressStory,CommsTile}.tsx`.

### B4 — CI gate before anything else merges

Owner item, but it's load-bearing: five rounds of panel review are doing what GitHub Actions should. Minimum: `lint + tsc + vitest + contract tests (consent version sync, DTO allowlist, tier-gate guard)` on every PR to main. This is a $4/mo GitHub Pro decision blocking a 30-defect-per-5-rounds bleed.

## C. WHAT I WOULD KILL

- **Kill the denylist hardening path entirely** — every further hour on `LIFESTYLE_WORDS`/`classifyKey` is sunk cost once B2 lands. Freeze it, ship the DTO.
- **Kill Slice 12 route aliases** — five-destination IA is fine, but aliases double the surface for deep-link bugs like the `composeTo` class. Pick canonical routes, 301 the old ones server-side, done. Don't maintain parallel client-side alias tables.
- **Defer the focus-trap stack** — correct as a prerequisite, but the 3 in-house modals are low-traffic; B1+B2 close active data leaks, modals don't. Reorder: B4 → B1 → B2 → Slice 4 → B3 → focus-trap/modals → Slice 8 → Slice 12.

## CONFIDENCE + REQUIRED LOOKUPS

- **A5 (role 'user' consent bypass): HIGH impact, MEDIUM confidence** — requires reading `protect()`/authMiddleware to confirm whether `req.user.role` can be `'user'` and whether any AI controller trusts `req.aiConsentProfile` for a different user than the actor. **Look this up first.**
- **A2 phone-regex false positives: HIGH confidence** the regex is asymmetric (US-only); MEDIUM on training-data corruption frequency.
- **A1: HIGH confidence** — the excerpts prove query-string construction; only unknown is whether a proxy strips Referer (don't count on it).
- **A7 320px overflow: HIGH confidence** — arithmetic holds unless a parent constrains width.
- Required lookups: `requireTier.mjs` TRIAL_EFFECTIVE_TIER handling on the socket path; `checkMessageRate` limits; whether Sentry/analytics is actually installed on the coach route (determines A1 blast radius).
