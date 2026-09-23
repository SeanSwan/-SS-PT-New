# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/panel-homelab-heat-2026-08-25/PACKET.md
**Tokens:** 2048 in / 18002 out (reasoning: 14428) | total 20050
**Wall:** 357.0s

---

# Hostile Review: The Plan Optimizes the Wrong Term

Thesis up front: **this plan spends most of its ink on load-time watts (undervolting, power limits, GPU splits) when ~90% of the recoverable money and heat is in the 24/7 idle baseline.** Current always-on draw is roughly Box A 76 W + Box C ~60 W + router ~10 W ≈ **150 W continuous ≈ $16/month at $0.15/kWh (every continuous watt ≈ $1.31/yr)**. The plan as written attacks maybe 1–2 of those 150 watts. The "late idea" (Pi as controller) and the unasked question (why is Box C awake at all) are the actual plan. Conversion constant used throughout: **1 W continuous ≈ $0.11/month**.

---

## Q1 — Is the two-box split worth building? Condition for NO

The **RAM move: yes, unconditionally** — it's $0, already proven in this exact box, reversible in 20 minutes. Do it tonight.

The **orchestration (queue, wake, suspend logic): conditionally**, and the plan doesn't state the condition, which is the failure. It is NOT worth it if any of:

- **The batch queue is video-dominated.** Video models (Wan-class, ~60+ GB with variants) don't fit 16 GB VRAM. Box B offloads, times balloon, and the "batch worker" quietly becomes a liability. The plan's own role assignment (§3 item 2: "long video renders" → Box B) is a mis-assignment — video belongs exclusively on the 32 GB 5090 box, full stop.
- **Simultaneous interactive + batch collisions are <2–3 h/week.** Throughput-splitting an embarrassingly-parallel job only pays when you're actually blocked. If you're not blocked, this is an evening of setup plus a permanent model-sync tax for zero recovered hours.
- **You won't maintain two synced ComfyUI installs and model trees.** This is the real cost the plan never mentions: duplicate weights, version drift, hash mismatches. It's the thing that rots.

Minimum viable version: RAM in, WoL tested, and a **manual** wake-and-submit shortcut on Box A. Build the polling queue only after the manual version has annoyed you for two weeks.

## Q2 — Ranked by value ÷ cost

| # | Move | Cost | Watts saved | When | ~$/mo | Verdict |
|---|------|------|-------------|------|-------|---------|
| 1 | **Fix Pi boot storage** (replacement hub power cord ~$8, or `usb_max_current_enable=1` + 5.1 V/3 A PSU) | $0–12 | Enables #2–3 (~130 W) | — | unlock | **Do first. Everything below is blocked on this.** |
| 2 | **Migrate radar → Pi; retire Box C** | $0 + 1 evening | ~50–65 W | 24/7 | ~$5.5–7 | Do after a 1-week shadow run. Kills Q5 as a bonus. |
| 3 | **Pi as controller; both big boxes sleep when idle** | $0 (test WoL on B first) | 60–110 W × unused hours (~16–20 h/day) | daily | ~$4–6 | The best idea in the packet, buried as a "late note." |
| 4 | **Diagnose the 76 W idle** — see Q7. If it's the multi-monitor VRAM-clock bug, fix display topology | $0 | up to ~50 W | while awake | $0–5 | 30 minutes. Could be the single biggest idle win. |
| 5 | **Buy a plug-in power meter** (~$15–20) | $15–20 | 0 | — | meta | **The only purchase I endorse.** Every watt number in this packet except one is a guess. |
| 6 | **Cap 5090 at 400 W floor** | $0 | 80 W | load only | ~$0.5–1.2 (at 3 h/day) | Free checkbox. Costs ~4–6% perf. Take it. |
| 7 | **RAM → Box B (128 GB)** | $0 | 0 | — | unlocks MoE batch | Do, with expectations reset (see Q8). |
| 8 | **Test WoL on Box B** | $0, 20 min | — | — | — | Before any $12 plug. Different board ≠ dead board. |
| 9 | Smart plug + AC-restore fallback | $12 | — | — | — | Only if #8 fails. See BitLocker caveat in Q3. |
| 10 | Curve undervolt (proper V/F, not just cap) | $0 + 1–2 evenings | 60–100 W at same perf | load only | ~$1–2 | Only if GPU load ≥2–3 h/day. Do the 5090 first. |
| 11 | Fan-stop curves on Box A (14 fans spinning at idle is absurd) | $0, 10 min | ~5–15 W | awake idle | <$1 | Do. Also kills idle noise. |

**Anti-list (do not spend):** DDR5 kit ($1000 — hard no, the $0 RAM move covers the need); VPS for radar (recurring cost + violates the boundary for marginal savings — see Q4); any LAN tensor-parallelism scheme (the plan correctly rejects it); networking upgrades (Pi stays 1 GbE, fine — see Q3); moving the 5090 (ruled out, and correct).

## Q3 — Pi as controller: better. Four things break.

Better, decisively: Box A as controller forfeits ~76 W × 24 h ≈ **$100/yr** so that a 4 W device can… not be used. What breaks:

1. **The keystone runs on dying media.** Making the Pi the dependency for wake + radar while it boots from an SD card "expected to fail" is the worst risk-reward in the packet. Fix #1 in the table first. Non-negotiable.
2. **File path.** Pi 4 is 1 GbE (~100 MB/s real). If the shared queue/artifacts live on the Pi, every multi-GB render result crosses at 1 GbE instead of your 2.5 GbE. Fix: Pi sends 60-byte magic packets and small job files; **big transfers stay peer-to-peer A↔B**, or Box B pulls directly from wherever the assets live.
3. **Tailscale currently dies with Box A.** If A sleeps, your remote access path is gone. Install Tailscale on the Pi (free); Pi 4 will push ~100–250 Mbps over WireGuard — plenty for admin and wake-from-away, not for pulling model weights.
4. **Nothing wakes Box A for interactive use** except your finger. You're physically in that room (the TVs are there); the power button is the cheapest wake mechanism you own. If you need remote wake, Pi does it — that's already proven from April.
5. (Smart-plug caveat if WoL-B fails: "Restore AC Power Loss → Power On" gives a **cold boot**, not a resume. Needs a boot-triggered scheduled task ("run whether user is logged on or not") and will bite you if BitLocker asks for a PIN. Also: it auto-boots after every power cut, at 3 a.m., fans and all.)

Also: add a **suspend watchdog on Box B** — a crashed job that never releases the "stay awake" condition means a 100+ W box running all night into a sealed hot room. Queue empty + 0% GPU for N minutes → sleep, regardless of job state.

## Q4 — Box C: retire it. The Pi at 4 W beats everything.

The workload is cron + scrapes + one HTTPS call. Zero local inference. The 2013 GPU and the 95 W 2017 CPU are running a Raspberry Pi's job.

- **VPS math first, honestly:** 60 W ≈ $6.5/mo vs a ~$5 VPS — the VPS is nominally cheaper. Rejected anyway: recurring cost forever, and collected data lands on someone else's disk, violating the boundary in spirit even if credentials never leave. The stated principle wins; note that the Pi at 4 W (~$0.45/mo) beats both.
- **Correct call:** migrate to Pi **after** the storage fix, via a **shadow run** — both collectors running in parallel for a week, diff the outputs, then cut over. Never big-bang a collector that "makes money while you sleep."
- **Migration risks, concretely:** amd64-only Docker images or Python wheels; headless Chromium on ARM (works, slower — check scrape cadence doesn't trip rate limits); environment/keys move; and the SD→SSD boot itself. Keep Box C whole as a cold spare — its 300 GB SSD and case are worth more intact than parted.
- If migration stalls on arch issues: interim is pull the 770 (Q5), Eco-mode the CPU, and accept ~40 W until you finish the port. But finish the port — it's worth $65–85/yr.

## Q5 — GTX 770: remove only if Box C survives the quarter.

It computes nothing; Kepler idles ~10–20 W plus its fan. Headless-boot risk on AM4 is **low but nonzero** — most AM4 boards POST fine without a dGPU, and Ubuntu doesn't care, but a minority halt on "no VGA" and you're fixing it blind. The test costs 10 minutes and $0: shut down, pull the card, boot, wait, SSH in. If it POSTs, done. If it hangs, re-seat and stop caring.

But the hostile answer: if radar migrates to the Pi this month, **don't do the surgery on a box you're about to euthanize.** Retiring the box subsumes the question.

## Q6 — Undervolting: the cap is free, the curve is a maybe.

- **480 → 400 W cap:** saves 80 W **only under full load**. At 3 h/day that's ~7 kWh/mo ≈ $1. Perf cost ~4–6% (memory-bound image gen loses on the lower end). It's a free checkbox — set it. The room-heat benefit during renders is real; that's the actual argument, not the dollar figure.
- **Curve undervolt vs. cap:** yes, meaningfully better — a locked-clock V/F point typically recovers most of that 4–6% at the same ~400 W, i.e., ~60–80 W free under load. Cost: one evening per GPU in Afterburner, and it occasionally resets on driver updates. **Do it only if your 5090 load is ≥2–3 h/day.** If it's 45 minutes a day, you're paying an evening to save ~40¢/month.
- **4080 Super:** lower priority by construction — it sleeps, and it's the batch box where a few percent doesn't matter. One extra consideration: it's a 320 W GPU in a tight SFF case running multi-hour CPU-offload MoE jobs. Cap it to ~70–80% for sustained batch (saves 60–80 W during exactly the hours the room is already cooking, lengthens jobs slightly, protects VRAM thermals in that case).
- **Idle is the unexamined term — see Q7.**

## Q7 — What's missed entirely

1. **The 76 W idle number is the smoking gun, not a datapoint.** A 5090 idling at 76 W and 41 °C at 0% utilization is the classic **multi-monitor mixed-refresh VRAM-clock bug** (memory stuck at max clock because your displays disagree on refresh — two 4K + an OLED 1440p is precisely the trigger). If confirmed (check memory P-state in HWiNFO/GPU-Z at idle), the fix is identical refresh rates / consistent DP topology — **~40–55 W saved, 24/7 or whenever the box is awake, for $0.** If instead 76 W is whole-system at the wall, it's implausibly low for 14 fans + X870E + 5090 and needs re-measurement. Either way, the plan builds on an ambiguous number.
2. **The intake path.** An exhaust fan pushing air out of a sealed 108 sq ft room with an undercut-free door chokes itself. Crack the door or cut a vent. $0, and it improves the heat strategy more than any undervolt.
3. **The baseline thesis itself** (stated above): sleep architecture and Box C retirement cut the room's resting heat output ~450 BTU/h; undervolting cuts 80 W for load-hours only. The plan has these inverted in emphasis.
4. **Model-sync drift** as the hidden recurring cost of the two-box split (Q1).
5. **The suspend watchdog** (Q3) — the failure mode where the sleep architecture silently becomes a 100 W always-on heater.
6. Circuit sanity check: 480 + 320 + 150 (OLED) + monitors on one 15 A/120 V circuit ≈ 11 A with a TV, amp, and lights on it. Probably fine; verify before the first simultaneous render day.

## Q8 — Factual errors

1. **§3 item 1's bandwidth reasoning is wrong in both directions.** Keeping Box A at 2×32/6000 "to preserve bandwidth" is cargo cult — Box A's workloads (ComfyUI, agents) are VRAM/GPU-bound; CPU memory bandwidth is irrelevant to them. Meanwhile the plan silently assumes Box B's 128 GB runs at speed. **4×32 DDR5 on AM5 will very likely not hold 6000 MT/s** — expect 3600–4800 after tuning, and the spare kit's already run in this box, so at least compatibility is proven. Worse: the Level1Techs ~116 GB MoE pattern was built on multi-channel server bandwidth (~300+ GB/s). Box B is dual-channel: ~96 GB/s peak, ~65 real — a **5–7× deficit** on the exact resource CPU-offload MoE is bound by. It will run; expect single-digit tok/s decode and minutes-long prefill. That's an overnight batch box (which fits the role!) — but the plan cites the pattern without disclosing the hardware gulf.
2. **The ~1.5× parallel-render estimate is inflated ~20–40%.** A 5090 is ~1.7–2× a 4080 Super per seed. Integer 2/2 split: wall clock = max(2t, 4t) = **1.0–1.3×, not 1.5×**. Even 3/1 caps at ~1.35×. 1.5× requires near-parity that doesn't exist, and any VRAM offload on B erases the margin. Also unexamined: batching 4 seeds on the 5090 alone may already capture most of the parallelism through better utilization — shrinking the cross-box gain further. Right idea, wrong number: budget **~1.2–1.35×**, image gen only.
3. **"~300× too slow" is decorative.** vs. PCIe 5.0 x16 (~64 GB/s) it's ~200×; vs. NVLink-class it's thousands. And it's the latency (~0.1–0.5 ms vs. µs), not bandwidth, that kills layer-split. Conclusion correct; number invented.
4. **The plan's §5 heat section is the weakest part presented as the strategy** — category error rather than factual error, and the most expensive one if it absorbs the evenings that items 1–3 of the ranking deserve.

**Execution order:** Pi storage fix → radar shadow-run → Pi controller + sleep both boxes → idle-power diagnosis → 400 W cap + RAM move tonight. Total cash outlay: **under $25** (mostly the power meter). Expected steady state: always-on load drops from ~150 W to ~16 W, room baseline heat drops ~90%, and every future decision gets made against meter readings instead of estimates.
