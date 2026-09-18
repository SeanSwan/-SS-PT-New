# MiniSwan GSQ — State, Transport, and How to Use It

**Status:** WORKING AND VERIFIED END-TO-END (2026-09-16)
**Owner:** Sean (human) · **Worker:** MiniSwan (RTX 4080 SUPER) · **Consumer:** Hermes on the 5090
**Supersedes:** nothing. This is the missing record for work that existed only on the box.
**Related:** `MINISWAN-RESOURCE-MODE-CONTRACT-2026-09-06.md` · `MINISWAN-RESOURCE-MODE-BLUEPRINT-2026-09-06.md` ·
`MINISWAN-ACCESS-2026-09-02.md` · commit `ac49119df`

---

## 1. Why this document exists

Between 2026-09-03 and 2026-09-12 a complete local-model stack was installed on MiniSwan:
a llama.cpp runtime, an 11.29 GiB Qwen3.8-27B quant, a pinned Hermes profile, and an on-demand
controller. **None of it was written down in the repo.** The newest in-repo MiniSwan documents
stop at 2026-09-06 and describe a plan (`C:\models\` + `unsloth/Qwen3.8-Flash-Next` + port on the
tailnet) that the September 12 work actually superseded. The box was the only source of truth.
This document closes that gap with verified evidence.

## 2. What is actually installed

| Layer | Artifact | Location | Evidence |
| --- | --- | --- | --- |
| Model | `Qwen3.8-27B-GSQ-RCO-IQ3_S-mtp.gguf` — 12,120,016,960 B (11.29 GiB), IQ3_S 3.4375 bpw, 27.3B params, `n_ctx_train` 262144 | `C:\swan\models\qwen38-gsq\d562806dbafae37109975e970aae91b43e73b440\` | `mini-profile.json`, `/v1/models` meta |
| Model source | `ISTA-DASLab/Qwen3.8-27B-GSQ-RCO-GGUF` @ rev `d562806dbafae37109975e970aae91b43e73b440`, sha256 `58fd826723939933dc86f45b7fe04545cbc2de1c70f6fe2cdd3858c87a98c12f` | — | `mini-profile.json` |
| Runtime | llama.cpp **b10809**, CUDA 13.3 Windows build, commit `5266f24da75dc449bd56cbed7addb9c8e4a6a73e`, exe sha256 `cb29f66008d4d73cce17cab2c2569ab318eb244b0b2ca2a15024b44d90dfcd3f` | `C:\swan\runtimes\llama-gsq-b10809\` | `/v1/models` `system_fingerprint: b10809-5266f24da0` |
| Legacy runtime | llama.cpp (2026-09-03 build) — used only by the older launcher | `C:\llama\bin\` | directory listing |
| Hermes profile | `profileId: miniswan-gsq`, model id `qwen3.8-gsq-rco-mini`, 65536 ctx/1 slot, max_tokens 4096, tools on, vision off, admission `minimumFreeMiBAfterUnload: 15000` | `C:\swan\hermes-profiles\gsq\mini-profile.json` | file read |
| Controller | `MiniSwan-GSQ.ps1` — `-Mode Start\|Status\|Stop -Json`, mutex-guarded, sha256-pins runtime+model before launch | `C:\swan\hermes-profiles\gsq\` | live `-Mode Status` |
| API key | 66-byte key file; llama-server launched with `--api-key-file` | `C:\swan\hermes-profiles\gsq\secrets\gsq-api.key` | profile `endpoint.keyFile` |
| Hermes provider | `miniswan-gsq` → `http://172.26.128.1:18082/v1`, plus aliases `mini-gsq` and `miniswan-gsq` | 5090: `~/hermes2/.hermes/config.yaml` lines 58–69, 1061–1067 | config read |
| Launcher (new) | `scripts/miniswan/miniswan-gsq.ps1` — wake → start → forward → verify | 5090 repo | commit `ac49119df` |

There is **no Hermes runtime on MiniSwan** — no `hermes` command, no service, no `C:\hermes*`.
"hermes-profiles" is the profile contract that Hermes consumes, not an install. This matches the
ownership contract: MiniSwan executes, the 5090 holds authority.

## 3. How to use it

```powershell
# bring the 4080 model online for Hermes
.\scripts\miniswan\miniswan-gsq.ps1 -Mode start

# in Hermes, select the alias
#   mini-gsq   (or miniswan-gsq)   ->  qwen3.8-gsq-rco-mini

# when finished - releases the GPU and lets the box sleep again
.\scripts\miniswan\miniswan-gsq.ps1 -Mode stop
```

`-Mode status` reports the forward, `/health`, and the remote controller state without changing
anything.

## 4. Verified evidence (2026-09-16)

Read-only inventory plus one deliberate start. The authenticated probe ran **inside WSL**, using
the exact address Hermes uses, with the key read in-memory and never printed:

- `GET 172.26.128.1:18082/v1/models` → **HTTP 200**, model `qwen3.8-gsq-rco-mini`
- `POST 172.26.128.1:18082/v1/chat/completions` → **HTTP 200**, `finish_reason: stop`,
  `content: 'MINISWAN_OK'`, 29 completion tokens, **46.8 tok/s** generation, 130 tok/s prefill
- Controller at start: `status READY`, `readiness.authenticated: true`, `health: true`,
  listener pid 12048, GPU free 15796 MiB (floor 15000)

## 5. Operational facts you must know before relying on it

1. **The forward must bind the WSL vNIC, not loopback.** Hermes runs in WSL and reaches this
   machine at `172.26.128.1` (`vEthernet (WSL (Hyper-V firewall))`). A forward bound to
   `127.0.0.1` is invisible to Hermes. `miniswan-gsq.ps1` auto-resolves this; the first version of
   that script had exactly this defect and it was caught by the live probe.
2. **The box sleeps after 20 minutes idle.** Policy lives in `C:\swan\reconcile.ps1` +
   `swan-watchdog.ps1` (`sleep_min: 20`, `cap: 320`), and the watchdog counts an established SSH
   session as `SSH_ACTIVE`, which blocks sleep. So the forward both transports *and* keeps the 4080
   awake. Stop it when you are done or the machine never sleeps.
3. **The model and the render worker cannot both hold the GPU.** At 64K context the model uses
   ~14152 MiB of 16376 MiB (measured 2026-09-13, `mini64k-vram.json`), leaving ~1.9 GiB. A Video
   Studio render on MiniSwan will not fit while GSQ is loaded.
4. **The model reasons before it answers.** The GGUF's chat template preserves reasoning by
   default; at a tight `max_tokens` the visible `content` comes back empty and the text lands in
   `reasoning_content`. The profile's 4096 max_tokens is sized for this; a 24-token probe was not.
5. **`MiniSwan-GSQ.ps1` is the only supported launcher.** `C:\swan\miniswan-llama-server.ps1`
   (2026-09-06) is a competing, now-stale launcher: port 8080, ctx 32768, and it points at
   `C:\llama\bin\llama-server.exe` rather than the pinned b10809 runtime.

## 6. Open defects

| # | Defect | Impact | Fix |
| --- | --- | --- | --- |
| D1 | `SwanMiniSwanRenderAgent` advertises `-Capabilities ffmpeg,mediasync,generate`, but **ffmpeg is not installed and ComfyUI is not on the box** | The queue's lease filter can route ffmpeg/generate jobs to a worker that cannot run them | Install ffmpeg (winget) **or** narrow the task arguments to what the box can actually do |
| D2 | MiniSwan's clone is dirty at `main @ 53120649f` (2026-09-03): `M render-agent.mjs`, `M start-render-agent.ps1`, `?? worker-admission.mjs`, `?? worker-resource-policy.mjs` | The Sept 6 admission-gate wiring exists only in that working tree | Reviewed: the two new files are **byte-identical** to canonical copies now committed in `ac49119df`. The adapter wiring belongs to the render-agent repo and should be committed there |
| D3 | `C:\swan\.staging-gsq-20260913\` holds ~540 MB of install zips (cudart 390 MB + llama.cpp 149 MB + manifest) | Disk only | Delete after confirming `runtimes\llama-gsq-b10809` is intact |

## 7. Security notes

- **Possible credential in console history.** MiniSwan's PSReadLine history
  (`%APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt`, last written
  2026-09-07) contains `net user ogpsw *` immediately followed by a short typed value. **Rotate the
  `ogpsw` password, then clear that file.** No value is reproduced in this document.
- **Plaintext API keys at rest.** `~/hermes2/.hermes/config.yaml` stores `api_key` values for
  `local-gsq` and `miniswan-gsq` in plaintext (file mode 600, owner-only). The MiniSwan side is
  cleaner: it uses `--api-key-file`. Consider the same indirection on the Hermes side.
- The forward binds the WSL vNIC address only — it is not exposed to the LAN.

## 8. Rollback

1. `.\scripts\miniswan\miniswan-gsq.ps1 -Mode stop` (closes the forward, stops the model).
2. `git revert ac49119df` if the committed scripts are unwanted. Nothing in this work touches
   Render, the database, or the production app.
3. The MiniSwan install itself is additive: no scheduled task, service, or startup entry was
   created by this work. Removing `C:\swan\models`, `C:\swan\runtimes`, and
   `C:\swan\hermes-profiles` returns the box to its pre-Sept-3 state.

## 9. Future review hooks

- Re-run the authenticated probe after any llama.cpp or profile change; assert `finish_reason:
  stop` **and** non-empty `content`, not merely HTTP 200.
- Re-check the VRAM math if the profile's context or KV cache type changes; ~1.9 GiB of headroom is
  thin.
- Decide whether the forward should become a scheduled task (survives reboot, but keeps the 4080
  awake) or stay on-demand (current design).
- Confirm D1 is closed on the deployed task, not just in this document.
- Verify the `gsq-api.key` rotation path is documented before the key is ever changed.

---

## Addendum 2026-09-17 — launcher fixes, freeze recovery, and the 5090 sibling launcher

All findings below are [VERIFIED] live unless tagged otherwise.

**Repo launcher (`scripts/miniswan/miniswan-gsq.ps1`) — two defects fixed:**
1. `-Mode status` read `$healthy` before assignment, so local `/health` always reported
   "not answering". Status now probes through the same bind the start path uses.
2. `Get-RemoteController` lost backslashes in transit: the remote `-File` argument arrived as
   `C:swanhermes-profilesgsqMiniSwan-GSQ.ps1` and every remote controller call failed. The remote
   path is now converted to forward slashes (Windows PowerShell accepts them; backslashes can no
   longer be eaten). Remote controller JSON verified answering after the fix.

**Freeze aftermath on MiniSwan:** the 2026-09-17 PC freeze killed llama-server (pid 12048) without
the controller knowing, leaving `state.json` at phase `READY` with a dead identity. The controller
has no self-heal for this by design (`RECOVERY_REQUIRED_PROCESS_IDENTITY` from every mode).
Recovery applied: `state.json` renamed to `state.json.stale-20260917` (kept for audit) after
verifying no llama-server process, no 18081 listener, and idle VRAM. Controller then answered
`ALREADY_STOPPED` cleanly.

**Admission-floor finding (open):** with the box's current desktop baseline (~1.9 GiB used), free
VRAM is ~14.48 GiB — below the profile's `minimumFreeMiBAfterUnload: 15000`. `-Mode start`
therefore refuses (`GPU_BUSY_FREE_14160_MIN_15000`). Not a defect in the launcher; the gate is the
owned safety design. Options when Sean wants MiniSwan loads to succeed again: close the desktop VRAM
users on that box, reboot it, or lower the floor in `mini-profile.json` (his call).

**New sibling launcher for the 5090 box:** `scripts/local-gpu/qwen5090.ps1` +
Desktop clickables (`Desktop\@Everything\{Qwen Uncensored,MiniSwan Qwen} - {LOAD,UNLOAD,STATUS}.cmd`).
The 5090 stack serves the SAME uncensored 27B through two backends that can never both hold VRAM:
Ollama (`qwen3.8-uncensored:latest`, server must stay up for Hermes aux compression) and NInfer
(`ninfer-serve.exe`, Hermes' active chat provider per `ninfer_config.py selected` → `local-ninfer`).
The launcher is routing-aware, calls each backend's owned scripts only, never touches Hermes config,
never kills the Ollama server, and verifies eviction by polling (a live Hermes gateway reloads the
Ollama model on demand — UNLOAD reports this instead of silently losing the race). Full cycle tested:
load restored NInfer (weights 16.95 GiB in ~3 s, listening 172.26.128.1:18080), unload released both
backends to 2.8/31.8 GiB used. Residual: the first NInfer start invocation did not return for ~25 min
(server itself was healthy and listening; second invocation returned normally — cause [UNKNOWN],
watch on repeat use).

**Security note (rule 59):** `ninfer-serve.exe` takes its bearer key inline (`--api-key <value>` on
the command line), visible to any local process via process listings. Recommend switching to a key
file (as the GSQ profile does with `--api-key-file`) and rotating the key at the next convenient
window. Value not reproduced anywhere.
