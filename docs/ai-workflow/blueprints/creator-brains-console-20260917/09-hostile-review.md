# 09 — Hostile review, decisions & Astra record — Creator Brains Console

- **Date:** 2026-09-17 · **Reviewer of record for this packet:** ZCode/GLM seat (self-hostile pass, rule 17/61) · **Astra adjudication:** BLOCKED — see §3

## 1. Self-hostile pass (findings → disposition)

| # | Attack | Verdict | Disposition |
|---|---|---|---|
| H1 | Rapid double-click on RUN spawns two daily children before the engine lock exists | REAL | Bridge single-flight mutex around spawn; engine lock stays the backstop. Test added: T-B5 extended. |
| H2 | Two bridge instances → concurrent `setEnabled` writes clobber `registry.json` | REAL | Single-instance pid guard; second instance refuses naming the live pid. Test added: T-B11. |
| H3 | `.cmd` parsing stdout for the port is a launcher race | REAL | Bridge opens the browser itself after `listen`; `.cmd` just runs node + pause. 08 patched. |
| H4 | Library-mode embed duplicates React into SwanGuard | REAL (later) | S7 note: react/react-dom/styled-components as peer externals. 08 patched. |
| H5 | Console becomes a transcript-leak surface via a "helpful" future endpoint | REAL RISK CLASS | Hard invariant: no route may read tier-B docs; import discipline + 8+-word verbatim grep over everything served (T-B8); any future endpoint re-runs that gate. |
| H6 | "Backlog: lines[]" smuggles display strings into a contract (drift risk) | ACCEPTED, deliberate | Engine-formatted truth is the point (no client-side re-derivation); if engine wording changes, T-B1 shape test catches field presence, wording is display-only. |
| H7 | Status polling every 2 s while a run is active wastes nothing today but could hammer file reads on a huge store | ACCEPTED with bound | Poll interval backs off to 5 s after 10 min of run time; all reads are small JSON files; measured p95 gate at S6. |
| H8 | The constellation becomes decoration drift (particles not tied to data) | DOCTRINE RISK | Contract: every node/arc/color maps to a store field (T-T1 pins the mapping); motion budget: one signature moment, everything else calm (motion.md §4/§5). |
| H9 | Plan silently assumes Sean's browser has WebGL2 | flagged | Fallback (static list/orb) is a tested requirement (T-W7), not a nice-to-have. |
| H10 | Bridge could drift from CLI/menu behavior over time | mitigated by construction | Bridge composes the SAME lib functions; no re-implemented logic; engine tests own semantics. |

Residual risks (honest): three-scene performance on Sean's GPU is verified only at S5 exit on his machine; SwanGuard-side embedding risks (their bundle budget, their React version) belong to the receiving repo's review; the Astra adjudication may still overturn D1–D9 — every slice before S5 is direction-independent by design so an overturn costs only S5 reshaping.

## 2. Decision log

| Decision | Ruling | Authority |
|---|---|---|
| Planning workflow | Mega Blueprints activated; this packet is the canonical plan set (new surface — no prior console plan existed; engine blueprint remains canonical for the engine) | Sean's standing instruction 2026-09-06 |
| Ideation gate | 3 directions (CD1/CD2/CD3) produced per router; **Sean picks** before S5 styling; S0–S4 may proceed on his go | swan-design-router (rule 40) |
| v1 dangerous-op exclusion | restore/rollback/authorize CLI-only, tier-badged | bridge T0–T4 doctrine (design.md §15) |
| Token mode | Crystalline Swan (Cyberforest reserved for Hermes surfaces) | design.md §3 |
| Console adds npm deps only inside `console/web/`; engine stays zero-dep | adopted | engine invariant |

## 3. Astra consult record (exactly-one, no auto-retry)

- **Authorized:** Sean, 2026-09-17 — "call astra one time for the mega blueprint skill full documentation."
- **Attempt 1 (the only attempt):** `consult-codex.mjs` packet `swan-review-20260917075008558-70de359602a0` (64,705 chars, 6 files, egress redaction ran) → **FAILED: `codex_exec_failed`** — zero model output.
- **Root cause [VERIFIED by probe]:** harness/CLI drift — `buildCodexExecArgs` passed `--ask-for-approval never`; **codex-cli 0.154.0 removed that flag** and exits non-zero at parse, before any provider call. No tokens were consumed by the failed attempt.
- **Repair (uncommitted, this session):** `scripts/mcp/swan-council-subscription.mjs` — flag removed with constraint comment; `scripts/mcp/swan-council-subscription.test.mjs` — new pinning test (`buildCodexExecArgs omits flags removed by codex-cli 0.154.0`) + flip of the old positive assertion. **RED observed** (old code fails the new pin), then **GREEN: 10/10** (`node --test scripts/mcp/swan-council-subscription.test.mjs`). Fixed vector probe reached the provider.
- **Second blocker [VERIFIED by the same probe]:** **Astra seat usage limit — "try again at Sep 19th, 2026 10:12 PM."** Matches the R2 packet note ("Astra seat blocked until 2026-09-19"). The tiny diagnostic probe returned `turn.failed` with the usage-limit error.
- **Disposition:** per the exactly-one constraint and standing no-auto-retry discipline, NOT re-fired. Per the rule-46 unavailability fallback, this packet proceeds with the GLM seat's own hostile pass (§1) and the gap recorded here. **Astra re-fire is ready-to-go** (same packet, repaired harness) the moment the seat resets — recommended before slice S5, needs only Sean's "go".

## 4. Readiness verdict

**PLAN READY** — planning package complete (01–08 + this record + readiness.json), tests specified but NOT RUN against implementation (none exists — honest state). NOT implementation-verified; nothing deployed. Next authorized slice: **S0** (bridge) on Sean's go, plus his concept-direction pick before S5.
