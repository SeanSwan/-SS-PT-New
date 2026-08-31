---
decision: Workstation BIOS/system tuning advisory for Sean's primary dev machine — diagnosis and settings plan delivered; not yet applied or verified on hardware
status: open
supersedes: none
scope: Sean's local workstation (NOT SwanStudios product code — zero runtime files touched)
branch: claude/gigabyte-x870-bios-setup-40pyet
date: 2026-08-31
---

# Workstation BIOS Setup — Cold-Start Handoff

## ⚠ Read this first: nothing here is VERIFIED on the hardware

`[UNVERIFIED]` — every claim below is advisory. This session had **no access to the machine**.
Evidence available was exactly two things:

1. Sean's spoken description of his hardware (voice-transcribed, some terms garbled — see "Transcription decoding").
2. **A photograph of a screen** showing a *different* agent session's output about the same machine.

No BIOS was read, no command was run on the target box, no setting was changed. The next agent
must treat the whole plan as `[HYPOTHESIS]` until Sean runs the verification command in §5.

## 1. The ask (Sean, verbatim intent)

Sean wants the **optimal BIOS and system settings** for his workstation so it runs at its best.
Two specific things prompted it:

- He believes **"CMD" is disabled** and wonders whether it should be enabled.
- A prior agent session told him the machine **"was running 8 cores instead of 16"** and that he
  needs to go into the BIOS to fix it. He shared the screenshot of that finding as context.

## 2. Hardware inventory (as stated by Sean — NOT independently confirmed)

| Component | Value | Confidence |
|---|---|---|
| Motherboard | GIGABYTE **X870 AORUS PRO ICE** | `[LIKELY]` — decoded from "X870 soy RS ice pro" |
| CPU | AMD **Ryzen 9 9950X3D** (16C/32T, dual-CCD, V-Cache on CCD0) | `[VERIFIED]` — named in both Sean's message and the screenshot |
| GPU | **RTX 5090**, ASUS variant | `[LIKELY]` — Sean self-corrected from "GTX" to "RTX" mid-sentence |
| Cooler | **Lian Li Galahad II 360** AIO | `[HYPOTHESIS]` — decoded from "Gillen hard Lee Lee 360 AIL3" |
| Storage | 4 TB + 2 TB M.2 NVMe, WD Black | `[LIKELY]` |
| RAM | Corsair **Dominator Titanium**, 6000 MT/s, **64 GB assumed** | `[UNKNOWN]` — he said "264 GB"; almost certainly 64 GB, but **stick count is unresolved and it changes the advice** |
| PSU | not stated | `[UNKNOWN]` — **material gap, see §6** |
| BIOS / AGESA version | not stated | `[UNKNOWN]` — **material gap, see §6** |

### Transcription decoding
Sean dictates. Several terms arrived garbled and were interpreted, not confirmed:
- "X870 soy RS ice pro" → **X870 AORUS PRO ICE**
- "CMD" → **CSM** (Compatibility Support Module). *Could* have meant **SVM** (virtualization). Both were answered.
- "Gillen hard Lee Lee 360 AIL3" → **Lian Li Galahad II 360**
- "264 GB … at 16 6000" → **64 GB @ 6000 MT/s**, CAS latency unresolved

**If any decoding above is wrong, the corresponding recommendation may be wrong.** Confirm with Sean before acting.

## 3. Primary finding — ~75% of the CPU is missing

The screenshot reports Windows seeing **8 cores / 8 logical processors**. A 9950X3D is **16 cores / 32 threads**.
That is two independent faults stacked:

| Symptom | Cause |
|---|---|
| 8 cores instead of 16 | One CCD disabled (the chip is 2× 8-core CCDs) |
| 8 threads instead of 16 | **SMT also disabled** |

The screenshot also states **BCD contains no `numproc` restriction**, which rules out the Windows
boot-config cause and points at BIOS or a vendor utility.

### Four candidate sources — check all, not just BIOS
1. **BIOS**: CCD Control / Downcore Control / SMT set to non-Auto.
2. **GIGABYTE Control Center → Performance → "Gaming Mode"** — on dual-CCD X3D parts this deliberately
   disables the non-V-Cache CCD. Strong candidate given the board vendor.
3. **AMD Ryzen Master → "Game Mode" profile** — same behavior, persists across reboots.
4. `msconfig` → Boot → Advanced → Number of processors — **already ruled out** by the BCD finding above.

Sean's framing ("I need to go into the BIOS to fix it") may be **too narrow** — if the cause is #2 or #3,
no amount of BIOS work fixes it. Say so before he spends an evening in firmware.

## 4. Recommended settings (delivered to Sean in full in-session)

Grouped summary; the in-session answer carried the detail and menu paths.

**Boot/firmware** — CSM **Disabled** (required for ReBAR/Secure Boot/UEFI GPU mode; enabling it risks an
unbootable GPT install); Secure Boot **Enabled**; AMD CPU fTPM **Enabled**.

**GPU (free performance on a 5090)** — Above 4G Decoding **Enabled**; Re-Size BAR **Enabled/Auto**;
PCIe **Gen5/Auto**. Verify after: NVIDIA Control Panel → System Information → Resizable BAR = Yes.

**Memory** — EXPO **Profile 1**; FCLK **Auto** (→2000 MHz, the 1:1 sweet spot for a 6000 kit);
Memory Context Restore **Enabled** (cuts 20–40s of POST). 6000 is the correct AM5 target — higher
usually forces a 2:1 divider and is a net loss.

**Power/thermal** — Global C-States **Auto**; **ErP Disabled** (Sean uses **RustDesk**; ErP kills
wake-on-LAN and USB wake); Wake on LAN **Enabled** if he wants remote wake; AIO pump header **100% PWM**.

**Windows-side, specific to 9950X3D** — latest **AMD chipset driver** (ships the 3D V-Cache Performance
Optimizer that routes work to the right CCD); **keep Xbox Game Bar + Game Mode ON** (it is the hook the
optimizer uses — uninstalling degrades routing); power plan **Balanced**, not High Performance
(High Performance defeats the core parking the optimizer depends on).

**Tuning — explicitly deferred.** PBO / Curve Optimizer / Curve Shaper only after days of stability at
16/32 cores with EXPO on. Noted that negative Curve Optimizer values fail under *light* load, so
CoreCycler is required alongside OCCT/Prime95 or "stable" is a false reading.

**Recommended order**: Load Optimized Defaults → re-apply the above → verify 16/32 → chipset driver →
run for days → *then* tune.

## 5. The verification command — this is the gate

```powershell
Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors
```

**Must return 16 and 32.** Anything else means one of the four sources in §3 is still holding it down.
No claim that this is fixed is admissible without this output. Nothing in this session produced it.

## 6. Gap analysis — what Sean did NOT ask, ranked by cost

1. **A second agent already changed this machine, and its work is not reconciled with this plan.**
   The screenshot shows another session that edited 10 files, removed/preserved startup entries
   (Adobe Creative Cloud/CCX, iTunesHelper, Sony PMB, FireStorm, Imaging Edge, RustDesk), changed
   Defender scan scheduling/priority, disabled DVR + background capture, and left rollback receipts
   under `C:\tmp\workstation-maintenance-20260830`. It reported nothing committed or deployed.
   **The next agent must read those receipts before touching anything**, or the two plans will fight.
   This is the single highest-risk gap.
2. **BIOS/AGESA version is unknown, and it is load-bearing.** Early X870 firmware had real 9950X3D
   core-parking bugs. Tuning on top of stale AGESA wastes the effort. Get the version first.
3. **PSU is unknown.** RTX 5090 + 9950X3D is a heavy transient load. If the PSU is undersized, the
   "sluggishness" and any shutdowns get misdiagnosed as BIOS forever. Ask before tuning.
4. **RAM stick count unresolved — 2 vs 4 DIMMs changes the answer.** 2×32 GB at 6000 should just work;
   4 DIMMs load the memory controller far harder and often need 5600 or 5200. Without this, the EXPO
   advice is a coin flip.
5. **No BIOS profile backup was proposed to Sean.** Gigabyte can save profiles to USB. That is the
   rollback plan, and it should exist *before* Load Optimized Defaults wipes his current config.
6. **The cost is tied to his actual work and was never quantified.** If this is his primary SwanStudios
   dev box, running at ~25% CPU has been silently taxing every `npm run build`, `vitest run`, and
   `tsc --noEmit` in every session. Framing the fix in build-minutes would likely move it up his queue.

## 7. Open questions owed by Sean

1. **How many RAM sticks — 2 or 4?** (Determines whether 6000 EXPO is realistic.)
2. **SVM on or off?** He uses WSL2/Docker in this repo's workflow → likely **on**, but VBS/Memory
   Integrity costs a few percent in games. His call.
3. Not asked but needed: **PSU wattage** and **current BIOS version**.

## 8. What was NOT done, deliberately

- No settings applied — advisory only; no access to the machine.
- No product/runtime code touched. Working tree was clean at session start (`git status --porcelain` → 0 lines)
  and this document is the only artifact.
- No PBO/Curve Optimizer values recommended for immediate use — gated behind stability.
- The other agent's `C:\tmp\workstation-maintenance-20260830` receipts were **not** read (no machine access).

## 9. Paste-ready prompt for the next agent

```
Load the `handoff` skill, then read
docs/ai-workflow/AI-HANDOFF/WORKSTATION-BIOS-SETUP-HANDOFF-2026-08-31.md
in full before doing anything.

Context: Sean's primary workstation (GIGABYTE X870 AORUS PRO ICE / Ryzen 9 9950X3D /
RTX 5090 / 64GB DDR5-6000) is reporting 8 cores / 8 logical processors instead of
16 / 32 — roughly 75% of the CPU is missing. A BIOS + system settings plan exists in
that handoff but NOTHING has been verified on the hardware. Everything in it is
[HYPOTHESIS] until proven.

Do these in order, and do not skip step 1:

1. BEFORE proposing any change, get Sean to surface the OTHER agent session's rollback
   receipts at C:\tmp\workstation-maintenance-20260830. Another session already modified
   startup entries, Defender scheduling, and DVR/background capture on this machine.
   Reconcile with it — do not contradict or re-do its work.

2. Collect the four unknowns that block the plan (handoff §6/§7): RAM stick count (2 or 4),
   PSU wattage, current BIOS/AGESA version, and whether Sean wants SVM enabled.

3. Have Sean save his current BIOS profile to USB before any Load Optimized Defaults.
   That is the rollback plan and it does not exist yet.

4. Then work the plan in handoff §4, and gate every completion claim on the §5 command
   returning 16 and 32. Per Rule 74, do not say "fixed" without that output pasted back.

Note Sean dictates by voice — several hardware terms in the original session arrived
garbled and were DECODED, not confirmed (handoff §2). Confirm the board model and cooler
before relying on any menu path.

This is workstation ops, not SwanStudios product work. No runtime code should be touched.
```
