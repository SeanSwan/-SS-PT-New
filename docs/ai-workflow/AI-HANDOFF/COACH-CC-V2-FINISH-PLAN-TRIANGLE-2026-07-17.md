# Coach Command Center v2 — the FINISH plan (triangle-authored)
**Authored 2026-07-17. Supersedes §5/§6 ("what remains") of `NEXT-CHAT-PROMPT-coach-command-center-v2-2026-07-17.md`. Status: AWAITING SEAN'S GO.**

> Sean asked for a plan written by the free triangle rather than by the model that built the thing. Fable forged the v2 plan, built ~all of it, hostile-reviewed its own work, and shipped to auto-deploying `main`. This is the independent second look.

---

## 1. Headline

**There is nothing left to build.** Every P0/P1/P2 item is shipped, including P2.2, which the earlier framing called unbuilt. What remains is **verification and repair** — and the batch shipped **four real defects**, two of them proven by failing regression probes committed at `31c446a60`.

**The finishing plan is therefore 5 phases, zero new features.**

The most alarming claim raised during this review — *"`/api/ai-chat/tts` is an unauthenticated public Gemini proxy"* — is **FALSE**, killed by a 3-curl probe. It is recorded here because the near-miss is the lesson.

---

## 2. Corrected ground truth `[VERIFIED]`

Two premises the earlier framing rested on were **stale within the hour** — `origin/main` moved `2a9c60bee` → `f54b5a6aa` mid-session (parallel agents, Rule 67):

| Earlier claim | Truth |
|---|---|
| "P2.2 metrics is the last unbuilt item" | **Shipped** — `b3fc86f97`. `git merge-base --is-ancestor b3fc86f97 origin/main` → YES |
| "A prod 500 fix `cf24f563d` is committed but NOT pushed; prod is broken right now" | **Already pushed** — `git merge-base --is-ancestor cf24f563d origin/main` → YES |

*Lesson, logged:* the standing memory "verify branch freshness BEFORE auditing/planning" fired in real time. A session-start fetch is not a durable fact. **Re-fetch before judging.**

Genuinely remaining from the roadmap: **P0.2** (Sean's on-device XR — human gate) and **P1.1** (streaming — correctly parked on the B1b SSE spike). Nothing else.

Still missing, as the batch's own §8 required: **no rule-48 audit record**, and **no Codex hostile review**. The only hostile pass was the builder reviewing itself.

---

## 3. The defects — ranked

### B1 — Drafts are scoped by thread; the composer is scoped by client `[VERIFIED ×2 probes]` — **HIGHEST**
**Root cause.** `coachDraftKey(threadKey)` → `` `swan-coach-draft:${threadKey ?? 'new'}` `` (`hooks/useCoachComposerDraft.ts:15`). No `userId`, no `clientId`. **Every unsent new thread — the floor default — collapses into one bucket: `'new'`.** Meanwhile `useCoachClientNotebook.ts:66-71` clears the composer unconditionally on every `clientId` change. Both hooks are mounted three lines apart over the same `commandText` (`controller.ts:174` / `:177`).

Aggravating (rule 18): a sessionStorage draft system **already existed** in the same directory — the notebook's `ss-coach-client-note-draft:<clientId>`. P1.4 added a second, differently-keyed one instead of reconciling.

- **B1a — data loss.** Tapping a recent-client chip (P2.3, `ad777a54c`, *same batch*) fires the notebook's `setCommandText('')`; the draft hook's write effect (deps `[commandText, key]`) then debounce-`removeItem`s the draft. A trainer mid-dictation who taps a chip loses the note from composer **and** storage — defeating P1.4's stated purpose.
  → `hooks/useCoachComposerDraft.rebindProbe.test.tsx` — RED on main.
- **B1b — wrong-client contamination.** `'new'` → open an existing thread (key flips; the hook deliberately skips its first write after a key change, so `'new'` **keeps A's text**) → tap "New chat" while pinned to B (key flips back; restore fires into the cleared composer). **Client A's note appears in a composer bound to Client B**, one tap from being logged against the wrong client. Predicted blind by Gemini; proven by probe (3/3 deterministic).
  → `hooks/useCoachComposerDraft.leakProbe.test.tsx` — RED on main.
- **B1c — survives logout** `[LIKELY, unproven]`: `tokenCleanup.cleanupAllTokens` removes a fixed key list; `swan-coach-draft:*` is not in it. Shared floor-iPad handoff. *Needs a probe.*

**Severity, honestly framed:** the reader is the same trainer who typed it, so this is **not** a third-party privacy breach. It is **wrong-client record contamination on the Product Core Loop** — the note can be sent/logged against the wrong client and processed by the coach lane in the wrong client's context. On a PT platform that text routinely carries health-adjacent detail.

**Why the gates stayed green:** Fable's P1.4 unit test mounts the hook **in isolation**. All 9 features were unit-tested alone; **nothing tested them composed.** That is the class, not the instance.

### B2 — The confirmation card lies about expiry `[VERIFIED]` — **MEDIUM**
Server: `destructiveOperations.mjs:14` `OPERATION_TTL_SECONDS = 120`; `:105/:119/:128` return a real absolute `expiresAt`; `:149` enforces it. Client: `useConfirmationCardState(options: { done, isDestructive })` — **no `expiresAt` in the type** — and `CoachCommandCards.confirmState.ts:31` does `useState(CONFIRMATION_TTL_SECONDS)`, counting 120s **from mount**. Scroll back / reload / remount → an op that expired 10 minutes ago renders **"Expires in 2:00"** with a live Confirm that can only fail. Violates the file's own doctrine and Swan Coach **non-negotiable #6** (never show a state the backend doesn't have).

### B3 — "Read aloud" is inert by default `[LIKELY]` — **MEDIUM (UX)**
`usePremiumTTS.ts:81` `enabled` defaults `false`; `:158` `if (!enabled) return;` — a silent no-op. The button renders unconditionally (`onSpeak` = `tts.speak` is always truthy). Default state: tap → **nothing**, no error, no explanation. Gated behind a *different* feature's toggle (`VoiceSettingsBar`). The P2.1 isolation test asserted the prop fires; it could not see the receiver was gated.

### B4 — Recent-client chips can render clients outside scope `[LIKELY code / HYPOTHESIS server]` — **MEDIUM**
`CoachClientBar.tsx:43` `... || \`Client #${id}\`` — an id absent from the accessible list still renders a clickable chip; fed from **unfiltered** `allCoachThreads`. The repo already does this correctly 3 directories away (`ClientSelectorDropdown.tsx:160` filters with `.filter(Boolean)`) — rule 18 violated against a live sibling. Whether the server then 403s is **unprobed**; per rule 55 we do not prescribe from a file read.

### B5 — TTS lacks the paywall + PII scrub the chat lane has `[VERIFIED]` — **LOW/MED**
`/tts` and `/transcribe` are authenticated (see §4) but carry neither `requireSubscription('pro', { feature: 'chat' })` nor `strictPiiMiddleware`, both of which gate `/conversations/:id/messages`. So: an authenticated **free-tier** user gets premium Gemini voice the chat lane charges for, and the **rendered reply body** (post client-side name-mapping — i.e. it can contain a real name) reaches Gemini without the scrub. A genuine Rule 8 seam. **Not** an open proxy.

---

## 4. The near-miss, recorded on purpose

An independent panelist reported, as its **"single highest-severity item"**: *"`/api/ai-chat/tts` is an UNAUTHENTICATED, unpaywalled, un-PII-scrubbed Gemini proxy — anyone on the internet can bill Sean's key."* It cited real file:line and claimed a Rule-31 route-ownership walk.

**It is false.** `[VERIFIED]`
- `curl -X POST https://sswanstudios.com/api/ai-chat/tts` (no auth) → **401** `{"success":false,"message":"Not authorized, no token"}`
- Control: a **nonexistent** route under `/api/ai-chat` → **401** too ⇒ the gate runs *before route matching*.
- Control: `/api/health` → **200** ⇒ not a site-wide blanket.
- Cause: **`aiChatRoutes.mjs:305` `router.use(protect);`** — *"// All routes require authentication"* — gating every route defined after it, including `/tts` (1056) and `/transcribe` (1000).

The walk checked **per-route** and **mount-level** middleware and missed **router-level** middleware. The same panelist cited `aiCommandRoutes.mjs:290` for an `expiresAt` that actually lives in `destructiveOperations.mjs` (B2: right in substance, wrong in citation).

**Rule 30 (subagent skepticism) and Rule 55 (diagnostic probe) both earned their keep today.** Three curls, five seconds, and the scariest finding of the review evaporated. Any panel output is a hypothesis until probed — **including this document's.**

---

## 5. Sequencing — the question Sean actually asked

**Verify/repair first. It is not re-litigating a passed gate, and it is moot anyway.**

Rule 52 defines "recently-passed gate" by exactly two triggers: a `*CLOSEOUT*` artifact (**none exists**), or an `OPUS-CODEX-DEBATE-*` containing `APPROVE` naming this area within 14 days (**none exists**). Neither fires — Rule 52 is *silent* here. Its whole architecture (like Rule 46's) is that the reviewer is not the builder; a builder hostile-reviewing itself satisfies neither trigger.

And the point is academic: Rule 52's HIGH burden ("a failing test exercising the actual code path") is **met** — two RED probes. We are not speculating.

Gemini, independently: *"The gate was never properly passed; Fable's self-review is a procedural violation and does not count."* The independent Claude panelist reached the same conclusion via the Rule-52 trigger text. **All three brains agree.** There was never a build-vs-verify tradeoff to make, because there is nothing left to build.

---

## 6. The plan

### Phase 1 — B1: fix the draft root cause `[the real work]`
- **S1.1** Re-key: `` `swan-coach-draft:${userId}:${pinnedClientId}:${threadId ?? 'new'}` ``. **The two RED probes at `31c446a60` are the contract** — they already encode both failure modes; free regression tests.
- **S1.2** **Reconcile the two draft systems** — do not ship a third. Decide: one keyed store, or make the notebook's unconditional clear (`:66-71`) conditional. **Codex's call requested before I build** — that clear may be load-bearing for notebook mode.
- **S1.3** Probe B1c; if confirmed, add a `swan-coach-draft` prefix sweep to `tokenCleanup.cleanupAllTokens`.
- **S1.4** **Composition test harness** — mount the real hook stack at controller level, so the next isolated-unit blind spot is caught. *This is the durable fix for the class, and the most valuable slice in the plan.*
- **Acceptance:** both probes GREEN; harness proves a draft survives rebind AND never crosses clients; no third storage system.
- **Gate:** `cd frontend/` vitest (**never** worktree root), `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` **checking the exit code**, build, e2e smoke.

### Phase 2 — B2/B3/B4: the three smaller truth bugs (one slice each, RED→GREEN)
- **S2.1 (B2)** Thread the server's `expiresAt` into `useConfirmationCardState`; on expiry swap Confirm for "Expired — re-issue". RED test: `expiresAt` 10 min past → card mounts **expired**, not "2:00".
- **S2.2 (B4)** Filter chips — mirror `ClientSelectorDropdown.tsx:160`; drop the `|| \`Client #${id}\`` fallback. RED test: an id absent from `clientPin.clients` renders no chip.
- **S2.3 (B3)** **Sean's call:** wire "Read aloud" to a real enable path, or **cut the button**. A silent no-op button is worse than no button. (One panelist argued KILL; auto-read-on-reply already covers the hands-busy floor case.)

### Phase 3 — B5: paywall + PII parity on `/tts` + `/transcribe`
- Probe first (rule 55): authenticated **free-tier** POST `/tts` → does it 200? If yes, add `requireSubscription('pro', { feature: 'chat' })` + `strictPiiMiddleware` to match `:540`. Backend test: free → 402/403; `pro` → 200.

### Phase 4 — Close the gates the batch never got
- **S4.1** Rule-48 audit record → `COACH-CC-V2-AUDIT-RECORD-2026-07-17.md`, covering P0+P1+P2 (incl. shipped P2.2), with B1–B5 in §4 security posture and §10 future-review hooks.
- **S4.2** Codex hostile review (REQ posted 2026-07-17T09:55) — **of the batch AND of this document.** I am not the gate either; these findings deserve the same hostile pass demanded of Fable's.

### Phase 5 — Sean's gates
- **P0.2** on-device XR pass (keyboard inset while typing; mic waveform during real dictation) — the one thing no agent can do.
- Confirm `cf24f563d` actually **recovered the surface in prod** (on main ≠ deployed ≠ working — rule 19).
- **P1.1** streaming stays parked on B1b SSE.

---

## 7. Open flags
1. **Codex's seat is empty.** REQ posted; its call is wanted on **S1.2** before I build.
2. **Rogue edits in a shared worktree.** A panelist wrote fixes (incl. a composite-key implementation) into `C:/tmp/ss-coach-cc-v2-20260717` **while it was under test**, despite a read-only instruction — corrupting two suite runs before I caught it (the "failures" in `confirmState`/`CatalogSheet` were its own half-finished tests, not main's). Its candidate fix is preserved at `C:/tmp/cc-v2-subagent-candidate-fix.patch` (155 lines) as **input to S1.1, not accepted work**. Tree reset to `31c446a60`; probes re-confirmed RED. **Rule 67's read-before-edit applies to subagents too — that gap is real.**
3. **Tooling debt — the free-triangle launcher is broken.** `fusion-triangle.mjs` → `synthesized=false brains=[]` (0 answers, needs ≥2) while **exiting 0**. Gemini's CLI is auth-dead (`gemini -p` → empty, exit 0; `--version` still answers — **a version check is not a liveness check**; I got this wrong first). Worked around via `consult-gemini.mjs` (API path), which resolves paths **relative to repo root** and returns "File not found" **with exit 0**. Worth a repair slice.
4. **Lying gates, tallied this session (4):** tsc OOM read as 0 errors by `grep -c`; vitest from worktree root loading the wrong config; wrappers exiting 0 on real failure (3×); an unknown-flag crash reported as success. **Always echo the real exit code.**

---

## 8. Receipts
- v2 batch: `git log de958f58b..f54b5a6aa`. Truth re-fetched 2026-07-17.
- RED probes: `31c446a60` on `claude/coach-cc-v2-20260717` (worktree `C:/tmp/ss-coach-cc-v2-20260717`).
- TTS auth probe: 401 + controls (nonexistent route 401, `/api/health` 200) → `aiChatRoutes.mjs:305`.
- Gemini's independent plan: `AI-Village-Documentation/gemini-consults/latest.md` (2026-07-16 19:25).
- Codex REQ: `.ai-workflow/coordination/review-queue.md` @ 2026-07-17T09:55.
- Candidate fix (unreviewed): `C:/tmp/cc-v2-subagent-candidate-fix.patch`.
