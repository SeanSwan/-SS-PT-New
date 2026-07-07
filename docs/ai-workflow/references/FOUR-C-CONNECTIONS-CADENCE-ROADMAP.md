# Four-C Roadmap — Connections (C2) & Cadence (C4)

**Status:** PLANNED (not built) · **Created:** 2026-06-11 · **Source:** Four-C's second-brain reframe (`docs/ai-workflow/brainstorms/four-cs-second-brain-2026-06-11.md`)

This doc holds the *planned* Connections and Cadence build-out so the always-loaded operating files (CLAUDE.md/AGENTS.md) stay lean. The Four-C Router in those files points here. Nothing below is active unless this doc says LIVE. **Building any of it is a separate, gated workstream** (grill-me/chromie → swan-orchestrator → build → closeout) — and anything touching live data, auth, billing, PII, or remote systems inherits all the existing rules (rule 8 zero-PII, rule 47 supervised launcher, rule 50 QA tiers, Hermes privacy gate).

---

## C2 — Connections (live data the second brain can reach)

**LIVE today:**
- Render PostgreSQL (production DB; local dev uses `DATABASE_URL` too).
- Cloudflare R2 (video/media assets; `frontend/src/config/videoAssets.ts`, `scripts/upload-videos-to-r2.mjs`).
- `node scripts/consult-gemini.mjs` / `consult-codex.mjs` (CTO design + hostile review).
- Hermes (desktop-5090 + Telegram; Pi RETIRED 2026-07) — operator/continuity, Sean-only, privacy-gated, local Qwen3 fail-closed; live install receipt: FABLE-HERMES-WORKFLOW-UPGRADE/170 §A.
- Swan Oracle / SerpAPI (`SWAN_ORACLE_API_KEY`) — teaching widgets, intel.

**PLANNED (prioritize when Sean greenlights; each needs its own gated slice):**
| Candidate | Value | Notes / guardrails |
|---|---|---|
| Stripe (read) | Revenue/MRR, churn, failed-checkout truth in admin | Already integrated for payments; planned = read-side ops/analytics surface. Scoped read keys, no write. |
| Calendar (Google) | Session scheduling context, trainer availability | OAuth; consented; feeds next-best-action. |
| Accounting (QuickBooks-equiv) | P&L / cash truth for admin ops | Read-only; finance data is sensitive — admin-gated. |
| Plaud audio ingest | Voice → workout log (existing upload/parse path) | Manual export first; official OAuth later (still beta). |
| Wearables / health sync | Enrichment only — Swan owns the canonical record (rule 62) | Consent + zero-PII-to-LLM (rule 8). |

**Connection discipline (Nate Herk model + Swan rules):** prefer **APIs/CLIs over MCP servers** (more control, cheaper); use **scoped keys** (read-only where possible — "keys, not prompts" are the permission layer); never embed secrets (rule 44/47/59); treat any health/biometric/PII data as sensitive by design (rule 62).

---

## C4 — Cadence (capabilities that run on a trigger/schedule, not just manually)

**LIVE today:**
- Continuity bridge (`.ai-workflow/continuity/rolling-last-done.md`; explicit-trigger append only).
- Pre-commit secret scan (`scripts/scan-secrets.sh`) + Rule-42 backend audit discipline.
- `prompt-watcher` UserPromptSubmit hook (rule 66) — fires every prompt.

**PLANNED (each must EARN automation — the trust/cost/risk ladder below):**
| Candidate | Trigger | Value |
|---|---|---|
| Nightly admin briefing | schedule (cron / cloud routine) | Who trained, what's stale, what needs intervention, what's shareable (Product Core Loop proof). |
| Stale-client alert | schedule/event | Flag clients who haven't logged in N days → coach intervention (retention). |
| Deploy health watch | event (post-push) | Confirm Render deploy live + smoke key surfaces. |
| Weekly content/marketing loop | schedule | Scan niches → topics → draft (content-cadence rule 9 / no-spam limits). |
| Milestone → testimonial pipeline | event | Admin one-tap "request permission to feature" on big client wins (consent-clean marketing). |

**Cadence discipline (hard-won):** more autonomy = more cost + more risk + more maintenance. An automation must be battle-tested manually first, must have an **owner**, and the permission layer must be **keys not prompts** (the 2026 Nate Herk "agent emailed 200k people a bad discount code" lesson — assume *if it can, it will*). Default-off flags, kill switches, and audit logs per rule 48. SwanStudios cadence candidates that touch client comms or money get Tier-C (AI Village) review before going autonomous (rule 50).

---

## How to use this doc
- The Four-C Router in CLAUDE.md/AGENTS.md lists the one-line candidates and points here.
- When Sean wants to build one: it starts as a normal gated slice (grill-me/chromie → orchestrator → build → closeout), and its LIVE status moves up into the table above.
- This doc is reference-only and loaded on demand — it is NOT always-in-context, by design (token economy).
