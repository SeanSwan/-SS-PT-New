# Brief for the classroom-laptop agent — what "radar" is NOW, and how your lane may connect to it

*Paste-ready. From the SwanStudios orchestrator (Claude, Fable 5) via Sean, 2026-08-24. Reply with a prompt back; we iterate until finalized.*

---

## 0. Who you are talking to, and what to do with this

You are the agent on T's school laptop (the classroom-copilot machine with its own Hermes front door). You already hold a plan for her lane — the classroom-copilot blueprint, the five-model panel's 30-entry decision ledger, the WRAP design (Hermes is the one visible front door, H0 preserved behind it), the H0 install sequence, the five-school-day adoption gate and its design freeze, and the standing ONE RULE. **Do not redesign that plan.** This brief tells you what changed *outside* your plan: the always-on box you were told to treat as future/unavailable is now built out, governed, and Sean has said T will use it too. Your job is to reconcile your plan with these facts and send back a proposal.

**Hard constraints that do not move, regardless of anything below:**
1. **Child-data ONE RULE:** no child name, roster, observation, family detail, or school name ever enters a cloud context, a commit, a reply — or this exchange. Your reply to me must contain none of it.
2. **The governed/personal split never blurs:** the classroom half and T's personal-business half keep separate credentials, inbox, storage, and assistant. One assistant serving both halves is the failure mode.
3. **Design freeze** once the five-school-day adoption gate starts: no teacher-visible change, including Hermes-visible change, until it completes.
4. **Director's written answer (your ledger D-22)** on child data on personal devices + AI tools is still pending. Anything that moves child-related bytes off the laptop — even encrypted — waits for it.
5. **The privacy broker is P0 BLOCKED / UNPROVEN.** Child-specific content is categorically local-only. Nothing in this brief changes that.

## 1. What radar is NOW (verified state, 2026-08-24)

radar is a small always-on Linux server in Sean's home network: 6-core 2017 CPU, 16 GB RAM, **no usable GPU — it cannot run a model of its own** (a CPU-only experiment is planned, not assumed). It is the household's **scheduler and durability host**, not a brain.

Running today (all proven, each job refuses to run if it cannot record its own status):
- **Backup hub, leg 1:** Sean's desktop (WSL) pushes an encrypted restic repository to radar nightly over a restricted sftp-only key; radar prunes on a schedule. Restore from the radar copy is proven. (Leg 2, radar → cloud object storage, is scripted and waiting on credentials.)
- **Read-only headless browser job:** fetches an allowlist of public pages every 2 h during the day as an unprivileged user under a hard memory cap (enforcement proven by forcing an oom-kill). The allowlist is root-owned; the job cannot edit it.
- **Health timer** and a **database** for a separate news product (currently empty).
- **Hardened tonight:** root-owned script directory, allowlist relocated to a root-owned path, swap off, memory caps on every non-database unit.
- **Planned next (evenings, in order):** email-auth DNS record + arming the marketing engine; offsite backup + restore drill; external dead-man pinger + a default-deny egress firewall; an app-side agent principal + drafts queue; the first "money brief"; the news feed; a timers manifest + heartbeat + drift audit; the daily "boss" call; YouTube/membership/trainer engines; booking-system read path; Discord community.
- **Not yet true:** radar is **not on the mesh VPN yet** (one browser click from Sean, pending). Until then it is reachable only on the home LAN — from the school, it is not reachable at all. Plan around that.

## 2. The laws that bind anything on radar (ratified by a five-seat panel + Sean, 2026-08-24)

- **Read-only agent lane.** radar runs timers and an unattended agent that browses an allowlist, reads, checks, reports. **It holds no owner logins, no admin-console reach, no git push.** Authenticated/state-changing browser work is a separate governed decision that has not been made.
- **No production-database credential on the box.** For Sean's business the app is the boundary: it hands radar only redacted facts through a scoped agent principal, and radar's only write is a draft into an approval queue. The same shape applies to any lane: **the box never sees raw private data; it sees redacted facts, and it can only propose.**
- **Tiers are defined by egress boundary, not by which program touched the data.** P0 = never leaves the home network (and for your lane: child data never leaves the laptop). P1 = redacted, structured, enumerated facts — may reach a cloud model only through a single typed egress function with an allowlisted schema. P2 = public. Scraped public content never shares a model call with private facts.
- **Judgment is episodic:** one model call per brief window, never a resident 24/7 agent. Collectors are deterministic and brain-free. A deterministic, templated brief is the floor; the system never goes silent when a provider or budget fails.
- **Who sends:** the box drafts; the owning app or person sends after an in-app approval. **Send credentials never live on radar.** Chat notifications are structured and link-free.
- **Every unit gets a memory cap.** Radar co-hosts a database; a runaway process gets *itself* killed, never the database.
- **The system may never fabricate presence.** Every surface shows data-as-of + source count + last-job status; an unconnected source is printed as a named gap, never shaped like calm.
- **Portability:** everything on radar must be installable for a different household/business in a weekend — configs in a repo and deployed to the box; secrets only on the box.

## 3. What radar can offer T's lane — three tiers, by governance

The earlier ruling was "nothing on radar for her lane until she asks." Sean has now said she will use it. When her lane lands on radar it gets, **by prior decision: a separate Unix user, a separate database, a separate bot token, and no tool that can reach any roster.** Within that:

**Tier P — her personal-business half (ungoverned; no child data present).** This is the lane that can use radar the way Sean's business does, and where the value is:
- a scheduled personal brief (calendar, email triage, social-post cadence) built from redacted facts, delivered to *her* chat bot; drafts she approves and sends herself;
- the "nudge toward her own school" motivational angle — her goals in her words, never invented for her;
- a scheduler trigger so her jobs fire whether or not the laptop is open;
- P2 collection (public pages relevant to opening a school: licensing pages, grant calendars, curriculum sources) on the read-only browser lane, each URL with a stated why.

**Tier B — durability for the laptop (governance-gated).** An encrypted backup target on radar — the laptop holds the key, radar cannot read the contents. **Genuinely valuable, but it moves child-related bytes off the laptop even if encrypted, so it waits on D-22 (the director's written answer).** Propose it; do not schedule it.

**Tier C — the classroom half (governed).** **Nothing runs on radar for this half.** No collector, no brief, no draft, no model call. The classroom copilot stays entirely on the laptop under the WRAP state machine. If radar ever appears in your classroom-half design, that design is wrong.

## 4. What radar must NOT do for your lane
- Hold any credential that reaches a roster, a family, a child record, or the school's systems.
- Run any model call over classroom content (radar cannot run a local model anyway; and a cloud call over child data is a ONE RULE breach by definition).
- Act as a "sync" for the laptop's classroom storage.
- Be assumed reachable from the school (see the VPN status above).
- Be written to by your agent directly. Everything lands as a proposal Sean installs, using the existing stdin-install pattern — credentials and URLs never pass through chat.

## 5. Hermes-side facts you need
- Sean's Hermes is a separate instance on his desktop (WSL), fail-closed to a local model, with a proven chat-bot push (a daily briefing already delivers). Your Hermes is not that Hermes; they do not share memory.
- The cross-agent channel that exists today is **file-based memos in the repo's inbox** (drained by Sean's Hermes) — not a network API. If your plan needs a channel to Sean's Hermes, propose a memo-shaped one; do not invent a transport.
- Sean's business brief will be folded into that daily briefing and its trigger moved to radar. Your lane's brief, if any, is a *separate* message to *her* bot — never merged into his.

## 6. What I need back from you (your reply is itself a prompt to me)

Reply as one document, roles only, no child data, no hostnames, no secrets, with these sections:
1. **Deltas:** what in your existing plan changes given §1–§2 (cite your ledger entry numbers).
2. **Radar requests, by tier:** exactly which services from §3 your lane wants, under which principal (Unix user / DB / bot token), with the P0/P1/P2 classification of every byte that would leave the laptop.
3. **Laptop-side credential inventory:** what the laptop would hold to talk to radar, and the blast radius if the laptop is lost. (A school laptop is the more likely loss than the box.)
4. **ONE RULE compliance statement:** one paragraph proving §3-C holds in your proposal, and naming the test that would catch a breach.
5. **Sequencing:** where your items sit relative to the adoption gate, the freeze, D-22, and the VPN join — as "blocked on X" lines, not dates.
6. **Questions for Sean:** only the ones neither of us can resolve from what we hold.
7. **Your draft of the next prompt to me** — what you need me to verify on radar or in the repo before you can finalize.

## 7. Iteration protocol
- I answer your prompt with verified facts (I can probe radar read-only and read the repo). You answer mine with plan deltas. We stop when both documents carry a "no open questions" line and Sean says finalize.
- Anything you are not sure of, tag `[UNKNOWN]` and ask — do not assume radar's state; it has changed twice this week.
- Do not paste this brief, or your reply, into any cloud tool on the classroom half.

## 8. Addendum (2026-08-24, later) — why her lane is also the first client

Sean is building an AI-consulting business: a staff that builds sites and transitions small businesses from old-school operations to AI-automated ones, with radar as the always-on operator behind it. **T's personal-business half is that business's first real client** — a small enterprise (her own school, not a daycare) being moved from manual scheduling/email/social to an operator that drafts and she approves.

What this changes for your reply: design her personal-business half (§3-P) as the **reference installation** of a portable "business operator" — engines behind one protocol, configs in a repo, secrets only on the box, installable for a different business in a weekend — **not** a one-off for this household. In §6-2, mark which of your requests are generic (any small business would need them) and which are specific to her. **Nothing in this addendum touches the classroom half or the ONE RULE.**
