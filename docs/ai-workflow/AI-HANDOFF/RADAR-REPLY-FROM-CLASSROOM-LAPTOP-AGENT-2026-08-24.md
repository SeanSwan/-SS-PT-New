# Classroom-laptop agent reply to the orchestrator

## 1. Deltas

- **D-03 and D-04 — unchanged, now sharper.** The privacy broker remains blocked and protected classroom content remains local-only. The always-on scheduler host is not an inference engine and is not part of the classroom runtime.
- **D-05, D-16, D-23, and D-30 — role split clarified.** The future GPU inference workstation remains a separately measured and gated generic-inference role. The always-on scheduler/durability role must not be described or configured as that inference route.
- **D-09 and D-22 — durability narrowed.** An encrypted backup target is only a future Tier B proposal. It is not scheduled, and no protected archive leaves the laptop until the director's written policy answer explicitly permits the exact off-device backup shape.
- **D-12 and D-13 — scope narrowed.** Controlled-vocabulary collection and provenance-bearing structured cards may serve only the separate personal-business lane's public research. They do not create a classroom-host connection.
- **D-15 — separation extended.** The personal-business lane requires its own Unix principal, database, notification token, storage, and assistant context. None may be shared with the classroom profile or another operator's lane.
- **D-18 and D-20 — unchanged.** The classroom front door, local engine, paper floor, offline behavior, adoption gate, and teacher-visible design freeze remain intact. The existing classroom assistant must not be repurposed as the personal-business assistant. The approved user-facing boundary for a separate business assistant is `[UNKNOWN]`.
- **Net result:** no classroom-plan redesign and no classroom service added to the scheduler host. The new work is a separate personal-business reference installation plus a policy-blocked durability proposal.

## 2. Radar requests, by tier

### Tier P — separate personal-business operator

**Principal set:** one dedicated unprivileged Unix user, one dedicated database or schema, and one dedicated notify-only bot token. The token must not read message history, and none of these principals may reach the classroom profile, classroom storage, another operator's data, host administration, or send credentials.

**Generic requests — required for a portable small-business operator:**

1. A deterministic scheduled brief with `data-as-of`, source count, and last-job status on every output; an unavailable source is shown as a gap.
2. An episodic judgment step over validated P1 facts, with the deterministic brief as the floor. Initially set `cloud_rows = none`; P1 cloud judgment stays disabled until the typed-egress and zero-retention gates pass.
3. An allowlisted P2 public-research collector. P2 collection and P1 judgment use separate calls and separate stored inputs.
4. A draft-only proposal queue. The host proposes; the owning app or person approves and sends. Notifications are structured, link-free, and cannot approve or send.
5. Per-unit memory caps, a hash-only audit chain, fail-closed status reporting, and a revocable per-client namespace.
6. Repo-held schemas, engine interfaces, unit templates, migrations, rubric, and installer; host-held secrets, salts, and allowlists only. Acceptance is the clean-VM weekend-install test.

**Specific requests — configured only after the business operator approves them:**

1. Brief cadence and delivery preferences `[UNKNOWN]`.
2. The operator's own education-business goals, expressed only in the operator's approved wording `[UNKNOWN]`.
3. The exact P2 source allowlist and the reason for each source `[UNKNOWN]`.
4. The exact personal-business fact categories permitted into the P1 schema `[UNKNOWN]`.

**Bytes that may leave the laptop:**

| Byte class | Classification | Permitted shape |
|---|---|---|
| Private-overlay handshake and routing metadata | P1 | Operational metadata only; no content fields. |
| Personal-business facts | P1 | Typed, redacted aggregates and enumerated status fields only, through one schema-validated egress function. No raw free text, message body, stable person identifier, or source credential. |
| Public-research requests and synthetic acceptance fixtures | P2 | Allowlisted public URLs, public facts, and synthetic test data only. P2 calls never share a request with P1. |
| Raw private inputs | P0 | Do not leave their owning app or approved local boundary. The scheduler host receives only the validated P1 projection. The exact boundary and transport are `[UNKNOWN]`. |
| Classroom-runtime content | P0 | Zero bytes leave the laptop; no scheduler-host request exists for this class. |

### Tier B — encrypted durability

**Requested service:** a separate restricted backup principal and encrypted repository target. The laptop alone holds the repository encryption key; the host stores ciphertext and minimal repository metadata and cannot decrypt it. Transfers are proposed only on the home-LAN boundary; private-overlay backup is not proposed.

**Byte classification:** encrypted archive chunks and repository metadata are P0 durability bytes. No plaintext, key material, prompt, model input, or notification body leaves the laptop. This entire tier is blocked on D-22 and a restore/revocation/retention test.

### Tier C — classroom runtime

**Requested services:** none. No Unix login, database path, bot route, collector, timer, brief, draft, model call, sync, or writable endpoint is exposed to the classroom runtime. Byte egress from this lane to the scheduler host is exactly zero.

## 3. Laptop-side credential inventory

**Current state:** no scheduler-host credential or route is installed on the classroom laptop.

**Future minimum, only after the corresponding gates pass:**

1. **Per-device private-overlay identity.** Scope: reach only the personal-business endpoint. Loss blast radius: an attacker could attempt network access as this device until the single identity is revoked; it must confer no shell, host-admin, or cross-tenant access.
2. **Scoped personal-business client credential `[UNKNOWN]`.** Scope: submit the typed P1 fact envelope and read this principal's brief/draft status only. Loss blast radius: forged P1 submissions or exposure of that principal's redacted status, but no raw source access, database administration, send action, or other lane.
3. **Tier B backup client credential and repository encryption key.** Installed only after D-22. Loss blast radius: the encryption key plus repository access could expose the encrypted backup. Store it behind FileVault and the system credential store, use a separately revocable repository credential, and keep no decrypting copy on the host.

The laptop must not hold the host's admin credential, database-admin credential, bot token, model-provider credential, send credential, another operator's credential, or a credential that can cross from the personal-business assistant into the classroom profile.

## 4. ONE RULE compliance statement

The proposal gives the classroom runtime no scheduler-host principal, route, collector, timer, database, notification, draft, model, or sync capability; its local front door and offline floor remain unchanged. Tier P is a different assistant, identity, storage namespace, and approval channel. Tier B is storage-only ciphertext and remains disabled unless D-22 explicitly permits it. The acceptance test is `classroom-lane-zero-radar-egress`: place a synthetic protected-field marker at every candidate boundary, run each classroom-front-door mode under packet capture, and require zero scheduler-host connections, zero events in the personal-business database or bot, and a pre-socket schema rejection for the marker. A positive-control P2 request must still traverse the personal-business path so a broken capture cannot falsely pass.

## 5. Sequencing

- **BLOCKED ON `[UNKNOWN]` adoption-gate state:** no teacher-visible assistant, launcher, profile, or workflow addition while the five-use-day freeze is active.
- **BLOCKED ON D-22:** do not configure or schedule Tier B and do not move a protected archive off the laptop.
- **BLOCKED ON private-overlay join, per-device identity, and revocation proof:** do not configure any laptop-to-host route.
- **BLOCKED ON separate-principal proof:** do not start Tier P until the Unix user, database namespace, bot token, storage, and assistant context are demonstrably isolated.
- **BLOCKED ON notification-scope proof:** do not install the bot token until history-read behavior is disabled or otherwise bounded and verified.
- **BLOCKED ON default-deny egress, writable-code-tree remediation, memory caps, and status receipts:** do not place a personal-business credential on the host.
- **BLOCKED ON the app-side P1 boundary, typed schema, one egress function, canary, audit chain, schema-widening CI gate, and zero-retention provider evidence:** keep P1 cloud calls disabled and `cloud_rows = none`.
- **BLOCKED ON schema-distinct drafts plus in-app approval and shown-equals-sent testing:** notifications remain informational and no sending workflow is armed.
- **BLOCKED ON operator approval:** do not install the specific cadence, goals, sources, or fact categories until the personal-business operator approves their exact configuration.
- **UNBLOCKED:** roles-only repo design, deterministic templates, synthetic tests, and read-only verification may proceed without changing the classroom laptop or host.

## 6. Questions for Sean

1. `[UNKNOWN]` What is the approved user-facing boundary for the separate personal-business assistant so it does not reuse the classroom profile or violate D-20's one-front-door rule for the classroom lane?
2. `[UNKNOWN]` Which component is the authoritative P0-to-P1 boundary for this first-client installation, and what exact typed transport delivers its validated facts to the scheduler host?
3. `[UNKNOWN]` Do the dedicated Unix user, database namespace, and notify-only bot token exist yet? If so, provide presence, ownership, scope, and revocation receipts without values.
4. `[UNKNOWN]` Is the private overlay joined, and is this laptop's future identity individually revocable without affecting another lane?
5. `[UNKNOWN]` Is the bot unable to read prior chat history, and is its notification path structurally unable to approve or send?
6. `[UNKNOWN]` Are default-deny egress and the browser-code ownership fix active now? The brief and decision record describe different points in the hardening sequence.
7. `[UNKNOWN]` Which configured provider, if any, has verified zero-retention/no-training treatment for P1? Until this is answered, P1 cloud use remains off.
8. `[UNKNOWN]` Where are the canonical portable engine interface, P1 fact schema, draft schema, four-environment-variable install contract, and clean-VM acceptance test in the repo?
9. `[UNKNOWN]` What is the current adoption-gate state, and has the personal-business operator approved the exact Tier P sources, cadence, goals, and notification destination?
10. `[UNKNOWN]` For future Tier B, is the restricted backup endpoint non-destructive or otherwise protected by immutability, and what retention/revocation/restore evidence will be required after D-22?

## 7. Your draft of the next prompt to me

Perform a read-only verification pass for the proposed first-client personal-business operator. Do not change the scheduler host, laptop, repo, credentials, or notification service. Return roles only, with no hostnames, secrets, private content, or identifying operational data.

1. Report present/absent and least-privilege scope for the dedicated Unix principal, database namespace, bot principal, storage namespace, app-side facts principal, and drafts principal. Never return credential values.
2. Verify whether the private overlay is joined and whether a single client-device identity can be revoked independently.
3. Verify default-deny egress, pinned destinations, per-unit memory caps, swap posture, writable-code-tree ownership, status-on-failure behavior, and hash-only audit receipts.
4. Verify that the notification principal cannot read message history, notifications are structured and link-free, and notification actions cannot approve or send.
5. Identify the canonical repo paths and current blob hashes for the portable engine interface, typed P1 facts schema, drafts schema, deterministic brief template, timer/unit template, four-environment-variable install contract, schema-widening CI test, and clean-VM acceptance test. Mark absent artifacts `[UNKNOWN]`; do not invent replacements.
6. Identify the actual P0-to-P1 source boundary and transport intended for this client. Prove it cannot deliver raw free text or source credentials and that `cloud_rows = none` is enforceable.
7. Report zero-retention/no-training evidence for each provider eligible for P1. A provider without verified evidence is P2-only.
8. Verify that drafts and armed automations are schema-distinct and that approval is in-app with a shown-equals-sent byte test.
9. For the future encrypted durability lane, report endpoint write/delete scope, immutability posture, retention, per-device revocation, restore evidence, and whether a home-LAN-only transfer can be enforced. Do not enable it.
10. Return a blocker table mapping each failed or unknown fact to the responsible role and required proof. End with `no open questions` only if every item above is verified and the owner has resolved the user-facing assistant boundary; otherwise end with the remaining `[UNKNOWN]` questions.

Open questions remain.
