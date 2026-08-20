# Station buildout plan — the thing Sean runs

**Date:** 2026-08-20 · **Status:** ready to execute · **For:** SWA-70 · **Feeds from:** the two grill
docs (`marketing-station-spare-pc-2026-08-20.md` + `swanguard-up-to-speed-2026-08-20.md`)

This is the plan Sean asked for: what he installs and builds by hand, then what an agent does once
he's logged in and the box is reachable. The split he described — *"I install everything and build,
then I log in and tell you to set it up"* — is exactly right. It maps to: **Sean lays the floor →
Claude Code builds on it → Hermes runs it.**

---

## The operating model (how "you set it up" actually works)

Three ways an agent can act on the station; the plan uses the first for building, the third for
running:

1. **Claude Code runs ON the station** (Sean opens a Claude Code / VS Code session on the box after
   login). **This is the build path** — full tool access, native to the machine, no remote-shell
   fragility. Recommended for Phases 1–3.
2. Claude Code stays on the 5090 and reaches the station over a Rule-47 supervised launcher (SSH).
   Fallback only — good for one-off checks, not a multi-day build.
3. **Hermes runs on the station** as the always-on operator. **This is the run path** — cron,
   collectors, briefing, scheduling. Hermes is definitely on this box (Sean confirmed).

**Clean division of labor:** Claude Code *builds* the station; Hermes *operates* it. Don't put the
build agent in the always-on role or the operator agent in the build role.

---

## Phase 0 — Decisions Sean makes before installing (5 minutes)

| Decision | Recommendation | Why |
|---|---|---|
| **OS** | **Ubuntu 24.04 LTS (native, not WSL)** | The box runs docker, always-on node/python services, browser automation, AND pentest labs — all native-Linux-natural. Hermes runs fine on native Linux. WSL only made sense on the 5090 because Windows was already there. |
| **Pentest lab isolation** | **Separate VMs (or a separate physical disk / network namespace), never the host** | A lab target that gets popped must be nowhere near the credential broker. Decide the boundary now — retrofitting isolation is how zones leak. |
| **Credential posture Phase 1** | **Zero platform/brand tokens on the box** | Radar Phase 1 is pure-read public sources. The biggest security surface is simply absent until the operator phases. |
| RAM / ethernet | Confirm 32 GB + wired | Affects concurrent browser contexts; wired matters for an always-on unattended node. (Open flag from the station doc.) |

---

## Phase 1 — Sean installs + builds the floor (the part he does by hand)

Base tooling, in order:

1. **OS + updates**, then **Tailscale** — join the tailnet, confirm the box is reachable from phone
   and laptop. This is the perimeter; nothing else is public.
2. **git, node (LTS), docker + docker-compose, python 3.11+**, build-essential.
3. **Clone the repos**: SwanGuard (`SwanGuard-Newsroom`) and SS-PT.
4. **Verify the SwanGuard demo builds** with the correct env flags
   (`VITE_SWANGUARD_API_MODE=demo` + `VITE_SWANGUARD_ALLOW_STAGING_DEMO=true`) — proves the toolchain
   before any agent work. (A plain build renders the OLD app; that trap is documented.)
5. **Log in, open Claude Code on the box**, keep the session live. Hand off to Phase 2.

---

## Phase 2 — Claude Code builds SwanGuard up to speed (agent, on the box)

Runs under SwanGuard's own gates (swan-orchestrator → recursive plan → hostile review → closeout).
Ordered slices:

1. **Merge `codex/swanguard-newsroom-recovery-20260801` → main**, reconciling main's 2 civic commits
   under the Q1 hierarchy (personal intel center; civic = a section). Newsroom becomes mainline;
   the 14-module shell retires.
2. **Promote `StoryNode` → `packages/contracts`** with a schema-version field, so web + api +
   station collectors share one type.
3. **Build the ingest API on `apps/api`**: idempotent `POST /stories` (natural-key dedupe — S2),
   ranked `GET /stories/top?n=` with delivered-state marking (S4), authed by a scoped POST-only
   machine token the radar can call but not read (S3).
4. **Stand SwanGuard up as an always-on service on the station** (docker-compose: web + api + db),
   Tailscale-only, existing auth + long-lived trusted-device sessions (Q5).
5. **Enroll SwanGuard + the ingest pipeline in the Pi watchdog** at deploy time (S5) — never later.

## Phase 3 — Claude Code builds the radar (agent, on the box)

1. **Collectors, credential-free first**: RSS/news, event calendars, venue pages, security feeds
   (Hacker News, CVE/threat sources), training-research sources. Each terminates in a named artifact
   (S4). Heuristic rank on-box; any LLM summarization delegates to the 5090's Qwen (S1) — no
   inference on the 3600.
2. **Wire the Hermes 06:47 briefing** to `GET /stories/top` over Tailscale — top news, ranked,
   capped, deep-linking into the newsroom for evidence.
3. **X via xAI Live Search** (Q6) — after Sean creates the xAI account/key; key lives in the
   station broker; daily budget + weekly canary (S7). Hermes's three X locks stay untouched.

## Phase 4 — Operator functions (gated, later; each its own grill/plan)

- **Marketing drafts** — draft-only, Sean publishes from phone; T2 by construction (station doc).
- **Trainer scheduling assistant** — the tight-schedule pain. Rides Swan Coach's command lane
  (availability / view_available_slots) + Hermes Telegram; client IDs only, names merged locally
  (Rule 8 privacy-proxy); T3 client messages route through Sean's approval except the pre-approved
  inbound-ack carve-out. **This gets its own grill before build** — it touches real clients.
- **Pentest/coding lab** — segregated zone (Phase-0 boundary); cert study environment.

---

## What Sean owes (unblocks phases)

- Phase 0 OS + isolation decisions (above).
- xAI account + API key — before Phase 3 X-collection.
- DMARC record (SWA-13) — before any Phase-4 outbound email.
- The 2 open hardware flags (RAM, ethernet).

## Sequencing logic

Read-only ships first (no gates, no creds, no DMARC). Credential-free collectors before X. Operator
+ scheduling wait for an authority model that already exists on paper. Pentest lab runs parallel but
walled off. Nothing outward-facing before its tier is enforced.
