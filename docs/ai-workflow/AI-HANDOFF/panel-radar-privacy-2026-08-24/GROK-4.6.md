# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Served:** `x-ai/grok-4.6`
**Document:** docs/ai-workflow/AI-HANDOFF/panel-radar-privacy-2026-08-24/PACKET.md
**Seed:** (none)
**Tokens:** 2896 in / 8560 out · **Cost:** ~$0.0570 · **Wall:** 163.4s · **finish:** stop

---

**Grok 4.6** — hostile review. Roles only. Claims tagged. I could not inspect running units, DB catalogs, SaaS docs, restic include-files, or provider contracts; those are called out as `[UNKNOWN]`.

---

## Attack on §4 invariant (do not accept as written)

The invariant is **false** as a security claim and **misleading** as a privacy claim.

**What “at most read business data” hides.** C2 is the production store of a training/membership business. Full box compromise ⇒ bulk export of names, contacts, notes, payments, schedules. That is the breach. Framing it as a cap (“cannot message a client…”) is an *integrity* bound, not a *confidentiality* bound. Owner words in §3 are about confidentiality.

**Missing credentials / stores (table is incomplete):**
- **C0 restic sftp-only key + local snapshot cache.** Already on the box (§1). Compromise ⇒ pull/push backup channel, or read snapshots if they contain collector JSON. `[VERIFIED]` that the hub exists; `[UNKNOWN]` include-paths.
- **C7 headless-browser state** (allowlist file, cookies/profile, job cwd). Full compromise rewrites the allowlist; “read-only lane” is a unit file, not a TPM. `[HYPOTHESIS]`
- **C8 news-product DB** (empty now, same host). Future PII magnet. `[VERIFIED]` empty today; `[UNKNOWN]` future schema.
- **C9 systemd credentials / logs / journal / swap** for timers, LLM prompts, brief JSON. P0 lives here even if egress is clean.
- **C1 is not “spend only.”** Any P0/P1 that reaches the adapter is a **provider exfil** path. Coding-plan keys often have **no contractual zero-retention**. `[UNKNOWN]` for this plan.
- **C4+C5 compose to owner-as-confused-deputy.** Attacker INSERTs plausible drafts, then C5-pushes “approve the 17:00 failed-payment texts.” Invariant’s “go nowhere without the tap” assumes an attentive owner, not a phished one. `[HYPOTHESIS]`
- **Armed templated automations** (§2.6) sit *next to* the drafts queue. If queue rows are indistinguishable from auto-send templates, C4 becomes send. `[UNKNOWN]` schema.
- **C2 SELECT “business tables”** — if that includes sessions, hashed passwords, other integration tokens, blast radius is not “business data.” `[UNKNOWN]` grants.
- **C3 “own channel stats”** often includes revenue and geo. Not automatically P2. `[HYPOTHESIS]`
- **C6** undefined; any stored booking login would let the box **act as the owner** at the studio SaaS, directly falsifying the last sentence of the invariant.

**Single cheapest blast-radius cut:** **remove C2 from the box.** Production app exposes a facts/drafts API that emits only P1 aggregates + already-slot-filled templates. Box holds C4 (INSERT drafts) + C5 + C1, never a DB role. Lowest cost: one migration + one service role; kills bulk SELECT.

Invariant, rewritten if we keep C2: *compromise reads whatever the replica can SELECT (assume all business PII), spends to cap, exfils via LLM, spams owner chat, plants drafts, and likely reads backups.* It still should not send, book, or pay **if** app guards hold **and** automations cannot be confused with drafts. That last conjunction is unproven.

---

## Attack on §5 proposal (do not accept as written)

**Egress-only tiering is the wrong enforcement point.** Collectors, SQL, restic, journald, core dumps, and the brief renderer all see P0 *before* egress. A compromised box never needs the egress function. Tiering must be **process isolation + data-at-rest policy**, not a function color.

**P1 as “opaque IDs + day + type + amount bucket” is not anonymised** for N≈dozens. Quasi-identifiers re-identify. Stable IDs across calls enable linkage. `[VERIFIED]` k-anonymity fails in small populations when attributes are sparse (session type × day × bucket). Per-entity P1 to a cloud model **violates** “I don’t want my entire schedule going straight to a cloud model” in spirit even if names are stripped.

**“Both paths adequate for the same job” conflicts with P0 never leaving the house.** If the job is “which quiet clients, what to say,” the cloud path cannot be adequate without per-entity P0/P1. If the job is “counts and public stats,” local and cloud can match. Split the job; do not gold-set a contradiction.

**Golden set of anonymised bundles** cannot score P0 quality. Blind rubric on P1 bundles only tests the P1 job. `[VERIFIED]` methodological error.

**CPU-only overnight model** on 2017 6-core / 16 GB / no GPU, sharing a box that already OOM-kills a browser at 64M, is correctly `[HYPOTHESIS]`. It also writes P0 into model caches. Reject as a dependency.

**Workstation-awake “enhancement”** will train the owner to leave the desktop on. Privacy architecture that relies on sleep will be bypassed operationally. `[HYPOTHESIS]`

**Reusing chat-path regex middleware** for brief egress is the wrong tool (see C). Chat sanitizer ≠ allowlisted schema.

**P2 scrape → brief** is a prompt-injection conveyor into the same boss call that sees P1. Contamination is the default unless the boss call is split.

I accept only: deterministic P0 on-box; cloud sees **aggregates + public**; local model optional enhancement; same **output contract** for the P1/P2 sections, not for P0 entity actions.

---

## 6. BUILD SPECS

### A. Tiering — split is directionally right, P1 definition is wrong

**Keep three tiers, change P1 to aggregates-only for any off-box model.** Per-entity rows never leave the house. Re-attach names only in the local renderer (box deterministic templates, or workstation when awake).

**Re-id risks that survive proposed P1** (all `[VERIFIED]` as mechanisms; rates `[UNKNOWN]` without the DB):
1. Uniqueness: `(session_type, day, amount_bucket)` on a small book.
2. Stable `anon_id` across briefs.
3. Sequence: “quiet 14d + lapsed package + failed payment” is a fingerprint.
4. Small-N presence: publishing count=1 of a rare class.
5. External join: public video/community posts × day-level schedule.

**Rule:** cloud P1 may contain **counts, rates, histograms, day-level totals**. No per-entity IDs. If an equivalence class has count < 3, **suppress** (output `"suppressed": true`), do not bucket-down into a singleton.

**P1 egress schema** (`additionalProperties: false`; no free-text strings except enum and `bundle_id`):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "required": ["bundle_id","generated_at","window","aggregates","public"],
  "properties": {
    "bundle_id": {"type": "string", "pattern": "^b_[0-9a-f]{16}$"},
    "generated_at": {"type": "string", "format": "date-time"},
    "window": {
      "type": "object", "additionalProperties": false,
      "required": ["start","end"],
      "properties": {
        "start": {"type": "string", "format": "date"},
        "end": {"type": "string", "format": "date"}
      }
    },
    "aggregates": {
      "type": "array",
      "items": {
        "type": "object", "additionalProperties": false,
        "required": ["kind","count"],
        "properties": {
          "kind": {"enum": ["quiet_client","lapsed_package","new_lead","failed_payment","same_day_cancel","membership_step","open_slot_count","trainer_recruit_signal"]},
          "count": {"type": "integer", "minimum": 0},
          "suppressed": {"type": "boolean"},
          "days_quiet_min": {"type": "integer", "minimum": 0, "maximum": 365},
          "session_type": {"enum": ["pt","group","class","consult","other"]},
          "status": {"enum": ["active","quiet","lapsed","lead","cancelled","failed","pending"]},
          "amount_bucket": {"enum": ["0","1-50","51-150","151-400","401+"]},
          "day": {"type": "string", "format": "date"}
        }
      }
    },
    "public": {
      "type": "array",
      "items": {
        "type": "object", "additionalProperties": false,
        "required": ["kind"],
        "properties": {
          "kind": {"enum": ["video_stat","public_page"]},
          "metric": {"enum": ["views","ctr","subs_delta","watch_pct"]},
          "metric_value": {"type": "number"},
          "day": {"type": "string", "format": "date"}
        }
      }
    }
  }
}
```

**On-box P0 working set** (never passed to adapter): `client_pk, display_name, channel, slot_iso, template_id, template_slots[]`. Renderer fills drafts locally.

**Per-call pseudonymisation** (only for *local* join files, not for cloud):
- `salt = CSPRNG(16)` per brief; stored `0600` on box; deleted after render.
- `anon = "p_" + HMAC-SHA256(salt, table || "|" || pk)[0:12]`
- **Never reuse salt across briefs.** No stable ID to cloud because no per-entity rows to cloud.

**Acceptance tests**
- `pytest tests/p1_schema.py`: 50 mutated bundles with extra keys / free-text / email / phone / ISO datetime-with-time / sequential ids → **schema reject**.
- `tests/k_anon.py`: fixture of 40 clients; any aggregate with class size 1–2 must set `suppressed` and drop dimensions until k≥3 or count-only.
- `tests/no_stable_id.py`: two consecutive briefs, grep egress for any `p_[0-9a-f]{12}` → **zero matches**.
- Owner rubric on **P1/P2 sections only**; P0 money-now list scored separately against SQL gold.

---

### B. Always-on gap — rank and evening test

**Rank (forced):**
1. **Deterministic + templated P0** — only always-on path that matches §2.1–2.3 and §3.
2. **Accept desktop-awake latency for P0 prose enhancement** — optional, never blocking; brief must already be sendable.
3. **CPU-only small model on the box** — research spike only; default **off**.
4. **P0 → cloud via proxy** — **forbidden**. Not a fallback.

Do not implement (4). (3) is not how you close the gap.

**One-evening acceptance test (decides (1) vs (3), ~3–4h):**

```
# 1) Export 30d labels on-box (never off-box)
sudo -u agent psql -c "\copy (SELECT ...) TO /var/lib/agent/gold30.csv"
# Owner marks 20 cases: draft / no-draft / which template. 20 minutes.

# 2) SQL+templates only
python -m engines.p0_rules --gold /var/lib/agent/gold30.csv --out /tmp/sql.json
python -m eval.score --rubric eval/p0.yaml --pred /tmp/sql.json
# PASS (1) if recall>=0.80, precision>=0.85, 0 P0 fields in any cloud fixture.

# 3) Only if FAIL: 3h spike
# llama.cpp tiny instruct, MemoryMax=512M, Threads=4, no network
systemd-run -p MemoryMax=512M -p MemorySwapMax=0 --wait -- \
  python -m engines.p0_cpu --gold /var/lib/agent/gold30.csv --out /tmp/cpu.json
# Adopt (3) only if +10 recall AND no extra false drafts AND RSS<512M AND
# no model cache files outside a tmpfs unit. Else KILL (3).
```

If (1) passes, **do not ship a box model**. Floor brief = SQL + templates; local GPU model may rewrite tone when workstation is awake, same draft queue.

---

### C. Strip proxy — treat regex as hostile

Chat middleware is **not** the brief proxy. Ranked exploitability (high→low):

1. **Free-text columns** (notes, body, URL, ICS SUMMARY, scraped title) in the bundle — trivial PII + injection. `[VERIFIED]`
2. **Prompt injection from P2 scrape** into the one boss call that also has P1 — model asked to “summarise this page” echoes hidden PII or tool-calls. `[VERIFIED]` pattern
3. **Quasi-identifiers / sequential IDs / emails-as-pk** — re-id, not a regex problem. `[VERIFIED]`
4. **Provider logging/training** on coding-plan endpoints. `[UNKNOWN]` contract
5. **Unicode/homoglyph/zero-width/base64** vs blocklist. `[VERIFIED]` bypass class
6. **URL query strings, filename paths, webhook payloads** in “public” pages.
7. **Canary-blind log redaction** (PII in `journalctl` of the proxy itself).

**Build (replace sanitizer):**
- Single function `egress_to_provider(bundle) -> bytes`. Only call site for C1.
- Validate against schema above; **dump+abort** on extra properties.
- Split boss calls: `brief_p1p2(cloud|local)` vs `drafts_p0(local|sql)`. No shared prompt.
- Provider: zero-retention / no-train flags **if the API has them**; else coding-plan still only gets P1 aggregates. `[UNKNOWN]` whether flags exist — code must fail closed to “deterministic floor,” not to “send anyway with hope.”
- Egress audit: append-only `0600` JSONL `{ts, bundle_id, sha256, provider, bytes}` — **hashes not bodies**.
- Canaries: `CANARY-PII-7f3a`, `555-0100`, `ssn:000-00-0000` injected into collector fixtures and into a decoy notes row.

**CI that must FAIL the build:**

```
python -m tools.egress_gate \
  --schema schemas/p1.bundle.json \
  --forbid-types string-except-enum-and-ids \
  --pii-regex tests/pii.patterns \
  --fixtures tests/fixtures/collectors/*.json \
  --wire tests/fixtures/expected_wire/*.json
# extra: mitm assertion
grep -E 'CANARY-PII|@|555-0100' tests/captures/provider.post && exit 1
```

Any raw-text column in a collector dataclass without `tier: P0_LOCAL` → import-time fail (`dataclasses` + custom metaclass or pydantic `Field(json_schema_extra={"tier":...})` scanned by CI).

---

### D. Service account

App roles are `user|client|trainer|admin` — **do not reuse admin/trainer**. Add role `agent_drafts` **or** a non-user key with identical grants. Owner asked for “its own account”; §2.6 already requires a dedicated service account.

**Grants (Postgres example):**

```sql
CREATE ROLE agent_drafts NOINHERIT LOGIN;
GRANT INSERT, SELECT ON drafts_queue TO agent_drafts;
-- SELECT only on views that are already P1 aggregates, if C2 remains
GRANT SELECT ON v_agent_aggregates TO agent_drafts;
REVOKE ALL ON clients, payments, messages, notes, users FROM agent_drafts;
-- deny writes everywhere else via REVOKE + FORCE ROW LEVEL SECURITY
```

Prefer **no C2**: only `INSERT drafts_queue` + `SELECT drafts_queue WHERE created_by = self`. Aggregates computed **in the app** behind the existing admin path, returned as P1 JSON.

**Token on box:**
- `systemd` `LoadCredential=drafts_token:/etc/agent/drafts_token` (root `0400`, not in repo, not in restic if possible — restic exclude).
- Unit `User=agent`, `ReadOnlyPaths=/`, `ReadWritePaths=/var/lib/agent/out`, `MemoryMax=256M`, `NoNewPrivileges=yes`.
- Rotation: 90d; app endpoint `POST /service-tokens/rotate` owner-tapped; old token 1h overlap.

**App guard change:** every mutating route checks role ∈ {user,client,trainer,admin} **except** `POST /drafts` which allows `agent_drafts` with schema `{template_id, slots, anon_ref}` and **server-side** re-bind of `anon_ref` → pk (box should not send pk if we kill C2). Existing AI-chat admin token on the **workstation** stays off the box.

**Proof test (CI against staging):**

```
TOKEN=agent_drafts
curl -f -H "Authorization: Bearer $TOKEN" -d @ok.json /api/drafts   # 201
curl    -H "Authorization: Bearer $TOKEN" /api/clients              # 403
curl    -H "Authorization: Bearer $TOKEN" -X POST /api/clients      # 403
curl    -H "Authorization: Bearer $TOKEN" -X POST /api/messages     # 403
curl    -H "Authorization: Bearer $TOKEN" -X DELETE /api/drafts/1   # 403
psql -U agent_drafts -c "SELECT * FROM clients"                     # ERROR
psql -U agent_drafts -c "UPDATE drafts_queue SET body='x'"          # ERROR
```

A second test: token stolen from the unit still cannot SELECT `pg_catalog` extras / other DBs (news). `[UNKNOWN]` current `pg_hba` until tested.

---

### E. Credential invariant

**Not true** (see attack). Missing: restic key, browser profile, news DB, logs/swap, LLM exfil, C4+C5 confused-deputy, automation-queue aliasing, C3 non-public metrics.

**Single change, lowest cost, biggest cut:** **no production-DB role on the box**; app-side P1 view + drafts INSERT only. Second: **restic exclude** `/var/lib/agent`, `/etc/agent`, journal for `agent.service`. Third: C5 bot **cannot** attach buttons that one-tap approve; approval only in the app UI.

---

### F. Booking-SaaS read path

**Rank:**
1. **Secret ICS/feed URL** — only if `[VERIFY]` (a) token in URL is revocable, (b) feed has **times/locations without client names/emails**, (c) HTTPS, (d) not listed in a public page. If names present, treat as **P0** and **do not** send to any model; deterministic busy/free only.
2. **Official read-only API** after developer approval — scoped token in `LoadCredential`, same as C3 pattern.
3. **Stored login in box browser — rejected** (§2.1). Do not “temporarily” do it.

**Must verify first (manual, one sitting):** export a sample ICS/API payload; `grep -iE` name/email/phone; document fields. `[UNKNOWN]` until that file exists.

**While unresolved, box MUST emit a named gap, never parity fiction:**

```json
{"booking_saas":{"status":"unavailable","reason":"no_read_path","do_not_invent":true}}
```

Brief renderer: section title “Studio booking: no feed; slots not checked.” Acceptance: tests with empty source fail if output contains invented ISO times. No “parity” comments executed.

---

### G. Portability (weekend install)

**Does not break** if secrets and tenant allowlists stay off-repo.

| In repo | On box only |
|---|---|
| P0/P1 schemas, egress_gate, systemd unit **templates**, engines as modules, SQL migration `drafts_queue` + `agent_drafts`, CI fixtures, rubric | tokens, HMAC salts, restic key, allowlist URLs, provider keys, gold CSV |
| `config.example.toml` (engines on/off) | `config.toml` |

Swappable engines: `cash.py`, `membership.py`, `video.py`, `recruit.py` behind one `Engine` protocol. Another business: copy repo, fill env, run migration, drop two allowlist URLs, arm nothing until DNS/auth exists. **Breaks portability:** baking this tenant’s P1 enums to one gym’s session types without a config enum; putting C2 SQL table names in collectors instead of app views.

Acceptance: `make demo-tenant` brings up compose with fake P1 fixtures and a drafts queue; no real keys; CI green.

---

## 7. Brief

**Most silently dangerous item (no heartbeat catches):** **P0 sitting in restic snapshots / journals / collector JSON on a box that already has an offsite key**, *or* a **schema drift** that adds one free-text field to “P1” while tests still pass on happy fixtures. Heartbeats catch silence and OOM, not quiet exfil. Close second: **C4+C5 social-engineering the one-tap**.

**Could not verify:** DB catalog and RLS; restic include/exclude; whether coding-plan offers zero-retention; chat-bot token scopes; drafts vs auto-send table identity; booking SaaS ICS fields; headroom under existing MemoryMax; news DB future; whether production API already has a non-admin path; live middleware bypass corpus beyond “hostile card-number tests”; actual client cardinality (packet says ~dozens — `[HYPOTHESIS]` if used for k-anon).
