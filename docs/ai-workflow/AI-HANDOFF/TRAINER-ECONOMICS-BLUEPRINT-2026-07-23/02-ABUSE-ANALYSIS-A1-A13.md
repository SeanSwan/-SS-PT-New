# Adversarial Abuse Analysis — Trainer-Set Pricing (attack-the-pricing pass)

Purpose: enumerate how independent trainers setting their own prices could manipulate/abuse the system, each paired with a concrete defense. Feeds the Kimi governance design. Sean's core worry: "this has room to be manipulated and abused... they set their prices at the beginning... they can't just keep changing... they can set specials but that has to be regulated too."

## Threat model
Actor = an independent trainer (brings own clients, sets own prices, SwanStudios takes 15% of the charged amount). Motive = maximize their take, minimize SwanStudios' 15%, and/or exploit clients. Every defense must ALSO not punish honest trainers running legit specials.

## ATTACK VECTORS → DEFENSES (ranked by ease/likelihood)

### A1. Off-platform circumvention (HIGHEST — the 15%-dodge)
- **Attack:** Trainer sets a low/token on-platform price (or none) and collects the real fee in cash/Venmo off-platform → SwanStudios gets ~$0 of a real paying client. Or: "pay me directly and I'll give you a discount."
- **Defense:** (a) Non-circumvention clause already in the contract (Kimi term sheet clause 8) — platform-sourced clients must transact on-platform. (b) **Price floor** — no session/package can be priced below a platform minimum (e.g. $25) so "$0.01 to move off-platform" is blocked. (c) Anomaly detection: a trainer with many active clients but near-zero on-platform revenue is flagged for admin review. (d) Make on-platform the path of least resistance (scheduling, logging, progress all live there) so leaving costs more than 15%.

### A2. Price churn / instability (Sean named this)
- **Attack:** Trainer changes base prices constantly — bait a client at $80, jack to $150 next month; or thrash prices to confuse/pressure.
- **Defense:** **Base-price change rate-limit** — base package prices lock after being set and can only change once every N days (default 30-60), OR require a cooldown + notice to existing clients. Existing clients' active packages are **price-protected** (grandfathered) for their term — a price change never retroactively repricing a client mid-package. Every change is logged (price-history/audit table).

### A3. Fake-anchor "always on sale" (dark pattern)
- **Attack:** Set base at $300 (never real), permanently "50% off" to $150 to fake urgency/value. Erodes trust and is a deceptive practice.
- **Defense:** **Specials are time-boxed and capped in frequency** — a discount must have a real end date, max duration (e.g. ≤14-30 days), and a trainer can't run specials more than X% of the calendar (e.g. no more than 30 days of specials per 90). After a special ends, a cooldown before another. A permanent discount is structurally impossible. Optionally: display the price the client actually pays, de-emphasize "strikethrough" theater.

### A4. Discount depth abuse (race to the bottom / $0 dodge)
- **Attack:** 99% off special → effectively free on-platform, real payment off-platform (A1 combined); or predatory undercutting.
- **Defense:** **Max discount cap** (e.g. specials ≤ 30-40% off base) AND the price floor (A2) applies to the *post-discount* price. The 15% is always computed on the actual charged amount, so a legit discount just means SwanStudios earns 15% of a smaller (but floored) number — fine; a 99%-off dodge is blocked by both the cap and the floor.

### A5. Discriminatory / per-client pricing abuse
- **Attack:** Wildly different prices to different clients for bad reasons (gouging, discrimination) since prices are "for their client specifically."
- **Defense:** Trainer sets **published base packages** (their standard menu), and per-client pricing must derive from those (a client gets a base package ± a regulated special), NOT arbitrary per-head numbers invented at will. This keeps pricing consistent and auditable. Truly custom one-off quotes, if allowed, are logged and bounded by floor/cap.

### A6. Fee-base manipulation (splitting / miscategorizing)
- **Attack:** Structure charges to shrink the 15% base — e.g. charge a tiny "session" on-platform + a big "equipment/consult fee" off-platform; or mislabel to dodge.
- **Defense:** 15% applies to ALL in-platform client transactions of any label (contract clause 3, "gross"). No untracked fee categories. Anything a client pays a trainer through the platform is feeable. Off-platform side-fees are A1 (circumvention).

### A7. Refund / chargeback gaming
- **Attack:** Charge full, deliver, then self-refund off-platform to claw back the 15%; or use refunds to launder the fee base.
- **Defense:** Trainer is merchant of record (bears refunds/chargebacks — Kimi clause 9); refunds reverse the application fee proportionally (already specced); refund-rate anomalies flagged. A refund can't be used to retroactively make the fee base zero while the client stays trained.

### A8. Introductory-then-trap
- **Attack:** Cheap intro price to hook a client, then large jump once they're committed/mid-program.
- **Defense:** Price-protection for active packages (A2) + change rate-limit + existing-client notice period. A client on a package keeps that price for its term; new terms use current price with notice.

### A9. Staff-vs-independent misclassification (Sean's two-types point)
- **Attack (or honest confusion):** An "independent" trainer training SwanStudios-sourced clients under independent terms (own pricing) when they should be on affiliated/staff terms — or vice versa — to get the better deal.
- **Defense:** Trainer TYPE is chosen at onboarding and set by admin, not self-serviceable after the fact. Independent = own clients + own pricing + 15%. Affiliated/staff = trains SwanStudios clients + SwanStudios sets pricing + different comp (flat or different split). Client SOURCE (trainer-brought vs SwanStudios-sourced) is tracked so the right economic rule applies per client.

### A10. Under-report / over-deliver (Sean 2026-07-23 — THE package-vs-actual-sessions dodge)
- **Attack:** Trainer signs a client up for a SMALL package on-platform (e.g. buys 4 sessions, so SwanStudios takes 15% of 4 sessions) but actually trains that client 12+ times — collecting the extra 8 sessions off-platform in cash. The logged/paid volume is a fraction of the real volume. This is circumvention (A1) hidden inside a legit-looking small purchase — much harder to catch than a $0 price because a real payment DID happen.
- **Why it's the priority one:** it's the most natural, deniable dodge ("I just trained them a few extra times as a favor"), it scales silently, and it directly erodes the 15% on the highest-value clients.
- **Defense = a PATTERN-WATCHING ABUSE-DETECTION SYSTEM that alerts the admin (Sean's explicit ask):** a background monitor that continuously watches training patterns per (trainer, client) and flags obvious abuse signals for admin review. Concrete detectable signals:
  - **Sessions-logged vs sessions-paid mismatch:** workout logs / check-ins / session records for a (trainer, client) pair exceed the paid/remaining package sessions by more than a tolerance. The single strongest signal — SwanStudios already logs workouts, so "trained" (logged) vs "paid" (package balance) is directly comparable.
  - **Package depletion anomalies:** a client's package hits 0 remaining but training activity continues; or packages are perpetually "topped up" in tiny amounts while activity is high.
  - **Cadence vs purchase mismatch:** high session frequency (e.g. 3x/week logged) against a package that only funds 1x/week.
  - **Chronic small-package + high-activity clients:** a client always on the smallest package but among the most-trained.
  - **Near-zero revenue, many active/engaged clients** (ties to A1).
  - **Off-platform-scheduling tells:** sessions logged with no corresponding on-platform booking/payment event.
- **Response ladder (not instant punishment):** signal crosses threshold → **admin alert** (dashboard flag + optional notification) with the evidence (this trainer, this client, logged N vs paid M over period P) → admin reviews → soft nudge / ask-to-reconcile → repeated/egregious → suspension per contract for-cause. False-positive-aware: legit reasons exist (comped session, make-up session, trial), so the system SURFACES for human judgment, it does not auto-punish. Tunable thresholds + tolerance band.
- **Design notes for Kimi:** this is a **Four-C Cadence (C4) automation** — runs on a schedule/trigger, keys-not-prompts, has an owner (admin) and a kill switch (CLAUDE.md rule 48/50). Privacy: client IDs/roles only. It reuses SwanStudios' existing first-party workout-log data as the "actual sessions" source of truth — that first-party data IS the moat that makes this detectable (a platform without logging couldn't see this). Should produce a ranked "abuse-risk" review queue for the admin, not a wall of raw events.

### A13 — The "dark session" false-negative (hostile-review of the detector, 2026-07-23)
- **Attack:** the A10 detector's core signal is `logged_sessions > paid_sessions`. A patient abuser defeats it by logging ONLY the paid sessions on-platform and running the extra off-platform sessions WITHOUT logging them. No log = no signal → `logged ≤ paid` → looks clean. The detector assumes the trainer self-reports all activity; a sophisticated dodge simply doesn't.
- **Why it matters:** it's the detector's structural blind spot — trainer-controlled logging is the sensor, and the abuser controls the sensor.
- **Defense (needs design, goes to SWA-62 Part 3):** don't rely solely on trainer-entered logs. Add sensor sources the TRAINER doesn't control: (a) client-side confirmation — the client rates/confirms each session, or a client check-in; a client trained 12× who only sees 4 confirmations is a signal; (b) client engagement vs purchase — a highly-engaged client (app opens, progress views, streaks) on a tiny package is suspicious even with clean logs; (c) periodic client micro-surveys ("how many times did you train this month?") sampled + compared to logged; (d) scheduling/calendar data if bookings exist independent of logging. The honest-trainer framing still holds: these are soft signals feeding the same ranked admin queue, not auto-punishment. Kimi's design should incorporate at least the client-confirmation signal so the sensor isn't 100% trainer-controlled.

## GOVERNANCE RULESET (the regulated model, defaults for Kimi to refine)
- **Price floor:** platform minimum per session/package (post-discount). Default: TBD by Sean (suggest $25-40/session floor).
- **Base-price change cooldown:** base prices lock; changeable at most once per 30-60 days; logged; existing clients grandfathered.
- **Special caps:** max discount % (suggest ≤30-40%), max duration per special (suggest ≤14-30 days), max special-days per quarter (suggest ≤30/90), cooldown between specials.
- **Fee base:** SwanStudios 15% on the ACTUAL charged (post-discount, floored) amount, all in-platform transactions.
- **Price-history audit:** every base-price and special change recorded (who/when/old→new) — enables abuse detection + dispute resolution.
- **Anomaly flags to admin:** near-zero revenue + many clients (A1), high refund rate (A7), constant special usage (A3), floor-hugging prices (A1/A4), **and (A10) logged-sessions-exceed-paid-sessions mismatch — the priority detector.**
- **Type & source:** trainer type (independent/affiliated) admin-controlled; client source tracked; economic rule selected per (type, source).
- **Abuse-detection cadence system (A10, Sean's explicit ask):** a scheduled/triggered background monitor that compares first-party workout-log activity against paid package balances per (trainer, client), scores abuse risk, and produces a RANKED admin review queue with evidence — surfaces for human judgment, never auto-punishes. Owner=admin, kill switch, IDs-only. This is the always-on "watching for abuse" layer, distinct from the static pricing caps above.

## Open questions for Sean (materially change the design)
1. Price floor value? (suggest $25-40/session)
2. Base-price change cooldown length? (suggest 30 or 60 days)
3. Max special discount %? (suggest 30-40%)
4. Should specials need admin approval, or just be auto-bounded by the caps? (auto-bounded = less friction; approval = more control)
5. For affiliated/staff trainers training YOUR clients — flat pay per session, or a different % split? (this is the "working for me" comp model, still TBD)
