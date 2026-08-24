---
decision: Two of the three spend caps are structurally unenforceable — the ledger they read has no writer. Hygiene items inventoried, nothing moved.
status: open
supersedes: none
originating_model: claude-opus-5
created: 2026-08-24
rule_basis: Rule 32-39 (hygiene, non-destructive), Rule 16 (spend gate), Rule 51 (confidence tags)
---

# Spend-ledger and hygiene findings

Nothing in this document has been executed. It is inventory and diagnosis.

---

## Part 1 — The spend cap cannot fire on cumulative spend

### The finding

`scripts/lib/spend-ledger.mjs` exports `recordSpend({ model, topic, usd, note })`.

**Nothing calls it.**

| Script | imports `spend-ledger`? | calls `recordSpend`? |
|---|---|---|
| `scripts/hooks/spend-guard-gate.mjs` | yes — `checkSpend, CAPS, spentToday, spentOnTopic` | **no** |
| `consult-grok.mjs` | no | no |
| `consult-glm.mjs` | no | no |
| `consult-kimi.mjs` | no | no |
| `consult-sol.mjs` | no | no |
| `consult-fable.mjs` | no | no |
| `consult-openrouter-panel.mjs` | no | no |

### Search method, disclosed (GLM 5.3 F2 / Ox F4, 2026-08-24)

Both review seats flagged the first draft of this section for asserting a universal from a
negative search whose method was never stated. Method, stated:

- `grep -rn "recordSpend" --glob '**/*.{mjs,js,cjs,ts}'` across the repo
- `grep -rnE "import\(.*spend-ledger|require\(.*spend-ledger"` for dynamic-import paths
- scoped confirm over `scripts/lib/`, `scripts/hooks/`, `scripts/consult-*.mjs`

**This turned up a second, separate spend system the first draft missed.**
`scripts/mcp/swan-council-spend.mjs:63` exports its own `recordSpend(ledgerPath, {...})` — a
different signature, a different ledger path, and it *is* wired up (`swan-council-lib.mjs`
imports it alongside `reserveSpend`/`settleReservation`, with a real test suite). So the project
is **not** spend-blind in general. The dead writer is specifically `scripts/lib/spend-ledger.mjs`,
which is the one the consult-script gate reads.

**Corrected scope:** *the consult-script spend path never records; the caps that read
`.ai-workflow/spend/ledger.jsonl` cannot accumulate.* Not "the project cannot track spend."

### The 7 entries, dated — they are a fossil, not a writer

Both seats correctly noted that 7 entries prove *some* write path once existed, so "nothing calls
it" rules out current importers, not out-of-band writes. Dating them settles what they are:

```
2026-08-23T03:35:23.306Z  anthropic/claude-fable-5      $0.5754   qa-oracle-design-brief
2026-08-23T03:35:23.308Z  openai/gpt-5.6-sol-pro        $0.5045   qa-oracle-design-brief
2026-08-23T03:35:23.308Z  moonshotai/kimi-k3            $0.1874   qa-oracle-design-brief
2026-08-23T03:35:23.308Z  x-ai/grok-4.6                 $0.0831   qa-oracle-design-brief
2026-08-23T03:35:23.308Z  deepseek/deepseek-v4-pro      $0.0068   qa-oracle-design-brief
2026-08-23T03:35:23.309Z  deepseek/deepseek-v4-flash    $0.0016   qa-oracle-design-brief
2026-08-23T03:35:23.309Z  tencent/hy3                   $0.0033   qa-oracle-design-brief
```

All seven share **one topic** and span **3 milliseconds** — a single batch write from one pass,
not seven calls accumulating over time. `[LIKELY]` a since-changed or removed code path; the
writer was not identified. **Ox F6 is the right follow-up:** whatever component produced the
self-reported `$5.4272` figure for the 15-round debate already computes real cost and is the
natural insertion point for the writer. Find it before adding `recordSpend` anywhere.

`[VERIFIED]` — zero callers of `spend-ledger.mjs:63` in the current tree, by the method above.
`[UNKNOWN]` — what wrote the 7 entries.

### Why that is worse than an accounting gap

`checkSpend()` (`spend-ledger.mjs:101-120`) evaluates three caps:

```js
if (totals.call  > CAPS.perCall)                 breaches.push(...)   // worstCaseUsd, passed in fresh
if (totals.topic + totals.call > CAPS.perTopic)  breaches.push(...)   // spentOnTopic(topic, entries)
if (totals.day   + totals.call > CAPS.perDay)    breaches.push(...)   // spentToday(entries)
```

`totals.topic` and `totals.day` are both computed **from the ledger**. With no writer, the ledger
stays near-empty — 7 entries in its entire history, all dated 2026-08-23 — so both terms are
effectively `0` on every call.

**Consequence: only `perCall` works.** The per-topic and per-day caps are structurally incapable
of firing, because accumulation is never recorded. The gate presents as a cumulative budget
control and is actually a single-call size limit.

This explains every observation:

- a 15-round debate self-reported at **$5.4272** never tripped a cap and left zero ledger entries
- this session's **$0.4552** likewise left zero entries
- the ledger's 7 lifetime entries are from a path that no longer runs

`[VERIFIED]` — the empty-ledger state, the absent writer, and the cap arithmetic were each read
directly. `[LIKELY]` — that the 7 existing entries came from a since-changed code path; not traced.

### Recommended fix (NOT applied)

Add one `recordSpend(...)` call at the end of each consult script, after the cost is computed and
before exit. Every consult script already computes and prints a cost (`Cost: ~$0.0511`), so the
value exists — it is simply never persisted.

**Deliberately not done in this pass.** It touches ~6 scripts, several of which carry another
agent's uncommitted work (`consult-grok.mjs` holds an in-flight egress-redaction change), and git
writes are currently blocked by a stale `.git/index.lock`. Scattering edits across six
concurrently-held files is how the shared index gets clobbered.

**Sequencing note:** do not have the PreToolUse hook record the *estimate* as a substitute. The
hook fires before the call and knows only the worst case; recording it would double-count once a
real writer lands, and a ledger with plausible-but-wrong numbers is worse than a visibly empty
one — an empty ledger at least announces itself.

### A claim of mine that was wrong, corrected here

Earlier today I filed, on SWA-196 and in a Hermes memo, that
`spend-guard-gate.mjs:45` mapping `'consult-grok.mjs' → 'grok-4.6'` means
*"every Ox/DeepSeek call riding that transport is billed to Grok."*

**That was wrong.** `spend-guard-gate.mjs:92` does read overrides —
`cmd.match(/SWAN_[A-Z_]*MODEL=([^\s]+)/) || cmd.match(/--model\s+([^\s]+)/)` — and takes the
**max** of default and override *by design*, with the reasoning stated in-file: a caller-supplied
value that makes a call look cheaper is exactly what an agent under budget pressure would reach
for. Pricing Ox at Grok rates is a deliberate conservative choice, not a misattribution bug.

Two real observations survive that correction:

1. The guard matches `--model` **in the command string**, but `consult-grok.mjs` never parses
   `--model` (it reads `SWAN_GROK_MODEL` only). The guard holds a belief about a flag that has no
   effect on the transport. Harmless today — it only ever raises the estimate — but it is a stale
   belief that will mislead the next reader.
2. My own fix to `ox-final-review.mjs` now passes the model through the **spawn `env` option**
   rather than the command text, which the guard cannot see. The result is a Grok-priced estimate
   for a $0 seat — again the safe direction, and still a blind spot worth naming.

---

## Part 2 — Hygiene inventory (Rule 32-39, non-destructive)

**No file was moved, renamed, or deleted.** Classification only.

### Root directory (Rule 35 — root keeps `CLAUDE.md` + `ACTIVE-INDEX.md` as operating files)

15 `.md` at root. Four are legitimate: `CLAUDE.md`, `ACTIVE-INDEX.md`, `AGENTS.md`, `README.md`.
The remaining eleven are one-off review packets:

```
SWAN-DECISION-PACKET.md          SWAN-FORGE-ROUND7-PACKET.md
SWAN-FORGE-PACKET.md             SWAN-FORGE-ROUND8-PACKET.md
SWAN-FORGE-ROUND4-PACKET.md      SWAN-FORGE-ROUND9-PACKET.md
SWAN-FORGE-ROUND5-PACKET.md      SWAN-FORGE-SHIPPED-REVIEW-PACKET.md
SWAN-FORGE-ROUND6-PACKET.md      SWAN-SERIALIZER-REVIEW-PACKET.md
swan-lens-review-packet.tmp.md
```

Classification: **QA artifact / temp output** (Rule 33). Likely relocation candidates pending
approval — the numbered ROUND4-9 sequence reads as a completed debate series. `.tmp.md` is the
clearest candidate of all. **Not moved. Requires Sean's approval (Rule 34).**

### `.bak` files

```
AGENTS.md.bak-20260802
.claude/settings.json.bak-20260802
.claude/settings.json.bak-20260803-dualtier
.claude/settings.json.bak-egress-20260822
```

Classification: **archive-only historical record.** Pre-edit snapshots of two governance files.

The first draft called these deletion candidates because *the originals* are version-controlled.
**Both review seats rejected that reasoning** — tracked-status of a live file says nothing about
whether a `.bak` snapshot's content is in history. A `.bak` can hold an intermediate state that
was never committed, or one later discarded by a reset. GLM noted the deciding diff was cheap and
I had not run it. That was correct; it was one command.

Run now — all four differ from their live originals, so the question is real. Hashing each and
testing whether git already holds that exact blob:

| file | blob | in git object store |
|---|---|---|
| `AGENTS.md.bak-20260802` | `f6527d7b` | **yes** |
| `.claude/settings.json.bak-20260802` | `f7fc7240` | **yes** |
| `.claude/settings.json.bak-20260803-dualtier` | `81698743` | **yes** |
| `.claude/settings.json.bak-egress-20260822` | `82057736` | **yes** |

`[VERIFIED]` — every `.bak` content is recoverable from git; none is a unique artifact.
`[UNVERIFIED]` — whether each blob is *reachable* from a ref or merely present as an object. An
unreachable blob survives until `git gc` prunes it. Confirm reachability before deleting if the
content matters; the safety claim above is about presence, not permanence.

### `.agents/skills/` — an ignore rule that covers 15 of 22

`skills-lock.json` is a real manifest (`source`, `sourceType: github`, `skillPath`,
`computedHash`), so `.agents/skills/` is an **installed, reproducible tree** — the npm-modules
analogue, not authored work.

- `.gitignore` names **15** specific subdirectories under `.agents/skills/`
- **22** untracked skill directories are present
- **65** files under `.agents/skills/` are currently tracked

**Arithmetic correction (2026-08-24, prompted by Ox F5).** The first draft said "seven trees are
neither ignored nor tracked," inferring `22 − 15`. That subtraction was wrong: the two sets are
**disjoint**. The 15 gitignored names (`animejs`, `gsap`, `tailwind`, `three`, `lottie`,
`hyperframes`, `hyperframes-cli`, `hyperframes-media`, `hyperframes-registry`, `typegpu`,
`waapi`, `css-animations`, `contribute-catalog`, `remotion-to-hyperframes`,
`website-to-hyperframes`) share no member with the 22 untracked ones. So the real figure is
**22 trees / 664 files neither ignored nor tracked**, not seven — the hazard is three times what
the first draft claimed. Two numbers for one quantity, again, and this one was mine.

Enumerated, with `skills-lock.json` membership checked for each:

```
captions-overlay(1)      changelog-video(8)        cut-the-curve(2)
embedded-captions(93)    faceless-explainer(24)    figma(2)
general-video(4)         hyperframes-animation(121) hyperframes-audio(6)
hyperframes-core(19)     hyperframes-creative(72)  hyperframes-keyframes(3)
media-use(133)           motion-doctrine(4)        motion-graphics(23)
music-to-video(65)       oversized-cursor(1)       pr-to-video(30)
product-launch-video(28) seam-craft(1)             slideshow(2)
talking-head-recut(22)
```

`[VERIFIED]` **all 22 appear in `skills-lock.json`, and all 22 have zero tracked files.** Every
one is reproducible from the manifest — there is no authored content mixed in, which is what
made the original proposal risky. That removes the blocker: the classification question the first
draft said "must precede any `.gitignore` edit" is now answered for this set.

### Ox F5 — classification alone leaves the trap armed

Ox's point stands: inventorying a hazard does not disarm it. Any `git add -A` in this tree stages
664 files of vendored, lock-reproducible content. Concrete proposal, **not applied** (Rule 39 —
`.gitignore` edits are Phase-2, Sean's approval):

```gitignore
# Lock-managed skill trees — reproducible from skills-lock.json, never authored here.
# Replaces the 15 enumerated entries; `!` lines below re-admit anything genuinely authored.
.agents/skills/*/
```

With explicit re-admits for whichever of the 65 currently-tracked files are authored rather than
vendored. **That last classification is still open** and must be settled before the rule lands —
a blanket ignore would otherwise orphan real work.

**Interim mitigation, no approval needed:** stage explicit paths, never `-A`. That is what every
commit in this session has done.

Proposed (Rule 39, Phase-1 proposal only — **not applied**): replace the 15 enumerated entries
with a manifest-driven rule that ignores lock-managed skills wholesale, keeping the genuinely
authored ones as explicit exceptions. Requires deciding which of the 65 tracked files are
authored versus vendored — **that classification is not done and must precede any `.gitignore`
edit.**

---

## Open, not addressed here

- `.git/index.lock` — stale (0 bytes, created 00:31, no `git.exe` running), blocks all git writes
  repo-wide for every agent. The harness correctly refuses deletion inside `.git/`. Needs one
  operator command.
- 1,578 untracked files repo-wide, 99 modified-uncommitted. This document classifies only the
  hygiene subset.
