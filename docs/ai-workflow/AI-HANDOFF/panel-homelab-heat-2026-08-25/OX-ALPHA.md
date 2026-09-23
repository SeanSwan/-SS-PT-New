# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/AI-HANDOFF/panel-homelab-heat-2026-08-25/PACKET.md
**Seed:** (none)
**Tokens:** 2535 in / 8483 out · **Cost:** ~$0.0000 · **Wall:** 351.2s · **finish:** stop

---

# HOSTILE REVIEW — ox-alpha, SwanStudios Panel

---

## (a) VERDICT

**REVISE.** The constraint analysis (§1) and hardware inventory (§2) are solid, but the packet contains one outright mathematical error masquerading as a conservative estimate (§3.6's "~1.5×"), one architectural idea that contradicts the packet's own verified findings (the Pi-as-controller late idea vs. Box A's confirmed-dead WoL, §2 vs. §3-late), and at least four load-bearing numbers that are estimates wearing the costume of measurements. Evidence by section below.

---

## (b) CORRECTNESS ATTACKS

**B1. The ~1.5× parallel-render estimate is wrong, and wrong in the flattering direction (§3.6).**
Do the arithmetic the packet skipped. Per-seed time on Box A = `t`. The 5090 is ~2–2.5× faster than a 4080 Super at diffusion inference (this is well-established across SDXL/Flux benchmarks), so per-seed time on B ≈ `2–2.5t`.

- Naive 2/2 split: A finishes at `2t`; B finishes at `4–5t`. Wall clock = `max(2t, 4–5t)` = **4–5t**, versus `4t` sequential baseline. **The 2/2 split is a regression or a wash.** The packet's caveat blames "16 GB VRAM" — wrong diagnosis. The problem is asymmetric compute, and no VRAM amount fixes it.
- Best-case weighted split (3 on A / 1 on B): wall = `max(3t, 2–2.5t)` = `3t` → **~1.33×**, not 1.5×. Hitting 1.5× requires B ≥ ⅔ of A's per-seed speed. It isn't.

The *contention-relief* claim survives — A staying responsive while B grinds is real value. The *throughput* claim does not. Strike "1.5×" or replace with "≤1.33× with a 3/1 weighted split, 1.0× with a naive 2/2."

**B2. The queue has a lost-job race (§3.4).**
"B picks up the job file, then suspends after N minutes of empty queue." Sequence: B polls, sees empty queue, begins suspend countdown; A drops job file at minute N−ε; B suspends; job sits unseen indefinitely. There is no handshake. Required: A pings B until reachable, *then* writes the job atomically (write-temp-then-rename into the watched folder), and B's suspend timer resets on any folder event. Also: crash-mid-job recovery is unspecified — if B dies after claiming but before returning results, is the job re-delivered? Use an atomic claim-rename (`inbox/` → `claimed/`) plus idempotency keys in job files, or accept silent job loss.

**B3. The smart-plug fallback corrupts filesystems as described (§3.3).**
"Smart plug on PSU cord plus BIOS AC BACK → Power On" — if the plug cuts power while Windows is running, that's a hard power loss on NTFS. The plug must only ever close a circuit onto an *already cleanly shut down* machine (scripted `shutdown /s`, confirm off, then plug is merely the re-arm mechanism). The packet doesn't say this. As written, it's a data-loss instruction.

**B4. 4-DIMM DDR5 on AM5 is hand-waved (§3.1).**
Moving the spares into Box B gives 4 populated slots. AM5 boards frequently cannot run 4 DIMMs at 6000 MT/s; expect a forced drop to ~3600–5200 MT/s or instability, especially with mixed kits. For CPU-offload inference, token generation rate scales roughly linearly with memory bandwidth — a 6000→4000 drop costs ~33% tok/s. Capacity still dominates (fitting the model at all beats speed), so proceed, but the packet must state: mixed-kit stability unverified, memtest86 mandatory, expected speed reduction acceptable. Right now it reads as "$0, free win" with zero failure mode acknowledged.

**B5. The ~116 GB / 500B MoE claim is unvalidated (§3.1).**
116 GB for 500B parameters is ~1.86 bits/weight — sub-Q2 territory. Viability depends entirely on the model's active-parameter count (MoE tok/s ∝ bandwidth ÷ active bytes-per-token) and whether the KV cache for the intended context fits in 16 GB VRAM alongside the offloaded layers. Neither number is in the packet. Name the model and the quant, or mark this whole thread "unproven."

**B6. Off-by-one on the suspend timer / idle accounting:** minor, but "returns results, then suspends after N minutes" — if N is measured from last *poll* rather than last *job completion*, a long-running job followed by immediate suspension races the next enqueue. Define the timer anchor.

---

## (c) SECURITY ATTACKS

Lower stakes here than a web app, but real items:

- **C1. Shared-folder queue authz (§3.4):** SMB share between two Windows boxes on a consumer router. Verify guest-access is disabled, the share is scoped to a dedicated local account, and SMB signing is on. A compromised IoT device on the same /24 (cameras, smart plugs — see C3) should not be able to write job files that execute in Box B's context. Job files that trigger renders/LLM runs are an implicit command channel; treat the drop folder as untrusted input.
- **C2. Box C's privacy boundary is asserted, not enforced (§2):** "holds no production database credential by design" — good principle, but nothing verifies it. If Box C is migrated to a Pi, re-audit: the Pi's SD card and any synced dotfiles/API keys are the leak surface. "P0 never leaves the house" is a claim about egress; confirm there's no standing tunnel besides the one documented API call.
- **C3. Smart plugs are new attack surface:** $12 IoT plugs on a flat LAN, cloud-dependent firmware. Prefer local-control plugs (TP-Link Kasa with local API, or ESPHome/Tasmota) — also required anyway for scripted integration, since cloud-API control adds seconds of latency and a vendor outage breaks your wake path.
- **C4. Replay/idempotency:** covered in B2 — duplicate magic packets are harmless, duplicate job files are not.
- **Rate-limit/DoS:** non-issue at this scale. Skip.

---

## (d) DATA-TRUTH / CLAIM-DRIFT AUDIT (Rule 58 analog)

The packet's "Verified hardware inventory" header earns trust, but several claims drift from verified to vibes mid-document:

| Claim | Section | Status |
|---|---|---|
| WoL dead on Box A | §2 | ✅ Verified, exhaustively. Do not relitigate. |
| Magic packets fire from Pi | §2 | ✅ Verified — but **only ever tested against Box A's (dead) port**. Never proven against a live target. |
| Box B WoL | §2 | ⚠️ Honestly marked UNTESTED — but §3.3 builds the entire sleep architecture on it. |
| "Box B sleeps (~5 W)" | §3.3 | ❌ Unmeasured. Modern Standby vs S3 behavior on that board is unknown; RGB/AIO headers can hold it at 10–15 W. Measure or mark as estimate. |
| "~1.5× wall-clock" | §3.6 | ❌ Mathematically wrong (see B1). |
| "116 GB quantized model" | §3.1 | ❌ Unnamed model, unnamed quant. |
| "Workload could plausibly run on the Pi" | §4.4 | ❌ No audit of collector memory footprint, storage growth against the Pi's storage plan, or ARM compatibility of the scrapers. "Plausibly" is doing unpaid labor. |
| Spare DDR5 sticks match installed kit | §2 | ❌ Unstated. Mixed-kit operation assumed. |

---

## (e) HOUSE-RULE VIOLATIONS & SPECULATIVE-SUCCESS LANGUAGE

- Web-stack house rules (styled-components/Victory/palette/touch targets): **N/A** — not applicable to this document type. No violation.
- **Speculative-success language without a named verified path** (violations):
  - §3.6: "estimated ~1.5× wall-clock" — no benchmark, and the arithmetic contradicts it (B1).
  - §4.4: "could plausibly run on the Pi" — no footprint audit.
  - §3.3: "~5 W" sleep draw — unmeasured.
  - §3.1: "run mostly on CPU out of system RAM via ik_llama.cpp" — no named model, no measured tok/s, no KV-fit calculation.
- **Internal contradiction (worst offense):** §2 states Box A's WoL is "CONFIRMED DEAD… Conclusion recorded: do not retry." §3-late proposes a Pi controller waking "both big boxes." The Pi cannot wake Box A by any verified path. This idea, as written, is dead on arrival for half its purpose.

---

## (f) SINGLE HIGHEST-RISK ITEM & DE-RISKING

**The entire sleep/wake architecture rests on two unverified wake paths — one of which is affirmatively known dead.** Box A: WoL confirmed dead. Box B: WoL untested. Every downstream element (queue, roles, Pi-controller idea, projected watt savings) inherits this risk. Build anything on top and you're constructing on a floor you've never loaded.

**De-risk in one evening, ~$0–25, before any other work:**
1. **Tonight, 30 min:** Send magic packets from the Pi to Box B. If they land → B's sleep path is real. If not → B joins A, and the architecture collapses to "B sleeps manually / stays awake," decided now instead of after a weekend of queue plumbing.
2. **Same evening:** Prototype A's wake path *if* Pi-as-controller matters: scripted clean shutdown → smart plug cycle → BIOS AC-power-on boot. Time the full round trip. If it exceeds ~60 s or proves flaky, kill the both-boxes-sleep design permanently and record it next to the WoL post-mortem.
3. Only then write a line of queue code.

---

## APPENDIX — Direct answers the packet demanded (compressed)

**Q1 (worth building?):** NOT worth it if: fewer than ~2–3 heavy batch jobs/day AND interactive contention is rare AND Box B's WoL fails. Under those conditions it's complexity theatre — a polling watcher, a sleep timer, and a wake path to save watts on a machine that's asleep anyway. The contention-relief benefit alone can justify a much dumber version: B awake when queued, manual otherwise.

**Q2 (ranked by value÷cost):**
1. **Fix the 5090's 76 W idle (§2)** — that figure is pathological for a 5090 (typical: 20–35 W); it screams pinned memory clocks from multi-monitor 4K/high-Hz. Lock P-states (`nvidia-smi -lgc` floor, kill "prefer max performance," drop secondary-monitor refresh). **~40–50 W, 24/7, on the always-on box, $0.** Best ratio in the document, and the packet missed it entirely.
2. **Smart plugs with energy metering ($13–18 ea.)** — every watt number in this packet is a guess. Measure first.
3. **RAM into Box B ($0)** — real capability gain; see B4 caveats.
4. **480→400 W cap + voltage/frequency curve undervolt on both GPUs ($0)** — expect ~3–5% perf loss for the flat cap; a proper curve (e.g., ~900 mV plateau) typically holds 92–95% perf at ~350–400 W. Worth it here because heat, not FPS, is the binding constraint. Same logic for the 4080S.
5. **Migrate Box C → Pi** — saves ~55 W × 24 h ≈ $70–90/yr at $0.15/kWh; cost is owner-time plus migration risk (d-table row 7). Do it *after* metering confirms the 50–70 W estimate.
6. **Remove GTX 770 (~12 W)** — only after proving the 1600X board POSTs headless. Chicken-and-egg warning: you can't change "halt on no-video" BIOS settings without video. Test with a borrowed GPU before pulling the 770 permanently.
7. **Two-box render split** — last. Value ≤1.33× (B1), complexity high. Justify on contention relief only.

**Q3 (Pi as controller):** Better *in principle* (~150 W of Box A idle replaced by 4 W), broken *as specified* because A can't be woken (§2). Viable only via the smart-plug-shutdown hack in (f), with resume-from-S4 latency as the UX tax on an owner who interacts with Box A daily. Net: partial adopt — Pi controls B; A gets an idle-timer + verified wake path or stays awake.

**Q4/Q5 (Box C, GTX 770):** Migration to Pi is the correct endgame for a scrape-plus-one-API-call workload; the privacy boundary survives (it's egress policy, not silicon). Risks: ARM compat of collectors, storage growth vs. Pi storage, and the headless-boot trap in Q5. Don't pull the 770 until POST-without-GPU is demonstrated.

**Q6 (undervolting):** Answered in Q2 item 4. The GUI hassle is worth it exactly once per GPU; the flat 400 W cap is the lazy fallback, not the target.

**Q7 (what's missed — the big one):** **Building science.** An exhaust-only fan in a small room *depressurizes* it, pulling replacement air through leaks — in summer, that's hot humid outside air, and the fan may simultaneously be starved of intake flow while sitting on the tower. Measure room ΔT vs. ambient with the door open vs. closed before buying anything. Second miss: **total continuous thermal budget** — A (~150 W idle) + C (~60 W) + Pi/network (~15 W) ≈ 225 W ≈ 770 BTU/hr dumped into 108 sq ft around the clock. That's a space heater that never turns off. The idle-clock fix (item 1) and Box C migration attack this directly; the render-split does not.

**Q8 (factual errors):** B1 (the 1.5× claim — the packet's headline performance number is arithmetically indefensible), B4 (4-DIMM DDR5 speed assumption), and the implicit assumption that the Pi's proven magic-packet capability transfers to Box A (it was only ever tested against a dead port).

— ox-alpha
