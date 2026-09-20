# ADJUDICATION — Astra Mega Blueprint, Coach Command Center AI harness

**Call:** `scripts/consult-astra-subscription.mjs --document tmp/coach-cc-ai-harness-20260920/PACKET.md
--mega-blueprint --out tmp/coach-cc-ai-harness-20260920/REPLY.md`
**Transport:** `codex-cli` · **billing:** `chatgpt-subscription` (**$0**) · **effort:** high
**Wall:** 709.1 s · **Tokens:** 52,696 in / 23,121 out / 3,465 reasoning
**Reply:** 1,506 lines · 94,770 bytes
**Requested model:** `gpt-6-astra`; **served model: `null` — IDENTITY UNVERIFIED.**
`codex exec --json` emits no model field (measured on codex-cli 0.154.0; the substring `model` does not
occur in the raw JSONL). **The requested model is provable; the served model is not.** Do not cite this
as a verified-Astra review.

**Packet:** 57,632 bytes · SHA-256 `a599d8e7756f460ff69d9e71e374395904858c078f865802d82513f08afb40bf`
**Secret scan:** CLEAN (0 hits).
**Split:** `--check` exit 0 · 9/9 documents present · 12 files written.
**Splitter warning:** `03-contracts.md` is 352 lines — over the 300-line Rule-4 budget. Carried, not hidden.

---

## 0. Why this file exists

A hostile review is an **input**, not a verdict. Astra's PART A carries a scope disclaimer of its own
("supplied packet only… `[VERIFIED]` means directly supported by a supplied excerpt, **not independently
reproduced**"). So every finding below was **re-measured against the real repository** before being
accepted, downgraded, or refused. Relaying a finding I had not checked would have made me a courier.

**Tally: 16 findings → 11 CONFIRMED · 3 DOWNGRADED · 1 REFUTED · 1 UNVERIFIED · 0 silently dropped.**

Severity after adjudication: **4 HIGH · 7 MEDIUM · 0 CRITICAL · 0 LOW.**

---

## 1. CONFIRMED (11) — re-measured, and the finding survives

### A1-06 HIGH — the privacy docblock contradicts the call it documents
`frontend/src/hooks/useCoachCommand.ts:17` states, in the file's own header:

> `PRIVACY: selectedClientId passed as an ID — no names sent to backend.`

The same file then sends three more fields (`:96-101`): `message`, `previousContext`, `routeContext`.
`message` is the coach's **raw free text** — the single most likely carrier of a client's name in this
whole surface. So the sentence is true only of `selectedClientId` and reads as a blanket privacy claim.

**Why it matters more than it looks:** this is the *third* instance of one pattern already recorded in
`REFERENCE.md` — *a documented promise the code does not keep* — and it sits on the boundary the Cortex
Contract ranks **#1**. A reviewer trusting the docblock would conclude the boundary is ID-only.
**Fix:** narrow the sentence to what is true, and state where free text is redacted (see §2, A1-05).

### A1-11 HIGH — the pending-confirmation store is process-local and non-durable
Astra could only say `[UNKNOWN]`; the packet had given it the export inventory, not the storage. Measured:

```
backend/services/ai/destructiveOperations.mjs:17
const pendingOps = new Map();
```

A bare in-process `Map`. Consequences, stated plainly: **a restart loses every pending confirmation**;
**a second process or replica cannot see a confirmation created by the first**; and confirm/cancel
serialize against a per-process object, not a shared record. On a production SaaS with a Render
deployment this is a real availability-and-consistency defect, not a theoretical one.

**Astra's caution was the right call and is now upgraded from `[UNKNOWN]` to MEASURED.** Its proposed
remedy — adjudicate the existing store first, migrate only if it fails the contract — is preserved in
`05-slices.md`.

### A1-15 HIGH — the reviewed bytes are not pinned
1,154 dirty entries at `ffe4f805e`. That commit cannot identify what was reviewed, because most of the
reviewed files are *modified or untracked* relative to it. Astra's demand is correct: a manifest of
supplied files + hashes + diffs, with review and tests bound to that snapshot. This is the same defect
class as the project's own recorded lesson — *a `git log -S` absence search proves nothing in an
untracked worktree.*

### A1-03 HIGH — `IMPLEMENTATION VERIFIED (LOCAL)` rests on a precondition it declared unmet
`COMMAND-CENTER-EXPERIENCE-DECISION-PACKET-2026-09-06.md` asserts `implementation_authorized: true` and
`Status: IMPLEMENTATION VERIFIED (LOCAL)`, while in the same document requiring that backend/recovery
work "must be reconciled before new UI claims". No reconciliation receipt was supplied, and none is in
this package.

**Astra's epistemics here are better than a bare accusation, and I am keeping them:** the absence of a
receipt *in the packet* does not prove reconciliation never happened. So this is recorded as
**UNVERIFIED-FROM-PACKET**, not as a false claim. The action is the same either way: produce the receipt
before carrying the status forward.

### A1-02 MEDIUM — "210 files" is stale, and now measured
`SWAN-COACH-ASSISTANT-MASTER-BLUEPRINT.md:29` claims 210 files under `coach-assistant/`. Measured:

| Measure | Value |
|---|---|
| Files on disk | **324** |
| Files tracked by git | **320** |

The claim is **short by 114 files**. Astra's fix is adopted: drop the count from normative architecture,
and any future count must carry its command, exclusions, timestamp and dirty-tree snapshot.

### A1-12 MEDIUM — **my own packet contained a contradiction** (self-inflicted)
Packet §6.2 lists **three** privacy-named modules with no test at their own path:
`inputSanitizer.mjs`, `deIdentifier.mjs`, `phiScanner.mjs`. The very next sentence says **"Two of the
four have no test at their own path."** Three, not two. The arithmetic was mine and it was wrong.

**This is the finding I would most want to have caught myself**, because §6.2 was written to make a
safety point and the error is *in the safety point*. Correction: **three of four.** (The fourth —
`outputValidator.detectPii` — is referenced by tests, but that does not establish a behavioural
assertion of `detectPii` itself, which Astra also notes and which I accept.)

### A1-16 MEDIUM — the packet misnumbered the archive rule (self-inflicted, independently caught)
Packet §8 said the archive requirement is **Rule 74**. It is **Rule 86**, and
`docs/ai-workflow/references/HOSTILE-REVIEW-ARCHIVE.md` explicitly **forbids** renumbering it down:
`main`'s Rule 74 is Proof-Before-Done and `scripts/review-debt.mjs` already cites it that way, so "74"
would mean two things at once.

**Two independent discoveries of the same defect:** I found it while the call was in flight (and fixed
the user-level `SOUL.md`, `MEMORY.md` and `REFERENCE.md`), and Astra found it in the packet. That
convergence is the strongest evidence in this round that the defect was real.

**The input packet is NOT edited** — its SHA-256 is the provenance of what was sent, and editing it
would invalidate that. The **deliverable** carries the correction: `00-README.md:49` says Rule 86 and
`06-bans.md:8` bans the 74 label outright.

### A1-13 MEDIUM — two dormant/misleading artifacts
Both halves re-verified: `providerCostTracker.mjs` (222 lines) has **no production importer** — its only
importer is `backend/tests/unit/providerCostTracker.test.mjs:7` — and the two
`useCoachAssistantCommandSummary*` test files (322 + 36 lines) test `useCoachAssistant.ts` and
`utils/coachCommandResultSummary.ts`, i.e. **they are named after a module that does not exist.**
Accepted as `DORMANT/NOT WIRED` labelling plus a separately-scoped rename. Not to be wired merely to
justify its existence.

### A1-14 MEDIUM — the cap is an integration prerequisite, not an afterthought
Confirmed against measured sizes: `commandExecutor.mjs` **885** · `aiChatRoutes.mjs` **1090** ·
`useAIChat.ts` **567** — all over the 300-line Rule 4 cap. Any plan that adds guards directly into these
files violates the cap on arrival. Extraction of the touched responsibilities is therefore a
**prerequisite of the first slice**, which is what the package now says.

### A1-09 MEDIUM — `dispatched` proves handoff, not persistence
`useCoachCommand.ts:68-72`: the true branch returns `fallback` — *"Sent to the active workout surface."*
That is a claim of **delivery to a surface**, and the code is honest about the false case ("No active
Workout Logger was open. No workout was submitted."). What it cannot claim is that a form accepted the
change or that a workout was **saved**. Astra's three-way split — `handoff_delivered` /
`form_updated` / `business_effect_committed` — is accepted; only an authoritative save-path receipt may
claim persistence.

### A1-01 MEDIUM — the authority chain genuinely is incomplete
Confirmed as a documentation-state defect, with Astra's own scope caveat honoured. The master blueprint
delegates authority to two documents, neither of which is itself a master blueprint, and the 2026-09-06
packets disclaim being replacement blueprints. **There is no single live authority for this surface.**
Accepted fix: make this package's `00-README.md` the canonical index **for the AI harness only** — not a
wholesale supersession of unrelated Coach Universe / atomic-save / Brain Console work. (Astra's A2-06
self-corrected exactly this overreach in its own draft.)

---

## 2. DOWNGRADED (3) — real, but the stated mechanism was wrong

> Per this project's review discipline: a finding that is real but whose stated reach is unreachable or
> already-handled gets **downgraded, and I say so.** A downgrade is not a dismissal.

### A1-05 HIGH → MEDIUM — enforcement on the chat lane **does** exist
Astra: *"A production import of `EthicalAIPipeline` at `routes/masterPrompt/ethicalAI.mjs:8` does not
establish enforcement on `/api/ai-chat`."* **The specific claim is false.** Measured:

- `backend/routes/aiChatRoutes.mjs:72` imports `strictPiiMiddleware` from `middleware/piiSanitizationMiddleware.mjs`
- `backend/routes/aiChatRoutes.mjs:466` applies it **inline on the messages endpoint**:
  `requireSubscription('pro', { feature: 'chat' }), aiRateLimiter, strictPiiMiddleware`
- `backend/middleware/piiSanitizationMiddleware.mjs:322` — `export const strictPiiMiddleware = piiSanitization({ blockCritical: true })`
- it detects/redacts PII patterns, collects **name hints from the request object** (`:100`, `:124`) and
  flags PHI (`:205`)

So the chat boundary is not unguarded. **What survives, and is the sharper point:** a PII *redactor* is
not a Cortex-Contract *enforcer*. The contract requires approved-note metadata and that notes be
"policy context, not executable instruction" — a prompt-injection boundary. `piiSanitization` does not
implement either. Astra's fix (one enforceable provider-admission boundary used by every in-scope model
invocation) is accepted; its premise is corrected.

### A1-07 HIGH → MEDIUM — the code is right; the **comment** is the defect
Astra feared errors could leak into the chat lane. Measured: they cannot. `useCoachAssistant.ts:105-109`
branches on `type === 'error'`, appends the error messages and **returns** — the chat call at `:111-132`
is a *separate* branch reached only by an explicit `fallback_to_chat`.

But the file's own header, `useCoachAssistant.ts:5`, reads:

> `*     ├─ fallback_to_chat | error  → chat lane (sendMessageWithConversation)`

**The docblock claims a fallback the code does not implement.** So the finding converts from "unsafe
routing" to **"a documented promise the code does not keep"** — the same pattern as A1-06, and the
**fourth** instance of it in this workspace. Astra's exhaustive-outcome-reducer fix is still worth
having (it makes the guarantee structural rather than incidental), so it is retained at reduced
severity.

### A1-04 HIGH → MEDIUM — the route config **is** consumed
Astra: route objects "are insufficient to prove the router renders `CoachCommandCenterPage`." Partly
fair, but the consumption link does exist: `UniversalDashboardLayout.tsx:39` imports
`roleConfigurations` from `./UniversalDashboardLayout.routes`. So the declarations are not orphaned.
**Residual, and accepted:** importing a config is not proof that each role's JSX renders the expected
component and reaches the expected transport. The demand for the rendered JSX + mounted call chain is
kept; the "insufficient evidence" framing is downgraded.

---

## 3. REFUTED (1) — already implemented; do not relay as a defect

### A1-08 HIGH — REFUTED
Astra: a confirmation may carry `operationId: null` (`useCoachCommand.ts:26-54`) while confirm submits
an operation ID (`:170`), and nothing shows how a null-ID confirmation is disabled.

Measured — `CoachCommandCenter.actions.ts:225`:

```ts
if (!confirmation.operationId) return { success: false, error: 'No pending operation id was returned.' };
```

A null-operationId confirmation is **refused before any request is made**, and
`CoachCommandCenter.commandLane.ts:62` carries `operationId` through unchanged. Astra's proposed fix
("render legacy/null confirmations as unavailable") describes **behaviour that already exists**.
Recorded as refuted. It is not carried into the package as an open defect.

---

## 4. UNVERIFIED (1) — plausible, but no evidence produced

### A1-10 — registry-derived write classification could be evaded
Astra: a mutating handler whose registry entry declares neither `destructive: true` nor
`requiresConfirmation: true` would survive `AI_COMMAND_WRITES_ENABLED=false`.

The mechanism is **structurally plausible** — `commandLaneControls.mjs:29-31` does derive write-ness from
the registry entry — and Astra's rule (keep the registry the *sole* runtime classifier; do not add a
competing command-name list) is correct. But **no evidence was produced that any such handler exists**,
and producing it requires auditing all 49 dispatchers against all 18 registry files. **Marked
UNVERIFIED, not confirmed.** It is carried into `09-tests.md` as a test to write rather than a defect to
fix: assert that every registry entry declaring a mutating effect also declares a write flag.

---

## 5. Astra's A2 self-review — accepted as-is

A2 is Astra reviewing its own draft, one pass, as the mandate requires. All seven corrections are
improvements and none needed adjudication (they are fixes to its own un-emitted draft, not claims about
this repository). Two are worth naming because they show the pass was real rather than ceremonial:

- **A2-01** narrowed an "exactly once" promise to only what a reviewed dispatcher sharing the **same
  database and transaction** can guarantee — i.e. it withdrew a claim it could not support.
- **A2-04** refused to let its own proposed ledger replace the existing operation store without
  adjudication — which, given §1/A1-11, is exactly the right instinct.

---

## 6. What is NOT claimed

- **No commit, no push, no production contact.** `main` untouched at `fe388691f`.
- The **served model is unverified** (§0). This is a subscription-transport review of `gpt-6-astra` as
  *requested*.
- Astra reviewed **only the packet**, never the repository. Every `[VERIFIED]` above is *its* label for
  "supported by a supplied excerpt". The repository-level measurements in this file are **mine**, and
  are cited by `file:line` so they can be re-run.
- **Rule 46 is not satisfied by this round.** Astra is a review seat; the chain still owes the Final
  Decider. Nothing here is a merge authorisation.
