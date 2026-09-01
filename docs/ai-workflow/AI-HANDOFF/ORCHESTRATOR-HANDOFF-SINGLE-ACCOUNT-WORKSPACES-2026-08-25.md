# Classroom-laptop agent handoff: single-account workspace boundary

Use this as the next prompt to the orchestrator. Reply in the same seven-section shape. Use roles only. Do not include any identifying classroom content, hostnames, credentials, tokens, private records, or secret values. Mark every unverified fact `[UNKNOWN]`. Make no changes while answering.

## 1. Deltas

- The owner has made a binding usability decision for this laptop: **do not create another macOS account and do not require account-hopping**.
- “Separate workspaces” means visibly separate folders, profiles, launchers, sessions, and policy gates inside the existing dedicated Standard teacher account. The administrator account remains authentication-only and is not a daily workspace.
- The laptop account was rechecked on 2026-08-25 and is not a member of the macOS `admin` group.
- Claude Desktop and Claude Code are installed. The owner reports that sign-in is complete. No credential value was requested, read, copied, or stored by the classroom-laptop agent.
- The locked classroom Hermes profile remains unchanged. Radar is not connected. No shared-Hermes transport is enabled.
- The proposed next implementation step was paused before any new folder was created so this single-account boundary can be reconciled with the orchestrator first.

## 2. Current laptop state

| Component | Current state | Boundary |
|---|---|---|
| Dedicated teacher login | Standard macOS account; confirmed non-admin | The only daily laptop login |
| Administrator login | Existing; used only when macOS requires owner-supervised authorization | Not an assistant workspace |
| Local classroom Hermes | Installed, responding, and intentionally locked down | Local/private front door; existing profile must not be edited by this change |
| Codex | Installed and available | Must obey the active workspace lane and local gate |
| Claude Desktop | Installed, signature verified, owner reports sign-in complete | Public/creative workspace only until a stronger policy is ratified |
| Claude Code | Installed and signature verified | May be opened only in the public/creative workspace at this stage |
| FileVault, immediate lock, automatic login, firewall | Previously supervised and reported enabled/passing | Security baseline; no password or recovery key is to be requested |
| Radar route | Not configured | Remains disconnected |
| Shared owner-Hermes learning route | Not configured | Remains queued/blocked |

## 3. Proposed single-account layout

The laptop should expose separate **front doors**, not separate user accounts:

```text
Existing Standard teacher account
├── LOCAL PRIVATE front door
│   └── Existing locked classroom Hermes profile
├── CLOUD PERSONAL / CREATIVE front door
│   └── Proposed Public-Creative-Lab folder for public or synthetic work
└── RADAR PUBLIC / SYNTHETIC front door
    └── A separate session and staging area inside Public-Creative-Lab
```

Required invariants:

1. Restart and ambiguous state default to LOCAL PRIVATE.
2. Moving between front doors starts a fresh session with no copied context.
3. Unknown, mixed, or derived-from-private material is private and is blocked from Cloud and Radar.
4. Redaction alone does not declassify a private source.
5. External admission happens before DNS, API calls, telemetry, embeddings, transcription, remote tools, or file upload.
6. Model selection never changes the active lane.
7. There is no automatic fallback from local to Cloud or Radar.
8. The gate records only decision metadata and hashes, never prompt or file contents.
9. No application receives access to the existing classroom profile or unrelated folders.
10. No second macOS/Unix login is to be added on this laptop.

My recommendation is to implement the Public-Creative-Lab as a folder-scoped logical sandbox in the existing Standard account, using mirrored `AGENTS.md` and `CLAUDE.md` rules plus one deterministic local egress validator. First run synthetic offline tests; only then review and trust project hooks. Do not attach Radar during this phase.

## 4. Privacy and learning-packet compliance

- The unresolved policy still means **no real classroom data in any Cloud, Radar, or shared-learning path**.
- If identifying classroom material appears, the active agent must stop without repeating it and direct the operator back to LOCAL PRIVATE.
- Local/private sessions may stage a local-only Hermes memo, but the actual local ingest path is `[UNKNOWN]`.
- Cloud or Radar sessions may create only a separately authored, roles-only, public/synthetic memo. They must not redact or summarize a private transcript into the shared lane.
- Durable learning remains governed by the existing model allowlist. Non-allowlisted outputs remain inbox/quarantine material and must not enter the durable corpus automatically.
- A substantial learning memo must include the required mistakes section and external-calibration disclosure when applicable.
- The repository currently contains contradictory descriptions of whether an inbox is local/gitignored or committed. Therefore, no forced add, automatic commit, or automatic push is permitted. The canonical shared queue and transport remain `[UNKNOWN]`.

## 5. Safe sequencing

1. **Now:** reconcile this single-account decision with the governing rulings and return a revised boundary.
2. **After reconciliation:** create only the Public-Creative-Lab folder and its local policy files in the existing Standard account.
3. Run offline synthetic allow/block tests. No external call is part of the test.
4. Show the owner the exact Codex and Claude hook configurations before either project is trusted or opened in an app.
5. Open Claude/Codex only against that one folder, with no access to the existing classroom profile or unrelated folders.
6. Ratify the local-Hermes inbox and sanitized shared-Hermes queue paths before enabling learning-packet delivery.
7. Connect Radar only after endpoint identity, certificate/public-key pin, per-device authorization, request schema, output quarantine, revocation, and no-fallback behavior are verified and approved.

Current red gates: Radar identity and pin `[UNKNOWN]`; Radar authorization and revocation receipt `[UNKNOWN]`; typed job schema `[UNKNOWN]`; output quarantine contract `[UNKNOWN]`; local-Hermes inbox path `[UNKNOWN]`; sanitized shared-Hermes queue and transport `[UNKNOWN]`; project-hook configurations not yet created or trusted.

## 6. Questions for the orchestrator

1. Does logical isolation by folder, profile, launcher, fresh session, and fail-closed gate inside one Standard macOS account satisfy the governing separation requirements? If not, identify the exact violated ruling and propose a solution that still creates no additional laptop login.
2. Does the earlier “dedicated Unix principal” requirement apply only to a remote service host, or was it intended to require another local macOS user? Revise it explicitly so the laptop remains single-account.
3. Ratify or revise this local layout: existing locked classroom Hermes profile for LOCAL PRIVATE; one Public-Creative-Lab folder for CLOUD PERSONAL / CREATIVE; a distinct Radar session and staging subfolder inside that public/synthetic workspace.
4. What exact non-secret receipts must be observed before the Radar front door may be connected: endpoint role, certificate/public-key pin, authorization scope, independent revocation, schema version, quarantine path, and failure behavior?
5. What are the canonical local-only Hermes inbox path and the separately tracked sanitized shared-Hermes queue path? Resolve the local/gitignored-versus-commit contradiction. Do not provide credentials.
6. Should Codex and Claude use the same composite validator command and mirrored policy text, with project-specific hook adapters only? Identify any lifecycle event that cannot enforce a pre-egress block.
7. Is any remaining ruling incompatible with the owner-approved Cloud personal/creative lane for public or synthetic work? If so, state the narrow conflict and the least disruptive compliant amendment.
8. What work has the orchestrator completed since the last exchange, what changed in the repo, and what exact next laptop action does it recommend after this reconciliation?

## 7. Reply contract / next prompt

Perform a read-only reconciliation of the current governing brief, panel rulings, and latest decision record against this handoff. Do not change the repository, laptop, Radar host, applications, credentials, hooks, or network routes.

Return exactly these seven sections:

1. **Deltas received** — acknowledge the single-account/no-account-hopping decision and list any resulting ruling changes.
2. **Current orchestrator work** — identify completed or in-progress roles-only artifacts and their commit/blob identifiers; do not include hostnames or secrets.
3. **Ratified laptop layout** — approve or revise the three-front-door logical layout while preserving one Standard laptop account.
4. **Privacy and egress ruling** — state the exact fail-closed classification, pre-network gate, fresh-session, no-fallback, and audit requirements.
5. **Learning-packet ruling** — identify the two queue roles, canonical paths or `[UNKNOWN]`, model-allowlist handling, validation, and human approval requirements.
6. **Blockers and evidence** — map every `[UNKNOWN]` to the responsible role and the non-secret proof required to clear it.
7. **Next prompt to the classroom-laptop agent** — give one small, reversible next step. It must not connect Radar, enable shared delivery, inspect unrelated files, request credentials, or modify the locked classroom profile unless all prior gates are proven and explicitly approved.

End with the literal line `no open questions` only if every question and `[UNKNOWN]` above is resolved. Otherwise end with `Open questions remain.` followed by the unresolved roles-only questions.

Open questions remain.
