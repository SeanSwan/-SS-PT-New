# Egress redactor — hostile review packet (2026-08-23)

**Under review:** `scripts/lib/redact-egress.mjs`, its test, and the wiring of 15 consult
scripts to it. **Assume it is wrong until you can prove otherwise.**

> **Note on what you are reading:** this packet is itself sent through the redactor under
> review, so the code samples below are partially self-redacted in transit. Where you see
> `<PATH>` or `<REDACTED-KEY>` *inside a code block*, the original source contained a literal
> home path or the canary string `sk-` + 20 chars. That is the mechanism demonstrating itself
> on its own source, not a transcription error. Judge the logic, not the placeholders — and if
> you think the self-redaction hides something material, say so, because that is a finding.

---

## 1. Why this was built

A review packet sent to six external model vendors carried the operator's Windows username
inside filesystem paths. Scope once measured: **61 documents in `docs/ai-workflow/AI-HANDOFF/`
still contain it**, and that count *grew from 59 during the session that measured it* — new
documents keep being written.

The recorded cause was "a secret scan returned a false negative and was believed." Reading the
code showed something worse: **a sanitizer already existed and already ran on that path.**

```js
// scripts/consult-kimi.mjs — the sanitizer that was running WHILE the leak happened
function sanitizeOutboundText(value) {
  return String(value ?? '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<REDACTED_EMAIL>')
    .replace(/\+?1?[\s.(-]*\d{3}[\s.)-]*\d{3}[\s.-]*\d{4}/g, '<REDACTED_PHONE>')
    .replace(/sk-or-[A-Za-z0-9_-]{8,}/g, '<REDACTED_KEY>')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer <REDACTED_KEY>')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '<REDACTED_JWT>');
}
```

It covered emails, phones, `sk-or-` keys, bearer tokens, JWTs. It had **no operator-identity
pattern and no absolute-path pattern at all.** It did not fail, get skipped, or misconfigure —
it executed correctly and had nothing to say about the class that leaked. Three separate scripts
each carried their own drifting copy.

**The claim this work makes:** coverage is not existence, and a control that returns "clean"
without proving it can find anything is not a control.

---

## 2. The artifact under review

`scripts/lib/redact-egress.mjs` — **145 lines.** Full source:

```js
import { readFileSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { basename } from 'node:path';

/** Secret-shaped values. Redacted wherever they appear, key name irrelevant. */
const SECRET_SHAPES = [
  [/sk-[A-Za-z0-9_-]{12,}/g, '<REDACTED-KEY>'],
  [/sk_(live|test)_[A-Za-z0-9]{8,}/g, '<REDACTED-KEY>'],
  [/rk_live_[A-Za-z0-9]{8,}/g, '<REDACTED-KEY>'],
  [/whsec_[A-Za-z0-9]{8,}/g, '<REDACTED-KEY>'],
  [/xoxb-[A-Za-z0-9-]{8,}/g, '<REDACTED-KEY>'],
  [/AIza[A-Za-z0-9_-]{20,}/g, '<REDACTED-KEY>'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, '<REDACTED-JWT>'],
  [/\b\d{8,}:[A-Za-z0-9_-]{30,}\b/g, '<REDACTED-BOT-TOKEN>'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '<REDACTED-PEM>'],
  [/postgres(ql)?:\/\/[^\s"'<>]+/gi, '<REDACTED-DB-URL>'],
  [/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '<REDACTED-EMAIL>'],
];

/** Identity-bearing patterns, built from the RUNTIME environment. */
function identityPatterns() {
  const user = (userInfo().username || '').trim();
  const home = homedir() || '';
  const winUser = basename(home) || '';
  const out = [];
  for (const name of new Set([user, winUser].filter((n) => n && n.length >= 3))) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out.push([new RegExp(esc, 'gi'), '<OPERATOR>']);
  }
  out.push([/[A-Za-z]:\\Users\\[^\\\s"'<>]+/g, '<PATH>']);
  out.push([/\/(?:home|Users)\/[^/\s"'<>:,;)\]]+/g, '<PATH>']);
  out.push([/\/mnt\/[a-z]\/Users\/[^/\s"'<>:,;)\]]+/g, '<PATH>']);
  return out;
}

function applyAll(text, patterns) {
  let out = text;
  const hits = [];
  for (const [re, repl] of patterns) {
    const m = out.match(re);
    if (m && m.length) hits.push({ replacement: repl, count: m.length });
    out = out.replace(re, repl);
  }
  return { out, hits };
}

export function selfTest() {
  const patterns = identityPatterns();
  const user = basename(homedir() || '') || userInfo().username || '';
  if (!user || user.length < 3) {
    throw new Error('[redact-egress] CANARY IMPOSSIBLE: cannot derive an operator identity ...');
  }
  const canary = `canary /home/${user}/x C:\\Users\\${user}\\y sk-CANARYCANARYCANARY123456`;
  const { out } = applyAll(canary, [...patterns, ...SECRET_SHAPES]);
  const leaked = [];
  if (out.toLowerCase().includes(user.toLowerCase())) leaked.push('operator identity');
  if (out.includes('sk-CANARY')) leaked.push('secret shape');
  if (leaked.length) {
    throw new Error(`[redact-egress] CANARY FAILED — did not catch: ${leaked.join(', ')} ...`);
  }
  return true;
}

export function redactForEgress(text) {
  selfTest();
  const { out, hits } = applyAll(text, [...identityPatterns(), ...SECRET_SHAPES]);
  return { text: out, hits };
}

export function readForEgress(path, { label = 'document', quiet = false } = {}) {
  const raw = readFileSync(path, 'utf-8');
  const { text, hits } = redactForEgress(raw);
  if (!quiet) { /* prints hit counts to stderr */ }
  return text;
}
```

**Wiring:** 15 `scripts/consult-*.mjs` now call `readForEgress()` where they previously called
`readFileSync()`. Three that had their own local sanitizer (`consult-kimi`, `consult-hy3-design`,
`consult-terra-pro`) now delegate to the shared one *before* running their original body.

---

## 3. What was verified, and how

> **Superseded 2026-08-26 by the REVISE pass (§8).** The original table is kept for the
> record; its coverage row was **false** (see §8.1). Current evidence is in §8.3.

| Check | Method | Result (2026-08-23, original) |
|---|---|---|
| Unit behaviour | `node scripts/lib/redact-egress.test.mjs` | 13/13 pass |
| Real caller path | ran a live seat with an invalid key | printed `3 redaction(s) before send — <OPERATOR>×2, <REDACTED-KEY>×1`, then 401 |
| **The actual incident, replayed** | a real back-catalogue doc that still contains the username | 1 → **0** occurrences; additionally caught **2 database URLs** nobody had flagged |
| Citations survive | repo-relative `file:line` references through the redactor | byte-identical in/out |
| ~~Coverage~~ | ~~grep every script that reaches an external host~~ | ~~15/15 wired, 0 unwired~~ **FALSE — `consult-panel.mjs` unwired, `consult-qwen.mjs` counted as wired, seeds/diffs/prompts/error strings never passed through; grep scoped to `consult-*` only** |

---

## 4. Known-weak points — attack these first

These are stated so you attack them rather than rediscover them. **Refuting one is worth more
than agreeing with the list.**

1. **The canary may prove less than it claims.** It plants the operator's *own* name and one
   `sk-` string. It therefore proves those two patterns compiled and ran. It does **not** prove
   any other pattern works, and it cannot detect a class nobody thought of — which is the exact
   failure mode that caused the original incident. Is this canary theatre?
2. **Regex redaction has a bypass surface.** Base64, URL-encoding, unicode homoglyphs, zero-width
   joiners, line-wrapped secrets, a username split across a markdown link. None are handled.
3. **Identity derivation could be wrong or dangerous.** `basename(homedir())` on a machine where
   the home directory is `/home/admin` or `C:\Users\user` yields a common English word, which
   then gets globally replaced with `<OPERATOR>` — corrupting prose. The `length >= 3` guard is
   the only protection. Is 3 the right floor? Is a floor even the right mechanism?
4. **Order dependence.** `identityPatterns()` runs before `SECRET_SHAPES`, and `<PATH>` collapses
   a whole path segment. Can an earlier replacement destroy evidence a later pattern needed, or
   create a false match?
5. **`quiet: true` is used in a loop** in `consult-codex.mjs`, so those redactions are silent.
   Silent redaction is how the previous sanitizer stayed unexamined for months.
6. **`selfTest()` runs on every call**, recompiling regexes each time. On a large document set
   this is wasted work — but caching it would mean the proof runs once and then is assumed.
   Which side of that trade is right?
7. **This does not redact the reviewer's own output.** A model asked to quote the document back
   can re-emit a redacted placeholder, but nothing stops it inferring or reconstructing.
8. **The 61 historical documents are unchanged on disk.** The gate stops them being *sent*; it
   does not clean them. Is that acceptable, or does it leave a loaded gun?

---

## 5. Process failure in the same session — also under review

While committing this work, the agent staged 4 files with `git add`, and a **different agent
working the same tree ran `git commit` 40 seconds later**, sweeping the staged files into its
commit (`139437997`, a commit whose message is about an unrelated file inventory).

Nothing was lost — all files committed intact — but four learning packets are now recorded under
a misleading message. The agent had checked lane files for *file locks*, checked for an active
rebase, and checked hook safety. It never checked **whether the index already had staged
content**, which it did.

**The lesson claimed:** in a shared working tree the git index is shared mutable state; `git add`
is a write to it, and any agent's `git commit` sweeps whatever is sitting there. Lane files
protect files, not the index.

**Attack this too:** is the proposed rule (`git commit -- <explicit paths>` atomically, or use a
worktree) actually sufficient? Is there still a race between `git add` and `git commit` even in
one command? Should the pair-coding protocol forbid committing in a shared tree entirely?

---

## 6. Current state you should factor in

- **The entire workstream is UNCOMMITTED**: `redact-egress.mjs`, its test, and 12 modified
  `consult-*.mjs` are untracked or unstaged. The durable fix is not itself durable.
- The branch is `wip/comms-notifications-2026-07-05`, **~2,226 commits behind `origin/main`**.
  Work committed here does not reach main.
- `origin/main` has 55 learning packets; this branch has 115.

---

## 7. Your remit

Return **exactly** this shape:

```
VERDICT:   APPROVE | REVISE | REJECT
BLOCKERS:  <numbered; file:line + why it fails>
FINDINGS:  <numbered; severity + file:line + concrete failure scenario>
MISSED:    <what the author should have checked and did not>
ONE THING: <the single highest-value change, if you could make only one>
```

House rules you are judging against: max 300 lines/file · zero PII to LLMs (IDs and roles only)
· no "done/fixed/working" without current-session proof · docs describe what the code does NOW.

Do not hedge to consensus. If the design is sound, say so and spend your effort on the weakest
part instead. If it is security theatre, say that plainly and show the bypass.

---

## 8. REVISE pass — 2026-08-26 (Fable, Final Decider)

Two independent Fable reads returned **REVISE** (one against the packet, one against the tree
mid-edit). Both agreed the module's design is sound for its threat model and that the failures
were in the *wiring*. This section records what changed and what is now proven.

### 8.1 Verdict on §4 item 1 — is the canary theatre?

**No, but it was mislabelled.** The canary is a **positive control on the instrument**: it
proves identity derivation produced a usable name in *this* process, the apply pipeline runs
end-to-end, and every pattern fires on its sample. That is exactly the control the 2026-08-22
incident lacked. It is **not** a coverage proof — a regex that matched only its own canary would
pass. Coverage lives in the test corpus + the stated threat model (accidental leakage by
cooperative authors; regex is the right tool for that and the wrong tool for adversarial
exfil, so §4.2's base64/homoglyph list is the wrong threat). The stderr line now says
`no matches (instrument live; coverage per test corpus)` instead of `clean (canary verified)`.

### 8.2 What the REVISE changed

| Blocker / finding | Fix | Where |
|---|---|---|
| Gate sat at the file read; diffs, prompts, seeds, error strings went raw | **Gate moved to the transport.** `fetchForEgress(url, init)` redacts the final string body immediately before the socket; headers untouched (the API key belongs there). Non-string body → throw. | `scripts/lib/redact-egress.mjs` `fetchForEgress`; every outbound `fetch(` in 14 `consult-*.mjs` + `lib/openrouter-stream.mjs` (used by `consult-sol`) |
| Fail-closed defeated: `consult-codex.mjs` caught the canary throw and kept sending | Canary errors rethrown; read errors redacted before embedding; `--files` loop prints ONE aggregate line instead of nothing | `consult-codex.mjs:147-175` |
| The redactor's own ENOENT message carried the absolute path | `readForEgress` rethrows with a redacted message (REGRESSION 2 test) | `redact-egress.mjs` `readForEgress` |
| `consult-gemini-panel.mjs:130/:145` passed the raw `{text,hits}` object → seed + remit went over the wire as `[object Object]` | `redactOutbound()` returns the string; both call sites fixed; comment corrected | `consult-gemini-panel.mjs` |
| Shape coverage narrower than the sanitizer it replaced | Added: opaque `Bearer`, phone, keyed 7+/bare 10+ digit IDs (Rule 47), `rnd_` (Render), `ghp_`/`github_pat_`, `SG.` (SendGrid), `lin_api_`, redis/mongodb/mysql/amqp URLs | `SECRET_SHAPES` |
| Identity = OS username only | `hostname()` added. **Git author name is NOT redacted — Sean's call**, since his name is brand-adjacent; decide explicitly rather than default. | `identityNames()` |
| Common-word usernames (`root`, `admin`) would shred prose | Boundary regex for a denylist of common words; unusual names stay boundary-free (leak beats corruption) | `COMMON_WORD_NAMES` |
| Three stacked legacy sanitizers (kimi/hy3/terra) | Collapsed to the shared redactor only | those three scripts |
| Nothing failed if a new script called bare `fetch(` | **Regression guard test**: every `consult-*.mjs` (except local-only `consult-qwen`) + `openrouter-stream.mjs` must contain no bare outbound `fetch(` and must import `fetchForEgress` | `redact-egress.test.mjs` last block |
| Canary samples tripped the pre-commit secret scanner | Samples assembled from parts — an allowlist for this file would be a bigger hole | `c(...)` helper |

### 8.3 Evidence (current session, 2026-08-26)

| Check | Method | Result |
|---|---|---|
| Unit + regression + guard | `node scripts/lib/redact-egress.test.mjs` | **39/39** |
| Transport gate on the real caller path | `consult-codex.mjs --ask "<name in /home and C:\Users paths> sk-…"` with a bogus key | `[redact-egress] request: 2 redaction(s) before send — <OPERATOR>×1, <REDACTED-KEY>×1`, then 401. The ×1 (not ×2) was the **shell** collapsing the second occurrence (argv probe: name present once); the redactor scored 2/2 on the same literal and on a JSON body. Zero spend. |
| ENOENT channel | `consult-codex.mjs --review --files <packet>,docs/does-not-exist.md` | `--files: 1 file(s), 4 redaction(s)`; transport found nothing left to redact |
| Bypass probes | 18 probes (fwd-slash, URL-encoded, zero-width, md-link, hostname, `rnd_`, `ghp_`, `SG.`, `lin_api_`, opaque Bearer, phone, chat_id, redis, …) | all previously-leaking shapes now caught; base64 remains out of scope by threat model |
| Secret scan | `scripts/scan-secrets.sh` over module, test, transport lib, all consult scripts | CLEAN |
| Syntax | `node --check` on every touched file | clean |
| Line cap | `redact-egress.mjs` 214 / test 160 | under 300 |

### 8.4 Still open (not in this pass)

- **Non-consult egress surfaces — enumerated 2026-08-26 (slice 2).** 21 `scripts/**/*.mjs`
  call an external host. Classified: **document/prompt egress to an LLM host (gated now):**
  `hermes-village.mjs` (2 sites), `validation-orchestrator.mjs` (2), `glm-audit.mjs`,
  `auto-research/eval-suite.mjs` (2), `auto-research/prompt-mutator.mjs` (2),
  `mcp/swan-council-lib.mjs` (`fetchImpl` default). All in the guard test's
  `DOCUMENT_EGRESS` list. **Authored-prompt only (not gated):** the four `generate-*` image
  scripts + `recolor-logo.mjs` — they send hand-written prompts, not repo docs. **Own-host or
  localhost (not egress):** `sswanstudios.com`/`onrender.com` smoke + QA + CORS utilities,
  `hooks/idle-gpu-reaper`, `qa/stripe-testmode-replay`. Live proof: `glm-audit.mjs money
  --send` with a bogus key → `request: 6 redaction(s) before send — <REDACTED-EMAIL>×2,
  <REDACTED-ID>×4` then 401 — that packet had been leaving unredacted. **Still un-enumerated
  (not scripts):** Linear MCP comments, Artifact publishes, the Hermes SSH/cat read of
  `docs/` — these are agent-driven egress with no code chokepoint; the 61 tainted docs reach
  them until the cleanup pass below.
- **§4.8 — the 61 tainted files on disk stay loaded** for every surface above. Cleaning them is
  a separate Rule-34/37 pass needing Sean's approval; it is not deferred by accident.
- **§5 index race — rule to add to the pair-coding protocol:** the git index is *unowned
  shared state*; bare `git commit` with no pathspec is forbidden in the shared tree; commit
  with `git commit -m … -- <paths>` (tracked) or `git add -N <f> && git commit -- <f>` (new),
  which builds a temporary index and leaves nothing for another agent's bare commit to sweep;
  anything that genuinely needs staging uses a worktree. This pass committed that way.
