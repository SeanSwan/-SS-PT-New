# NEXT-CHAT MASTER PROMPT — Aurora Console: finish + roll out the reusable console skin
**Forged 2026-07-17 by Fable 5 (Final Decider) at token-limit handoff. Status: READY. Predecessor: `NEXT-CHAT-PROMPT-coach-command-center-v2-2026-07-17.md` (its P0/P1/P2 are SHIPPED — see §2).**

> **Kickoff (paste to the fresh agent):** *"Read `docs/ai-workflow/AI-HANDOFF/NEXT-CHAT-PROMPT-aurora-console-2026-07-17.md` in full, then execute it. Worktree `C:/tmp/ss-coach-cc-20260716` (branch `claude/coach-command-center-rebuild-20260716`) already holds commit `4df80aa58` UNPUSHED — start by verifying it, then continue at §5."*

---

## 1. Sean's standing intent (do not drift from this)

- He called the Coach Command Center **"tacky"** (screenshot: a wall of same-weight boxed chips; chrome competing with content). He is **willing to change the whole thing** to make it easier and more beautiful.
- He picked **direction 3 — "Command Bridge Aurora"**: the surface sits under a slow aurora that IS the coach's state (cyan idle → crimson listening → purple thinking → gold speaking). *Presence as weather.*
- **The upgrade that changes the architecture:** he wants this to work for **other consoles too**, switchable via the **theme changer** and the **lens**. So this is a **reusable skin**, never a one-page repaint.
- Everything must still obey: dark-first, tokens-with-fallback (rule 6), 44px targets, Dual-Button Glow, reduced-motion, no MUI/Tailwind, 300-line cap.

## 2. Where we are NOW (all verified; main is live)

**Shipped to main today (deploy-verified):**
1. W3 mobile rebuild + 4-round recursive hostile review — `12a8a6a92`.
2. v2 feature batch — `2a9c60bee`: chat-lane proposals on the canonical surface (live + history), confirmation expiry countdown + one-tap re-issue, two-tap destructive confirms, per-thread composer drafts, day dividers, registry-fed "What can I say?" catalog sheet, copy/read-aloud, recent-client chips.
3. v2 master handoff doc — `de958f58b`.
4. **P2.2 command metrics** — `f54b5a6aa`: `GET /api/ai-command/metrics/summary` (admin-only, fail-closed, 1–90d) aggregating the EXISTING append-only `AiCommandAuditLog`. *Lesson: AI observability ingestion already exists — always check `AiCommandAuditLog` / `AiMetricsBucket` before building a lane.*

**In the worktree, COMMITTED but UNPUSHED — `4df80aa58` "Aurora Console":**
- New lens `aurora-console` — `frontend/src/adapters/style-lens-swan/manifests/auroraConsole.ts`, registered in `adapters/style-lens-swan/index.ts` (`SWAN_EXPANSION_MANIFESTS`), renderer ids added to BOTH `core/style-lens-os/constants.ts` (`CORE_RENDERER_ALLOWLIST`) **and** `core/style-lens-os/types.ts` (the hand-listed `ShellRendererId`/`NavigationRendererId`/`ComponentRecipeId` unions — **this pairing is the trap that cost a tsc exit-2; patch both**), contrast receipt in `adapters/style-lens-swan/visuals.ts`, CSS block in `adapters/style-lens-swan/SwanStyleLensGlobalStyles.ts`.
- **The reusable contract** = the `--console-*` token family defined in that CSS block: `--console-surface`, `--console-surface-strong`, `--console-line`, `--console-line-strong`, `--console-glow`, `--console-atmosphere-a/-b`, `--console-state-idle/-listening/-thinking/-speaking`. **Every value composes from THEME vars** (`var(--accent-primary)`, `var(--accent-secondary)`, `var(--bg-elevated)`, `var(--accent-gold)`) → the theme changer recolors the skin automatically; the lens switch re-skins within the theme.
- `frontend/src/components/ConsoleOS/ConsoleAtmosphere.tsx` — the aurora sheet. **Fail-closed**: `display:none` unless `html[data-style-lens='aurora-console']`; hue follows `data-voice-state` **and** the generic `data-console-state` (the hook any future console sets); transform/opacity only; reduced-motion keeps the state tint, drops motion.
- Coach CC consumes it: token bridge in `CoachCommandCenter.shellStyles.ts` (`--coach-surface: var(--console-surface, var(--bg-surface, …))` — console token first, **previous fallback preserved**), lens-scoped de-box pass `CoachCommandCenter.auroraConsoleStyles.ts` (chips → text hierarchy, one frost-glass panel language, presence hue on the strip/dock/tab), `<ConsoleAtmosphere />` mounted in `CoachCommandCenterPage.tsx` inside the `data-voice-state` shell.
- Pinned by `frontend/src/components/ConsoleOS/ConsoleAtmosphere.contract.test.ts` (fail-closed, theme-derived, state-reactive, coach consumption).
- **Gates at commit:** 932/932 (lens + core + ConsoleOS + coach suites) · honest `tsc` **exit 0** · vite build clean.

## 3. Non-negotiable gotchas (each already cost a round)

1. **`tsc --noEmit` OOM-crashes (exit 134)** on this repo with the default heap and `grep -c "error TS"` reads the crash as "0 errors". ALWAYS: `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit; echo $?` and trust the **exit code**.
2. **vitest from a worktree root uses the wrong config (no jsdom)** → misleading mass pass/fail. ALWAYS `cd frontend/` (or `backend/`) first.
3. Adding a lens renderer id requires **two** edits: `constants.ts` allowlist **and** `types.ts` unions. The registry test derives counts from its own `expectedExpansion` list — add the pair there too.
4. Coach overlay z-stack: ops drawer scrim **10040** / rail **10050** / catalog sheet **10052-10053** / voice overlay **10060**. Any new overlay picks its z with these in mind.
5. My shell drifted into the stale shared checkout once (`~/Desktop/quick-pt/SS-PT/frontend`) and "files vanished". The live tree is the **worktree**: `C:/tmp/ss-coach-cc-20260716`.

## 4. Verify before building (rule 52)

```bash
cd C:/tmp/ss-coach-cc-20260716 && git log --oneline -1        # expect 4df80aa58
git fetch origin main --quiet && git rev-list --left-right --count origin/main...HEAD
cd frontend && npx vitest run src/adapters/style-lens-swan src/components/ConsoleOS --reporter dot | tail -3
NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit; echo "exit=$?"
```

## 5. FINISH THE JOB — ordered slices

**S1 — Sean must SEE it (highest value; nothing else matters until he approves the look).**
The lens is registered but he has no proof. Do BOTH:
- (a) **Live proof:** dev server + the mocked-session probe (`frontend/e2e/coach-command-center-mobile-smoke.spec.ts` harness: `SWAN_PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:<port>`), with `document.documentElement.setAttribute('data-style-lens','aurora-console')` injected, and capture screenshots at **414 / 375 / 1440 / 2560** in both the idle and listening states (drive `data-voice-state`). Attach them in chat.
- (b) **Lens-switch truth:** prove the surface renders **byte-identically** without the lens (default) — the contract test asserts it structurally; the screenshot proves it visually.
- Accept: Sean says "ship it" or names changes. **Do not push the skin to main before he sees it** — it's a visual bet on a live production surface.

**S2 — Theme-changer matrix proof.** Screenshot the aurora-console Coach surface under ≥3 themes (`crystalline-dark` default, `frozen-aurora`, `obsidian-black`) proving the skin recolors from theme vars alone (that IS Sean's "works with the theme changer" requirement). Add a palette-matrix test entry if `swanStyleLensPaletteMatrix.test.ts` covers per-lens contrast — verify aurora-console's 13.16 receipt in `visuals.ts` matches reality under each theme.

**S3 — Second console adopts the skin (this is what makes it "reusable", not a claim).**
Pick ONE and wire it exactly like Coach: token bridge → lens-scoped de-box → `<ConsoleAtmosphere />` inside a `data-console-state` root. Recommended: the **admin dashboard** surface Sean has open in the world-factory gallery (`w2-chrome-sovereign-admin` / `w2-swan-deep-field-admin` HTMLs are his design references — mine them for intent, do not copy markup). Accept: two consoles, one skin, zero duplicated CSS; contract test extended to the second surface.

**S4 — Rule 48 audit record** for the whole day's arc (W3 rebuild → v2 batch → metrics → Aurora Console), at `docs/ai-workflow/AI-HANDOFF/COACH-COMMAND-CENTER-V2-AUDIT-RECORD-2026-07-17.md`. All 12 sections; the "Future review hooks" section must include: aurora motion cost on low-end phones, `--console-*` contrast under every theme, and whether per-route lens scoping (currently none — `roleMapping.ts` `routeOverrides: []`) should gate console skins.

**S5 — Push.** ONE push of the batch; verify deploy (bundle-hash watch + `/api/health`); then Hermes memo + review-queue update for Codex.

## 6. Still open (Sean-owned)

- **SSE spike (gates streaming replies, P1.1):** flag ON in prod (endpoint 401 = armed), launcher `c:\tmp\sse-spike-probe.ps1` intact, route `backend/routes/aiStreamSpikeRoutes.mjs` mounted. Sean runs one PowerShell command → STREAMING/BUFFERED verdict → record it in `SWAN-COACH-B1-STREAMING-SPEED-PLAN-2026-06-10.md`, then remove the spike route + env var.
- **XR on-device pass:** type hello → reply; dictate → red pulse + waveform; keyboard never covers the composer; More → "What can I say?"; proposal confirm card with countdown; destructive → demands a second tap. Now also: the aurora, once S1 lands.
- **Codex:** hostile pass owed on the shipped batches (review-queue 2026-07-16T24:05Z + 2026-07-17T02:05Z); must rebase coach WIP onto main ≥ `f54b5a6aa`.

## 7. Guardrails (pinned by tests — do not "simplify" away)

Never fabricate a coach reply (`interpretCoachChatResponse` is the only outcome authority) · no raw server error text in cards · retry/send always busy-gated · conversation-identity + object-identity guards on every `setActiveConversation` · console skin stays **fail-closed** (other lenses render identically) · `--console-*` values only ever compose from theme vars — **never raw hex** · phone height reserves are device-matrix-tuned (132px), don't shave them · 300-line cap (`sectionSplit.test`).

## 8. If Sean asks for the AI Village on this
He asked for a Village run to choose the finish path. **Rule 16: paid — ask first.** My Final-Decider read: the path is already decided (§5) and a Village run on an unapproved visual bet is premature spend. Recommend the **free triangle** (Claude+Codex+Gemini) on the Aurora *architecture* if he wants a second opinion, and save the Village for the per-route-lens-scoping question in S3 if that turns architectural.
