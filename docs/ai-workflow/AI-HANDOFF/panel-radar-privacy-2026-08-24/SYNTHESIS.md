# SYNTHESIS — privacy tiering for the always-on business operator box — 2026-08-24

**Final decider:** claude-fable-5. **Seats:** Ox Alpha (`stealth/ox-alpha`, $0), Grok 4.6 (`x-ai/grok-4.6`, $0.057), GLM 5.3 (coding plan, $0 marginal), local Qwen 3.8 (Ollama, $0), Fable seat (written before reading the others — `FABLE-SEAT.md`).
**Privacy:** roles only. **Packet:** `PACKET.md`.

## 0. Attribution and instrument notes
- `Served:` headers checked: Ox = `stealth/ox-alpha`, Grok = `x-ai/grok-4.6`. No truncation (`finish: stop` on both).
- **Qwen self-labelled its output "Seat: Ox Alpha."** It is Qwen. Nothing in `QWEN-3.8.md` is attributed to Ox.
- GLM did not ventriloquise other seats this round (the remit explicitly forbade it — the fix from the 2026-08-24 direction panel held).
- Fable **verified on the box** what every seat could only tag `[UNKNOWN]`: the retention job's user holds a 43-byte `.restic-password` (0600) and the retention script references it. The box holds the backup repository key today.

## 1. Consensus (5/5 unless noted) — treat as SETTLED
1. **The §4 invariant is false as written.** "Read business data" is a euphemism for a PII breach; the claim bounded *integrity* while the owner's concern is *confidentiality* (Grok's framing, endorsed by all).
2. **Per-entity P1 rows are not anonymous at N ≈ dozens.** `(session_type, day, amount_bucket)` re-identifies by arithmetic (Ox); GLM predicts >50 % tuple-uniqueness and demands it be *measured*. Stable IDs across calls are a join oracle.
3. **Deterministic + templated P0 is the floor, not an option** — it is what the "never silent" law requires. **P0 → cloud is forbidden**, ranked dead last, not fourth.
4. **CPU-only model on the box = at most one measured evening**, default off, with a written decision rule; Grok and Qwen would not bother; Ox, GLM and Fable allow the experiment. All agree: kill it below ~3 tok/s or on any hallucination in 20 runs, and **delete the loser — do not leave it as a silent fallback** (Ox).
5. **Egress is one typed function validated against an allowlist schema; the regex sanitizer is demoted to a detector.** Chat-path middleware is not the brief proxy (Grok, GLM).
6. **P2 scraped content never shares a call with P1 facts** — prompt-injection conveyor (Ox, Grok, GLM, Fable).
7. **Service account = a separate principal, never the admin/trainer session**; DB grants on views only; **two credentials** (read vs drafts) so neither can do the other's job (Ox, Grok, GLM, Fable).
8. **Approval happens inside the app; chat is notify-only and link-free.** C5 is a persuasion/phishing channel, and the one-tap is a data plane fed by the box, not a control plane (Ox's headline; Grok's "confused deputy"; GLM's "owner is being trained to tap").
9. **Booking SaaS:** secret ICS feed > official API > stored login (rejected permanently). The feed almost certainly carries client names → its content is **P0, on-box only** (Grok, GLM). Until connected, the brief prints a named gap; a test fails on any fabricated booking fact.

## 2. The one real disagreement — where the P0→P1 boundary lives
| Seat | Position |
|---|---|
| Ox | Keep the DB role but bound it (`statement_timeout`, read-only txn), add a k≥3 gate + daily salt; **headline = default-deny egress firewall** on the box |
| Grok | **Remove the DB role from the box entirely.** The app exposes a facts/drafts API; cloud receives **aggregates only**, no per-entity rows |
| GLM | DB role may `SELECT` **one redacted view only**; per-entity rows allowed with **daily key rotation + zero-retention provider** ("linkable nowhere") |
| Qwen | Move P0 data off the box to the workstation (impractical — the box then has nothing to schedule on; directionally = PII-free box) |
| Fable (pre-read) | Redacted views in the app; box never receives PII |

**Ruling (Fable):** **Grok's cut, with the app as the boundary.** The box holds **no production-DB credential at all.** It calls `GET /api/agent/facts/:engine` (returns a validated P1 bundle) and `POST /api/agent/drafts` (handle + template id + slots; the app re-binds handle → client server-side). This kills the DoS vector (Ox), the pseudonym map on the box (GLM's "crown jewel"), the bulk-SELECT breach (Grok), and the need for any DB grant audit on the box.
On **per-entity rows to the cloud boss**: the boss needs categorical rows to *rank* and *pick a template*; aggregates alone cannot say "these three first." Ruling: allow **≤ N (default 10) per-entity categorical rows, k≥3 suppressed, app-minted handles rotated daily, only to a provider with a zero-retention path** — GLM's "linkable nowhere" plus Ox's k-gate. Names, times, and message bodies are filled in the app at approval. This is exposed as config `cloud_rows = none | topN` (default `topN`, N=10); the owner may set `none` for the strictly-aggregates posture, which is also what a stricter client business would want (portability).

## 3. Unique insights adopted (by seat)
- **Ox:** default-deny **egress firewall** (nftables `policy drop`, pinned endpoints) — converts "full compromise" into "compromise that can only talk to four hosts"; heartbeats verify *alive*, not *true* → structured, templated bot messages only; egress-volume anomaly alert; "losing engine is deleted".
- **Grok:** confidentiality-vs-integrity; **armed automations adjacent to the drafts queue can alias into a send path** — drafts and automation sequences must be schema-distinct tables with no shared transition; **P0 at rest on the box** (journald, swap, model caches, collector JSON, restic snapshots) — data-at-rest policy is part of tiering; video analytics may include revenue/geo → not automatically P2; workstation-awake enhancement will train the owner to leave the desktop on (accepted, flagged).
- **GLM:** **redefine tiers by egress boundary — P0 = never leaves the home network — not by which processor touched it** (this also makes the CPU-model experiment a non-violation); **shown ≠ sent** rendering attack → byte-identical test after template fill; audit-log hash-chain head printed in the brief; a provider with no zero-retention path is **dropped, not excused**; the **weekend-install test = exactly four env vars** or the portfolio claim is marketing; LAN isolation box↔workstation (pivot risk).
- **Qwen:** nothing unique; restated consensus with generic examples. Calibration: confirm-only seat.
- **Fable:** the verified restic key; redacted views (superseded by Grok's stricter cut); nightly `box-audit` diffing grants + schema hash against the repo.

## 4. Blind spots (no seat covered)
- **Arming day is gated on the outbound-email DNS record** — GLM named arming as the most-silently-dangerous event; nobody tied it to the DNS record that is still missing. They are the same evening.
- **Chat-bot token read scope** — Qwen brushed it; verify the bot's privacy mode so a compromised token cannot *read* the owner's chat history.
- **The app-side work is real build work** (agent principal, facts endpoints, drafts queue, redacted projections) in the production repo — it goes through the normal gates (canonical-surface receipt, schema cross-check, tests), not the box lane.
- **Backup-key deletability and allowlist writability** — asked as `[UNKNOWN]` by three seats; probed by Fable after synthesis (result recorded in the brainstorm doc).

## 5. Decisions (Fable rulings — written back to the brainstorm doc)
- **D1** The box holds **no production-DB credential**. Agent principal with scopes `read:facts`, `write:drafts`; routes only under `/api/agent/*`; never sets the user principal.
- **D2** Tiers by **egress boundary**: P0 never leaves the home network; P1 = the app's facts bundle (aggregates + ≤N categorical rows, k≥3, daily handles); P2 public, isolated calls. Config `cloud_rows = none|topN`.
- **D3** Deterministic + templated floor ships first. CPU-model = one measured evening (decision rule from Ox/GLM), default off, tmpfs cache + `MemoryMax`; delete if it loses.
- **D4** Egress = one typed function; schema-validated; canary-proven with the existing egress redactor; hash-chained audit log; CI fails on schema widening; providers without a zero-retention path are excluded from P1.
- **D5** Default-deny **egress firewall** on the box; LAN isolation from the workstation where feasible.
- **D6** Approval in-app only; chat notifications structured and link-free; drafts table schema-distinct from automations; shown==sent byte test.
- **D7** Backups: object-lock/immutability on the offsite bucket when leg 2 lands; restic excludes for agent state/credentials; decide whether `forget --prune` moves to the workstation (prune is not time-critical) or the box's inbound is hardened instead.
- **D8** Booking SaaS: verify a read-only calendar feed exists; its content is P0 on-box; named gap until then.
- **D9** Portability: repo = schemas, engines, unit templates, migrations, rubric, install script; box = secrets/salts/allowlists only; **acceptance = four-env-var weekend install on a clean VM.**
- **D10** Data at rest on the box: swap off or encrypted; no P0 in journald; model caches on tmpfs; agent state excluded from backups.

## 6. Calibration (for the learning corpus)
| Seat | Cost | Real findings | Disproven | Notes |
|---|---|---|---|---|
| Ox Alpha | $0 | egress firewall, DoS via unbounded SELECT, C5 as persuasion channel, k-gate, "delete the loser" | 0 | tagged UNKNOWNs honestly; best security engineer in the room |
| Grok 4.6 | $0.057 | remove C2, confidentiality≠integrity, automation aliasing, data-at-rest, split calls | 0 | strongest structural catch; worth the nickel |
| GLM 5.3 | plan | tier-by-boundary, shown≠sent, 4-env-var test, provider drop rule, hash-chain in brief | 0 | no roleplay this time; measure-before-believe discipline |
| Qwen 3.8 | $0 | confirmation only | 0 (1 impractical proposal) | mislabelled itself as Ox; keep as the free confirm seat, never lead |
| Fable | — | verified restic key on the box; views proposal | superseded by Grok's cut | orchestrator bias check: wrote seat before reading |
