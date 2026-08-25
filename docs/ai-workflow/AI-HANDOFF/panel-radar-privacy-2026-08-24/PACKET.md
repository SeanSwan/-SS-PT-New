# Panel packet — privacy tiering for an always-on business operator box — 2026-08-24

**Seats:** Ox Alpha, GLM 5.3, Grok 4.6, local Qwen 3.8. Final-decider synthesis by the orchestrator.
**Privacy:** roles only. No personal names, organisation names, hostnames, usernames, or client identifiers appear here. Do not ask for them.
**Your job:** attack the proposal in §5, answer §6 with BUILD SPECS and acceptance tests, not opinions. Tag every non-obvious claim `[VERIFIED]` (you can show why) / `[HYPOTHESIS]` / `[UNKNOWN]`. **Write only as yourself — never draft text "on behalf of" another seat.** State explicitly what you could not verify.

---

## 1. The system (ground truth — verified by the orchestrator, not the seats)

- **The box:** a small always-on Linux server (6-core 2017 CPU, 16 GB RAM, **no usable GPU**), inside the owner's home network. It already runs: a nightly encrypted backup hub (restic, restricted sftp-only key, retention with fail-closed status files), a health timer, a read-only headless browser job (allowlist file, `MemoryMax=768M`, enforcement **proven by an oom-kill test at 64M**), and the only database of a separate news product (currently empty). Every non-database unit carries `MemoryMax`. Two more jobs (cloud offsite, external dead-man pinger) are scripted and blocked only on credentials.
- **The workstation:** a high-end-GPU desktop that runs the owner's **local operator agent** and **self-hosted open-weight models** (fully private). It **sleeps**, and **wake-on-LAN has been proven impossible on this hardware** — do not propose it.
- **The production app:** a hosted SaaS for a small in-person training business + memberships. Roles are exactly `user | client | trainer | admin` — no agent/service role exists. The local operator agent already reaches the app through an API route **authenticated as a logged-in admin/trainer user**. A **PII-sanitisation middleware is live** on the AI-chat path (name/email/phone/address/SSN/card patterns, a PHI scanner, hostile card-number tests, an AI-privacy-profile model, a transcript redactor, a schedule-AI privacy module). A marketing engine (lead capture, speed-to-lead, nurture sequences, suppression/unsubscribe) is **built but unarmed**; the outbound-email DNS authentication record is still missing.
- **A third-party studio booking SaaS** holds part of the owner's schedule. **No integration exists** — only "parity" comments in the app's schedule controller. Reading it requires a login.
- **Alerts:** a chat-app bot push to the owner is **proven** (a daily briefing already delivers). A second, community-facing chat platform is planned but not created.

## 2. Decisions already made by the owner (INPUT — do not re-argue)

1. The box is a **read-only agent lane**: timers + an unattended agent that browses an allowlist, reads, runs checks, reports. **No owner logins, no admin-console reach, no git push.** Authenticated/state-changing browser work is a separate, later, governed decision.
2. Judgment on the box is **episodic** (one call per brief), never a resident 24/7 agent. Collectors are deterministic and brain-free; **one "boss" call** reads all collected facts and writes the brief.
3. The brain is a **provider-pluggable adapter**: a subscription-billed coding-plan model as default ($0 marginal) → an optional per-token provider behind a **hard monthly cap** → a **deterministic brief as the floor**. The system **never goes silent** when budget or providers fail.
4. Four revenue engines, sequenced by blocker: client cash (leads, quiet clients, lapsed packages) → membership funnel → own-channel video analytics ("what to post next") → trainer recruitment. Three of them read the **same production DB through one read-only role**.
5. Reporting: **one fixed-time brief + a short money-now interrupt list** (new inbound lead, failed payment, same-day cancellation).
6. **Who sends: the production app**, after the owner's one-tap approval. The agent's ONLY write is into a drafts/approval queue via a dedicated service account. Templated automations (reminders, nurture) auto-send once armed. **The box never holds send credentials.**
7. Private chat = owner's ops channel; community platform = members/trainers only; **no client PII ever crosses to the community platform.**
8. The box is also the **portfolio piece for a consulting business**: every design must be installable for a different small business in a weekend (configs in a repo and deployed to the box; engines as swappable modules).

## 3. The owner's words on privacy (sanitised)

- "I would prefer to use the local operator agent and the local model for privacy reasons; otherwise we're using cloud computing."
- "I don't want my entire schedule going straight to a cloud model. Nobody smart does that."
- "Both systems must be adequate for the same job — without one being bad and the other good."
- "We created middleware that strips private data before it goes to cloud providers. We would have to **harden and bolster** it so I can use it without worrying about a leak."
- "I hate scheduling and following up on clients." He wants the agent to help schedule slots in the booking SaaS and to get clients messaged (resolved: the app sends, he approves).
- The agent should get "its own account — restricted access, so it can just get information."

## 4. Credential inventory the design implies (attack this list)

The "read-only agent lane" is not literally zero-credential. The proposal puts these on the box, each revocable and scoped:

| # | Credential | Scope | Blast radius if the box is fully compromised |
|---|---|---|---|
| C1 | LLM provider key(s) | subscription plan / per-token key under a hard cap | spend up to cap; the plan's credit budget |
| C2 | production-DB **read-only** role (or a read-scoped app token) | SELECT on business tables | read business data — the whole question of §6 is what FORM that data takes before any model sees it |
| C3 | video-platform analytics **read-only** OAuth token | own channel stats | read channel analytics |
| C4 | drafts-write token (service account) | INSERT into an approval queue only | create drafts nobody sends without the owner's tap |
| C5 | outbound chat-bot token | send to the owner's private chat only | spam/mislead the owner |
| C6 | (future, undecided) booking-SaaS read path | see §6-F | — |

**Claimed invariant to attack:** *"A full compromise of the box can at most: read business data, spend up to the cap, post to the owner's private chat, and create drafts that go nowhere without the owner's tap. It cannot message a client, change a booking, move money, or act as the owner anywhere."*

## 5. The orchestrator's proposal (attack it)

**Three data tiers, enforced at the egress function, not by convention:**
- **P0 — raw private:** schedule details with times/locations, client names/contacts, message bodies, free-text notes, booking-SaaS data, financial line items. **Never leaves the house to a cloud model.** May be processed by (a) deterministic code on the box, (b) the local model on the workstation *when it is awake*.
- **P1 — redacted structured facts:** opaque IDs, counts, day-level dates, statuses, session types, amounts bucketed. **May go to a cloud model only through the hardened strip proxy**, as a fixed **allowlisted schema** (no free text at all), with names re-attached locally at display time.
- **P2 — public:** news, public video stats, competitor pages. Any provider.

**The always-on gap:** the local model sleeps with the workstation. Proposal: make every P0 judgment either **deterministic + templated** (e.g. "3 clients quiet > 14 days" is SQL; follow-up drafts from templates with slots) so it needs no model, and treat the local-model pass as an *enhancement that runs when the workstation is awake*, not a dependency. A CPU-only small model on the box for an overnight P0 batch is **`[HYPOTHESIS]`** — feasibility/quality unmeasured.

**"Both paths adequate":** same adapter, same output contract, one small golden set of anonymised fact-bundles with blind scoring of the resulting briefs; a path is "adequate" if it clears a fixed rubric, not if it matches the other path.

## 6. Produce BUILD SPECS for these (with acceptance tests)

- **A. The tiering.** Is the P0/P1/P2 split right? What re-identification risks survive P1 (quasi-identifiers: session pattern + type + amount; stable IDs across calls; small-population inference — a business with ~dozens of clients)? Specify the P1 schema and the per-call pseudonymisation rule.
- **B. The always-on gap.** Rank: (1) deterministic+templated P0, (2) CPU-only small model on the box for overnight batches, (3) accept desktop-awake latency for P0 items, (4) P0 → cloud via proxy. Give the acceptance test that decides between (1) and (2) in one evening.
- **C. Hardening the strip proxy.** Concrete failure modes of a regex/blocklist sanitizer in a brief pipeline (free text, URL params, notes fields, prompt injection from scraped pages carrying PII into the brief, provider-side logging/training, IDs that are identifiers). Specify: allowlist-schema egress, structured-facts-only, per-call pseudonymous IDs, provider zero-retention settings, an egress audit log, canary tokens, and a CI test that FAILS when any raw-text column reaches the egress function. Rank by exploitability.
- **D. The service account.** New role vs scoped API key for `read + drafts-INSERT only`; token storage on the box (root-only file, unit-scoped); rotation; how the app's existing per-role guards must change; the test that proves the account cannot read anything outside its allowlist or write anywhere but the queue.
- **E. The credential invariant (§4).** Is the claimed invariant true? What is missing from the table? What single change would most reduce blast radius at lowest cost?
- **F. The booking-SaaS read path.** Rank the safest read-only options: (1) a secret read-only calendar/ICS feed URL if the SaaS offers one, (2) an official API with developer approval, (3) a stored login session in the box's browser (currently rejected). What must be verified about the SaaS first, and what does the box do while this is unresolved (it must not fabricate presence — empty states name the gap)?
- **G. Portability.** Does anything above break the "installable for another small business in a weekend" constraint? What must live in the repo vs on the box?

## 7. Also answer, briefly
- The single most-silently-dangerous item in this design (the one no heartbeat catches).
- What you could not verify from this packet.
