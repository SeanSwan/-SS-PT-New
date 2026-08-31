---
decision: "Four PRs are open against main from a single session's work. This packet asks Codex to attack all four, and names the specific places I believe are weakest."
status: open
supersedes: none
---

# Codex hostile-review packet — four open PRs (2026-08-28)

**Author:** Opus 5 · **Linear:** SWA-219 · **Reviewer requested:** Codex
**Standing:** every finding below is mine, from my own hostile passes. I ran no external model — none were available this session. **This packet is therefore single-brain-reviewed and should be treated as such.** That is the single biggest reason to read it adversarially.

---

## 1. What to attack

| PR | Scope | Size | Risk surface |
|---|---|---|---|
| **#93** | Egress: operator-identity redaction + canary, pre-commit gate, 97 docs cleaned, 10 consult launchers gated | 114 files, +905/−415 | Every outbound LLM request |
| **#94** | Location / gym-ops spine (SWA-74) | 10 files, +979/−2 | **Alters live `sessions` table** |
| **#96** | Trainer onboarding + receipt-backed credential custody (SWA-62) | 22 files, +3067 | **Applicant PII + file uploads** |
| **#97** | S1 shadow price observation + append-only audit (SWA-62) | 11 files, +855 | **Money path (`cartRoutes`)** |

All four are OPEN and MERGEABLE against `origin/main`.

---

## 2. Where I think they are weakest — start here

### 2.1 PR #97 — the money path (highest stakes)

`cartRoutes.mjs` gains `void observeCartAdd({...}).catch(() => {})`. My argument that it is safe:
- `async` function, entire body inside `try` → cannot throw synchronously
- not awaited → zero added latency
- `priceFloorEnforce` defaults false → charged price untouched

**Attack these specifically:**
- Is `void fn().catch()` genuinely un-throwable in *all* paths, including if `observeCartAdd` is somehow not a function at import time (module resolution failure)?
- `priceShadowObserve` defaults **TRUE** — a `price_change_logs` row per cart add from the moment the migration lands. Is that write volume acceptable, and is the table indexed for it?
- Does an unbounded fire-and-forget promise per cart add create backpressure under load?

### 2.2 PR #94 — the `sessions` ALTER

Adds nullable `sessions.locationId` with `onDelete: SET NULL` + index. Main already had a free-text `Session.location` STRING, which this **keeps** and re-labels LEGACY.

**Attack:** two representations of one fact now coexist. I judged that acceptable because the branch documented the transition and nothing reads `locationId` yet. Is a dual-source-of-truth acceptable to ship, or should the backfill land first?

### 2.3 PR #96 — PII and custody

The original port used `safeKey()`, a **string-prefix** check on the uploaded file key. A parallel agent replaced it with receipt-backed custody (a `TrainerCredentialUpload` row proving this user uploaded the object). I verified and committed that work; **I did not write it.**

**Attack:**
- Receipt reuse: attach sets `status:'attached'` and nulls `expiresAt`; lookup requires `'pending'`. Is there a path that re-opens an attached receipt?
- `onDelete: 'RESTRICT'` on the credential→Users FK means **a user with credential uploads cannot be deleted.** I flagged this as probably-correct for legal retention, but it will surprise an admin deleting a test account. Is RESTRICT right, or should it be a soft-delete?
- The cleanup worker deletes rows. I verified it can only touch `uploading`/`pending` with elapsed `expiresAt`, or stale `deleting` claims — and that attached rows have `expiresAt: null` so are doubly unreachable. **Please try to break that.**

### 2.4 PR #93 — the redactor

- The canary is a **positive control on the instrument, not a coverage proof**. It cannot detect a class nobody thought of — which is exactly how the original incident happened.
- `operator-identity-8dot3` requires a `Users` prefix, so a **bare** 8.3 short name in prose is not caught. I found one that way, by reading, not by the gate.
- Common-word account names (`root`, `admin`) are deliberately excluded. That gap is asserted by a test, but it is still a gap.

---

## 3. Process facts you should weigh

- **No external review.** Claude-only, this session. Every "verified" below is self-verified.
- **A parallel agent's uncommitted work was found staged in my worktree** (21 files, the PR #96 hardening) and committed by me to preserve it. Authorship is disclosed in the commit. I verified it (77/77) but did not author it — treat its design as unreviewed-by-its-author.
- **My own numbers were wrong four times this session** and are corrected in `WIP-EXTRACTION-INVENTORY-2026-08-27.md` §1. Three shared one cause: *a filter or sample narrower than the thing being measured, reported as complete.* Assume that class is still present somewhere I did not catch.
- Concretely: `priceResolver.mjs` (134 lines, PR #97) was found **only by a transitive import walk** after a name-based grep missed it. If any extraction is missing a file, that is the mechanism.

---

## 4. Verification I actually ran

| PR | Evidence |
|---|---|
| #93 | full tree `scan-secrets --all` → 14,062 files, 0 hits; context-gateway 154/154; live `glm-audit --send` with bogus key → `3 redaction(s) before send — HOME_PATH, EMAIL` then 401; guard test proven to fail when a bare-`fetch` launcher is planted |
| #94 | 50/50 unit tests **after fixing a real 500** (`listLocations` read `req.query.includeInactive` unguarded); deps verified on main; 6 files byte-identical to source |
| #96 | 77/77 across 7 files; **mutation-validated** — removing `safeKey` failed exactly 3 security tests and no others, restored to 0 diff |
| #97 | 20/20 (verified on the *ported* tree, not only the source); migration loads; cart call site byte-identical |

**What I did NOT verify anywhere:** real-Postgres migration execution, any browser/end-to-end journey, and production behaviour. All four carry migrations that have only been static-checked.

---

## 5. What is deliberately NOT in these PRs

The remaining WIP work — notification delivery, communication audit, messaging extensions — is **87 files / 12,846 lines with 23 test files**, not a slice. I stopped rather than rush it.

`CommunicationAuditLog` looks small (351 lines) and separable, but **every one of its consumers** (`messagingSafetyService`, `notificationDeliveryService`, `messagingReportModerationService`, `messagingAdminOverrideAuditService`) lives inside that program. Porting it alone lands a table and a service nothing on main calls — dormant code by Rule 27. It should land *with* the program, not before it.

That program also carries `20260630050000-add-enterprise-notification-fields.cjs`, which **alters the `Users` table** (idempotently, via `addColumnIfMissing`). It deserves its own review, not an appendix to this one.

---

## 6. What I want from you

1. **Break the money path** (§2.1). That is where a mistake costs the most.
2. **Break the credential custody chain** (§2.3) — especially receipt reuse and the cleanup worker's delete scoping.
3. **Find the file I missed.** §3 names the mechanism; assume it recurred.
4. Rule on the two judgment calls I made alone: dual-source-of-truth on `sessions.location` (§2.2), and shipping `priceShadowObserve` default-true (§2.1).
5. Tell me if committing another agent's staged work was the right call, or whether it should have been left for its author.
