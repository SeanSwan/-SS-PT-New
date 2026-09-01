# HANDOFF — radar session 2 (grill → panel → hardening → laptop-agent loop) → next agent

**From:** vs-claude session `s5c2f8d16` (Opus 5 → Fable 5 → Opus 5; check your own model before writing rule-68 provenance).
**Date:** 2026-08-24 → 2026-08-25.
**Predecessor:** `c:\tmp\RADAR-SESSION-HANDOFF-2026-08-24.md` (session 1 — build state, 13 traps) — still valid except where §7 below corrects it.
**Read order:** §1 (what this was) → §7 (current state) → §8 (blocked on Sean) → §2/§3 (the settled decisions) → §5 (the live loop, your first task) → §9 (traps).
**One-line status:** radar's purpose is settled and panel-ratified; three box defects fixed; a four-round exchange with the partner's laptop agent is live and has just requested a 5-seat hostile review + full build blueprint — **that is your first task, and it costs money (Rule 16 — ask Sean first).**

---

## 1. What this session was

Sean asked to continue the radar work with `grill-me`. It became five things:
1. **A 14-question grill** on what radar is *for* → `docs/ai-workflow/brainstorms/radar-pc-utilization-2026-08-24.md` (Status: complete).
2. **A 5-seat privacy panel** (Ox, Grok 4.6, GLM 5.3, local Qwen, a Fable seat written before reading the others) → `docs/ai-workflow/AI-HANDOFF/panel-radar-privacy-2026-08-24/SYNTHESIS.md`, rulings **D1–D10**.
3. **Three hardening fixes on the box**, with Sean's go and before/after proof.
4. **A four-round exchange with the partner's laptop agent** over GitHub (§5) — still open.
5. Continuous board/Hermes/memory sync.

## 2. The grill's settled decisions (do NOT re-ask)

| # | Decision |
|---|---|
| Q1 | radar = **read-only agent lane**: timers + an unattended agent that browses an allowlist, reads, checks, reports. No owner logins, no admin-console reach, no git push. |
| Q2 | radar gets **its own brain credential** — superseded by Q11. |
| Q3 | First job = **business watch**; Sean reframed the whole box as **the always-on money machine**. Verbatim: *"Making money is the number one priority right now. I desperately need to make money."* North star: **make money while asleep** — a "main boss" watches, Sean checks in and clicks buttons; **≤4 training hours/day**. Long game: **Sean Swan, AI consultant** — a staff building sites and moving businesses old-school → AI-automated. |
| Q4 | **All four revenue engines**, client-cash **first**: client cash → membership funnel → YouTube "what to post next" → trainer recruitment. Three read the same DB. |
| Q5 | **One fixed-time brief + a short money-now interrupt list** (new lead, failed payment, same-day cancellation). |
| Q6 | **radar drafts, Sean sends** — later upgraded by Q13. |
| Q7 | **Discord = community home; Telegram = private ops channel.** Hard PII wall. Discord not yet created. `[VERIFIED]` zero Discord references on `origin/main`. |
| Q8 | **One boss + dumb collectors.** Deterministic collection; ONE episodic judging call per brief; cross-engine ranking. |
| Q9 | YouTube engine = **"what to post next, and why."** `[VERIFIED]` the existing `youtube-production-studio-blueprint-2026-08-11.md` covers *production*; analytics is deferred row 11 — the growth half is uncovered. |
| Q10 | **radar IS the consulting portfolio piece** — binding constraint: build it installable for another business in a weekend. |
| Q11 | Brain = **provider-pluggable adapter**: GLM (Z.ai coding plan, subscription, $0) default → OpenRouter capped fallback → **deterministic brief as the floor; never silent**. `[VERIFIED]` `consult-glm.mjs` uses `ZAI_API_KEY` against the coding-plan endpoint; `ZAI_API_KEY` is **not** in `.env` — must be provisioned. `[LIKELY]` ChatGPT Plus ≠ OpenAI API access. Local Qwen = 5090-dependent → ineligible for always-on. |
| Q12 | Sean did not answer the 4-hour question directly; it dissolved into privacy tiering (→ the panel). The "freedom number" idea was **not adopted**. |
| Q13 | **The SwanStudios APP sends, Sean approves in-app.** radar/Hermes decide + draft; the app holds send credentials + compliance. |
| Q14 | Fire the 4-seat panel (Grok paid, explicitly approved, ≤$1). |

**Re-grill addendum (2026-08-24/25) — the partner lane widened:** she uses radar for planning **and class design**; gets the **Taste/Design Brain**; may use the **Atelier** asset creator (family use only, nothing sold); gets **5090 time with a queue**; wants **two-way messaging**. Then: **operating-system parity** — she inherits the skills, both rulebooks (derived), the hooks and the recent fixes, but **her Hermes keeps its own brain**, with a **read grant** on Sean's brain + the Karpathy Wiki, **her own wiki** (her whole brain — school is one collection — plus an **Obsidian vault**, **Graphify only on demand**), and a proactive **ideas habit**.

## 3. The panel rulings D1–D10 (unanimous after synthesis — treat as settled)

- **D1** The box holds **NO production-DB credential**. The app exposes `GET /api/agent/facts/:engine` + `POST /api/agent/drafts` behind a scoped **agent principal** (own namespace; never sets the user principal). *(Grok's cut — it beat the orchestrator's own pre-read design, which is recorded in `FABLE-SEAT.md`.)*
- **D2** Tiers by **egress boundary**, not by processor: P0 never leaves the home network; P1 = the app's facts bundle (aggregates + ≤N categorical rows, k≥3 suppression, daily-rotated handles); P2 = public, in isolated calls. Config `cloud_rows = none | topN`.
- **D3** **Deterministic + templated floor ships first.** CPU-model on the box = one measured evening with a written decision rule; default off; the loser is deleted, not kept as a silent fallback.
- **D4** Egress = **one typed function**, allowlist-schema validated, canary-proven, hash-chained audit log, CI fails on schema widening. Providers without zero-retention are excluded from P1.
- **D5** **Default-deny egress firewall** on the box; LAN isolation from the workstation where feasible.
- **D6** **Approval in-app only.** Chat notifications structured and link-free (the chat channel is a persuasion channel). Drafts schema-distinct from automations. Shown==sent byte test.
- **D7** Backups: object-lock on the offsite bucket; restic excludes for agent state; decide whether prune moves to the workstation.
- **D8** Booking SaaS: verify a read-only ICS feed; its content is P0 on-box; print a **named gap** until connected.
- **D9** Portability acceptance = a **four-env-var weekend install** on a clean VM.
- **D10** Data at rest: swap off/encrypted, no P0 in journald, model caches on tmpfs, agent state excluded from backups.

## 4. What changed ON the box (session 2) — §2b/§10 of the session-1 handoff are STALE on these points

With Sean's go, one idempotent root script, before/after proven, real run after:
- `/srv/radar/bin` was **owned by the browser-agent user** while root-executed scripts live there → now `root:root 755`, all scripts root-owned.
- Browser allowlist moved `/srv/radar/browser/targets.txt` (agent-owned 664, inside `ReadWritePaths`) → **`/etc/radar/browser-targets.txt`** (root 644; unwritable in-unit via `ProtectSystem=strict`). Runner patched; backup at `/root/radar-browser-fetch.bak-2026-08-24`.
- **Swap off** (two files, 12 G, 0 B used): `swapoff -a`, both fstab lines commented (files kept — reversible), `MemorySwapMax=0` drop-in on the browser unit.
- "Restic excludes for agent state" — **moot**: nothing on radar is backed up by restic (only the prune job exists). No change invented.
- **Still open (needs Sean's go — a 4th change):** `/srv/radar/browser` tree (`fetch.mjs` + playwright) is **agent-owned and writable in-unit** → a compromised job can persist by editing its own code. Fix = root-own the tree, keep only a profile/cache dir writable.

## 5. THE LIVE LOOP — the partner's laptop agent (your first task)

All on branch **`wip/comms-notifications-2026-07-05`** of the private repo `SeanSwan/-SS-PT-New`. Every message is one additive file; commits are made with **git plumbing on the branch tip** so no other agent's in-flight work is swept in (§9).

| # | Commit | File | What it is |
|---|---|---|---|
| 1 | `338f5ed84` | `RADAR-BRIEF-FOR-CLASSROOM-LAPTOP-AGENT-2026-08-24.md` | Brief 1 — what radar is now, the laws, three governance tiers for her lane, reply contract, +§8 "her lane is the consulting business's first client" |
| 2 | `477201e55` | `RADAR-REPLY-FROM-CLASSROOM-LAPTOP-AGENT-2026-08-24.md` | Her agent's reply 1 — disciplined; zero classroom bytes to radar; 10 questions; a read-only verification list |
| 3 | `d5b924181` | `RADAR-ORCHESTRATOR-REPLY-2-...-2026-08-24.md` | Reply 2 — verified host/repo state item by item, **two corrections** (§7), and **§12 the widened lane** |
| 4 | `ccf3691bb` | `RADAR-BRIEF-3-HERMES-PARITY-...-2026-08-25.md` | Brief 3 — operating-system parity: inheritance inventory, transfer matrix, her Hermes brain, her wiki (Karpathy + Obsidian + Graphify-on-demand), the read link, the ideas habit |
| 5 | `b6c25867b350` | `ORCHESTRATOR-HANDOFF-SINGLE-ACCOUNT-WORKSPACES-2026-08-25.md` | Her agent, message 2 — **not** the owed reply: Sean ruled **one macOS account, no account-hopping**; it paused before building and asked for reconciliation |
| 6 | `5e86c014a` | `RADAR-ORCHESTRATOR-REPLY-3-SINGLE-ACCOUNT-RECONCILIATION-2026-08-25.md` | Reply 3 — rulings **R1–R6** (§below), ratified its three-front-door layout, egress + learning-packet rulings, blocker table, next step |
| 7 | **`e4d71d18c`** | `ORCHESTRATOR-HOSTILE-REVIEW-REQUEST-PUBLIC-CREATIVE-LAB-2026-08-25.md` | **OPEN — your task.** 204 lines. Demands a 5-seat hostile review + one implementation-ready build packet |

**Reply-3 rulings (R1–R6):** R1 the "separate Unix user / DB / bot token" requirement binds **shared hosts only**, never a second macOS login (my brief-1 ambiguity caused her agent's pause). R2 on the laptop the boundary is **content classification at the door + gate**. R3 the **Public-Creative-Lab is the second front door** — her Hermes brain lives there. R4 her wiki lives in the lab, **child-data-free by marker test** → this settles the "class design" tier **by placement**. R5 lab work is not teacher-visible → freeze-compliant while the locked classroom profile is untouched. R6 she still owes reply 2 §12 (4 items) + brief 3 §7 (6 items).

### What `e4d71d18c` asks for (summary)
A **comprehensive hostile review before anything is created**, and then **one implementation-ready blueprint — no menu of options**, because Sean doesn't want the laptop agent choosing architecture. Specifically:
- **§2 five independent seats**, frozen packet, no seat sees another: **Ox Alpha** (attack paths/blast radius), **Grok 4.6** (adversarial operator, unsafe defaults), **Qwen 3.8** (M3/16 GiB feasibility — *the laptop is an Apple M3 with 16 GiB, newly disclosed*), **Kimi K3** (state machines, concurrency, replay/idempotency), **GLM 5.3** (architecture completeness, sequencing, acceptance). Each returns ACCEPT/REVISE/REJECT + P0/P1/P2 findings + the violated invariant + a concrete correction + tests. `[UNAVAILABLE]` if a seat truly can't run — no silent substitution.
- **§3 ten synthesis rules** — pick one architecture; fail-closed; scanning is defense-in-depth not proof; **state the real limits of macOS folder/app permissions, don't oversell the sandbox**; classification before any network activity; fresh session per door; radar stays a narrow typed job service.
- **§4 a build packet (A–G):** exact filesystem tree with permissions and classifications; derived `AGENTS.md`/`CLAUDE.md` with a **rule-by-rule kept/derived/dropped ledger** and exact banner/stop/attestation wording; **complete JSON Schemas** (lane policy, provenance, outbound envelope, audit receipt, quarantine receipt, radar request/response) + the classification state machine + a single composite validator/emitter; **inactive** Codex `hooks.json` and Claude `settings.json` blocks with event→handler maps; her Hermes/wiki/ideas-habit spec sized to M3/16 GiB; the radar queue-client contract; the household messaging path.
- **§5 eight Mermaid visuals + eight monospace wireframes**, every label mapped to a real path.
- **§6 a synthetic-only test matrix** (fixtures → expected decision/exit code/receipt/gate) including **positive controls proving the harness observes traffic and writes**.
- **§7 a phased mechanical build order** (8 phases) with preconditions, mutations, verification commands, rollback, red-gate stops — and **resolve reply 2 §12 + brief 3 §7 inside the packet**.
- **Output:** exactly one file, `docs/ai-workflow/AI-HANDOFF/PUBLIC-CREATIVE-LAB-HOSTILE-REVIEW-AND-BUILD-BLUEPRINT-2026-08-25.md`, pushed to the same branch, additive only; report commit + blob SHA; end with `no open design questions` only if the agent can execute without choosing anything.

### How to run it
- **ASK SEAN FIRST — this spends money (Rule 16).** Ox = $0; GLM = subscription; Qwen = local/$0; **Grok ≈ $0.06**; **Kimi K3 ≈ $0.20–0.40**. Whole panel ≈ **$0.30–0.50**. Today's ledger already reads **$2.04** against the $3.00/topic and $5.00/day caps — check `scripts/lib/spend-ledger.mjs` before firing.
- Seats: `SWAN_GROK_MODEL=stealth/ox-alpha node scripts/consult-grok.mjs …` for Ox (the `--model` flag is ignored — §9), `consult-grok.mjs` for Grok, `consult-glm.mjs` for GLM, `consult-qwen.mjs` for local Qwen, `consult-kimi.mjs` for Kimi. `mkdir -p` the `--out` dir first for grok. Sanitize the packet (roles only) and **positive-control the leak grep** before egress.
- Write your own seat **before** reading the others (it worked: the orchestrator's design lost to Grok's, and the record says so).

## 6. Discoveries that change existing plans

1. **`[VERIFIED]` The marketing acquisition engine is already built on `origin/main`** — `speedToLeadService.mjs`, `automationCron.mjs`, `jobs/marketingPublisherWorker.mjs`, `marketingReadinessService.mjs` (states `ready|degraded|blocked|demo`, an `armedCheck(env)` gate, a `lead_nurture` `isActive` flag), lead capture wired to contact/signup/newsletter/checkout. **It is built, unarmed, and unhosted** — not a build problem.
2. **`[VERIFIED]` The drafts approval queue already exists on `main` and is DORMANT.** `backend/migrations/20260322000001-create-communication-drafts.cjs` (`type: email|sms`, `status: pending_approval|approved|sent|rejected`, `approvedBy/At`, `sentAt`), model `CommunicationDraft` (blob `87c489ba8003`), controller `3088fac32ec1`, **route mounted** `backend/core/routes.mjs:475` → `/api/trainer/drafts` — but the model is registered in `backend/models/dormantModels.mjs:29` ("No caller… awaiting Rule-34 disposition") and is in no association registry. `[LIKELY]` the route throws on call — the exact failure that registry documents. **E4 is a switch-on, not a build.**
3. **`[VERIFIED]` The canary egress redactor is unpublished** — `scripts/lib/redact-egress.mjs` exists only as an untracked local file in another agent's lane, on no pushed ref. The published control is **`scripts/hooks/egress-privacy-gate.mjs`** (blob `278cea5ec61c`, wired in settings). Cite that one.
4. **`[VERIFIED]` Repo drift, found by her agent:** `.gitignore:444` ignores `.ai-workflow/*` and `git check-ignore` confirms on a pending memo — yet **210 `.ai-workflow/hermes-inbox/` files are committed on `main`**. Rule text and tree disagree. Fix = a deliberate `git rm --cached` pass on `main` with Sean's approval; **never** force-add on either side.
5. **`[VERIFIED]` The box holds the restic repository password** (0600 in the backup user's home; the retain script uses it) → full compromise decrypts every snapshot including the Hermes vault. And the WSL→radar key is sftp-only **without `-R`** → it can **delete** snapshots. "Append-only" in the 2026-08-23 handoff is an over-claim (corrected in place).
6. Durable-packet allowlist (`_schema.json` v1.2.0): `claude-fable-5`, `claude-opus-5`, `moonshotai/kimi-k3` → **her local 8B can never write durable packets**; its output is inbox/quarantine.

## 7. Current verified state (2026-08-25)

```
radar timers:  radar-health (5m) · radar-db-backup (02:30) · radar-restic-retain (05:30)
               · radar-browser (2h, 08:15–22:15)      [offsite + deadman still NOT installed]
radar caps:    MemoryMax on all four units (768M/256M/128M/1G); swap 0 devices
radar egress:  OUTPUT policy ACCEPT — no default-deny firewall yet (D5 unbuilt)
radar overlay: tailscale installed, NOT joined (one Sean click); tailnet has no tags/ACL
radar users:   admin (sudo) · browser-agent (no sudo) · backup (sftp forced-command, CAN delete)
radar DB:      one product database; news tables still 0 rows
radar open:    /srv/radar/browser tree agent-writable (4th change, needs Sean's go)
repo:          origin/main has NO /api/agent, AgentToken, P1 schema, timers manifest,
               install contract, or schema-widening test (all 0 files)
branch:        wip/comms-notifications-2026-07-05 — the exchange branch; ~2,256 behind main
spend today:   $2.04 (caps: $1/call, $3/topic, $5/day)
gate files:    c:\tmp\r2-creds.env  ABSENT     c:\tmp\hc-url.txt  ABSENT
```

**Repo hygiene:** this session committed only its own files (grill doc, panel dir, learning packet, the four exchange files). Other agents have uncommitted learning packets in the working tree — **they are not yours; do not sweep them** (`git add -A` is forbidden while lanes are held — Rule 67). My two Hermes memos are gitignored by design.

## 8. BLOCKED ON SEAN (nag list, value order)

1. **DMARC record** (Namecheap, ~10 min, open since July, SWA-13) — panel-unanimous #1; gates arming the built marketing engine. Staple `dig` + a test-send the same sitting.
2. **`c:\tmp\r2-creds.env`** (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET; new bucket, bucket-scoped token) → unlocks offsite leg 2, then a **restore-one-file drill**.
3. **`c:\tmp\hc-url.txt`** (healthchecks.io ping URL, Period 5min / Grace 10min) → unlocks the dead-man pinger, then the pull-the-wire test.
4. **Restic password → password manager.** It lives inside the backup it protects. Total-loss gap.
5. **Tailscale join** on radar (one click) + a tag + an ACL + disable key expiry.
6. **Approve the 4th radar change** (root-own `/srv/radar/browser`).
7. **Approve the inbox cleanup on `main`** (210 tracked memos vs the ignore rule).
8. **Answers her agent is waiting on:** read scope of his Hermes brain for her Hermes (shared tier only, recommended — or everything); always-on replica of the shared tier on radar (yes/no); confirm the class-design-by-placement ruling (R4); the front door for her personal assistant (answered by R3 — confirm); the adoption-gate state.
9. **Render API key rotation** (exposed 2026-08-12, standing).
10. **Permission to spend ~$0.30–0.50** on the 5-seat panel §5 asks for.

## 9. Traps paid for in session 2 (do not re-pay)

1. **Windows caps a Bash command line at ~8K chars** and it surfaces as `unexpected EOF while looking for matching quote`. The quoting was fine; the tail never reached bash. **>7K of content → Write tool or a script file.** (Cost two runs.)
2. **A `head -8` cut turned a live middleware into "dormant."** A positive control with a wider glob caught it. This class was already in the corpus and was repeated anyway — run the control, don't recall the rule.
3. **`grep -c` exits 1 on a zero count** — a `&&` chain guard built on it aborts on the **good** outcome. Use `|| true`.
4. **Never export `MSYS_NO_PATHCONV=1` around native-binary file paths** (`GIT_INDEX_FILE`, `--out` dirs) — git got an unconverted `/c/…` path and could not create its lock. The flag is for `<rev>:<path>` reads only.
5. **A literal-path `sed` against a runner that referenced the file through a variable** matched nothing, "succeeded," and left the job pointing at a deleted file (browser lane down ~2 min). **Grep the reference form before any path sed**; the real-run proof in the fix script is what caught it.
6. **A stale `.git/index.lock`** (no live git process) blocked a commit — check for processes, then remove.
7. **The lane-staged guard blocks committing paths you did not claim** — claim first (`node scripts/lane.mjs claim --files …`), never `--allow-foreign` casually.
8. **Commit with plumbing when the branch has other agents' work:** `git hash-object -w` → `GIT_INDEX_FILE=<repo-relative> git read-tree <origin-tip>` → `update-index` → `write-tree` → `commit-tree -p <origin-tip>` → `git push origin <sha>:refs/heads/<branch>`. No rebase, no sweeping.
9. **Local Qwen self-labels as another seat** (its panel output was headed "Seat: Ox Alpha"). Attribute by file, not by the model's claim.
10. Carried from session 1 and still true: `consult-grok.mjs` takes its model from `SWAN_GROK_MODEL` (not `--model`) and does **not** `mkdir` the `--out` dir; **Ox 429s upstream** (paced retry, one 429 ≠ down); GLM roleplays other seats unless the remit forbids it (the forbid worked this time).

## 10. Where we're going — the sequence (supersedes the direction panel's §5)

| Evening | Work | Blocked on |
|---|---|---|
| **E1** | DMARC record + validator + arm `lead_nurture` + speed-to-lead monitor · **news: seed + enable 3–5 sources + bootstrap ingest timer** | Sean: DMARC (SWA-13) |
| **E2** | offsite leg 2 + restore drill + password manager + object-lock | `r2-creds.env` |
| **E3** | dead-man pinger + pull-the-wire test + **default-deny egress firewall** (firewall is not blocked) | `hc-url.txt` |
| **E4** | **app-side agent principal + `/api/agent/facts/cash` + drafts queue** — a **switch-on** (register `CommunicationDraft`, prove `/api/trainer/drafts`, add the principal) | — (unblocked) |
| **E5** | deterministic floor brief → folded into the 06:47 Morning Ops Briefing, trigger moved to radar + money-now interrupts → **first money brief** | E4 |
| **E6** | **news: `/api/feed` + mock-kill + `count(*)>0` gate → the newsroom shows real data** | E1 |
| **E7** | timers manifest + heartbeat (green/yellow/red/**blocked**) + box-audit (grants/schema drift) | — |
| **E8** | boss call (GLM default) + provider adapter + egress gate + rubric + approval UI | E4/E5 + `ZAI_API_KEY` on radar |
| **E9+** | YouTube OAuth/engine 3 · membership queries · trainer engine · booking-SaaS ICS · Discord · the partner lane per the blueprint | per-item |

Sean's sequencing words: *"we will do the money first, but then the news right after. All together, because I really want that done. I'm tired of seeing that mock data."*

## 11. Continue by

1. **Read `e4d71d18c`** (§5) — it is your task and it is precise about the output file and contract.
2. **Ask Sean for the panel spend** (~$0.30–0.50, ledger at $2.04 today) and for the §8 answers the blueprint needs (read scope, replica, R4 confirm — the M3/16 GiB spec is already given).
3. **Run the 5 seats independently**, write your own seat first, synthesize, produce the single build packet, push it additively with plumbing, report commit + blob SHA.
4. Keep nagging §8. Emit the Hermes memo + a learning packet at close (rule 68/69 — both fired this session).

**Linear:** SWA-189 (the laptop loop + classroom lane), SWA-70 (radar direction + E4), SWA-199 (Tier-0 browser + hardening), SWA-202 (backup hub), SWA-175 (5090 serial resource — relevant to the GPU queue), SWA-165/207 (Atelier), SWA-13 (DMARC).
