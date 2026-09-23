# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Served:** `x-ai/grok-4.6`
**Document:** docs/ai-workflow/AI-HANDOFF/RADAR-DIRECTION-PANEL-PACKET-2026-08-24.md
**Seed:** (none)
**Tokens:** 3078 in / 8208 out · **Cost:** ~$0.0508 · **Wall:** 179.9s · **finish:** stop

---

**(a) VERDICT: REVISE** — working answer (//§4–4a) is directionally right on collection-vs-judgement and T1-first, but it is not a build spec. It recenters the news product after the owner deprioritized it (//§2.3 vs //§4a diagram), leaves production PII one process away from untrusted ingest, and treats “scheduler only” as isolation it does not have. Evidence that *is* solid: ingest is LLM-free (//§3 `agentRuntime` 5 vs four ingest modules 0); no in-app scheduler; feed route absent vs seven real route files; ~51 creators / ~39 sources default-off; DNS auth unset ~1 month; backup leg 1 fails-closed on status write; leg 2 never run.

**(b) Correctness attacks**

Happy-path-only logic. “Box = scheduler only” (//§4a) is a role label, not a runtime. The box already *is* prod Postgres (61 tables), dump+restore, and the workstation’s backup hub. Adding cron ingest, a chat bot, and later headless automation is more co-tenancy, not a smaller machine. The //§4a diagram never shows Postgres, backups, or the training SaaS — the actual blast radius is off-page.

Null / type / empty-feed. Enabling “a small set of sources” (//§4) without a written allowlist, per-source parser contract, and a non-empty assertion means the new endpoint can be real and still serve `[]`. That is mock data with better morals. Frontend already has ~8 modules bound to mock shapes; a new feed that returns a different envelope will look “broken” even when ingest works. No response schema is specified.

Stale state / races. T1 “session tomorrow” (//§4) is timezone- and midnight-unsafe; a 00:05 cron in UTC vs a trainer in local time double-fires or skips. No sent-digest ledger → cron overlap or a systemd restart double-sends. Ingest+dedup with no idempotency key (source, external_id, fetched_at window) will duplicate on retry. Backup prune + news archive + daily dumps on one disk have no shared watermark; the first writer to fill 185GB takes down WAL.

Off-by-one. “Stale / low on sessions” has no definition (last session? package remaining? last contact?). Default-off sources: enabling N without recording *which* N and *why* makes the next session’s “why is this empty” unreproducible. Catalog re-decision at “~2,000 rows or 5,000 items” (//§4a) — a continuous world+local+politics+cyber+company ingest crosses that in days, not at a planned review.

Error-path gaps. Restore-verification is asserted (//§1) but not *where* it restores (sidecar vs clobber-prod). Ingest failure is unspecified: empty parse, 403, selector drift, robots block — circuit open, page owner, or silently store nothing? Chat-app push is assumed to work unsolicited; many bots cannot originate DMs. DNS still unset → any “transactional email working right” work is dead on arrival. Leg 2 “scripted but not run” is not a backup.

Agent-judges exception the rule misses. The rule breaks on **judgement-triggered fetch of a primary source** (permalink, changelog, GitHub release, company blog) and on **one-off credentialed / non-allowlisted research**. Headline-only judgement will hallucinate. That is a *bounded fetch tool* on an already-identified URL, not a 24/7 collector. Source-discovery and selector-repair are the other two legitimate agent fetches — both should be ticket-shaped, not a daemon.

24/7 agent, costed. With no local inference (//§1), a continuous “coding agent” is an API idle-loop. A 15‑min pass at ~20k tokens is on the order of 10^6 tokens/day — tens to hundreds of USD — to notice that ingest already ran. Honest answer: **worth almost nothing.** Replace with cron ingest + 2–4 judgement batches/day + one morning T1 digest. Kill the 24/7 framing; it is a category error.

**(c) Security attacks**

Authn/authz + IDOR. T1 “reads production read-only” from the same host is not a boundary. Chat-app bot: if not locked to a single chat user id + allowlisted command set, anyone who finds it queries client state (classic bot IDOR). T2/T3 client messages have no consent/suppression/unsubscribe model. Partner “separate assistant” (//§4) is stated; **news-judgement vs training-PII is not.** That is the real IDOR: one tool-using agent, two products.

Injection. Scraped HTML/JS/article text into the same machine as client PII. Prompt-injection in a creator post → agent with SQL or send-message tools dumps or messages clients. SQL in digest queries if any filter is concatenated. Untrusted URLs in ingest = SSRF to 169.254.169.254, localhost Postgres, backup status files, or cloud metadata if any credentials later appear.

Secret handling. Restricted sftp key already on the box; leg 2 credentials “pending”; agents “no sudo / no docker group” (//§1) still read `~/.env`, `.pgpass`, unit EnvironmentFiles if perms are default. Backup repo + prod DB on one host = one compromise is both products and the workstation’s history.

Replay / idempotency. No alert idempotency key, no ingest exactly-once key, no “this digest for date D already sent.” Cron + retry = duplicate client-facing mail once T2 exists (CAN-SPAM / trust damage).

Multi-tenant scope. One box, “one product’s full schema (61 tables)” (//§1) — *which* product? Partner classroom data, partner personal business, training clients, news corpus: four tenants. Document only splits partner classroom vs personal. Training PII + news corpus + workstation backups are still one kernel, one disk, likely one Postgres. Child-data rule is correct and then under-applied.

Rate-limit / DoS. Unbounded continuous scrape from one IP: source bans first, then self-DoS (Chromium 0.5–2GB/instance vs 16GB and a production postmaster). Archive growth fills disk → Postgres stops. No cgroup/MemoryMax named. No per-source QPS/budget. No dead-man switch if the scheduler itself dies.

ToS/legal. Social-platform “monitor at all times” via scrape is called out as blocked/against terms (//§4a landmine 1). Do not build a scraper. Substitutes that capture most *product* signal: company blogs/RSS, release notes, changelogs, status pages, aggregator fronts, newsletters, YouTube/official RSS. Social is irreplaceable only for *minutes-level creator gossip*; that is a paid-tier budget decision, not a feature. Measure substitute recall on a 2-week allowlist before spending.

**(d) Data-truth / schema-drift (Rule 58)**

- **Which schema is on the box?** “61 tables” for *one* product, while two products plus a partner lane are in scope. News feed route does not exist; training tables are implied. Caller field vs column cannot be checked because no contract is written. That absence *is* the drift.
- Frontend newsroom: ~8 modules on mock (//§3) vs a not-yet-built feed. High probability of camelCase UI vs snake_case API, `items` vs `data.results`, ISO strings vs unix, and mock fields the real ingest will never populate (engagement, “hotness,” avatars).
- FK target drift: creators/sources “seeded default-off by a deliberate law” (//§3) — ingest rows will FK to sources that are off; ranking that joins enabled=true yields empty. Archive “saves everything” vs agent-facing catalog that must stay greppable: two tables are required (raw corpus vs pointer catalog). Document asks this and does not specify names, retention, or the generate-catalog job.
- Partner data in the same cluster as training clients is FK/tenant drift waiting to happen (`user_id` meaning trainer vs teacher vs creator).
- T1 digest fields (“stale”, “low sessions”, “session tomorrow”) are not columns named in the packet. If the 61-table training schema uses `sessionDate` / `remaining_sessions` / `last_contact_at` under different names, the first query is wrong.

**(e) House-rule violations and speculative-success language**

House rules: **zero PII to LLMs (IDs only)** is on a collision course with T1/T2 and “personal agent that knows the news” if that agent can also see the training DB. T1 must be SQL + local template, client **IDs only** (or no LLM at all). Any newsroom/scheduling UI work in this remit names **none** of: styled-components only, Victory only, `var(--token,#fallback)`, Dual-Button Glow, 44px targets, dark-first, WCAG 4.5:1, ≤300 lines/file. Credentials wording N/A; yoga/meditation N/A.

Speculative success, no verified path:
- “the corrected version is coherent” (//§4a)
- “Mock data should then be structurally unreachable” (//§4) — no delete/flag/module-split path
- “Near-zero blast radius” (//§4 T1) — false once the reader shares a kernel with postmaster and a bot token
- “the chat-app bot he already runs beats both” (//§4) — inbound bot ≠ outbound push verified
- “fails closed” is verified **only** for backup status write (//§1), then implicitly borrowed by everything else

Partner motivational assistant (//§2.7, //§5.5): **bad idea as specified.** It encodes *his* goal (“no daycare, only their own school”) as a system that nags *her*. That will feel like surveillance, not support, and any useful “open a school” workflow attracts roster/family data this box is forbidden to hold. Build nothing she did not ask for. If she asks, a shared calendar + draft-social queue *she* opens, no nudge engine, no child data, separate Unix user / DB / credentials, never on the training agent.

Kill vs defer: kill 24/7 coding agent, partner-nudge product, social firehose, RAG re-decision-under-pressure. Defer T3 auto-messages, browser automation on this box, “agent knows the news” until the catalog job exists.

Thing nobody asked: the box is **prod DB + workstation backup target + future ingest of untrusted HTML**. Compromise or disk-full is total. RTO/RPO are unstated. There is no dead-man alert if cron/ingest/backup did not run — an always-on box with no “I am alive” path.

**(f) Highest-risk item and de-risk before build/ship**

**Untrusted news ingest + tool-using agent + production client PII + workstation backup corpus on one 16GB host whose offsite restore path has never been run.** Prompt-injection, OOM of postmaster, or disk fill are the same incident. “Scheduler only” does not change that.

De-risk in this order, named paths, no new product work until 1–3 are green:

1. **Leg 2 credentials in, encrypted, file perms 0600, owner-only; one live offsite snapshot; restore to a *non-prod* target; write RPO/RTO.** If this fails, stop.
2. **systemd `MemoryMax` / `MemoryHigh` on every non-postgres unit** (ingest, bot, any future browser). Postgres wins OOM. Confirm with a load test that a runaway fetch cannot kill postmaster.
3. **Three principals, not one:** Unix user + Postgres role `training_ro` (SELECT on training, no partner, no backup files); Unix user + DB `news` only for ingest/archive/catalog; partner lane stays off this box until she asks. News agent tools: catalog+archive only. No `send_message`, no training tables.
4. **T1 = cron SQL + chat template, zero LLM, client IDs only, unique `(digest_date, kind)` send ledger.**
5. **Mock-data kill path:** implement the feed contract the ~8 modules already call *or* change them once to that contract; enable a written 3–5 source allowlist; cron ingest; add a CI/runtime assert that mock modules are not imported in production. Empty feed ≠ mock, but empty feed is still a ship blocker — assert `count(*) > 0` after first successful ingest.
6. **DNS auth record this week** before any client-facing mail work. Until it exists, T2/T3 are forbidden.
7. **Catalog, not RAG:** raw archive may grow; agent-facing surface is a generated greppable pointer file (title, url, source_id, fetched_at, 1-line gist) capped and rotated so it stays under the 2,000/5,000 re-decision line. Crossing the line is a scheduled review, not an accidental vector DB.

Do not ship a 24/7 agent. Do not scrape the hostile social API. Do not put a motivational agent on a partner. Sequence for a solo evening operator: offsite restore → cgroups → DNS → real feed + 5 sources + cron → T1 digest. Everything else is optional and currently framed as if it were the product.
