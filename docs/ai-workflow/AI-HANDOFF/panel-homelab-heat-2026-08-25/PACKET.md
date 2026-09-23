# Hostile Review Packet — Three-Box Homelab: Heat, Power, and Whether to Network Them

**Date:** 2026-08-25
**Remit:** Adversarial review. The owner is budget-constrained and heat-constrained. Tell him what is WRONG with this plan, what he is about to waste money or time on, and what the highest-value moves actually are. Rank by (value ÷ cost). Do not be agreeable.

---

## 1. The constraint that dominates everything

All equipment lives in a **9 ft × 12 ft room (108 sq ft)**. Every watt drawn becomes heat in that room. There is no dedicated air conditioning. Current mitigation: **an exhaust fan sitting on top of the main tower, pushing room air out of the room to the outside**, with cooler air drawn in passively. The main tower's airflow already exhausts upward into that fan.

Also in the room, adding heat: a **77" OLED TV**, **three monitors** (two 4K, one of them OLED; one 1440p).

**The owner is cash-constrained.** He explicitly cannot buy DDR5 (a 2×64GB kit is quoted locally at ~$1000 in the current memory market). Recommendations costing real money must justify themselves hard. Sub-$20 recommendations are acceptable.

Stated goal, in his words: *"keep that heat down and power down… lower anywhere we can, with losing minimal power and performance."*

---

## 2. Verified hardware inventory

### Box A — "main" (Windows 11)
- **RTX 5090, 32 GB VRAM.** Driver 610.62.
- **Power limit is ALREADY SET TO 480 W** — not the 600 W default. Range: min 400 W / default 600 W / max 600 W. So a 20% power cut is already applied. Idle draw observed: **76 W** at 41 °C, 0% utilization.
- **64 GB RAM = 2 × 32 GB Corsair @ 6000 MT/s** (2 DIMMs occupied).
- Motherboard: **Gigabyte X870E AORUS PRO ICE**.
- ~14-fan tower configuration.
- **Wake-on-LAN is CONFIRMED DEAD on this board.** Exhaustively tested over 2+ hours: BIOS F7b→F12a, ErP disabled, Network Stack enabled, every Realtek driver setting, every registry override, Pi-side `wakeonlan` + `etherwake` confirmed firing. Ethernet port LEDs go **completely dark within 5 seconds of S3 entry** — the board cuts NIC standby power. Known community issue on this board. Conclusion recorded: do not retry.

### Box B — "secondary" (Windows)
- **RTX 4080 Super, 16 GB VRAM** + **Ryzen 7 7800X3D**.
- **64 GB G.Skill currently installed — but this box has already been run at 128 GB previously**, and the owner still possesses the additional sticks. Re-installing them costs **$0**.
- Small-form-factor Lian Li case, described as physically tight. Arctic Liquid Freezer III AIO. 1000 W PSU. ~3 TB NVMe.
- Owner has ruled out moving the 5090 into this case. Do not relitigate.
- **WoL status on this board: UNTESTED.** Different motherboard from Box A.

### Box C — "radar" (Ubuntu, always-on by design)
- **Ryzen 5 1600X** (2017, 95 W TDP, no integrated graphics), **GTX 770** (2013, Kepler, CUDA compute 3.0 — unsupported by modern PyTorch), **16 GB RAM**, ~300 GB SSD.
- **This box has a real job**: it is a deliberate privacy boundary — a read-only agent lane that runs deterministic collectors plus ONE episodic LLM API call, to "make money while the owner sleeps." It holds **no production database credential** by design. Principle recorded: *"P0 never leaves the house."*
- Its actual compute load is: scheduled scrapes + one API call. **It performs no local inference.**

### Box D — Raspberry Pi 4
- Owned, available. **Currently blocked**: attempts to boot from USB SSD failed because the Pi 4's USB ports do not supply enough power; it is running on an SD card that is expected to fail eventually. The fix is a **powered USB hub**, which the owner already owns but has lost the power cord for.
- **Already provisioned with `wakeonlan` and `etherwake`, tested and confirmed firing magic packets** during the April WoL investigation.

### Network — already better than assumed
- All three PCs are **already wired via Ethernet to the same consumer router**, single /24 subnet.
- **Tailscale is already installed and running on Box A.** A mesh VPN layer therefore already exists.

---

## 3. The plan as currently proposed (attack this)

1. **RAM:** Spend $0. Move the already-owned spare sticks into Box B → 128 GB. Box B becomes the large-RAM CPU-offload inference worker (the pattern from a Level1Techs build: a ~500B-parameter MoE model, quantized to ~116 GB, run mostly on CPU out of system RAM via `ik_llama.cpp`, with the GPU holding KV cache). Box A keeps 64 GB @ 6000 untouched to preserve memory bandwidth.
2. **Roles:** Box A = interactive / low-latency (coding agents, ComfyUI the owner is watching). Box B = batch/queue worker (long video renders, big-MoE runs, dataset preprocessing, fine-tune jobs with CPU optimizer offload).
3. **Sleep architecture:** Box B sleeps by default (~5 W) and is woken on demand. Box A stays awake as controller. If WoL fails on Box B, fall back to a ~$12 smart plug on its PSU cord plus BIOS `AC BACK → Power On`.
4. **Queue:** a shared-folder job queue — the same polling-watcher pattern already used twice elsewhere in this owner's projects. Box A drops a job file; Box B picks it up, returns results, then suspends after N minutes of empty queue.
5. **Heat/power:** further power-limit and undervolt the GPUs; keep the exhaust fan.
6. **Claimed performance benefit:** explicitly NOT faster for any single task — Ethernet at 2.5 Gb/s (~0.3 GB/s) is ~300× too slow for tensor parallelism, and `llama.cpp` RPC layer-splitting would be network-latency-dominated. The claimed benefit is throughput and contention relief: the owner's image/video generation loop issues one prompt → 4 independent seeds, which is embarrassingly parallel and could be split 2/2 across boxes for an estimated ~1.5× wall-clock (not 2×, because Box B has 16 GB VRAM and will offload).

### A late idea the owner raised, not yet evaluated
Use the **Raspberry Pi as the always-on controller instead of Box A** — so that *both* big boxes can sleep, and a ~4 W device (rather than a 76 W-idle 5090 box) is what stays powered 24/7 and issues wake commands. Note the Pi is already tooled for exactly this and is already the proven magic-packet sender.

---

## 4. Questions for hostile review — answer each directly

1. **Is the two-box split actually worth building at all**, or is it complexity theatre that will cost more in maintenance and idle watts than it returns? Give the condition under which it is NOT worth it.
2. **Rank every proposed move by value ÷ cost.** Include moves not in the plan. Be specific about watts saved and dollars spent.
3. **The Pi-as-controller idea**: better or worse than Box A as controller? What breaks?
4. **Box C (radar)**: it draws an estimated 50–70 W continuously and runs a workload that is scrapes plus one API call. Is keeping a 2017 CPU + a 2013 GPU running 24/7 defensible, given the workload could plausibly run on the Pi at ~4 W — while preserving the "nothing leaves the house" privacy boundary that a cloud VPS would violate? What is the correct call, and what does the migration risk?
5. **The GTX 770 specifically**: it does no compute. Should it be removed? Note the 1600X has no integrated graphics — assess the headless-boot risk before recommending removal.
6. **Undervolting**: the 5090 is already at 480 W (down from 600 W default; floor is 400 W). What is the realistic remaining gain from 480 → 400 W, in both watts and lost performance? Is a proper voltage/frequency-curve undervolt meaningfully better than a simple power cap here, and is the GUI-tooling hassle worth it? Same question for the 4080 Super.
7. **What is being missed entirely?** Name the highest-value thing absent from this plan — thermal, electrical, architectural, or a false assumption embedded above.
8. **Call out any factual error** in sections 1–3. Specifically stress-test the memory-bandwidth-vs-capacity reasoning in item 1 and the ~1.5× parallel-render estimate in item 6.

Be concrete. Prefer "do X, it saves ~N W for $M" over principles.
