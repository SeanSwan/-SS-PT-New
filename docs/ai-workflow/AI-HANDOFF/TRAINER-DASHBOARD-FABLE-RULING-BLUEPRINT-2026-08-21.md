# Fable 5 — Final-Decider Ruling

**Reviewer:** OpenRouter `anthropic/claude-fable-5` (Fable via OpenRouter credits; Claude-subscription Fable was capped)
**Document:** docs/ai-workflow/AI-HANDOFF/TRAINER-DASHBOARD-AUDIT-VERIFICATION-2026-08-21.md
**Seed:** docs/ai-workflow/AI-HANDOFF/TRAINER-DASHBOARD-AUDIT-REVIEW-PACKET-2026-08-21.md
**Tokens:** 16400 in / 16000 out · **Cost:** ~$0.9640 · **Wall:** 214.2s

---

# FABLE 5 — BINDING RULING
**Trainer Dashboard Audit · Arbitration of Opus 5 Verification Pass · 2026-08-21**

---

# PART A — ARBITRATED RULING

## VERDICT

**REVISE.** The §6 plan's content is substantially correct — verified findings, real prior-audit discovery, correct identification of broken revocation as load-bearing — but it ships with a severity floor that is wrong (the blanket P0→P1 downgrade), an internal ordering contradiction (Gate 2 is called "the day-one move" while sequenced third), and a Gate 2 patch that silently narrows the seed's own fix; corrected below, it is buildable.

## WHERE THE VERIFICATION ITSELF IS WRONG

Opus 5 did excellent evidentiary work and then committed the mirror-image error of the audit it corrected. The audit inflated without a threat model; the verification **deflated with a threat model it never stress-tested**. Five specific failures:

**1. "Logged, attributable, contractually bound" is false on this codebase — by the verification's own evidence.** §5.8 confirms detection is *absent entirely*: no logging or alerting of failed assignment checks exists, and — worse — since no check exists on these paths, cross-tenant access produces **no anomalous event at all**. It is indistinguishable from legitimate traffic. Attributability without detection is post-breach forensics, not a severity mitigant. You cannot cite a control as a downgrade justification in §2 and confirm its total absence in §5 of the same document.

**2. Insider threat models discount likelihood of anonymous mass exploitation. They do not discount impact.** A trainer reading and **moderating** — a state-changing write — another trainer's client submissions, with client first name, last name, and username attached, is cross-tenant read/write in a multi-tenant health-adjacent SaaS where the tenant is a trainer's book of business. Calendar enumeration returning another client's full name is cross-tenant PII disclosure. These are P0 by any ordinary multi-tenant rubric, regardless of authentication. The client's contract is with the platform; the platform's promise is "only your trainer sees your data." That promise is broken today for every client on the system.

**3. The downgrade of P0-2 is internally inconsistent.** Opus 5 rates it P1 because exposure is "bounded" to formerly-assigned clients via write-once `targetUserId` and the creation-time check at `:376`. But §3 of the *same document* proves the bounding mechanism — revocation — does not function. A time-bound that cannot be enforced is not a bound. And the exposure is live today via the one revocation path that *does* work (`DELETE /:id`, used by admins working around the broken deactivate): a deleted assignment leaves the `role:'client'` thread enriching from the client's live data forever, with the RBAC gate **never running at all**.

**4. "5 of 6 panel seats reached this independently" is consensus laundering.** The seed's binding anti-consensus instruction existed precisely to prevent seven models converging on a comfortable read. Opus 5 imported that convergence as corroboration for the downgrade. Panel agreement on an unverifiable severity judgment is not evidence.

**5. Yes — controls were over-credited on the strength of comments.** Two instances:
- **The Rule 8 redaction note (§4.3):** Opus 5 quotes the code comment at `workoutLogUploadRoutes.mjs:165-166` — *"the parser already redacts the transcript + never sends the client name to the LLM"* — citing `workoutLogParserService.mjs:112,433`, lines Opus 5 **never quotes and evidently never read**. It verified the fail-closed gate at `:269` (credit where due) but a comment asserting a security property of a *different file* is precisely the drift vector that produces silent Rule 8 violations. Opus 5 half-concedes ("completeness open") and still uses the note to blunt Sol's REJECT. Not acceptable at the standard Opus 5 applied to everyone else: **quote what you verify.**
- **The `GlobalClientContext` field whitelist (§2, P0-4):** cited by line range (`:62-79`) with no quoted implementation — the only downgrade-critical claim in the table without a code block. And even taken at face value, the "safe" persisted payload is name, email, and photo: PII, in `sessionStorage`, under a non-namespaced key. Both must be re-read and quoted as part of Gate 0 probes.

**Ruling on the re-calibration: overturned in part.** F1 and F3 return to P0. F5 (broken revocation) is P0. F2 is P1 only because creation-time checks bound the *population*; the time-bound argument is rejected. F4 rises to P1 per "What Nobody Saw" below.

## LOCKED SEVERITY TABLE

| # | Finding | FINAL | Justification (one line) | Day-one batch? |
|---|---|---|---|---|
| F1 | Challenge moderation globally scoped | **P0** | Cross-tenant read **and write** with client PII, zero detection, live on main today | **YES** — G2-B |
| F2 | Coach chat gate never runs on `role:'client'` threads; enrichment persists past revocation | **P1** | Population bounded by creation-time check; time-bound is broken, exploitable today via `DELETE /:id` | **YES** — G2-C |
| F3 | check-conflicts trusts body IDs, leaks client full name | **P0** | Cross-tenant calendar enumeration with PII disclosure; no rate limit verified; cheapest fix in the report | **YES** — G2-A |
| F4 | Selected client stale, key not actor-namespaced | **P1** | Wrong-subject display becomes *accidental* cross-actor PII exposure on shared gym workstations (see below) | **YES** — G2-D |
| F5 | Assignment revocation broken (no endpoint + `isActive` never serializes) | **P0** | The security primitive every other fix depends on silently no-ops; known since 08-03 and dropped | **YES** — G1 |
| F6 | `pendingOps` in-memory Map + ephemeral signing key | **P2** | Availability bug on a verified single-instance deploy; Redis already provisioned | No — G4 |
| F7 | AI consent fails open | **P1** | Real, but flip is unsafe until the Gate-0 gap count and grandfathering migration exist | No — G5 |
| F8 | Refresh token in localStorage | **P1** | Standard XSS blast-radius exposure; requires dual-accept transition window, not a hotfix | No — G5 |
| F9 | Voice upload allows any trainer→any client | **P1-HOLD** | Documented intended behavior; product call is Sean's; interim compensating control: audit-log every cross-client upload from day one | Interim log YES; fix DEFERRED |
| F10 | `main` unprotected | **P0 (process)** | This is the mechanism that killed C1/C2 for 18 days; zero runtime risk to fix | **YES** — G0-A |
| F11 | Permission middleware fails open on lookup errors | **P2** | Outage disables restrictions; fix via ENFORCED/503 mode inside G3, not a standalone rush | No — G3 |
| F12 | No detection/alerting on authorization denials | **P1** | The actual compensating control the insider model requires; shadow-mode logs become permanent detection | No — G3 (starts with shadow) |

## LOCKED BUILD ORDER

**I override the document's Gate 0 → Gate 1 → Gate 2 strict sequence.** The document contradicts itself — §6 calls Gate 2 "the day-one move, not Gate 1 of the original plan," then sequences it after Gate 1. Resolution: **Gate 2 does not depend on Gate 1.** The check-conflicts clamp (`trainerId = req.user.id`) is an *identity* check, assignment-independent. The challenge-queue and aiChat patches read assignment state but only *over-grant to stale-active assignments* until Gate 1 lands — a strict improvement over "every trainer, every client" and acceptable for the interim window. Different files, different lanes, no merge conflicts.

**One correction to Gate 2-A as written:** the §6 patch dropped two elements the seed's original fix required — the **assignment check on caller-supplied `clientId`** and the **scope check on `excludeSessionId`**. As written, the patch stops trainer-calendar probing but still permits *client*-calendar probing via arbitrary `clientId`. Both restored. Locked.

| Gate | Contents | Starts | Blocks on |
|---|---|---|---|
| **G0** | Protect main + required checks; 4 probe tests (fail-first); consent-gap SQL count; **assignment-table reconciliation audit** (find clients actively trained with no active assignment row — the `DELETE /:id` workaround population) | **Today, all parallel** | Nothing |
| **G1** | Land C1/C2: implement or delete `/:id/deactivate`, frontend reads `status` not `.isActive`, e2e test that unassignment deactivates AND fans out | **Today, parallel with G2** | Nothing to start; **its completion gates G3 enforcement** |
| **G2 (A–D)** | Four surgical patches per table above, each merged with its G0 probe test | **Today, all four parallel** | G0 probe tests must exist before merge (fail-first discipline) |
| **G3** | Extend `assertAssignmentOrAdmin` to ~20 uncovered files via **skip-proof router factory** (Kimi's mechanism, adopted); shadow mode 1–2 weeks; deny/would-deny structured logging (= F12 detection, permanent); route-by-route enforce flip; F11 ENFORCED mode | After G2 merges | **Enforce flip strictly after G1 + G0 reconciliation** — flipping enforcement against a polluted assignment table locks trainers out mid-session, the seed's stated worst outcome |
| **G4** | Redis `pendingOps` (already wired); stable `OPERATION_SIGNING_KEY`; transactional reassign; canonical assignment contract | Parallel with G3 | Transactional reassign needs G1 |
| **G5** | Consent fail-closed (after G0 count + migration); HttpOnly refresh w/ dual-accept window; `/overview` default; nav regroup; retry states | Last | G0-C for consent; G2-D for context work |
| **SEAN** | F9 voice-upload scope: product decision | Whenever | Interim audit-logging ships in G0 regardless |

**Strictly ordered:** G1 → G3-enforce; G0-C → G5-consent; G0-reconciliation → G3-enforce. **Everything else is parallel.** Six workstreams can start this morning.

## WHAT NOBODY SAW

**Shared workstations.** Six models, the verification pass, and both audits all modeled the attacker as a trainer *deliberately crafting requests* — the entire severity downgrade rests on that premise. But this is a **gym**. Trainers share front-desk kiosks and floor tablets. The non-namespaced `ss-active-client` key survives logout (no provider-level clearing — verified at `:117-119`), and tokens sit in `localStorage` on the same shared machine. Trainer A logs out at the front desk, Trainer B logs in, and Trainer A's pinned client — name, email, photo — hydrates into Trainer B's session **with zero crafted requests and zero malice**. The insider-threat argument doesn't just discount too much; on shared hardware it doesn't apply at all. This is why F4 rises to P1 and G2-D ships day one. Secondary miss, noted above: the revised plan's own Gate 2-A pat
