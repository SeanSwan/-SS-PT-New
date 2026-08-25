# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/panel-radar-privacy-2026-08-24/PACKET.md
**Tokens:** 2643 in / 8117 out (reasoning: 4562) | total 10760
**Wall:** 155.3s

---

# GLM — seat 3

## Attacks first

**§4 invariant: false as stated.** Three counterexamples.

1. *"Drafts go nowhere without the owner's tap"* is time-bombed. The packet itself says templated automations (reminders, nurture) **auto-send once armed** (§1, Decision 6). The moment the marketing engine arms, C4 stops being "drafts that go nowhere" and becomes a client-facing send path whose content originates on the box. One-tap approval is also weak as a control: the owner is being trained to tap. If drafts are rendered with template slots, a compromised box controls slot content — the tap approves *displayed* text, and display-side truncation/HTML can make shown ≠ sent [HYPOTHESIS — depends on app rendering; must be tested].
2. *"Cannot act as the owner anywhere"* ignores C5: the chat push channel is a trusted input for the owner. A compromised box can phish him ("login failed, tap here") — impersonation of the *system* toward the owner, which the invariant doesn't count.
3. The table omits real credentials: **C7** the backup sftp key (if read-capable: full *historical* PII including deleted clients [UNKNOWN — verify whether the restricted key permits read]); **C8** the app route "authenticated as a logged-in admin/trainer user" — that is not a read-only role, it's an admin *session*; blast radius is whatever that session can reach, not "SELECT" [UNKNOWN — the actual token form is unstated]; **C9** the browser cookie jar / outbound network surface; **C10** the box's LAN presence — a pivot toward the workstation, which holds an operator agent with owner-level app access. "No heartbeat catches" any of this.

**§5 proposal: right instinct, wrong boundary.** Tiers are defined by *processor* ("deterministic code on the box," "local model on the workstation") which (a) is unverifiable from outside the egress point and (b) makes §6-B option 2 (CPU model on the box) a *tier violation* as written. Redefine: **P0 = never egresses the home network**, regardless of what computes on it. Then tier enforcement collapses to one auditable choke point instead of a claim about where code ran. Second: "no free text at all" in P1 is the strongest line in the proposal and must survive contact with reality — enums, day-dates, and bucketed amounts are still free-text-shaped to a sloppy serializer. Third: **P1 k-anonymity fails at this population.** With ~dozens of clients, (pkg_type, status, spend_bucket, last_touch) tuples will be mostly unique — run the query below before believing any redaction claim [HYPOTHESIS: >50% unique; measure it]. The honest mitigation is not coarsening until nothing is left; it is per-call pseudonyms + zero provider retention so uniqueness is *linkable nowhere*.

Accepted after amendment: three tiers enforced at egress; deterministic floor; both-paths-adequate rubric. Now specs.

---

## §6-A Tiering — build spec

**Schema `p1_bundle_v1`** (JSON Schema 2020-12; `additionalProperties:false` at every object; every string matches `^[a-z_]{1,24}$`; no field of type free string exists):

```json
{ "schema":"p1_bundle_v1",
  "window":{"start":"2026-08-10","end":"2026-08-24"},
  "clients":[{ "pid":"c_9f3a2b",
    "status": "pkg_active|pkg_lapsed|member|lead_new|lead_stale|quiet14|quiet30",
    "sessions_14d": 0, "last_touch":"b0_3|b4_7|b8_14|b15_30|b31p",
    "pkg_type":"private|group|semi|none",
    "spend_bucket":"none|q1|q2|q3|q4",
    "flags":["card_decline","no_show","unsub"] }],
  "aggregate":{"quiet14_n":0,"leads_new_7d":0,"lapsed_pkg_n":0},
  "money_now":[{"pid":"l_4c11","kind":"lead_new|pay_fail|cancel_same","d":"2026-08-24"}] }
```

**Per-call pseudonymisation:** `pid = "c_" + base32(HMAC-SHA256(K_d, "client:"+real_id))[0:6]`, where `K_d = HKDF(K_master, "day:"+date)` rotates daily. Mapping `pid→real_id` lives only in a root-owned file (0400) on the box, wiped after brief render. Consequence: the provider cannot link the same client across days — longitudinal analysis is sacrificed deliberately; aggregate trends are computed on-box, where real IDs are available.

**Surviving re-identification risks:** (1) tuple uniqueness — measure, then suppress `pkg_type` and `spend_bucket` for any category with population < 5 (config `population_floor`); (2) cross-call linkage — killed by daily `K_d`; (3) small-population inference — "the one `private` client with `card_decline`" is identifiable to an insider; accepted residual, since the provider is the threat model, not staff.

**Acceptance tests:**
- `python3 tests/reid_uniqueness.py --hist 90d` prints % clients unique on the P1 tuple; gate: alert (not fail) if >70%, auto-suppress offending field per rule above.
- `tests/reid_attack.py` simulates an attacker knowing one client's pkg_type + approximate cadence over 30 days of bundles; **top-1 link accuracy must be ≤ 1/30 baseline + 5pp**, because pids change daily.
- Schema fuzz: 10k random malformed bundles → egress rejects 100%, writes quarantine JSONL.

## §6-B Always-on gap — ranking

**Rank: (1) deterministic+templated ≫ (3) desktop-awake enhancement > (2) CPU model on box (only after tier redefinition, as optional quality path) ≫ (4) P0→cloud — refused; that is a tier violation, not an option.** The pattern is already proven on this box (health timer, allowlisted browser with oom-kill-tested `MemoryMax`) [VERIFIED per §1].

**One-evening decision test (1) vs (2):** build 20 anonymised golden fact-bundles. Path 1: SQL + Jinja templates with slot variety (3 tone variants each). Path 2: `llama-server -m <3B Q4_K_M> -c 4096 --threads 6` on the box, `MemoryMax=4G`, prompt = facts → brief. Blind rubric 0–3 each on: counts correct, slot fills correct, zero hallucinated client attributes, ≤300 words, wall time <20 min. **Decision rule: (2) wins only if it equals (1) on correctness AND scores +2 or better on tone AND zero hallucinations across 20 runs.** Counts are SQL, so path 1 is correct by construction; my prediction: path 2 hallucinates in ≥1/20 [HYPOTHESIS], so (1) ships and (2) stays in the repo behind a flag. Also verify swap is off/encrypted before any model touches P0 on-box.

## §6-C Strip proxy — failure modes ranked by exploitability, then spec

1. **Free text smuggled as field values** (notes in a status field, escaped JSON in a count) — highest, because one missed serializer defeats everything.
2. **Prompt injection via scraped P2 pages** carrying page-embedded PII *and* instructions into brief context.
3. **URL query strings** from scraped links (emails, tokens, search terms).
4. **IDs that are identifiers** (email-as-username, booking ref containing a surname fragment).
5. **Regex sanitizer as the sole control** — bypassable via homoglyphs, zero-width chars, base64 blobs, token-splitting, model-output reassembly. Demote sanitizer to *detector*, never control.
6. **Provider-side logging/training/abuse review** — the quietest leak; no heartbeat sees it.

**Spec:**
- **Egress = one typed function.** `emit(provider, bundle: P1Bundle)` — the egress module's public API accepts *only* the validated struct; lint rule forbids `json.dumps`/`str()` of ORM rows inside `egress/` (`ruff` custom rule + `import-linter` contract). Schema validation re-runs at egress; any failure → quarantine file + fall back to deterministic brief (fail-closed to the floor, matching Decision 3).
- **P2 pages:** DOM → allowlisted selectors → {eTLD+1, title, wordcount} only. No raw text, no query strings, ever reaches a provider context.
- **Provider posture:** pin API base to a zero-retention endpoint where the vendor offers one and confirm current terms in writing [VERIFIED that at least one major provider exposes a no-training/ZDR option as of my knowledge; the *current* contractual text must be re-verified — treat as UNKNOWN until the doc is in the repo]. If a provider has no ZDR path, it is dropped from the adapter list, not excused.
- **Audit log:** append-only JSONL, root-owned 0600: `{ts, provider, schema_ver, sha256(payload), scan_result, quarantined}`; daily hash-chain head printed in the owner's brief so silent truncation is visible.
- **Canaries:** seed 50 realistic fake P0 strings ("CANARY-77f2, +1-555-0142") into fixture DB rows and scraped-page fixtures; nightly job asserts none appear in any outbound payload or rendered brief. Gate: 50/50 detection.
- **CI test:** `pytest tests/test_egress_fuzz.py -m ci` — fuzz every source table through the full pipeline (10k cases) and assert the egress payload contains no substring (exact *and* Unicode-normalised) of any raw free-text cell. **Any raw-text column reaching egress = red build.**

## §6-D Service account

**Recommendation: new role `svc_agent` with capability flags, plus a dedicated DB role that has grants *only on views*.** A scoped API key bolted onto an existing admin/trainer session (the status quo per §1) is the weakest option and is exactly what C8 should replace.

```sql
CREATE ROLE svc_agent_ro LOGIN PASSWORD :'pw';
CREATE VIEW v_p1_bundle AS SELECT ... ;  -- projection: no name/email/phone/notes columns
GRANT SELECT ON v_p1_bundle TO svc_agent_ro;   -- no table grants. none.
```

App side: key = 32 random bytes, argon2id hash stored server-side; middleware deny-by-default with scopes `read:p1_views`, `write:drafts`. Every guard moves from `role==admin` to capability checks — this is the migration the guards need anyway.

**Box side:** key via systemd `LoadCredential=`, unit with `DynamicUser=yes`, `ProtectSystem=strict`, `NoNewPrivileges=yes`, `MemoryMax=512M`, `IPAddressAllow=` app origin + provider origin only. Rotation: 90-day + incident-triggered, dual-key overlap.

**Acceptance test** (`tests/svc_agent_matrix.sh`, CI-blocking):
- As svc_agent: `SELECT * FROM clients` → denied; `SELECT * FROM v_p1_bundle` → rows; `INSERT INTO drafts` → ok; `UPDATE drafts` / `DELETE drafts` → denied; every non-allowlisted HTTP route → 403.
- As the box unit user: reading the credential file → EACCES; `curl` to a non-allowlisted origin → blocked.
- Draft renderer: displayed text is byte-identical to sent text after template fill (no post-approval mutation) — closes §4 attack 1's rendering gap.

## §6-E Credential invariant

**Not true as stated** (see attacks: armed auto-send converts C4; C5 phishes the owner; C7/C8/C9/C10 missing; C8 may currently be an admin session, not a read role [UNKNOWN — verify]). Also unstated: the **pid→client map, audit logs, and canary seeds on the box are themselves aggregated PII** — the invariant counts credentials, not data at rest on the box.

**Single highest-value change:** demote C2 from "SELECT on business tables" to **"SELECT on `v_p1_bundle` only"** (§6-D SQL). Zero new infrastructure, moves tiering into the hardest enforcement layer (the DB), and shrinks the worst blast radius — "read business data" — to "read already-redacted facts." Second-cheapest: a LAN firewall rule isolating the box from the workstation, closing C10.

## §6-F Booking SaaS read path

**Rank: (1) secret ICS feed > (2) official API with scoped read > (3) stored login session — keep (3) rejected permanently.** A session cookie is the owner's full account capability: theft = act-as-owner, directly violating the invariant; there is no scoped-down story for it.

**Verify about the SaaS before (1):** feed URL entropy ≥128 bits and revocable in-app; HTTPS-only; whether event titles embed client names (almost certainly yes → feed content is P0: box-local processing fine, cloud egress never); whether the feed URL itself leaks identity in path segments. Verify for (2): OAuth scopes are genuinely read-only and refresh tokens are revocable. All currently [UNKNOWN — no docs in packet; do not assume].

**Until resolved:** the parity collector returns an explicit `status="gap"` sentinel; the brief carries the literal line `BOOKING SAAS: INTEGRATION ABSENT — parity checks SKIPPED`. **Acceptance test:** `tests/test_no_fabricated_presence.py` asserts (a) zero synthesized booking facts in any brief, (b) the gap string appears whenever integration status is `gap`, (c) an empty-but-"successful" parity result fails the build. Absence must be *stated*, never shaped like calm.

## §6-G Portability

Mostly survives. Breaks and fixes: quantile buckets are meaningless at population < ~10 → `population_floor` config auto-suppresses fields; HMAC master key + pid map are per-install secrets (correct — secrets live on the box, never the repo); canary seeds per-install.

**Repo:** view DDL, `p1_bundle_v1` schema + validators, unit files, adapter code, golden-set generator, rubric, install script, threat-model doc, all test suites above. **Box-only:** keys, pid map, audit log, canary seeds, per-business allowlist.

**Weekend test (must pass for the portfolio claim to be honest):** from bare Debian VM: `./install.sh` with exactly four env vars (`APP_ORIGIN`, `DB_DSN_RO`, `CHAT_BOT_KEY`, `LLM_PROVIDER_KEY`) → first deterministic brief within 8 person-hours; the svc_agent matrix and egress fuzz run green on the VM. If it needs a fifth var or a manual SQL step, the claim is marketing, not a spec.

---

## §7

**Most silently dangerous:** the day the marketing engine is **armed**. It silently converts C4 from "drafts that go nowhere" into a client-facing send path — the invariant's central claim dies by scheduled future event, and no heartbeat, canary, or CI test notices a *policy* flip. Second, nearly as quiet: the pid→client map on the box becoming the aggregated-PII crown jewel the credential table never counted.

**Could not verify from this packet:** current provider zero-retention terms (contract text needed); whether the backup sftp key permits reads; whether the app token is a scoped key or a live admin session; booking-SaaS feed/API properties; DB engine and version (affects view/row-security features); CPU model quality on this 2017 hardware; whether the chat push channel is end-to-end encrypted or server-readable; the exact drafts rendering pipeline shown-versus-sent. Each is either a doc pull or a one-evening test — none is a reason to delay building the deterministic floor.
