# recon round 6 — a fix reintroduced the defect the previous fix removed + NEW: Hermes remote 5090 access

**Agent:** vs-claude (Opus 5) · reviewer: GLM-5.3
**Commits:** `85bf9959b` (round 5), `cbee9b8f3` (round 6) · Branch `wip/comms-notifications-2026-07-05`
**Date:** 2026-08-16

## Round 6 result

Findings trajectory: **22 → 11 → 7 → 2 → 2 → 2.** Flat at 2 for three rounds. **Not dry.**

**F1 — a REGRESSION I created with the round-5 fix.** Round 4 fixed `--full` being advertised
but unparsed. Round 5, fixing the truncated sensitive-refs list, added a `[--full to list]`
marker to *that* list — while `full` was still consumed only by the landed list. So the exact
silent-no-op defect fixed in round 4 was recreated one round later, **by the fix for round 5's
finding.** Sixth instance of advertised/computed-but-never-wired, and the first that was a
regression rather than an omission.

**F2 — the merge-base-missing early return never set `filesUnknown`.** That path obtains no
file list, so `pathSensitivity([]) === 0` keeps the record out of `risky`; if the verdict is
then ACTIVE_LANE (lane lock, live worktree, commit inside 48h) it also fails every `unresolved`
predicate. A ref that was **never inspected** would be absent from AUDIT DELTA entirely, and
the section could assert *"NO unpushed changes detected"* over it. Triggers on unrelated
histories (vendored/imported trees) and on a merge-base timeout — a stall this codebase
anticipates elsewhere.

## The lesson from six rounds

The dominant defect class was never bad logic. It was **a value computed, or an action
advertised, that never reached the human.** Six instances: `neverAgeOut`, `needsContentConfirm`,
`census().degraded`, `VERDICT.EXPERIMENTAL`, `unresolved`, `--full` on the risky list.

Three of those were written *with a comment explaining why they mattered*. One was created by
the fix for the previous one. **Documentation has now failed six times to prevent this class.**

The only checks that ever caught it were mechanical:
1. grep for the consumer by name before claiming a fix is wired, and
2. read the RENDERED OUTPUT and confirm the value appears — not the array, not the code.

**Standing rule: a fix is verified by observing its effect in the artifact a human reads.**
Every one of these six passed code review, including my own, because reading code confirms
intent and only execution confirms behaviour.

## Mistakes I made

- **My fix for round 5 created round 6's finding.** I added a marker advertising a flag I had
  wired one round earlier for a *different* list. When fixing a class-of-bug, the fix itself
  must be checked against that same class — I introduced a silent no-op while writing the
  commit message that condemned silent no-ops.
- **I quoted "6 sensitive branches" twice off a truncated render.** True figure 77 (see the
  round-5 memo). Same root as trusting `ahead 68` — the exact failure the tool exists to
  prevent.
- **I nearly read an empty model response as a clean verdict** (round 5, `--max-tokens 20000`
  → 19,993 reasoning tokens, ~7 content tokens, 0-byte body). I now check body size before
  interpreting. An empty reasoning-model response is byte-identical to "no findings."

## Error → fix → repeat ledger

| Error class | Recurrences | Written up before recurring? | What finally stopped it |
|---|---|---|---|
| Computed/advertised but never wired | **6** | yes, 4× | Reading rendered output; grepping for the consumer |
| Number quoted off a capped/truncated view | 2 | yes — it is the tool's own thesis | Printing totals + overflow markers |
| Empty/failed probe read as a negative result | 2 | yes | Checking byte size / exit semantics first |

Six repeats with four write-ups is conclusive for row 1: **prose does not fix this class.**

## External-model calibration — GLM-5.3, six rounds

Findings 22 / 11 / 7 / 2 / 2 / 2. Reasoning tokens 27,442 / 23,185 / 17,806 / 17,230 / 17,208 /
20,806. Never padded once. Repeatedly graded its own findings honestly (called F2 "minor,
latent" in round 5 — it was a 13× undercount, and its hedge is what made that findable).
Refused to proceed in round 3 when my changelog contradicted the artifact I sent.

**Operational:** needs `--max-tokens ≥ 30000` for a ~16k input; reasoning consistently eats
17–21k. Below that it returns an empty body that reads as CLEAN.

**Verdict: the strongest adversarial reviewer available here, and subscription-billed.** Use for
hostile passes. Do not use for runtime truth — it is a static reader and cannot execute.

## NEW REQUEST FROM SEAN (2026-08-16) — Hermes remote access to the 5090 / Qwen3.8

Sean: *"I want her to also be able to connect to the 5090 remotely so she can go ahead and
utilize the Qwen 3.8 that we installed on her own whenever she wants to as well."*

**Not started — captured only.** This is a new lane and needs its own session with a proper
design pass, not a tail-end improvisation.

Known context it must build on (do not re-derive):
- Hermes brain is already **local Qwen3 on the desktop 5090**, FAIL-CLOSED, no auto cloud
  fallback (`project_hermes_brain_local_qwen3_2026_07`).
- The **Ollama bridge is already OPERATIONAL** (`project_hermes_ollama_bridge_operational`) —
  extend it; do not invent a new transport.
- Hermes2 config lives at WSL `~/hermes2/.hermes/config.yaml`.
- Qwen3.8-27B: q4_K_M ~17 GB is the daily driver (103–114 tok/s on the 5090, 100% GPU); q8_0
  is the heavy build at ~30 tok/s.

Open questions for the design session:
1. **Remote from where** — phone/Telegram only, or a laptop/Mac too? Sean's phrasing mentioned
   a Mac; that needs clarifying before transport is chosen.
2. **Reachability** — the desktop is not always on. Wake-on-LAN is **DEAD** for this machine
   (`project_hermes_phase_e_wol_dead` — exhaustive 5090 BIOS attempt failed, do not retry). So
   "whenever she wants" collides with a box that may be asleep. That constraint is the crux.
3. **Exposure** — any remote path to a home desktop is an inbound attack surface. Tailscale /
   WireGuard style overlay vs port-forward (never port-forward). Needs the T0–T4 tier
   treatment from the operator bridge.
4. **Failure mode** — if the 5090 is unreachable, does Hermes degrade, queue, or refuse?
   Current doctrine is FAIL-CLOSED with no silent cloud fallback; a remote path must not
   quietly become a cloud path.

## Sean-owned

- **recon is NOT dry.** Six rounds, zero clean, flat at 2 findings for three rounds.
- **77 non-landed refs touch sensitive paths** (auth/payment/admin/routes). That is real
  pre-launch audit-scope input independent of this tool's status.
- Commits sit on `wip/comms-notifications-2026-07-05`, 1,947 behind main.
