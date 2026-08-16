---
originating_model: claude-fable-5
date: 2026-08-16
topic: "Hermes chat-v2 rebuild — all five slices in one loop; probe-before-build discipline results"
linear: SWA-160
models_used:
  - model: claude-fable-5
    role: sole builder + hostile reviewer
    did: "Executed the 5-slice plan (state model, mockup a11y, replay harness, /api/ws transport, virtualization); probed the gateway before building; ran the dry loop to CLEAN×2"
    cost: subscription
skills_touched:
  - id: hermes-chat-state-model (design doc, not a skill)
    change: amended twice
    failure_motivating: "Two of its five load-bearing assumptions were wrong against the live gateway (event journal existence; rid-addressed approval resolution)"
---

# Chat-v2 five slices — what Hermes should learn

## Who did what

Single-model session (Fable 5). The three-reviewer plan (GLM 5.3 architecture, Kimi K3 crux reframing, HY3 posture) was executed as written from the prior session's handoff — zero paid consults this session. All five of GLM's mockup findings reproduced exactly as documented. Kimi's block-list schema catch proved correct and the harness validated it. Fable's original "spike streaming first" sequencing (overturned by Kimi/GLM last session) stayed overturned: streaming wired up trivially in Slice 4 exactly as they predicted.

## Skills created or changed

None created. The state-model doc (SS-PT `docs/ai-workflow/design-brain/mockups/hermes-chat-state-model.md`) was amended twice mid-build — see ledger. Motivating failure both times: writing schema against a plan instead of against probed source.

## The durable lesson

**A schema doc written before probing carries wrong load-bearing assumptions at a predictable rate — here 2 of 5.** The Slice-1 doc asserted an event-journal replay model (`lastEventSeq`) and rid-addressed approval resolution. One hour of source probing before Slice 3 falsified both: the gateway is snapshot-hydration-only (no seqs exist), and `approval.respond` is session-scoped FIFO (`tools/approval.py:2574` `queue.pop(0)`). Because the probe happened BEFORE the build, the corrections cost two doc edits and one reducer rule. Had the build gone first, the store and the approval UI would both have shipped wrong. **Procedure that survives: budget the first hour of any build slice to re-probe every assumption the design doc states as fact, no matter how authoritative the doc looks.**

Second durable lesson: **a replay harness catches design gaps no code review can** — the hydrated-turn adoption problem (resumed partial turn vs live continuation under the real turn id) only became visible when the fixture played a resume followed by live frames. It produced a reducer rule + regression test before any real reconnect ever happened.

## Mistakes I made

- Ran `cd ~/hermes2 && git log` and concluded "not a git repository" — wrong path (repo is `~/hermes2/hermes-agent`). Caught by cross-env-verify discipline before acting on it. The handoff said "the Hermes tree" without a full path; I filled the gap from memory instead of listing the directory first.
- Wrote `\n` escapes through the Windows→WSL→python heredoc chain; one escape level was consumed and a TS string literal broke. Caught by tsc. Repeat of the documented unquoted-heredoc trap class in a NEW variant (argv, not heredoc) — the write-up did not prevent the adjacent mistake. Fix that survives: never carry escape sequences across the boundary; use `String.fromCharCode(10)` or write files from the Windows side and copy.
- Nearly filed the degraded-banner as a bug when my observation window (navigate + snapshot overhead > 2s hold) was slower than the behavior. Third instance of the validate-the-instrument class this workstream. The fix that survived was structural: a `?hold=<ms>` parameter making the state inspectable at leisure.
- First evaluate used `() => new Promise(...)` arrow syntax the Playwright wrapper rejects; two failed calls before switching to `async () => {}` form.
- Initial approval UI armed EVERY pending card (mirroring the mockup) — the FIFO probe proved only the oldest is resolvable; armed-newest focus logic was also wrong. Caught in Slice 4 by reading `resolve_gateway_approval` instead of trusting the prior probe's "ID-addressable: YES" (which described the internal registry, not the RPC).

## Error → fix → repeat ledger

- **Escape-eating across Win→WSL boundaries** — recurred 2× this session (cp path mangling → `MSYS_NO_PATHCONV=1`; `\n` in python-heredoc-generated TS). Class was already documented in memory/handoff; documentation did NOT stop the second variant. What stopped it: an escape-free construction rule (no escape sequences cross the boundary, ever).
- **Instrument-slower-than-behavior false negatives** — 1× this session (banner), 3× lifetime. What stops it: build observability into the artifact (`?hold=`) instead of racing the probe.
- **Trusting a prior probe's summary over the source** — 1× (approval "ID-addressable: YES"). The handoff sentence was true of `_pending[rid]` and false of the RPC layer. What stops it: probe claims carry the function they describe; re-read the actual resolver before building UI on it.

## External-model calibration

None consulted this session ($0). The prior session's GLM/Kimi/HY3 outputs were all verified against reality during this build: GLM 5/5 mockup findings real; Kimi's schema crux real and load-bearing; the handoff's transport-risk retirement held.
