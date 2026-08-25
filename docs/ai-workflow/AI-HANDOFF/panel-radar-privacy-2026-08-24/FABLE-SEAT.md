# Fable seat — written BEFORE reading the other seats (anchor-free) — 2026-08-24

**Model:** claude-fable-5 (orchestrator / final decider). **Privacy:** roles only.
**Method:** answer §6 A–G of `PACKET.md` as build specs, attack §4/§5 first, tag claims.

## Attack on §4 — the invariant is FALSE as written

1. **C2 as a plain read-only DB role = a PII read on compromise.** "Read business data" is a euphemism: a `SELECT` role on the users/clients tables reads every client name, email, phone, and note. A full compromise of the box is then a **data breach**, not a nuisance. The invariant only holds if the box **never receives PII at all** — see A/E below. This is the single highest-value change in the whole design.
2. **`[LIKELY]` the box already holds the backup repository password.** The nightly retention job on the box runs `restic forget --prune`, which cannot run without the repo key. If so, box compromise = decrypt every backup snapshot, which includes the operator agent's private vault — the most private data in the house. **Verify** (does the retain unit reference a password file?). If true, the invariant is false today, before any of this design lands. Mitigations, in order: (a) object-lock/immutability on the offsite bucket; (b) inbound SSH only over the mesh VPN, no LAN-open port; (c) consider running retention from the workstation instead of the box — but that reintroduces "only when awake" for prune, which is tolerable (prune is not time-critical).
3. **C5 enables owner-phishing.** A compromised box can post "approve this draft → link" into the owner's private chat. Mitigation: **approval happens inside the authenticated app, never via a link in chat**; chat is notify-only, and every notification carries a per-day HMAC stamp the owner's client verifies (or simply: no links, ever).
4. **Missing from the table:** the backup-hub *inbound* key (workstation → box, sftp-only, fine), the future offsite bucket credential (**delete-capable** for prune → can wipe the offsite copy; needs a separate prune credential or object-lock), and the mesh-VPN node key if joined.

## A. Tiering — right shape, wrong P1, and the box itself is a tier boundary

- Keep P0/P1/P2, but **move the P0→P1 boundary INTO the production app**, not onto the box. The app exposes **redacted views** (`agent_v_clients`, `agent_v_sessions`, `agent_v_leads`, …) that contain opaque IDs + categorical/bucketed fields only. The box's read role has `SELECT` on those views **and nothing else**. Consequence: **PII never reaches the box, the box's model, or any cloud model.** Names attach in the app at approval/send time, where the data already lives.
- **P1 schema (per row, all enumerated or numeric — no free text):** `{ handle, kind: client|lead|member|trainer, status, days_since_last_contact: int, sessions_last_30: int, sessions_remaining_bucket: 0|1-2|3-5|6+, plan_tier, last_session_type: enum, goal_category: enum, risk_flags: [enum], amount_bucket: enum }`.
- **Per-call pseudonymisation:** `handle = HMAC-SHA256(run_salt, real_id)[:10]`, `run_salt` generated per brief run, kept on the box for 24h to resolve the boss's output back to real IDs, then destroyed. Cloud sees a different handle every day → no linkage across calls.
- **Small-population risk (dozens of clients):** quasi-identifiers are the real leak, not names. Rules: no day-of-week/time-of-day in P1; amounts bucketed; session types generalised to ≤6 categories; the cloud never receives more than the **top-N action rows (N≤10)** plus aggregates — it does not need the roster.
- **P2 isolation:** scraped/public content is summarised in a **separate call** with a constrained output schema before any of it is placed near P1 facts (prompt-injection firewall). Never one call with both.

## B. The always-on gap — (1) is mandatory, (2) is a one-evening experiment, (3) is an enhancement, (4) is rejected by the owner

- **(1) Deterministic + templated P0 is not an option, it is the floor** demanded by the "never silent" law. Build it first: SQL rules → ranked action list → template drafts with slots. The cloud/local boss *improves* ranking and wording; its absence must not change what ships.
- **(2) CPU-only model on the box** — `[HYPOTHESIS]` a 7–8B Q4 model on a 6-core 2017 CPU with 16 GB yields ~3–6 tok/s; a 1,500-token brief ≈ 5–8 min. Acceptable for a 03:30 batch **if** the unit runs under `MemoryMax=6G`, `CPUQuota=400%`, `Nice=15`, and a window that never overlaps the DB dump/prune. **Acceptance test (one evening):** run the same 5 anonymised fact-bundles through (a) templates, (b) the CPU model, (c) the workstation model; blind-score each brief on a fixed rubric (correct top action, no fabricated facts, draft usable without edits). Adopt (2) only if it beats (a) and reaches ≥3 tok/s; otherwise it is a toy. Note: this is a re-decision of the earlier "no inference on the box" — which was a GPU statement.
- **(3)** Workstation-awake pass = enhancement flag, never a dependency; the brief records which path produced it (`producer: template|box-cpu|workstation|cloud`).

## C. Hardening the strip proxy — invert it

A regex/blocklist sanitizer on free text will always lose (notes fields, URLs with names in query strings, transcribed audio, a scraped page that says "trainer X's client Y"). Hardening = **stop sending free text**:
1. **Allowlist-schema egress:** the *only* function that can call a cloud provider takes a typed `FactBundle` validated against a JSON schema where every string is an enum or a template ID. A free-text field cannot exist in the type. Anything else → throw.
2. **Canary-proven:** every call plants a canary name/email in a scratch field and asserts the serializer dropped it before the real payload is sent (the repo's egress redactor already does exactly this — reuse it, do not write a second one).
3. **CI test that FAILS on widening:** a test walks the schema; any string field without an `enum` or `templateId` constraint fails the build. A second test feeds a bundle with PII in every field and asserts the serialized payload contains none of it.
4. **Egress audit log:** `{ts, provider, model, schema_version, payload_sha256, token_counts, run_salt_id}` — never the payload. Nightly diff of `schema_version`/hash against the repo.
5. **Provider retention:** set zero-retention/no-training where the provider offers it; record the setting in the audit log. `[UNKNOWN]` whether the coding-plan endpoint offers a retention control — check before it becomes the default path for P1.
6. **Long-horizon canaries:** a unique fake handle pattern in P1 payloads; if it ever appears in the wild, the provider leaked.
7. **Exploitability ranking:** (i) free-text notes leaking → high, closed by 1; (ii) prompt injection via P2 → medium, closed by the A-isolation rule; (iii) provider retention → medium/unknown; (iv) stable IDs → low once per-run handles exist.

## D. The service account — a separate principal namespace, not a new user role

- Do **not** add `agent` to the user-role enum and reuse the user JWT path: every existing role guard would then need auditing for "what does agent mean here", which is exactly how a read-only principal grows write reach by accident.
- **Spec:** `AgentToken { id, name, token_hash (argon2/sha256+salt), scopes: text[], expires_at, last_used_at, revoked_at }`; middleware `protectAgent(requiredScope)` that authenticates the bearer token, sets `req.agent`, and **never** sets `req.user`. Routes live only under `/api/agent/*`: `GET /api/agent/facts/:engine` (returns a `FactBundle` from the redacted views) and `POST /api/agent/drafts` (INSERT into `agent_drafts` with `status='pending'`). Scopes: `read:facts`, `write:drafts`.
- **Storage on the box:** root-only file loaded with systemd `LoadCredential=`; the job user never sees the path; rotate by issuing a new token and revoking the old (both columns exist).
- **Tests:** (a) agent bearer on any non-`/api/agent` route → 401; (b) a user JWT on `/api/agent/*` → 401; (c) `write:drafts` token cannot `GET /facts` and vice versa; (d) SQL-level: the DB role used by the facts route can `SELECT` only the `agent_v_*` views (`information_schema.role_table_grants` assertion in a test); (e) the drafts table has no `sent` transition reachable from the agent path.

## E. The invariant, repaired

*"A full compromise of the box can at most: read **redacted, per-run-pseudonymised business facts with no PII**, spend up to the cap, post link-free notifications to the owner's private chat, and create drafts that are inert until approved inside the app. It cannot read a client's name, message a client, change a booking, move money, decrypt backups it does not hold the key for, or act as the owner anywhere."* — the clause about backups is only true after the retention-key question is resolved. **Single cheapest, largest reduction: redacted views + PII-free box.**

## F. The booking SaaS — read-only calendar feed first, and say "not connected" until then

1. **Verify first:** does the owner's staff account expose a calendar-subscribe / ICS feed URL (many studio booking systems do)? If yes: the box polls it (read-only, secret URL, revocable by regenerating), parses on the box deterministically → P0 stays on the box → aggregates only go anywhere else. `[UNKNOWN]` for this vendor/plan.
2. Official API with developer approval — second choice; cost and approval time unknown.
3. Stored login session in the box's browser — remains rejected (owner login on a headless box).
4. **Until resolved the brief must show:** `booking system: not connected — sessions there are not counted` (never fabricate presence).

## G. Portability — everything above survives the weekend-install test IF

- Repo: engine definitions, tier schemas, egress schema, view definitions (as migrations), unit templates, allowlists, the rubric + golden set. Box: secrets only (`/etc/<box>/…`, root-only, `LoadCredential=`). App: the `/api/agent/*` module + redacted views as a reusable package.
- The booking-SaaS adapter is a plugin interface with one implementation; a client with a different vendor writes one adapter.
- Nothing in the design depends on the workstation existing — the local-model pass is optional by construction, which is what makes it installable for a business that has no GPU desktop at all.

## §7
- **Most silently dangerous:** the read-only DB role or the egress schema quietly widening (a helpful migration grants the role a table; a helpful dev adds a `notes: string` field). No heartbeat notices. Fix: a nightly `box-audit` that diffs role grants and the schema hash against the repo and posts **blocked/red** to the heartbeat on drift.
- **Could not verify from the packet:** whether the retention job holds the repo key; provider retention controls on the coding-plan endpoint; the booking SaaS's feed availability; CPU inference numbers.
