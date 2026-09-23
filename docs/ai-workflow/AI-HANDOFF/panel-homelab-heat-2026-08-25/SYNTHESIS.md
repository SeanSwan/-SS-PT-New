# Synthesis — Homelab Heat/Power Panel, 2026-08-25

**Seats:** Ox Alpha (`stealth/ox-alpha`, effort high, **$0.00**, 8483 out) · GLM 5.3 (`glm-5.3`, 18002 out incl. 14428 reasoning). **Total spend: ~$0.**
**Attribution note (gotcha #3):** GLM did NOT ventriloquise other seats this run — its output was clean Q1–Q8. Ox and GLM are two independent votes.
**Verdict:** Ox = **REVISE**. GLM = plan optimizes the wrong term. Both converge.

---

## 0. INSTRUMENT ERROR — read this before trusting either review

**The packet fed both models a `76 W` GPU idle figure. That number was a transient artifact.** A second sample taken after the packet was written read **35 W at 39 °C, memory clock 7001 MHz against a 14001 MHz max** — i.e. the card *is* downclocking.

Consequences:
- **Ox's #1 ranked recommendation ("fix the pathological 76 W idle — best ratio in the document") is INVALID.** It reasoned correctly from bad input.
- **GLM's Q7 #1 and ranked item #4 are likewise built on it.**
- The claimed prize (~40–55 W, 24/7, free) **is not available.**

**Residual real finding:** memory sits at *exactly half* max clock at idle, not the lowest P-state — consistent with the multi-monitor mixed-refresh behavior both models named, but worth only ~**5–15 W**, not 40–55 W. One 10-minute refresh-rate-matching test, small prize.

**Confirmed independently:** fans measured at **99% while idle at 39 °C**. GLM flagged the same thing blind ("14 fans spinning at idle is absurd"). This one is real. `[VERIFIED — nvidia-smi]`

---

## 1. Errors the panel found in MY advice (owned)

| # | My claim | Reality | Caught by |
|---|---|---|---|
| 1 | 2/2 render split ≈ **1.5×** | 5090 is ~1.7–2.5× a 4080S per seed. Naive 2/2 = `max(2t, 4–5t)` = **regression or wash**. Best 3/1 weighted ≈ **1.33×**. Budget **1.2–1.35×, image-gen only** | Both |
| 2 | Pi as controller → "**both** big boxes sleep" | Box A's WoL is **confirmed dead**. The Pi cannot wake it by any verified path. "Dead on arrival for half its purpose" | Ox |
| 3 | Smart plug + `AC BACK → Power On` | As written this is a **hard power cut on live NTFS** = data-loss instruction. Plug may only re-arm an *already cleanly shut down* box. Also: cold boot ≠ resume; BitLocker PIN will bite | Ox |
| 4 | Box B = "long video renders" | Video models don't fit **16 GB**. Video belongs **exclusively on the 32 GB 5090**. Role assignment was backwards | GLM |
| 5 | Keep Box A at 2×32 "to preserve memory bandwidth" | **Cargo cult** — Box A's workloads (ComfyUI, agents) are GPU/VRAM-bound. CPU memory bandwidth is irrelevant to them | GLM |
| 6 | Ethernet "~300× too slow" | Decorative number. vs PCIe 5.0 x16 it's ~200×. And it's **latency** (~0.1–0.5 ms vs µs), not bandwidth, that kills layer-split. Conclusion right, number invented | GLM |
| 7 | 76 W idle | Transient. Real = 35 W. Poisoned both reviews | Me, post-hoc |

**Unasked-for catch (Ox):** the shared-folder queue has a **lost-job race** — B polls empty → starts suspend countdown → A drops job at minute N−ε → B suspends → job sits forever. Needs a wake-then-write handshake, atomic temp-then-rename, suspend timer reset on folder events, and atomic claim-rename + idempotency keys for crash-mid-job.

---

## 2. Where both seats converge (highest confidence)

1. **The 24/7 idle baseline is the prize; load-time undervolting is a rounding error.** GLM: always-on ≈ Box A + Box C + router ≈ **150 W continuous ≈ $16/mo**, and the plan attacked ~1–2 of those watts. Constant: **1 W continuous ≈ $0.11/month ≈ $1.31/yr.**
2. **Retire Box C (radar) → migrate to the Pi.** ~50–65 W recovered, 24/7. Ox #5, GLM #2. **Both demand a 1-week parallel shadow run and output diff before cutover** — never big-bang a collector that earns money overnight.
3. **Fix the Pi's boot storage FIRST.** Everything else is blocked on it. GLM: "non-negotiable" — making a dying SD card the keystone for both wake *and* radar is the worst risk/reward in the plan. Cost $0–12 (the lost hub cord, or `usb_max_current_enable=1` + a real 5.1 V/3 A supply).
4. **Test WoL on Box B before buying any smart plug.** Different board ≠ dead board. 20 min, $0.
5. **Buy a plug-in power meter (~$15–20).** The *only* purchase either seat endorses. Every watt figure in this thread except the GPU ones is a guess.
6. **The intake path is missed.** An exhaust-only fan in a near-sealed 108 sq ft room depressurizes it and chokes itself, pulling replacement air through leaks. Crack the door / undercut it / cut a vent. $0, and it beats every undervolt.
7. **Do the RAM move — it's $0 and already proven in that box.** But reset expectations (see §3).
8. **400 W cap: free checkbox, take it** — ~4–6% perf. The argument is room heat during renders, not the ~$1/mo.
9. **Build the queue LAST**, only after a manual wake-and-submit shortcut has annoyed him for two weeks.

---

## 3. The expectation reset on the Level1Techs dream (GLM, unique + important)

The L1T ~116 GB MoE build ran on **server multi-channel memory (~300+ GB/s)**. Box B is **dual-channel: ~96 GB/s peak, ~65 GB/s real** — a **5–7× deficit on the exact resource CPU-offload MoE is bound by**. Plus 4×32 on AM5 likely drops to **3600–4800 MT/s**, costing another ~33%.

**It will run. Expect single-digit tok/s decode and minutes-long prefill.** That is an *overnight batch box* — which fits the intended role — but the packet cited the pattern without disclosing the gulf. Also unvalidated: 116 GB for 500B ≈ 1.86 bits/weight is sub-Q2; viability depends on active-param count and whether KV cache fits 16 GB alongside offloaded layers (Ox B5).

---

## 4. Divergence

Only one, and it's soft: **Ox ranks the (invalid) idle fix #1**; **GLM ranks Pi-storage #1** and treats the idle fix as #4 with an explicit "if confirmed" hedge. With the 76 W number retracted, **GLM's ordering is the correct one.**

---

## 5. Agreed execution order

**Phase 0 — unblock + measure (~$20)**
1. Fix Pi boot storage (hub cord or `usb_max_current_enable=1` + 5.1 V/3 A PSU) — **blocks everything**
2. Buy plug-in power meter; baseline every box at idle and load
3. Test WoL on Box B from the Pi (20 min, $0)

**Phase 1 — the idle baseline (the actual money and heat)**
4. Shadow-run radar collectors on the Pi for one week → diff outputs → cut over → retire Box C. Keep Box C whole as a cold spare; do NOT part it out
5. Pi becomes controller **for Box B only**. Box A gets an idle timer + physical power button (he's in the room)
6. **Install Tailscale on the Pi** — otherwise remote access dies whenever Box A sleeps
7. Fix Box A's fan curve (99% @ 39 °C)
8. Add a **suspend watchdog** on Box B: queue empty + 0% GPU for N min → sleep *regardless of job state*. Without it a crashed job = a 100 W heater running all night in a sealed hot room

**Phase 2 — free load-time wins**
9. 5090 → 400 W cap
10. Spare sticks → Box B = 128 GB. Run **memtest86**; mixed-kit stability is unverified
11. Cap the 4080S to ~70–80% for sustained batch (tight SFF case, protects VRAM thermals)

**Deferred / conditional**
- Curve undervolt: only if GPU load ≥2–3 h/day. Otherwise an evening to save ~40¢/mo
- Polling queue: only after the manual version proves annoying
- Render split: ~1.2–1.35×, image-gen only, justified on **contention relief**, not throughput
- GTX 770 removal: subsumed by retiring Box C. Don't operate on a box you're about to euthanize

**Anti-list (do not spend):** DDR5 kit ($1000, hard no) · VPS for radar (recurring + violates the boundary for marginal gain; Pi at 4 W beats both) · any LAN tensor-parallel scheme · network upgrades · moving the 5090

**Also flagged (GLM):** circuit sanity — 480 W + 320 W + OLED + monitors + amp on one 15 A/120 V circuit ≈ 11 A. Probably fine; verify before the first simultaneous-render day.

**Hidden recurring cost neither the plan nor I priced:** maintaining two synced ComfyUI installs and model trees — duplicate weights, version drift, hash mismatches. GLM: "it's the thing that rots."

---

## 6. Expected steady state

Always-on load **~150 W → ~16 W**; resting room heat down ~90% (≈450 BTU/hr); total cash outlay **under $25**, and every future decision made against meter readings instead of estimates.
