# Miniswan Resource-Mode Contract

**Status:** Phase 2 admission gate wired locally in the preserved render-agent worktree; worker deployment, live queue verification, and hardware enforcement remain pending.

**Purpose:** Make the 4080 miniswan a useful background worker without allowing video jobs, browser work, or model tasks to make the 5090 workstation unresponsive.

## Ownership

- **Main Hermes on the 5090:** command authority, approval authority, canonical brain, and operator-facing reports.
- **Miniswan:** execution worker. It reads approved job inputs, claims bounded work, sends heartbeats, and returns artifacts plus measurements.
- **Queue:** the existing render-agent lease/heartbeat queue remains the job source of truth. A second local queue must not be introduced.
- **Shared brain:** workers may read an approved snapshot and submit versioned proposals. They may not write directly to the canonical vault.

## Modes

The policy lives in `scripts/swan-video-studio/worker-resource-policy.mjs`. It is admission control, not proof that Windows or NVIDIA has enforced a hardware limit.

| Mode | Intended use | Heavy work | Browser sessions | Safety rule |
| --- | --- | ---: | ---: | --- |
| `cool` | Hot days, alerts, public collection, reports | 0 | 0 | Keep the worker quiet |
| `balanced` | Normal video processing | 1 | 1 | Fresh telemetry required |
| `full` | Explicit render window or backlog | 1 initially | 2 | Fresh telemetry and future expiry required |
| `sleep` | Away/idle state | 0 | 0 | Reject new work; release leases first |

The policy never authorizes external sends or publishing. Email, social, calendar changes, YouTube publication, deletion, and other external-visible actions require a separate human approval receipt.

## Video path

1. Main Hermes creates or approves a job brief.
2. The worker claims the job only if its current mode admits the job kind and telemetry is fresh when required.
3. Raw footage remains immutable. The worker creates proxies, transcript/cut artifacts, captions, motion passes, and final exports in the existing Swan Video Studio layout.
4. Preview and metadata draft return to the 5090 for review.
5. Publication remains explicit until a separately reviewed YouTube API path exists.

The current helper uses CPU `libx264`. NVENC is a follow-up benchmark, not an assumed optimization. The benchmark must compare output quality, audio sync, captions, render time, CPU use, GPU use, and failure recovery on one representative video.

## Required enforcement before deployment

- Apply the policy to the render-agent admission loop.
- Apply actual CPU/job concurrency limits and report requested versus observed values.
- Verify the supported GPU power-limit mechanism on miniswan after it is reachable.
- Make full mode expire automatically and return to a conservative mode after restart or stale telemetry.
- Test that an unapproved shared-brain write is rejected.
- Prove a completed render survives worker restart and lease expiry without duplicate publication.

## Verified wake path

On September 6, 2026, miniswan was put into normal S3 sleep and woke successfully from a magic packet sent by the 5090 workstation. The Realtek PCIe 2.5GbE adapter was the recorded wake source. Port 22 accepted SSH afterward, and the Tailscale SSH route also recovered.

The machine currently has S3 available, Wake-on-Magic-Packet enabled, Shutdown Wake-On-LAN enabled, the Ethernet adapter wake-armed, and both `sshd` and Tailscale set to start automatically. The tested helper is `scripts/miniswan/miniswan-wake.ps1`; its installed copy is `C:\tmp\miniswan\miniswan-wake-safe.ps1`.

The older `C:\tmp\miniswan\wol.ps1` remains untouched and should not be used by automation because it disables hibernation as a side effect. The verified path is S3 sleep recovery; full-power-off recovery has not been tested.

## Current blockers

- The proven S3 wake path is resolved; the remaining recovery gap is untested S5/full-power-off wake.
- The separate `swan-render-agent` worktree contains uncommitted provider/handler changes and must be preserved while the adapter is integrated. A pre-edit snapshot exists at `C:\tmp\miniswan-render-agent-pre-adapter-20260906.json`.
- The render-agent gate is wired before handler dispatch, but the live queue path has not yet been exercised with a real admitted or denied job.
- The September 5 Hermes backup created an encrypted archive but did not produce the same checksum evidence as the prior backup; recoverability is not yet proven.

No GPU setting, Windows startup entry, browser credential, model, external account, or publication setting is changed by this contract.
