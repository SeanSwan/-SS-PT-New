# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/PACKET-GLM53-hermes-corpus-2026-08-16.md
**Tokens:** 7279 in / 26555 out (reasoning: 22581) | total 33834
**Wall:** 530.8s

---

# Hostile review — Hermes corpus enforcement + migration

Bottom line up front: the migration script can corrupt committed packets in ways its own revalidation net cannot catch, the gate's enforcement is one forgotten argument away from silent no-op, and the read side inherits both problems. Ranked below. Reachability is labeled honestly — several of your priorities turn out to be parser-coupled, and I say so where it matters.

---

## CRITICAL

### C1. `yamlScalar` does not escape `#` — silent value truncation that **passes** revalidation
**File 2, `yamlScalar`:** the escape-trigger set is `^[\s>|&*!%@\`]`, `:`, and leading `["'\[{`. It omits `#`, leading `- `, and leading `? `.

- **Trigger (silent):** author wrote `topic: ship gates on Fridays #sean approved 2026-08-01`. `yamlScalar` returns it bare; `applyPlan` emits `decision: ship gates on Fridays #sean approved 2026-08-01`. Under any comment-aware YAML read, `decision` is now `ship gates on Fridays`. The author's words are amputated, the truncation is invisible to `validatePacket` (the key exists, the value is present), so `--apply` prints `-> valid` and exits 0. **The committed corpus is silently corrupted by the one tool whose stated job is not to corrupt it.** Your in-repo `parseFrontmatter` may be naive enough to keep the whole string — which means repo tools and every standard YAML consumer now disagree about what the packet says, forever, until someone "fixes" one side.
- **Trigger (leading `#`):** `topic: #gate-wedges` → `decision: #gate-wedges` → the value is a comment; `decision` is empty. This one is caught — *after* `writeFileSync` has already destroyed the file (see C3).
- **Trigger (leading `- `):** `topic: - always dry-run gates first` → `decision: - always dry-run gates first` is not a legal plain scalar start. Strict parser: syntax error, loud. Naive parser: passes validation → silent landmine identical to the `#` case.
- **Family:** bare `true`/`false`/`null`/`2026-08-14` values get typed as boolean/null/timestamp by real YAML. Low reachability, same root cause.

The same hole hits `status_detail` (yamlScalar'd) and the `migrated:` line — see M3.

### C2. `applyPlan` re-implements frontmatter slicing with different rules than the parser — block-scalar `---` destroys the file structure
**File 2, `applyPlan`: `const end = norm.indexOf('\n---', 3); let block = norm.slice(4, end);`**

This is a second, independent frontmatter parser built out of substring arithmetic. It finds the **first** `\n---`, assumes the opener is exactly `---` at offset 0 (BOM or `--- ` with a trailing space shifts `slice(4)`), and knows nothing about YAML block scalars.

- **Trigger:** a legacy packet with a multi-line value — entirely plausible in a corpus the packet itself describes as "eight frontmatter dialects," and exactly the kind of packet carrying `provenance:` detail:
  ```
  ---
  title: Rule 67 lane violations
  provenance: |
    Sean 2026-08-10, call notes:
    --- designation excerpt ---
    Opus 5 is Fable-tier.
  date: 2026-08-14
  ---
  ```
  `indexOf('\n---', 3)` lands **inside the block scalar**. `block` is cut at the scalar's second line; the injected `tier_basis`/`decision`/`status`/`migrated` keys become the scalar's body (or terminate it, depending on indentation); the real `date:` key ends up after a stray document separator; the actual closing `---` is now mid-document. The file is structurally mangled on disk. Revalidation fails loudly (so: not silent like C1), but the committed packet requires hand repair, and the author's `provenance` text has been reflowed into garbage.
- **Note on your specific question:** a *body* line starting with `---` cannot be hit by this code — the frontmatter closer always precedes the body. The reachable variant is frontmatter-internal delimiters (block scalars, quoted multi-line values). The general defect is that parse (`parseFrontmatter`) and serialize (`applyPlan`) are two implementations that can disagree; `end === -1` on a file where the parser accepted unterminated frontmatter would produce `slice(4, -1)` mangle — theoretical, parser-dependent, but the class is real.

### C3. Write-then-validate ordering — every failure above lands on disk *before* detection
**File 2, `main`:** `writeFileSync(path, applyPlan(src, plan), 'utf8');` then re-read + revalidate. The comment brags that re-reading from disk is "non-negotiable" — but the right order is `validatePacket(name, applyPlan(src, plan), schema)` **before** writing (the function already validates strings; they use it on `src` two lines earlier in `planMigration`). As written, C1's leading-`#` case and C2 both mutate a committed file and then report `STILL FAILING` with exit 1 as the only safety net. There is no CI asserted anywhere in this packet; exit 1 is a hope, not a mechanism. This is the amplifier that turns escape-hole bugs into corpus damage.

---

## HIGH

### H1. The Stop-hook enforcement is optional by signature, and FILE 1 cannot be certified fail-open as submitted
**File 1, `decide(hookInput, transcriptRaw, readFile = ..., validate)`:** `validate` is a bare 5th positional with no default, and `packetErrors` converts a non-function into `return null` — "validator unavailable -> never block" with **zero telemetry**. If the hook entry calls `decide(input, transcript)` (or someone reorders the args), the entire schema-enforcement feature this packet ships silently degrades to a no-op — which is verbatim the failure mode the packet says it exists to end ("a contract nothing enforces is a document, not a contract"). No assertion, no log, no arity check.

Worse: **FILE 1 is a fragment, not full source.** It starts mid-function and references `BLOCK_REASON`, `MISTAKES_BLOCK_REASON(bad)`, `EMISSION_PATH_RE`, `parseTranscript`, `analyzeTurn`, and `signals.memoPaths` — none defined or shown. Two consequences: (a) if those constants are genuinely absent, `decide` throws `ReferenceError` on the first block-worthy turn; (b) the stdin read, the transcript location, the exception handling, and the JSON emission — the parts that actually determine whether the hook wedges a session — are unreviewable. The one unguarded external-input parse on the shown path is `analyzeTurn(parseTranscript(transcriptRaw))` — no try/catch before it; whether a malformed transcript crashes into a benign exit-1 or something worse depends entirely on the unseen wrapper. **Severity: unverifiable as submitted — and for a Stop hook, unverifiable is a finding, not a pass.** What is shown contains no hang paths (all synchronous), for the record.

### H2. `decision <- topic` is semantic laundering, not derivation
**File 2, `planMigration`:** `if (v.topic) { add.decision = v.topic; sources.push('decision<-topic (re-keyed, not re-authored)') }`.

File 3's own docstring defines the fields: `title` is "the lesson as a claim," `decision` is "the rule it establishes." A `topic:` in the dead dialect is a **subject** — "CRLF handling in memos," "hermes gate wedges." Re-keying it into `decision` promotes a noun phrase into a rule. The receipt's claim "re-keyed, not re-authored" is true of the string and false of the meaning — which is precisely the misattribution your derive-never-invent rule forbids. Concrete consequence: `hermes-learning-surface --grep crlf` prints `rule: CRLF handling in memos` as its **strongest-tier signal** (claim matches outrank body mentions), every time, for every migrated packet. The honest value under the script's own ONE RULE was `unknown`. `decision <- title` is the same sin with extra duplication (grep output shows the claim twice).

### H3. The `privacy` value is an invented attestation the scan cannot support
**File 2:** `add.privacy = 'IDs/roles only; no PII, no secrets, no absolute paths'`, justified as "only written when the scan is clean." The scan is the schema's 8 regexes: Windows user paths, bearer/JWT, OpenAI/Stripe/webhook/Google keys, postgres URLs. It cannot detect an email address, a person's name, a phone number, an IP, an internal hostname (`C:\Work\...` also escapes the `(Users|home)` anchor). The written string asserts **"no PII"** — a positive compliance claim — on the strength of a key-shape detector. Compare `models_used`, which honestly gets `unknown # not recorded`. This is the clearest derive-vs-invent violation in the file: a fixed constant presented as if attested, stamped into a permanent corpus.

### H4. `--include-untracked` converts the fail-safe into the fail-deadly switch
**File 2, `untrackedPackets` + `main`:** on git failure the script refuses to write (good) but then prints *"re-run with --include-untracked only if you have your own backup."* Two defects: (a) the flag's semantics conflate "I acknowledge no rollback" with "disable the guard" — it skips the check **even when git is healthy**, so it survives in shell history and re-runs against genuinely in-flight untracked packets with no `git checkout --` recovery, in a repo the packet says runs multiple agents in one tree; (b) the null handling is only fail-safe in `--apply` mode — in **dry-run**, `untracked === null` makes every packet print `HELD BACK — untracked (another agent's in-flight work; no rollback path)`, which is a false statement about tracked state (the truth is "unknown"). The dry-run lies to the operator about the repository. Minor add-on: `basename(p.trim())` collides if a same-named untracked file sits in a subdirectory under CORPUS, spuriously holding back a top-level packet.

---

## MEDIUM

### M1. Status normalization can land `current` without review, and demotes the author's justification
**File 2:** `status: current (per Sean 2026-08-01)` → regex extracts `current` → rewritten as bare `status: current`, original demoted to `status_detail`. The inline qualification lived in the authoritative field; post-migration the packet presents as lifecycle-clean while `reviewed_by` doesn't exist — and the schema's own `warnings` block says `reviewed_by_present` is **warn, never gate**. Whether `lifecycle.requires_reviewed_by` is enforced is unknowable — the validator, the third unseen dependency in this packet. Conditional on that, this is either loud (fine) or a silent review-state promotion. The blanket `status = 'draft'` for statusless packets is defensible and disclosed; this one isn't.

### M2. The `migrated:` audit line is interpolated raw and is itself corruptible
**File 2, `applyPlan`:** `lines.push(\`migrated: ${MIGRATION_DATE} — ... (${plan.sources.join('; ')}) ...\`)` bypasses `yamlScalar`. `sources` contains author-controlled text: `status normalised "${v.status}" -> "${norm}"`. A status containing `: ` makes the line a YAML error (caught loudly, after the write); a status containing ` #` silently truncates the audit trail mid-line — and since `migrated` isn't a required key, **validation passes**. The audit trail is the stated mitigation for H2; it can be silently amputated by the same `#` hole as C1.

### M3. Surface presents superseded/archived/draft lessons as current rules
**File 3, `sessionStart`/`--list`:** no status filter, no status marker in output. `status: superseded` (a value the migration itself can produce) shows up under "things this project already learned the hard way — consult BEFORE asserting…" and in "most recent." A reader follows a withdrawn rule. For a tool whose entire thesis is read-side trust, this is the fastest way to get it switched off.

### M4. One bad file kills the entire read path — and C1/C2 manufacture bad files
**File 3, `loadCorpus`:** `readFileSync(join(dir, name), 'utf8')` with no per-file try/catch. Any EACCES/EMFILE/unreadable packet crashes `--session-start`, `--list`, and `--grep` with a stack trace. Compound interaction: migrate corrupts a packet (C1 leading-`#`, C2), operator misses exit 1, every subsequent session-start throws. That is exactly the "untrustworthy enough that people switch it off" failure mode.

### M5. The gate's packet check is gated on the *response citing a path*
**File 1, `decide`:** packet validation only runs under `signals.memoEmitted` ("final response cites an emitted artifact path"). Write a corpus packet, make <3 writes, touch no git, respond "done" — the malformed durable packet passes the gate untouched. Conditional on unseen `analyzeTurn` (if `memoEmitted` can also be set by the Write itself, this collapses) — but as the shown control flow reads, the write-side enforcement has a text-citation OR-condition hole. Likely reachable; labeled conditional.

---

## LOW / THEORETICAL (labeled as requested)

- **L1 (reachable, minor):** source-tag lie — `sources.push(/^#\s+/m.test(fm.body) ? 'title<-H1' : 'title<-filename')` uses a different regex than `deriveTitle`'s `/^#\s+(.+?)\s*$/m`. A body with an empty H1 (`#\n`) yields title-from-filename stamped `title<-H1`. The auditability claim fails on a whitespace edge.
- **L2 (reachable):** `MIGRATION_DATE = '2026-08-16'` is a constant — re-run `--apply` in September for a late-found legacy packet and the receipt falsifies the migration date. "True by construction" only on release day.
- **L3 (reachable, loud):** `block.replace(/^status:.*$/m, …)` misses `"status": open`, `  status: open`, `status : open` — while `sources` already claims `status normalised`. Receipt asserts a repair that didn't happen; revalidation catches it.
- **L4 (theoretical, parser-coupled):** BOM and `--- `-with-trailing-space openers shift `slice(4)`; behavior depends on whether `parseFrontmatter` accepted them.
- **L5 (cosmetic but real):** File 3 — `truncate` slices UTF-16 units, splitting surrogate pairs mid-emoji; `(b.date||'').localeCompare` misorders `2026-8-2` vs `2026-09-…`; `body: fm.body || src` re-injects frontmatter into searchable body when body is empty. `--grep the` dumps every packet — the unbounded mention list is the noise tax the docstring promises to avoid.
- **L6 (minor):** `CORPUS_PATH_RE = /hermes-learning-packets[\\/]/` is unanchored substring matching — `…/hermes-learning-packets/v2/legacy.md` gets validated against the corpus schema and can spuriously block.
- **L7 (minor):** gate heading regex `^\s*#{1,4}\s*Mistakes\b` accepts `#### Mistakes`, `# Mistakes`, and `## Mistakes were made by the linter` — divergent from the schema's literal `## Mistakes I made`; only the (optional, H1) validator reconciles them. Also can't see code fences: a fenced example containing the heading satisfies the gate. Fail-open direction, consistent with stated policy, but wider than the schema it claims to enforce alongside.
- **L8 (documentation integrity):** the packet's own numbers contradict each other — 27/38 failing (context) vs 28/42 (migrate docstring); 14 post-schema failures (context) vs 12 (gate comment); "16 tracked packets back-filled" (context) vs up to 28 migrating; 17-of-18 and "40+" (surface) vs 42. In a provenance-audit workstream, unverifiable corpus statistics are themselves a defect.
- **L9 (theoretical):** `execFileSync('git', …)` has no timeout and inherits no stdio config — a credential-prompting git could hang a human-run CLI; irrelevant to the hook.

---

## Systemic shot

The three files form a chain, and the chain fails at its weakest design decision: **File 2 rewrites committed content through a hand-rolled serializer whose escape set and delimiter logic don't match its own parser (C1/C2), validates only after damaging (C3), and File 3 has no tolerance for the resulting damaged files (M4).** Meanwhile File 1 — the only component whose failure mode is "wedge a session" — was submitted as a fragment with its enforcement parameter silently optional (H1). Fix order: pre-write validation of the output string in `main`; escape `#`, leading `- `/? `/` and force-quote in `yamlScalar` (or emit and re-parse with a real YAML library instead of a second parser); make `validate` a required, asserted argument or fail loudly at hook startup; filter and mark status in File 3.
