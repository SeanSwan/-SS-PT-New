# VERIFICATION NOTES — Migrations Reconciliation package

**Read this first.** This file adjudicates the Astra review that produced this package. It is not a
summary of the review; it is a verdict on each finding, reached by opening the source.

**Package:** `BLUEPRINT-migrations-reconciliation-2026-09-20`
**Review:** `HOSTILE-REVIEW.md` (PART A of `ASTRA-REPLY.md`)
**Adjudicated:** 2026-09-20, against the working tree (branch `creator-brains-engine-r2-20260915`)

---

## 0. What this package is, and is not

**This package is ARCHITECTURE AND REMEDIATION PLANNING, not executable instructions.**

It is **not** ready to hand to a builder. `04-build-order.md` itself marks five of its own rows
`BLOCKED`/`UNKNOWN` because the full configuration, complete model definitions, complete migration
bodies and the startup caller closure were not supplied to the reviewer. That honesty is correct and
must not be papered over.

**Provenance of the review, recorded per protocol:**

| Field | Value |
|---|---|
| Transport | `codex-cli` (ChatGPT subscription) |
| Model **requested** | `gpt-6-astra` |
| Model **served** | **UNVERIFIED** — `servedModel: null`. `codex exec --json` emits no model field, so the requested model is provable and the served identity is not. |
| Reasoning effort | `xhigh` (per the blueprint mandate for architecture/review seats) |
| Effort corroboration | `reasoningOutputTokens: 9399` — non-zero on a real prompt, so the level was applied, not merely accepted |
| Tokens | in 54,417 · out 23,948 · reasoning 9,399 |
| Wall clock | 732.3 s |
| Billing | subscription, **$0 marginal** — no OpenRouter spend |
| Mega Blueprint | armed by `document` (proven by dry-run before dispatch) |

**Two defects in the packet itself, disclosed up front** — the review's input was imperfect, and the
reviewer was right to say so:

1. **The packet carries no SHA-256 of itself and no commit.** The reviewer flagged this. Correct: the
   packet was uncommitted work at dispatch time, so it could not carry a commit. It is disclosed
   here rather than retro-fitted.
2. **The packet's §4.4 search was narrower than its conclusion** (see A1-06 below). The conclusion
   survives a broader search, but the packet under-represented the evidence. Corrected in §3 of this
   file.

---

## 1. Adjudication — A1 findings

Verdicts: **CONFIRMED** · **REFUTED** · **UNDERSTATED / OVERSTATED** · **UNVERIFIABLE**.

| ID | Verdict | Adjudication and the evidence I read |
|---|---|---|
| **A1-01** | **CONFIRMED — and STRONGER than filed** | The finding is right, and there is a second defect the reviewer did not name: `/already exists/i` **subsumes the other five patterns**. Measured: over a corpus of six representative error strings, pattern 0 alone matches 5; patterns 1–5 each add **zero** additional matches. So `ALREADY_APPLIED_PATTERNS[1..5]` are unreachable — dead code. The reviewer's substantive point also holds: a multi-operation migration that trips on object 3 of 10 is recorded complete and never re-run. **Fix direction accepted**, but note the fix is *not* "tighten the regexes" — five of them can be deleted, and the classification itself is the defect. |
| **A1-02** | **CONFIRMED** | Two log statements are false under `STRICT=1` + `ALLOW_FAILURE=1`. (a) The `ALLOW_FAILURE` warning at `:64` promises "the run will exit 0", but `:353-361` exits 1 *before* the `ALLOW_FAILURE` branch at `:373` is reachable. (b) The final diagnostic at `:422` says "They were NOT marked as applied" — while `:374` marks them applied when `ALLOW_FAILURE=1`. A log that states the opposite of what the code did is exactly the class this repo's ledger exists to catch. |
| **A1-03** | **CONFIRMED (dev path); UNVERIFIED (production path)** | Demonstrable in dev: `main()` imports `database.mjs` (`:293`) while the delegated child is always spawned with `--config config/config.cjs --env <env>` (`:133-139`). Two configuration sources for one migration run. In production both nominally take `DATABASE_URL`, but the child's `config.cjs` resolution was not read, so whether they agree is **not established** — the reviewer's `[UNKNOWN]` is the correct label and I am not upgrading it. |
| **A1-04** | **CONFIRMED — highest-impact finding in the set** | `getExecutedMigrations()` (`:168-176`) catches **every** error and returns an empty `Set`. `pending` is then `executable.filter(f => !executed.has(f))` (`:313`) — so a permission failure, a dropped connection, or a malformed metadata table makes **all 312 migrations look pending**. Combined with A1-01's completion classification, this is the mechanism by which a bad run can both re-run history and mark the failures done. |
| **A1-05** | **CONFIRMED (both halves)** | (a) `runSingleMigration()` settles on `'exit'` only (`:153-155`); there is no `'error'` handler and no deadline, so a spawn failure (e.g. `npx` unresolvable) never settles the promise — the run hangs rather than failing. (b) **The guard's own comment overclaims.** `:439-442` asserts that `pathToFileURL` equality means "a differently cased or symlinked invocation path cannot silently disable migrations". `pathToFileURL` normalises to a file URL; it does **not** case-fold or resolve symlinks. The reviewer is right, and the comment is mine. The direction of the residual risk is the bad one: a false negative stops migrations running in production. |
| **A1-06** | **CONFIRMED as a PACKET DEFECT — my search was too narrow** | The packet's §4.4 ran `grep -rln 'createTable("Users"'`, which covers one quoting convention only. The reviewer correctly said that cannot exclude other forms. **Re-measured with a broader search:** no `createTable` in any quoting convention creates the quoted name; the only raw `CREATE TABLE` is `CREATE TABLE users_backup AS SELECT * FROM users` (lowercase, `20250528140000:60`). **So the packet's conclusion survives — but the packet was materially incomplete, and the omission matters more than the conclusion.** See §3: 36 migrations reference the quoted name, and the repo already documents this defect. |
| **A1-07** | **CONFIRMED — my packet's D4 premise was WRONG** | I wrote that renaming a recorded migration "changes nothing for production". It does. `pending = executable.filter(f => !executed.has(f))` keys history on the **filename**, so a renamed file is a new metadata key and becomes pending — it would re-run in production. The reviewer is right and my premise was backwards. **The corrected rule: preserve historical filenames and bytes; never rename a recorded repair as an ordering fix.** |
| **A1-08** | **CONFIRMED — verified by parsing the register** | The guard test's comment claims "22 of the 23 alter `\"Users\"`, and the 23rd alters `\"SocialLikes\"`". Parsed the `KNOWN_UNGUARDED` array: total **23**, distributed **Users 19 · Gamifications 2 · SocialLikes 1 · messages 1**. The comment is false on both counts (19 ≠ 22; and there are three non-`Users` tables, not one). The reviewer's numbers are exact. |
| **A1-09** | **SPLIT — (a) CONFIRMED, (b) CONFIRMED as a packet defect, count itself correct** | (a) My §5.3 called the family a "self-contradiction". The reviewer's reading is more careful and better: one file *conditionally* handles UUID, another describes an integer-parent/UUID-child mismatch. Those can be successive states, not a contradiction. **"Overlapping, unverified transformations" is the honest phrasing; I over-claimed.** (b) The reviewer noted the naming command "anchors its regex against a path-prefixed `ls` result". Correct **as a criticism of the packet**: the command shown in §5.4 would not reproduce the number shown. **Re-measured robustly** (cwd-relative): **18** un-dated `.cjs`, of which **3** begin with a non-digit. The *count* stands; the *shown command* was defective. |
| **A1-10** | **CONFIRMED** | Verified: `render-start.mjs:95-100` catches a migration failure and boots anyway; `backend/core/startup.mjs:207-214` → `syncDatabaseSafely()` → `productionDatabaseSync.mjs:41-53` can create tables from models. So the migration runner is not a release gate, and the model layer retains production DDL authority. This is the central unresolved decision (D2), and the reviewer is right that the successor corrects the *attribution* of H-07 without resolving the *authority*. |
| **A1-11** | **CONFIRMED — three extension sets genuinely differ** | Measured in one file: the comment at `:195` quotes the CLI resolver as `\.(cjs\|js\|cts\|ts)$`; discovery collects `cjs\|js\|mjs\|sql` (`:228`); classification is `cjs\|js` (`:211`). So `.cts`/`.ts` are CLI-resolvable but neither discovered nor executable-classified, while `.mjs`/`.sql` are discovered but not CLI-loadable. "H-04 FIXED" does overstate the scope. |
| **A1-12** | **CONFIRMED as a packet gap — and now remediated** | The packet asserted 9/9 without pasting the receipt. The reviewer was entitled to call that unestablished *from the packet*. **I have since re-run it and paste the receipt:** `vitest run tests/unit/safeMigrateControlFlow.test.mjs` → `Test Files 1 passed (1) · Tests 9 passed (9)`, 8.33 s, including the two mutation self-checks (`reintroducing the H-03 defect makes the zero-writes assertion fail`; `removing the M-01 break reproduces the production symptom`). The reviewer's larger point stands regardless: these tests establish source-shape and intercepted-control-flow coverage only. **They do not establish PostgreSQL convergence, real CLI discovery, physical FK compatibility, or production state.** |

### 1.1 The reviewer's preamble claims

- *"the supplied text does not include its commit or SHA-256 receipt"* — **CONFIRMED.** Disclosed in §0.
- *"Evidence below is limited to the supplied packet"* — accurate and appropriately scoped. The
  reviewer did not claim repo access, and it did not invent `file:line` for files it had not seen.
  **No finding was filed that required a file outside the packet**, which is the correct behaviour
  under the read-only sandbox.

---

## 2. Adjudication — A2 self-review corrections

The mandate requires that A2's findings visibly change the emitted package; a self-review that
changes nothing is evidence the pass did not run. Each was checked **in substance, not by keyword** —
a lesson from this very adjudication (see §5).

| ID | Landed in PART B? | Where |
|---|---|---|
| A2-01 — fresh databases must not replay the legacy chain | **YES** | `04-build-order.md:24` (`migrations-v2/…-schema-authority-baseline.cjs`), `:53` (`--migrations-path <selected epoch directory>`), `:79` ("Explicit v2 epoch selection"); "epoch" threads through `01-architecture.md:52,66,105` and `03-contracts.md:286` |
| A2-02 — adoption must not fabricate historical success | **YES** | `04-build-order.md:24` ("Fresh creation or exact adoption") + the adoption contract in `03-contracts.md` |
| A2-03 — ERD must label its evidence | **YES** | `01-architecture.md:135` `erDiagram`; `04-build-order.md:62` marks full model definitions `[UNKNOWN]` |
| A2-04 — a parent lock is not transactional for child DDL | **YES** | `04-build-order.md:12` ("own pinned lock connection"); `09-tests.md:84` (`concurrent-runners-permit-one-mutator`) |
| A2-05 — DDL and expectations must not share a source | **YES** | `09-tests.md:111-115` — a "Required mutations" section with a per-mutation failing case |
| A2-06 — no partial cutover | **YES** | `04-build-order.md:72-82` "Release coupling" enumerates all five joint requirements |

**Verdict: the A2 pass ran and materially shaped PART B.** It is not decorative.

---

## 3. Corrections to MY OWN packet — made here, not silently

These are defects in `CONSULT-PACKET.md`. The packet is **left byte-identical as sent** (its content
is the provenance of what the reviewer reasoned from); the corrections live here.

**C1 — The `"Users"` vs `users` defect was already known and documented in the repository.**
My packet presented it as a fresh discovery. It is not.

- `backend/migrations/20260220100000-fix-sessions-fk-to-correct-users-table.cjs` (86 lines) opens
  with: *"All prior migrations created FK constraints with `model: 'users'` (lowercase) … But the
  production User model uses `tableName: '"Users"'` (uppercase). In PostgreSQL, quoted identifiers
  are case-sensitive, so `"users"` ≠ `"Users"`. This causes FK violations for any user that exists
  only in `"Users"` but not `"users"`."* — **dated 2026-02-20.**
- `backend/migrations/20260301000002-fix-messaging-fk-users-table-name.cjs` says the same for
  messaging tables.
- **`backend/migrations/helpers/resolveUsersTable.cjs`** is a shared helper that **probes `"Users"`
  first and falls back to `"users"`**, documented as *"Production uses `"Users"` (capital U, quoted
  identifier)"*, and **used by 10 migrations**.
- **36** top-level migrations reference the quoted name.

**What this changes:** the *naming intent* is already declared in-repo (`"Users"` is production;
`users` is legacy). The open question is not "which name wins" but **convergence** — no migration
creates `"Users"`, so `sequelize.sync()` does, and the repo's own workaround was to resolve the
ambiguity **at migration runtime** rather than settle it. That runtime resolution is itself the
honest admission that the schema state is not determinable from the repository.

**C2 — My D4 premise was inverted** (see A1-07). Renaming a recorded migration makes it pending.
The corrected rule is in §1.

**C3 — "self-contradiction" was too strong** (see A1-09a). Use "overlapping, unverified
transformations".

**C4 — the §5.4 command shown would not reproduce the number shown** (see A1-09b). The count (18, of
which 3 sort last) is re-verified.

**C5 — the packet asserted 9/9 without the receipt** (see A1-12). Receipt now pasted.

---

## 4. What the review did NOT establish

Do not read this package as evidence of any of the following. None was measured:

- **Production's actual schema.** Whether production has `"Users"`, `users`, or both; and whether
  `users.id` is `uuid` or `integer`. This is `[UNKNOWN]` and requires an authorised read-only
  catalog observation. **Every downstream decision is conditional on it.**
- **Whether the five UUID↔INTEGER repair migrations ran in production.** Their `SequelizeMeta` state
  was not supplied and cannot be read from the tree.
- **Whether the delegated child and the parent ever connected to the same database** (A1-03).
- **PostgreSQL convergence of any kind.** The existing tests are source-shape and
  intercepted-control-flow only.
- **The served model identity** (`servedModel: null`).

---

## 5. A note on method, because it changed two verdicts

Two of the findings above were initially mis-graded by my own checks, in opposite directions:

- **A2-06 looked absent** because I grepped for the phrase "no partial cutover". The substance was
  present as an enumerated list in `04-build-order.md:72-82`. *A check that greps for a string
  misses the same requirement expressed differently.*
- **A1-09(b) looked like a false accusation** until I re-read the command *as rendered in the
  packet* rather than as I had run it. The reviewer was judging the text it was given, and the text
  was misleading. *The reviewer was right about the packet and I was right about the count; both
  facts had to be recorded.*

Both are the same failure mode: adjudicating against my memory of what I did, instead of against the
artifact the reviewer actually saw.

---

## 6. Package defects carried forward (do not silently drop)

- **`03-contracts.md` is 312 lines**, over the Forge's ~300-line budget. The splitter warned on
  stderr: *"WARN: 03-contracts.md is 312 lines, over the ~300-line budget — builder should split
  it"*. Carried here rather than dropped. A builder should split it at the schema-contract boundary.
- **Five rows in `04-build-order.md` are self-marked BLOCKED/UNKNOWN.** They are honest gates, not
  gaps to fill with judgement. The evidence supplement they name must be supplied before slice S1.
- **The package contains an `08-decision-density-self-test.md` that the prompt never requests.**
  This is by design: the splitter emits PART C under that name. Do not "fix" it by adding `08` to the
  required-doc list.
