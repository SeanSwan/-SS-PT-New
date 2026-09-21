# CONSULT PACKET — adversarial review of the Rule 86 hostile-review archive

**Prepared:** 2026-09-20 · **Prepared by:** Sable (WorkBuddy) · **Branch:**
`creator-brains-engine-r2-20260915` · **Subject:** the hostile-review archive rule, its contract,
its tooling, and the fixes made to it in round 15.

---

## 0. READER INSTRUCTIONS — READ THIS BEFORE ANYTHING ELSE

**Your sandbox is read-only and that is expected and correct.** You cannot save files and you
cannot file a review. The caller saves your reply and files it into the archive. Do not report
the read-only sandbox as a blocker, and do not stop to note it — it is not a limitation on this
task, it is the intended shape of it.

**Do not explore the repository. Do not read files. Do not list directories. Do not run shell
commands.** Everything you need is inlined below, verbatim, taken from disk at packet-build time.
Repo search is unavailable on this transport **by design**, so a denial from it is not a bug to
work around. If a fact you want is genuinely absent, mark it UNVERIFIED — that is a correct and
useful answer, not a failure. You will not be penalised for an honest UNVERIFIED. A confident
claim about code you could not read is the one thing that makes this packet worthless.

**This instruction is not a formality.** A sibling consult on this machine dispatched with a
343 KB packet and consumed **2,429,074 input tokens** — the model spent most of a 13-minute run
exploring a repository it did not need. This packet is inlined precisely so that does not happen
here.

**The skill inlined in §2 IS the skill, already loaded.** Do not attempt to look it up on disk.
The lookup will fail — this packet is dispatched from a root that does not contain the skill
directory — and stopping on that failure is the wrong outcome. The full text is below.

**Rule numbers appearing inside inlined material are that material's own references.** Where a
project rule matters to your finding, it is spelled out in prose. If you meet a bare number you
cannot resolve, the prose governs.

**No secrets and no personal data are in this packet.** It is infrastructure documentation. It
does contain one verbatim quote of the operator's own words describing what he wanted; that is
intentional and is not confidential.

**Budget your reply.** The output contract requires nine documents plus a review and a self-test.
Prefer completeness of *decisions* over prose volume: a short document that decides everything
beats a long one that decides nothing.

---

## 1. REMIT

Run the **Mega Blueprint** pipeline over the system documented in this packet.

The system under review is **the Rule 86 hostile-review archive**: a rule requiring that every
hostile review be filed as a dated, machine-lookup-able artifact rather than living in a chat
transcript, together with the tooling that implements that contract.

### What I am asking you to attack

Attack the **existing artifacts supplied in §3**. They are review targets, not background
reading. The rule text, the archive README, the supersede doctrine and the five tools are all in
scope, as is the consistency between them.

I have already run my own hostile pass over this system — round 15, eleven defects, recorded in
§4 with their fixes. Your value is precisely that **you did not write it and you did not see my
pass.** Two consequences, and they are the whole point of spending this call:

1. **Find what my pass missed.** Do not restate my findings back to me; §4 lists them and their
   fixes. A finding that duplicates §4 is worth nothing. **Attack the fixes in §4 as well** — a
   fix is a claim like any other, and those fixes are the least-independently-reviewed code in
   this packet.
2. **Attack the system's self-description.** Where the rule, the README, the doctrine and the
   tooling disagree with each other, that disagreement IS the finding. The most valuable single
   thing you can produce is a case where **the guarantee the system states is not the guarantee
   the code provides** — a place where a reader would believe something that is not true.

### Severity, stated so we mean the same thing

The archive records `defects: {critical, high, medium, low}`. **No severity scale is defined
anywhere in the system** — that is itself a candidate finding. For this review, use:

- **critical** — the archive can silently lose, corrupt, or misrepresent a review; or a stated
  guarantee fails in the ordinary course of use.
- **high** — a stated guarantee fails on a realistic input, or the tooling can be driven into a
  wrong state by a normal caller.
- **medium** — a real inconsistency or unhandled input that a careful caller would hit.
- **low** — documentation, ergonomics, or a latent hazard with no reachable trigger today.

If you think a finding is critical and the system's own framing understates it, say so and say
why. Overstating is a defect too: if you are unsure between two levels, pick the lower one and
say what would make it higher.


---

## 2. INLINED SKILL — `fable-blueprint-forge` (verbatim, complete)

This is the governing skill for the pipeline you are running, inlined in full so that this packet
has no dependency on any directory being present under whatever root you were given.


````markdown
---
name: fable-blueprint-forge
description: Fable-as-architect, cheaper-AI-as-builder. When Sean wants a feature planned so completely that ANY competent builder AI (Codex, ChatGPT, Claude Sonnet, a fresh session with zero repo context) can build it exactly as Fable would — architecture docs, Mermaid flowcharts, sequence diagrams, ERDs, ASCII/HTML wireframes, file-by-file build order, exact signatures/paths/copy/tokens, "do NOT" bans, and executable per-slice acceptance criteria — then Fable reviews each built slice at the boundary. Kills vibe-coding: the plan makes every decision so the builder makes none. Distinct from fable-deep-sight (reads what EXISTS), grill-me (extracts intent), chromie (pressure-tests the bet) — this FORGES the build package. Use when Sean says "blueprint this", "forge the plan", "make it so another AI can build it", or /fable-blueprint-forge.
---

# Fable Blueprint Forge

## Role

Fable (or the strongest available Claude, per the Final Decider fallback chain) is the **architect**.
A cheaper/high-token AI is the **builder**. The builder will fill every gap in the plan with its own
judgment — and a weaker model fills gaps worse. So the Forge's job is to leave **no gaps that
matter**: every place a builder *could* choose, the plan chooses for it. The output is a
self-contained build package a builder with ZERO repo access or context can execute faithfully.

Three laws (the whole skill in one breath):
1. **Decision-dense, not just long.** Exact file paths, exact function signatures, exact API
   request/response shapes, exact copy strings, exact palette tokens, explicit "do NOT" bans.
2. **Executable acceptance criteria per slice.** Not "auth works" — "these N named tests pass;
   this exact curl returns this exact JSON; this viewport renders this wireframe."
3. **Fable checkpoints, not Fable absence.** Builder types; architect reviews every slice
   boundary. Review-a-diff costs a tiny fraction of write-the-code.

## Pipeline position

`grill-me` (intent) → `chromie` (if the bet is unproven) → **`fable-blueprint-forge`** (this skill:
plan package) → builder executes slice-by-slice → **Forge checkpoint** per slice → `closeout-evidence-lock`
+ rule 48 audit record at phase close. The Forge does NOT replace recursive planning (rule 15) — it
IS the maximal form of it.

## When To Use

- Sean wants a substantial feature/system planned by the best brain and built by a cheaper one
  (Codex worktree agent, ChatGPT/GPT-5.x, a fresh Claude session, a Workflow fleet).
- The builder will NOT have repo access, or will have limited context — the package must carry
  everything.
- Sean says "planned, not vibe-coded," "blueprint everything," "wireframes and mermaids," "build it
  exactly like Fable would."

## When NOT to use

- Small slices Claude/Codex can just build under normal rules (15/17/26) — the Forge overhead isn't
  worth it below ~a multi-day feature.
- Intent is still fuzzy → run `grill-me` first. Bet is unproven → `chromie` first. The Forge
  assumes the WHAT is decided; it forges the HOW.
- Auditing existing code → `fable-deep-sight`.

## Phase 1 — Repo Truth Harvest (architect side, before writing a word of plan)

The #1 way handoff plans fail: they cite files/routes/models that don't exist or have drifted.
Before forging, gather with file:line evidence:
- Canonical surfaces the feature touches (rule 26 receipt discipline; route mounts, mounted JSX).
- Real model columns from model files + drift check (rule 58) for every table touched.
- Existing patterns to copy (rule 18): one working in-repo example per pattern the builder will
  need (a styled-component card, a route+controller pair, a Victory chart, a test file shape).
- The mount points: exactly where new routes/components/nav entries plug in.
Paste the relevant excerpts INTO the package — the builder can't grep the repo.

## Phase 2 — Forge the Build Package

Write to `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-<feature-slug>-<YYYY-MM-DD>/` as a small doc set
(one dir, numbered files, each ≤~300 lines so any builder can load them piecemeal):

1. `00-README.md` — what this is, build order, how to use the package, the Builder Contract (below).
2. `01-architecture.md` — system overview, component tree, data flow, **Mermaid**: `flowchart` for
   user/data flows, `sequenceDiagram` for every API interaction, `erDiagram` for schema (new +
   touched tables, exact column names/types), state diagrams where state machines exist.
3. `02-wireframes.md` — ASCII wireframes for every screen/state (desktop + 375px mobile), or an
   HTML mockup file per screen for visual surfaces. Every button, label, empty/loading/error state
   drawn. Exact copy strings. Exact palette tokens (`var(--token, #fallback)`).
4. `03-contracts.md` — every API endpoint: method, exact path, auth requirement, request JSON,
   response JSON (success + each error), status codes. Every exported function the builder must
   create: exact signature with types. Every model: full Sequelize definition text.
5. `04-build-order.md` — **file-by-file**: for each file — path, purpose, ≤300-line budget, what it
   imports, what it exports, which in-repo example to mimic (excerpt included), and the slice it
   belongs to. Ordered so every slice leaves the app bootable.
6. `05-slices.md` — the slice plan. Each slice: scope (files), the decisions already made,
   **executable acceptance criteria** (named test files + counts, exact curl + expected JSON,
   exact viewport checks), and STOP line: "do not proceed to slice N+1 until checkpoint passes."
7. `06-bans.md` — the "do NOT" list: house rules restated for a context-free builder (no MUI;
   styled-components only; Victory only; no hardcoded colors; 44px targets; dark-first; no
   yoga/meditation wording; zero PII to LLMs; ≤300 lines/file; `css` helper for shared style
   fragments; FKs reference `"Users"`; no `git add -A`; commit style `type(scope): desc`) PLUS
   feature-specific bans ("do NOT create a new route file for X, mount in Y", "do NOT touch Z").
8. `07-checkpoints.md` — the checkpoint protocol (Phase 3) and the review remit text to reuse.

**Decision-density self-test before calling the package done:** read each slice as a hostile
builder and list every choice you'd still have to make. Each one is either (a) decided in the
package now, or (b) explicitly delegated with bounds ("builder's choice, must satisfy X"). Zero
silent gaps. This is the Forge's rule-17 hostile pass.

**Privacy/secrets:** package is committed — IDs/roles only, no PII, no secrets, no env values
(rules 8/44). Run `bash scripts/scan-secrets.sh` over the package dir.

## Phase 3 — Builder Execution + Checkpoints

**Builder Contract (paste into 00-README.md and the builder's first prompt):**
> You are the builder, not the architect. Follow the package to the letter. Where the package
> decides, you do not re-decide — even if you'd do it differently. Where the package is silent on
> something that matters, STOP and return the question; do not improvise. Build ONE slice at a
> time; after each slice, output the diff + the acceptance-criteria evidence (test output, curl
> results, screenshots) and WAIT for the checkpoint verdict before continuing. Never claim a
> criterion passed without pasting its output.

**Checkpoint (architect side, per slice):** diff review against the package — (1) every acceptance
criterion verified with real output; (2) drift scan: anything built that the package didn't specify,
anything specified that wasn't built, any ban violated; (3) verdict `PASS / REVISE (list) / HALT`.
Checkpoints may run on paid Fable (ask Sean first, rule 16 / free-first ladder) or the free
triangle / strongest local Claude when Sean prefers $0. Log verdicts in
`07-checkpoints.md` or the rule-67 review queue.

## Output Contract (chat, when the package is forged)

```text
BLUEPRINT FORGE: <feature> — PACKAGE READY
Location: docs/ai-workflow/AI-HANDOFF/BLUEPRINT-<slug>-<date>/
Slices: N · Files planned: N · Diagrams: N mermaid + N wireframes
Decision-density self-test: PASS (0 silent gaps / N delegated-with-bounds)
Secret scan: PASS
Builder target: <Codex worktree | ChatGPT | fresh Claude | workflow fleet>
First slice + its acceptance criteria: <one line>
Checkpoint plan: <who reviews, paid or free>
```

## Hard Rules

- Architect never skips Phase 1 — a plan citing unverified repo state is vibe-planning (rules
  26/58 apply to the PLAN, not just code).
- Paid Fable authorship/checkpoints are spend-gated: ask Sean first; offer the free ladder.
- The package must work for a builder with ZERO repo access — no "see CLAUDE.md", no "grep for
  X"; everything needed is IN the package.
- Builder deviations are never merged silently — REVISE or HALT, and drift found at checkpoint
  goes back to the builder, not patched by the architect (or the token economics invert).
- Rule 48 audit record still lands at phase close; the package + checkpoint log feed it directly.
````



---

## 3. THE SYSTEM UNDER REVIEW

### 3.1 What it is, in one paragraph

Sean works with several AI coding agents on the same machine. Each agent, at the end of a
non-trivial task, is expected to produce a hostile review. Before this system existed, those
reviews were written wherever the session happened to be — a temp directory, a docs folder, a
repo root, a chat transcript — and a search for review-shaped files across one repository
returned hundreds of candidates, none of which was *the* place to look. The consequence is not
merely untidiness. A review that exists only in a transcript cannot be found by the next agent,
so the same defect gets re-found in new words, and — worse — a stale `CLEAN` verdict gets read
as current. The system's answer is one archive at a fixed address, with a fixed filename schema
and a fixed header, plus tooling to write, index, query and link the files.

The archive lives at `Z:\HostileReviews` — deliberately outside any repository, because that
drive has ample space and the C: drive does not, and because a review of one repo should not be
buried inside another.

### 3.2 The installed rule block, verbatim (77 lines)

This block is appended to the instruction files of every harness on the machine — Claude Code,
Codex, Gemini, Copilot, Continue, Roo, Cursor, and the WorkBuddy identity file. **It is the only
thing that causes a review to be filed: there is no hook, no CI job and no git hook enforcing any
of it.** An agent files a review because it read this and complied. The block itself says so.


````markdown
## Hostile Review Archive (Rule 86) — MANDATORY

**Every hostile review is filed to `Z:\HostileReviews`. A review that is not filed there
did not happen.**

A hostile review that lives only in a chat transcript is not findable by the next agent,
so the same defect gets re-found in new words and a stale `CLEAN` verdict gets read as
current. Before this rule, reviews were written wherever the session happened to be
working — `C:\tmp\`, `.ai-workflow/reviews/`, `docs/ai-workflow/reviews/`, root
`review-roundN-packet.md`, Hermes memos — and a `*hostile*` search across the SS-PT repo
alone returns **hundreds of files**, none of which is *the* place to look. (The measured breakdown is in the archive `README.md` §7 — re-derive it there. Do not copy a count into this rule: it drifted twice inside one session.) The fix is a single
archive with a fixed address and a fixed header.

**Before you review, look.**

```bash
node Z:\HostileReviews\query.mjs --subject "<subject>"
```

If a review exists, read it — your job is then to test whether its findings still hold
and whether the code has changed since, not to re-derive it. Re-reporting a settled
finding in new words is restatement, not review. The `--verdict CLEAN` list is the
dangerous one: those are the verdicts most likely to be stale and most likely to be
trusted.

**File at the end of the pass, before the completion claim.**

```bash
node Z:\HostileReviews\new-review.mjs \
  --subject "<what was reviewed>" --reviewer <agent> --seat "<harness / model>" \
  --repo <repo|n/a> --verdict <CLEAN|DEFECTS-FOUND|PARTIAL|INCONCLUSIVE> \
  --scope "In: <...>. Out: <...>."
node Z:\HostileReviews\reindex.mjs
```

- **The filename is the lookup key:** `<YYYY-MM-DD>-<HHMMSS>-<subject-slug>.md` — local
  date first, so a directory listing is already chronological, then the slug, so the
  subject is visible without opening the file. Lowercase `a-z0-9-` only, hyphens not
  spaces, ≤48 chars. The filename stem IS the `review_id`.
- **The header is the lookup surface:** YAML front-matter with the fixed key set —
  `review_id`, `date_local`, `date_utc`, `subject`, `reviewer_agent`, `reviewer_seat`,
  `round`, `repo`, `repo_path`, `branch`, `commit`, `scope`, `verdict`,
  `defects{critical,high,medium,low}`, `unproven`, `supersedes`, `superseded_by`, `tags`.
  `UNKNOWN` is not a verdict — use `INCONCLUSIVE` and say why. `unproven` is not optional;
  zero on a non-trivial review is a smell. `commit` matters: a verdict against a dirty tree
  is only valid for that tree.
- **Supersede, never correct.** A later round writes a NEW file with
  `supersedes: <old-review_id>` and sets `superseded_by` on the old one. Never edit a filed
  review into correctness, never append a second review to an existing file, and **never
  delete**. The record of what was believed at the time is the value.
  **The one edit that is required, not forbidden:** setting `superseded_by` on the old
  review is the backward half of the same link, not a correction — it changes no finding,
  no verdict and no count, and leaving it unset makes the older review still read as
  current. `new-review.mjs --supersedes` writes it, `relink.mjs` repairs a missing one,
  and `reindex.mjs` reports a link that is not reciprocal.

**Protocol:** `Z:\HostileReviews\README.md` — the contract, the header schema, the query
recipes, the generated corpus counts (`census-hostile.mjs`), and the map of legacy
pre-2026-09-19 locations. Full rule text: `docs/ai-workflow/references/HOSTILE-REVIEW-ARCHIVE.md`
in the SS-PT checkout (`<REPO>/docs/ai-workflow/references/HOSTILE-REVIEW-ARCHIVE.md`, where
`<REPO>` is that checkout's root), and Rule 86 in `<REPO>/CLAUDE.md` / `AGENTS.md` / `CODEBUDDY.md`.

**Numbering — why this rule is 86 and not 74.** The canonical sequence ends at Rule 85, and
Rule 74 is Proof-Before-Done. Rules 74–85 are absent here by design, so the gap is expected,
not a lost rule. **Do not renumber this rule down**, and do not "fix" the gap.

**Enforcement honesty (measured 2026-09-19).** Nothing here is a hook. The layers are this
block (boot context), the `hostile-review-archive` skill, `closeout-evidence-lock`, and the
tooling (`new-review.mjs`, `reindex.mjs`). `scripts/hooks/hermes-closeout-gate.mjs` enforces
review *debt* but has no notion of a filed `review_id`, and `.git/hooks/` is empty. So this
rule fires because an agent reads it, not because something forces it.

**Why:** Sean, 2026-09-19 — *"whenever we do a hostile review, that hostile review has to be
saved in the hostile review folder, and it needs to be dated... the header needs to be very
easy to be able to look up for other agents trying to find it. So that way if there were
some issues or things change or whatever, or we had different ideas, we can always just
have the agent just kind of just go look in this folder."*
````



### 3.3 The archive contract — `Z:\HostileReviews\README.md` (verbatim)

This is the normative document: layout, naming, header schema, query recipes, folder rules, and
the recorded map of legacy pre-2026-09-19 review locations.


````markdown
# Hostile Review Archive

**One folder. Every hostile review. Dated, named, and greppable.**

Canonical root: `Z:\HostileReviews` (WSL: `/mnt/z/HostileReviews`)

Established 2026-09-19 by Sean. Rule: **Rule 86 — Hostile Review Archive** (see
`docs/ai-workflow/references/HOSTILE-REVIEW-ARCHIVE.md` in the SS-PT repo for the
authoritative rule text).

**Where the rule is installed** — check these surfaces first when it appears to be missing:

- **The SS-PT constitutions** — `CLAUDE.md`, `AGENTS.md`, `CODEBUDDY.md` carry the mechanical
  block (header schema, naming, supersede rules, enforcement honesty).
- **`SOUL.md`** — the *value*, with a pointer here for the mechanics. It carries no header
  schema, by design: SOUL.md says why, the constitutions say how.
- **11 user-level harness files** under `<HOME>\` — `.claude/CLAUDE.md`,
  `.codex/AGENTS.md`, `.agents/MAKEER-BLUEPRINTS.md`, `.agents/standards/…canonical.md`,
  `.continue/rules/`, `.roo/rules/`, `.gemini/GEMINI.md`, `.copilot/`, and the three
  `non-vibe-coding/references/makeer-blueprints.md` copies. All carry one identical block.
- **3 repo-local harness copies** — `.github/copilot-instructions.md`,
  `.continue/rules/00-makeer-blueprints.md`, `.cursor/rules/00-makeer-blueprints.mdc`. These are
  an **older revision of the same document** (the canonical is 336 lines; these are ~103 plus
  the block), and the first rollout missed them entirely. `.cursor` has no user-level install,
  so until 2026-09-20 **no Cursor-specific surface carried this rule at all**. The block was
  appended to all three; the revision divergence is a separate, unfixed question — recorded
  rather than quietly rewritten.

---

## 0. Why this exists

Before this folder, hostile reviews were written wherever the session happened to be
working: `C:\tmp\`, `.ai-workflow/reviews/`, `docs/ai-workflow/reviews/`, root-level
`review-roundN-packet.md` files, Hermes inbox memos. A grep for `*hostile*` across the
SS-PT repo alone returns **hundreds of files** (measured breakdown: §7). The consequence is that a later agent asking
*"did anyone already hostile-review this, and what did they find?"* has no single place
to look, so the same defect gets re-found — or worse, a "clean" verdict from three weeks
ago gets treated as current when the code has since changed.

This folder fixes that by making the review an **artifact with a fixed address and a fixed
header**, not a message in a transcript.

**A hostile review that is not filed here did not happen.** That is the rule.

---

## 1. Layout

```
Z:\HostileReviews\
  README.md          <- this file. The contract. Read it before writing a review.
  TEMPLATE.md        <- the source `new-review.mjs` fills. Do NOT hand-copy it: a copy skips
                        the `review_id`/filename join that reindex enforces, the header fill,
                        and BOTH halves of the supersede link. Use `new-review.mjs` (§8).
  index.jsonl        <- GENERATED. One JSON object per review. Never hand-edit.
  query.mjs          <- look up reviews without opening a thousand files.
  new-review.mjs     <- stamps a dated file from TEMPLATE.md. Does NOT reindex: what it
                        writes is still a template, and reindex refuses to index one.
  reindex.mjs        <- regenerates index.jsonl from the front-matter of every *.md
  relink.mjs         <- repairs a ONE-WAY supersede link: when a newer review declares
                        `supersedes:` but the older one never got `superseded_by:`, this
                        sets the backward half. Changes no finding, no verdict, no count.
  census-hostile.mjs <- regenerates the counts in §7 from the live corpus. The generator
                        is the source of truth, not the prose in §7.
  <YYYY-MM-DD>-<HHMMSS>-<subject-slug>.md   <- the reviews themselves
```

Every script here is **zero-dependency Node**. They do not use `jq` — it is not installed
on this machine, and a lookup surface that depends on a missing tool is a lookup surface
that does not work.

### How to invoke these tools

**The invocation is not the same in every environment, and getting it wrong is a
`Cannot find module` — not a useful error.** From *inside* this folder the bare name works:

```bash
cd Z:\HostileReviews
node query.mjs --unproven
```

From *any other directory* — the normal case, because you are working in a repo — use the
absolute path, in the form that matches the Node you are actually running:

| Running this Node | Type it like this |
|---|---|
| Windows Node — Git Bash, PowerShell (both measured) | `node Z:/HostileReviews/query.mjs --unproven` |
| WSL's Node | `node /mnt/z/HostileReviews/query.mjs --unproven` |

Three traps, all measured on this machine — each one is a real `Cannot find module`:

- **`node /z/HostileReviews/query.mjs` fails under Windows Node** — it resolves to
  `C:\z\HostileReviews\query.mjs`. Use `Z:/`, not `/z/`.
- **`node /mnt/z/...` also fails under Windows Node** — it resolves to
  `C:\mnt\z\HostileReviews\...`. The `/mnt/z` form is for WSL's Node only.
- **A bare `node query.mjs` fails from any other directory** — it resolves against your
  cwd, e.g. `C:\tmp\query.mjs`.

Each script resolves its own location from `import.meta.url`, so only the path *you type*
matters. Nothing here depends on your current directory.

`index.jsonl` is **derived** from the review files, not maintained by hand. That is
deliberate: a hand-maintained index drifts from the thing it indexes, and a drifted index
is worse than none because it is trusted. Run `node reindex.mjs` after any manual edit.

---

## 2. Naming convention (mandatory)

```
<YYYY-MM-DD>-<HHMMSS>-<subject-slug>.md
```

| Part | Rule |
|---|---|
| `YYYY-MM-DD` | Local date (America/Los_Angeles unless the session says otherwise) |
| `HHMMSS` | 24-hour local clock, zero-padded |
| `subject-slug` | lowercase, `a-z0-9-` only, hyphens not spaces, ≤ 48 chars, no trailing hyphen |

**If the slug exceeds 48 characters it is cut at a word boundary, not mid-word.** A real
review filed 2026-09-19 produced `...-round-1-injection-and-cor` from the word
"correctness" — a truncated fragment in the one field whose entire job is to be legible.
`new-review.mjs` now prefers the last whole word (`...-round-1-injection-and`), falling
back to a hard cut only when that would leave less than half the budget. If you are naming
a file by hand, do the same.

Examples:

```
2026-09-19-130800-c-drive-forensics.md
2026-09-19-154500-rule86-archive-rollout.md
2026-09-20-091200-swan-coach-slice3.md
```

Date-first means a plain directory listing is already in chronological order, and the
slug means you can find a review by subject without opening anything. If two reviews
land in the same second on the same subject, append `-r2`, `-r3`.

The **filename stem is the `review_id`** and is the join key between the file and its
`index.jsonl` line. They must match.

---

## 3. Header contract (mandatory — this is the lookup surface)

Every review file opens with YAML front-matter carrying exactly these keys. Keys are
lowercase, snake_case, and stable. An agent should be able to answer most questions
with `grep` on the front-matter block alone, without reading the body.

```yaml
---
review_id: 2026-09-19-130800-c-drive-forensics
date_local: 2026-09-19T13:08:00-07:00
date_utc: 2026-09-19T20:08:00Z
subject: "C: drive full-drive forensics — verification of the 146 GB residual claim"
reviewer_agent: sable
reviewer_seat: workbuddy / deepseek-v4.1-flash
round: 1
repo: SS-PT
repo_path: <REPO>
branch: main
commit: "n/a (read-only forensics, no code change)"
scope: "In: full-drive measurement + residual arithmetic. Out: VSS internals, .ssh (access denied)."
verdict: DEFECTS-FOUND
defects: { critical: 0, high: 2, medium: 3, low: 1 }
unproven: 2
supersedes: null
superseded_by: null
tags: [forensics, disk, read-only]
---
```

### Field definitions

| Key | Meaning |
|---|---|
| `review_id` | Filename stem. Must match exactly. |
| `date_local` / `date_utc` | When the review ran. Both, always — local for humans, UTC for ordering across machines. |
| `subject` | One line. What was reviewed. Quote it if it contains `:` or `"`. |
| `reviewer_agent` | The agent's name (e.g. `sable`, `vs-claude`, `kimi`). |
| `reviewer_seat` | Harness and model (e.g. `workbuddy / deepseek-v4.1-flash`). Be honest — a review answered by the wrong seat is a real defect and belongs in the record. |
| `round` | 1 for the first pass on a subject; increments per re-review. |
| `repo` / `repo_path` | Which codebase. Use `n/a` for machine-level or non-repo work. |
| `branch` / `commit` | Exact revision reviewed. `dirty` if the tree was dirty — a verdict against a dirty tree is only valid for that tree. |
| `scope` | One line naming what was **in** and what was **out**. An unstated boundary is how a "clean" verdict gets over-read. |
| `verdict` | One of `CLEAN`, `DEFECTS-FOUND`, `PARTIAL`, `INCONCLUSIVE`. |
| `defects` | Counts by severity. `CLEAN` means all four are `0`. |
| `unproven` | Count of things the review could **not** establish. This is not a failure count — it is the honesty count. Zero unproven on a non-trivial review is a smell. |
| `supersedes` / `superseded_by` | `review_id` of the related round, or `null`. **Reviews are never edited into correctness — they are superseded.** |
| `tags` | Free-form, lowercase, for cross-subject lookup. |

### Verdict values

| Verdict | Means |
|---|---|
| `CLEAN` | The pass ran to dry and found nothing new. |
| `DEFECTS-FOUND` | One or more defects found. Counts in `defects`. |
| `PARTIAL` | The review covered only part of the intended surface — say which part in `scope`. |
| `INCONCLUSIVE` | The review could not reach a verdict (blocked access, missing fixture). Say why in §3. |

`UNKNOWN` is not a verdict. If you do not know, the verdict is `INCONCLUSIVE` and the
reason is written down.

---

## 4. Body skeleton

After the front-matter, use these sections in this order. Delete a section only if it is
genuinely empty, and never delete §3.

```md
# HOSTILE REVIEW — <subject>

**Reviewer:** <agent> (<seat>), <date_local>
**Method:** <one line: what you actually did — re-measured, re-ran, read, mutated>
**Evidence:** <where the raw evidence lives: commands, output files, probe scripts>
**Verdict:** <verdict> — <counts>

## 0. Verdict in one paragraph
The whole finding, readable in 20 seconds, by someone who will read nothing else.

## 1. Confirmed — what I re-measured and could not break
Table: claim | my measurement | result. This section is not filler. A review that
confirms nothing has no baseline, and a reviewer who breaks nothing looks like a
reviewer who tried nothing.

## 2. Defects
### D1 — <title> [CRITICAL|HIGH|MEDIUM|LOW]
- **Claim under review:**
- **Evidence:** `file:line`, command, or measurement
- **Exploitability / reach:** who or what can actually hit this
- **Why it matters:**
- **Fix:**
(one block per defect, numbered D1..Dn, severity in brackets)

## 3. Not proven / unopened
Everything this pass did **not** establish, named. "Unopened" is not "clean".
Absence of a grep hit is not evidence of safety.

## 4. What I deliberately did NOT do, and why
Restraint is part of the deliverable. If you did not touch production data, churn a
dirty tree, or move files, say so here.

## 5. Round log
find → fix → re-verify → re-review, until a full pass finds nothing new (the dry-loop
bar, Rule 73). Record the round count and what each round produced, including rounds
that found nothing.
```

---

## 5. How to find a review

Everything below assumes you have `cd`'d into this folder. From anywhere else — the normal
case — prefix the absolute path; see **How to invoke these tools** in §1 for which form
your Node needs.

**Use `query.mjs`, not a raw grep.** The index contains only reviews; grepping the `.md`
files directly also hits `README.md` and `TEMPLATE.md`, which contain these very recipes
inside fenced code blocks. So a naive `grep "^unproven:" *.md` returns `README.md` as if
it were a review. That is not hypothetical — it was caught by running the recipe.

```bash
# Every review, newest last
node query.mjs

# Everything about one subject (case-insensitive; matches subject + scope + tags)
node query.mjs --subject swan-coach

# Every CLEAN verdict — and be careful, this is the dangerous list
node query.mjs --verdict CLEAN

# Every review that found a CRITICAL / a HIGH
node query.mjs --critical
node query.mjs --high

# The honesty list — reviews that could not prove something
node query.mjs --unproven

# Reviewed against a specific commit, or in a specific repo
node query.mjs --commit abc1234
node query.mjs --repo SS-PT

# Reviews whose `superseded_by` is set — i.e. a newer round exists. This reads the
# RECIPROCAL field, so a one-way link is invisible here; `reindex.mjs` is what reports
# one, and `relink.mjs` is what repairs it. That is why the backward link is mandatory.
node query.mjs --superseded

# Everything one agent filed
node query.mjs --agent sable

# Just the ids or filenames, for piping
node query.mjs --subject auth --ids
node query.mjs --verdict CLEAN --files

# Raw JSON lines, for your own processing
node query.mjs --json | head -5
```

Filters compose with AND: `node query.mjs --repo SS-PT --unproven --verdict DEFECTS-FOUND`.
Exit code is `0` with matches, `1` with none — so it works in a script.

For **full-text** search of review *bodies* (which the index does not carry), grep the
files with the apparatus excluded:

```bash
grep -l "swan-coach" --exclude=README.md --exclude=TEMPLATE.md *.md
grep -l "^scope:.*auth" --exclude=README.md --exclude=TEMPLATE.md *.md
```

**Before starting any new hostile review, run the subject query against your subject.**
If a review already exists, read it: your job is to check whether its findings still
hold and whether the code has changed since — not to re-derive it from scratch. That
is the whole point of the folder.

If the index looks wrong, or a file was added by hand, run `node reindex.mjs`. It rebuilds
from the files and reports any review whose header is malformed rather than silently
dropping it. `query.mjs` warns if the index is stale before answering.

---

## 6. Rules of this folder

1. **One file per review.** Two reviews = two files. Never append a second review to an
   existing file — it destroys the `review_id` join and makes the index a lie.
2. **Never edit a filed review into correctness.** If a later round changes a finding,
   write a new file with `supersedes: <old-review_id>` and set `superseded_by` on the
   old one. The record of what was believed at the time is the value; a quietly corrected
   review is a fabricated history. **The one edit that is required, not forbidden:** setting `superseded_by` on the old
   review is the backward half of the same link, not a correction — it changes no finding,
   no verdict and no count, and leaving it unset makes the older review still read as
   current. `new-review.mjs --supersedes` writes it, `relink.mjs` repairs a missing one,
   and `reindex.mjs` reports a link that is not reciprocal.
3. **Never delete.** Same reason as Rule 34. Supersede, do not erase.
4. **File it at the end of the review pass, before reporting done.** Rule 73 requires the
   hostile pass before a completion claim; Rule 86 requires that pass to leave a file.
   A review that exists only in a chat transcript is not filed and therefore, by this
   folder's contract, did not happen.
5. **The front-matter is part of the artifact.** An incomplete header is an incomplete
   review. `unproven` is not optional — write `0` if it is genuinely zero.
6. **This folder is not versioned.** It is on `Z:`, outside any git repo. That means no
   `git log` safety net: rule 3 (never delete) is enforced by discipline, not by git.
   Treat every file here as append-only and permanent.

---

## 7. Legacy locations — reviews that predate this folder

Nothing was migrated (deliberate: moving them would break inbound links and the vault's
snapshot history). If you are looking for an older review, it is in one of these places.

**Read this as a map, not a count.** A `*hostile*` search across the SS-PT repo returns
**well over a thousand files**, and the searchable legacy corpus is **on the order of 300
documents**. Neither figure is worth quoting exactly: the directories involved are **live
working directories for other agent sessions**, which write into them continuously.

**`census-hostile.mjs` is the source of truth.** Run it — it prints the class totals and the
per-directory breakdown, freshly:

```bash
node census-hostile.mjs
# from another directory, or under Windows Node:
node Z:/HostileReviews/census-hostile.mjs
```

**This section deliberately does not restate its numbers.** A hand-copied figure drifts: the
three previous revisions of this table declared 267, then 289, then 290, and the third was
already one short when it was written, because a concurrent session was adding and removing
files under `docs/ai-workflow/AI-HANDOFF/` at the same time. A number a checker can disagree
with is a number that will eventually be wrong. **For a quantity that moves, the correct
documentation is the method, not the number.** (Last measured 2026-09-19; re-derive before
relying on any figure you remember from this section.)

**What the corpus consists of**, in descending order of size:

- **Duplicates inside git worktree checkouts** — the *same* tracked files, one copy per
  worktree. **VOLATILE: moves while you read it.** These are live working directories for other
  sessions, not separate artifacts. Do not treat them as a corpus.
- **Distinct documents outside the worktrees** — the real legacy corpus. It is dominated by
  three places, with a long tail:
  - `SS-PT\tmp\swanguard-backend-hardening\docs\` — stale hardening sandbox output (inside
    `tmp/`, so scratch)
  - `SS-PT\.ai-workflow\hermes-inbox\consumed\<YYYY-MM>\` — per-session hostile-review memos as
    filed with Hermes. **Durable record.**
  - `SS-PT\docs\ai-workflow\AI-HANDOFF\` — hostile briefs, handoffs and result docs.
    **Durable record.**
  - the tail: `docs/ai-workflow/{brainstorms,blueprints,hermes-learning-packets,reviews,references}/`,
    repo-root loose scratch (`.codex-tmp-*hostile*`, `.tmp/*hostile*`, `archive-414-hostile.png`),
    `.ai-workflow/{orientation,fusion,brain-review,qa-temp,coordination}/`, `.ai-workflow/` loose
    packets, `scripts/design-brain/tests/` (**test code, not reviews**), `.tmp/` repair scripts,
    `tmp/mega-blueprint-smoke/out/`, `.ai-workflow/vault/` snapshots, and
    `AI-Village-Documentation/codex-consults/inbox/`.
- **`.git/logs/refs/**` — git reflog. **Internals — never touch.**

**If the generator's breakdown names a location this list does not, add it here.** A location
the map never named is the one failure this folder exists to prevent, and it has already
happened twice — once leaving 22 files (7.6%) unlisted, and once leaving
`AI-Village-Documentation/codex-consults/inbox/` out. This list is prose and cannot notice its
own omissions; the generator can, which is exactly why it is the source of truth.

### The stale worktrees — a moving list, not a count

`git worktree list` reports **2** worktrees (main + `C:\tmp\ss-media-api`), and
`.git/worktrees/` holds **1** registry entry — but a dozen or more worktree directories
exist on disk. **This list is a snapshot and it changes while sessions operate.** During the
pass that wrote this section, `brain-console-salvage-20260918` was renamed to
`brain-console-salvage-20260918.broken-20260919-203310` and a thirteenth checkout appeared.
That is why the class total above is marked VOLATILE. Measured 2026-09-19:

```
.claude/worktrees/{forge-phase-1, ox-review-transport, s0-receipt-v1, unified-world-gallery-2026-07-16}
tmp/worktrees/{agent-ready-planner-audit-20260906, brain-console-20260913,
  brain-console-salvage-20260918, chart-experience-v3-20260904,
  client-schedule-review-20260915, coach-hive-ui-20260809, mobbin-governance,
  swan-coach-astra-owned-20260906, swan-coach-universe-20260904}
```

Each still has a `.git` file pointing at `.git/worktrees/<name>`, but that registry
directory is gone. `git worktree prune --dry-run` reports **nothing** — because prune
removes registry entries for missing directories, and here it is the *directories* that
are orphaned, not the registry. **These checkouts are where the great majority of the
files come from.**

They are dead weight, and removing them is a *worktree* operation, not a file cleanup.
**Nothing here has been moved or deleted** — Rule 34 requires Sean's explicit approval,
and the archive does not need this cleanup to work.

### Searching them

```bash
cd <REPO>
# the real corpus only — excludes worktree duplicates and git internals
find . -iname "*hostile*" -type f \
  -not -path "*/node_modules/*" -not -path "./tmp/worktrees/*" \
  -not -path "./.claude/worktrees/*" -not -path "./.git/*" | head -50
```

---

## 8. Filing a review (the fast path)

Paths below use the WSL form. Under Windows Node substitute `Z:/HostileReviews/` for
`/mnt/z/HostileReviews/` — see §1 for which form your Node needs.

```bash
# 1. Has this already been reviewed?
node /mnt/z/HostileReviews/query.mjs --subject "<your subject>"

# 2. Stamp the file
node /mnt/z/HostileReviews/new-review.mjs \
  --subject "C: drive full-drive forensics — residual claim" \
  --reviewer sable --seat "workbuddy / deepseek-v4.1-flash" \
  --repo SS-PT --verdict DEFECTS-FOUND \
  --scope "In: full-drive measurement. Out: VSS internals." \
  --supersedes 2026-09-19-130800-c-drive-forensics   # ONLY if this round replaces an earlier one

# 3. Write the review into the file it printed

# 4. Reindex so the counts match what you actually found
node /mnt/z/HostileReviews/reindex.mjs
```

**On the `--supersedes` line.** If this review replaces an earlier round and you omit it,
**both halves of the link are missing** — the new review declares nothing, so the old review
never gets `superseded_by`, and its verdict keeps reading as current. `reindex.mjs` cannot
catch that: its reciprocity check only inspects links somebody declared, so a link that
*should* exist and is written nowhere is invisible to it. Passing `--supersedes` sets both
halves in one step; `relink.mjs` repairs a one-way link afterwards. This is the one thing in
this folder that the tooling cannot check for you — see §6 rule 2.

Step 2 creates `2026-09-19-135502-c-drive-full-drive-forensics-residual-claim.md` from
`TEMPLATE.md`, fills the front-matter and the header line, and prints the path. It does
**not** touch `index.jsonl` — what it just wrote is a stamped template, not a review, and
`reindex.mjs` refuses to index one. So the file stays **OUT of the index until step 4**, and
until then `query.mjs` will not find it. That is why step 4 is not optional. `--dry-run`
prints the file it would create and writes nothing.

After step 4, `reindex.mjs` exits non-zero if any header is malformed — so a review filed
with a broken header fails loudly at filing time rather than becoming an invisible gap.

---

## 9. Inaugural entry

`2026-09-19-130800-c-drive-forensics.md` — the review that prompted this folder. It is
kept here as the worked example of the format.
````



### 3.4 The review template — `TEMPLATE.md` (verbatim)

`new-review.mjs` stamps a new file from this template, so the template is the *only* thing that
determines the shape of a filed review in practice. Note the interaction with §3.3: the README
describes the header schema in prose, and this file is what actually gets copied.


````markdown
---
review_id: <YYYY-MM-DD-HHMMSS-subject-slug>
date_local: <YYYY-MM-DDTHH:MM:SS-07:00>
date_utc: <YYYY-MM-DDTHH:MM:SSZ>
subject: "<one line — what was reviewed>"
reviewer_agent: <agent-name>
reviewer_seat: <harness / model>
round: 1
repo: <repo-name | n/a>
repo_path: <absolute path | n/a>
branch: <branch | n/a>
commit: <sha | dirty | n/a>
scope: "In: <what this pass covered>. Out: <what it deliberately did not>."
verdict: <CLEAN | DEFECTS-FOUND | PARTIAL | INCONCLUSIVE>
defects: { critical: 0, high: 0, medium: 0, low: 0 }
unproven: 0
supersedes: null
superseded_by: null
tags: []
---

# HOSTILE REVIEW — <subject>

**Reviewer:** <agent> (<seat>), <date_local>
**Method:** <what you actually did — re-measured, re-ran, read, mutated. Not "reviewed the code".>
**Evidence:** <where the raw evidence lives — commands run, output files, probe scripts>
**Verdict:** <verdict> — <C/H/M/L counts>

---

## 0. Verdict in one paragraph

The whole finding, readable in 20 seconds by someone who will read nothing else. State
the verdict, the single most important defect or confirmation, and the one thing a reader
must not assume.

---

## 1. Confirmed — what I re-measured and could not break

| Claim under review | My measurement | Result |
|---|---|---|
| | | |

This section is not filler. A review that confirms nothing has no baseline, and a
reviewer who breaks nothing looks like a reviewer who tried nothing. If you genuinely
confirmed nothing, say that plainly and explain why the surface offered no checkable claim.

---

## 2. Defects

### D1 — <title> [CRITICAL | HIGH | MEDIUM | LOW]

- **Claim under review:**
- **Evidence:** `file:line`, command, or measurement — not an assertion
- **Exploitability / reach:** who or what can actually hit this. "Any website can do X"
  and "the victim must be running a dev server on localhost" are very different findings.
- **Why it matters:**
- **Fix:**

### D2 — <title> [SEVERITY]

- **Claim under review:**
- **Evidence:**
- **Exploitability / reach:**
- **Why it matters:**
- **Fix:**

<!--
Grade honestly in BOTH directions.
- Do not inflate: "Not a live vulnerability, and I am not going to inflate it into one"
  is a complete sentence.
- Do not deflate: if a destructive operation is keyed to IDs you cannot verify, say
  "HIGH — CRITICAL if any of those IDs holds a live record, which I cannot verify
  without production access, and did not assume."
-->

---

## 3. Not proven / unopened

Everything this pass did **not** establish, named. "Unopened" is not "clean". Absence of
a grep hit is not evidence of safety. If you did not audit it, write *unopened*, not *fine*.

- <item> — <why it could not be checked>

---

## 4. What I deliberately did NOT do, and why

Restraint is part of the deliverable, not an omission.

- <action not taken> — <reason: would touch production data / churn a dirty tree / move files / out of scope>

---

## 5. Round log

The dry-loop bar (Rule 73): find → fix → re-verify → re-review, and stop only when a
full hostile pass finds nothing new. Record every round, including the ones that found
nothing — a round count with no content is not a round log.

| Round | Looked at | Found | Fixed | Re-verified |
|---|---|---|---|---|
| 1 | | | | |

**Dry:** reached on round <n> / not reached — <why>
````



### 3.5 The tooling (verbatim source, five files)

This is the whole implementation. There is no dependency beyond Node's standard library —
`jq` is not installed on this machine, which is why querying is a script rather than a shell
recipe.

#### 3.5.1 `new-review.mjs` — stamps a dated file from the template, then reindexes


````javascript
#!/usr/bin/env node
/**
 * new-review.mjs — stamp a dated hostile-review file from TEMPLATE.md and reindex.
 *
 * Usage:
 *   node new-review.mjs --subject "..." --reviewer sable --seat "workbuddy / model" \
 *        [--repo SS-PT] [--repo-path "C:\..."] [--branch main] [--commit abc1234|dirty|n/a] \
 *        [--scope "In: ... Out: ..."] [--verdict DEFECTS-FOUND] [--round 1] \
 *        [--supersedes <old-review_id>] [--tags a,b] [--dry-run]
 *
 * --supersedes <old-review_id> sets BOTH halves of the supersede link: it writes
 * `supersedes:` in the new review AND rewrites `superseded_by:` in the old one. Pass it
 * whenever this review replaces an earlier round. A link declared only in the new review
 * leaves the older verdict still reading as current, which is the failure the archive
 * exists to prevent. If the old file is missing, or already names a different successor,
 * the new review is still filed and the link is reported as NOT set — `relink.mjs` repairs
 * a one-way link afterwards, and `reindex.mjs` reports one that is not reciprocal.
 *
 * The value is a bare review_id — the filename stem, without `.md`. A path is refused: it is
 * joined to this folder's own path, so a value containing `..` would make this tool rewrite a
 * file outside the archive, where no check here can see it.
 *
 * Creates <YYYY-MM-DD>-<HHMMSS>-<slug>.md, fills the front-matter and the header line,
 * prints the path, then regenerates index.jsonl.
 *
 * Refuses to overwrite an existing file. Refuses to run without --subject and
 * --reviewer — a review with no subject cannot be looked up, which defeats the folder.
 *
 * Exit: 0 ok · 2 bad usage / collision
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Printed into runtime hints so they name a command that works from the caller's own
// directory. Forward slashes on purpose: a Windows path with backslashes is mangled by
// Git Bash, and the interpreter that resolved HERE is the one that will re-run the hint.
const SELF = HERE.replace(/\\/g, '/');
const TEMPLATE = path.join(HERE, 'TEMPLATE.md');

// --- args ------------------------------------------------------------------

const argv = process.argv.slice(2);

// --help must be handled BEFORE the generic parser, which would otherwise read it as a flag
// missing its value and then tell the caller to run --help — which is exactly what it did.
if (argv.includes('--help') || argv.includes('-h')) {
  const self = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const end = self.indexOf('*/');
  console.log(self.slice(self.indexOf('/**'), end === -1 ? undefined : end + 2));
  process.exit(0);
}

const opt = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) continue;
  const key = a.slice(2);
  if (key === 'dry-run') { opt[key] = true; continue; }
  const val = argv[i + 1];
  if (val === undefined || val.startsWith('--')) {
    console.error(`[new-review] --${key} needs a value`);
    process.exit(2);
  }
  opt[key] = val;
  i++;
}

const required = ['subject', 'reviewer'];
const missing = required.filter((k) => !opt[k]);
if (missing.length) {
  console.error(`[new-review] missing required: ${missing.map((m) => '--' + m).join(', ')}`);
  console.error('[new-review] run with --help for the full flag list (see header of this file)');
  process.exit(2);
}

// `--supersedes` takes a review_id, NOT a path, and the value is joined to this folder's own
// path below. Unvalidated, a value containing `..` or a separator makes this tool rewrite a
// file OUTSIDE the archive. Measured: `--supersedes "../outside-the-archive"` rewrote
// C:\tmp\outside-the-archive.md and reported success. Nothing in this folder can see that
// file — reindex, relink and query all work within HERE — so the edit is invisible, and this
// archive's whole contract is that a document outside this folder does not exist. Refuse
// before writing anything, so a bad value cannot half-apply.
const REVIEW_ID = /^\d{4}-\d{2}-\d{2}-\d{6}-[a-z0-9][a-z0-9-]*$/;
if (opt.supersedes && !REVIEW_ID.test(opt.supersedes)) {
  console.error(
    `[new-review] --supersedes must be a bare review_id (YYYY-MM-DD-HHMMSS-slug), not a path — ` +
      `got ${JSON.stringify(opt.supersedes)}.`
  );
  console.error(
    '[new-review] refusing: a path here would rewrite a file outside this folder, which nothing ' +
      'in this folder can check. Pass the filename stem, without the .md.'
  );
  process.exit(2);
}

// --- timestamps ------------------------------------------------------------
//
// Both, always. Local for a human reading the folder, UTC so two machines can be
// ordered against each other. Computed from the system clock, never from arithmetic.

const pad = (n, w = 2) => String(n).padStart(w, '0');
const now = new Date();
const tzMin = -now.getTimezoneOffset();
const sign = tzMin >= 0 ? '+' : '-';
const abs = Math.abs(tzMin);
const offset = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;

const dateLocal =
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
  `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}${offset}`;
const dateUtc =
  `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}` +
  `T${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}Z`;

// --- slug ------------------------------------------------------------------

function slugify(s) {
  const full = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (full.length <= 48) return full;

  // Truncate at a WORD boundary, not mid-word. A real review filed on
  // 2026-09-19 produced `...-round-1-injection-and-cor` from "correctness",
  // which reads as a typo in the one field whose whole job is to be legible.
  // Prefer the last whole word; fall back to a hard cut only if that would
  // leave less than half the budget.
  const cut = full.slice(0, 48);
  const atBoundary = cut.slice(0, cut.lastIndexOf('-')).replace(/-+$/, '');
  return atBoundary.length >= 24 ? atBoundary : cut.replace(/-+$/, '');
}

const slug = slugify(opt.subject);
if (!slug) {
  console.error('[new-review] --subject produced an empty slug (needs a-z0-9 characters)');
  process.exit(2);
}

const stamp =
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-` +
  `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const reviewId = `${stamp}-${slug}`;
const target = path.join(HERE, `${reviewId}.md`);

if (fs.existsSync(target)) {
  console.error(`[new-review] refusing to overwrite existing file: ${target}`);
  console.error('[new-review] if this is a second review of the same subject in the same');
  console.error('             second, pass --round 2 and re-run a moment later, or rename manually.');
  process.exit(2);
}

// --- render ----------------------------------------------------------------

const tags = opt.tags
  ? `[${opt.tags.split(',').map((t) => slugify(t)).filter(Boolean).join(', ')}]`
  : '[]';

const q = (v) => (v == null ? 'null' : `"${String(v).replace(/"/g, '\\"')}"`);

const vals = {
  review_id: reviewId,
  date_local: dateLocal,
  date_utc: dateUtc,
  subject: q(opt.subject),
  reviewer_agent: opt.reviewer,
  reviewer_seat: q(opt.seat || 'unspecified'),
  round: opt.round || '1',
  repo: opt.repo || 'n/a',
  repo_path: q(opt['repo-path'] || 'n/a'),
  branch: opt.branch || 'n/a',
  commit: opt.commit || 'n/a',
  scope: q(opt.scope || 'In: <state it>. Out: <state it>.'),
  verdict: opt.verdict || 'INCONCLUSIVE',
  defects: '{ critical: 0, high: 0, medium: 0, low: 0 }',
  unproven: '0',
  supersedes: opt.supersedes || 'null',
  superseded_by: 'null',
  tags,
};

let body = fs.readFileSync(TEMPLATE, 'utf8');

// Replace the front-matter block wholesale, preserving the rest of the template.
const fmEnd = body.indexOf('\n---', 3);
const rest = body.slice(fmEnd + 1);
const fm = Object.entries(vals).map(([k, v]) => `${k}: ${v}`).join('\n');
body = `---\n${fm}\n${rest}`;

// Convenience substitutions in the body header line so the reviewer only has to
// write findings, not re-type metadata.
body = body
  .replace('# HOSTILE REVIEW — <subject>', `# HOSTILE REVIEW — ${opt.subject}`)
  .replace('<agent> (<seat>), <date_local>', `${opt.reviewer} (${opt.seat || 'unspecified'}), ${dateLocal}`)
  .replace('**Verdict:** <verdict> — <C/H/M/L counts>', `**Verdict:** ${vals.verdict} — 0/0/0/0`);

if (opt['dry-run']) {
  console.log(`[new-review] DRY RUN — would create ${target}\n`);
  console.log(body);
  process.exit(0);
}

fs.writeFileSync(target, body, 'utf8');
console.log(`[new-review] created ${target}`);

// --- the backward half of the supersede link -----------------------------------
//
// The contract requires BOTH directions: the new file sets `supersedes: <old>`, AND the old
// file gets `superseded_by: <new>`. Setting only the forward half leaves the old review reading
// as CURRENT — which is what happened to four of the five relationships filed before
// 2026-09-20, because nothing made the second half easy. So the tool does it.
//
// This is the ONE sanctioned edit to a filed review. It changes no finding, no verdict and no
// count: it propagates the caller's own claim into the field the contract says must carry it.
if (opt.supersedes) {
  const oldPath = path.join(HERE, `${opt.supersedes}.md`);
  if (!fs.existsSync(oldPath)) {
    console.error(`[new-review] WARNING: --supersedes "${opt.supersedes}" but no such file exists.`);
    console.error('[new-review] the new review IS filed; its backward link was NOT set.');
  } else {
    const old = fs.readFileSync(oldPath, 'utf8');
    const oldFmEnd = old.indexOf('\n---', 3);
    const oldFm = oldFmEnd === -1 ? null : old.slice(0, oldFmEnd);
    if (oldFm === null || !/^superseded_by:.*$/m.test(oldFm)) {
      console.error(`[new-review] WARNING: ${opt.supersedes} has no superseded_by: line — backward link NOT set.`);
    } else {
      const current = ((oldFm.match(/^superseded_by:(.*)$/m) || [])[1] || '').trim();
      if (current && current !== 'null' && current !== reviewId) {
        console.error(`[new-review] WARNING: ${opt.supersedes}.superseded_by already says "${current}" — refusing to overwrite.`);
      } else {
        fs.writeFileSync(
          oldPath,
          oldFm.replace(/^superseded_by:.*$/m, `superseded_by: ${reviewId}`) + old.slice(oldFmEnd),
          'utf8',
        );
        // Assert off disk, not from the variable we just wrote.
        const after = fs.readFileSync(oldPath, 'utf8');
        const line = after.slice(0, after.indexOf('\n---', 3)).match(/^superseded_by:.*$/m);
        if (line && line[0] === `superseded_by: ${reviewId}`) {
          console.log(`[new-review] linked: ${opt.supersedes}.superseded_by = ${reviewId}`);
        } else {
          console.error(`[new-review] FAILED to set the backward link on ${opt.supersedes} — set it by hand.`);
        }
      }
    }
  }
}

// Deliberately NOT reindexed here. What was just written is a stamped template, not yet a
// review, and reindex.mjs refuses to index one (its UNFILLED TEMPLATE check). Reindexing
// here would publish a complete-looking record — real subject, real review_id, defects
// 0/0/0/0, unproven 0 — which is the exact smell the rule names. It also contradicted the
// documented two-step flow (stamp, then reindex), so the tool and its own docs disagreed.
console.log(`\n[next] write the findings into that file, then run: node ${SELF}/reindex.mjs`);
console.log('[next] until then it stays OUT of the index — by design, not by failure.');
````


#### 3.5.2 `reindex.mjs` — regenerates `index.jsonl` from front matter; the only writer of the index


````javascript
#!/usr/bin/env node
/**
 * reindex.mjs — regenerate index.jsonl from the front-matter of every review file.
 *
 * WHY THIS IS GENERATED AND NOT HAND-WRITTEN
 *
 * A hand-maintained index drifts from the thing it indexes, and a drifted index is
 * worse than no index because it is trusted. So the review files are the source of
 * truth and index.jsonl is a derived view, rebuilt from scratch on every run. There is
 * no incremental path that can get out of step, because there is no state carried
 * between runs.
 *
 * A review file with ANY problem — unparseable front-matter, an unfilled template, missing
 * keys, a review_id that does not match its filename, an unknown verdict, or a nested
 * `defects:` block — is reported to stderr and EXCLUDED from the index. Excluded is not
 * skipped: the problem is printed and the exit code is non-zero, so a malformed review is
 * visible rather than absent. Partial indexing is not an option — the summary line promises
 * these files are not in the index, and that promise has to be true.
 *
 * Usage:
 *   node reindex.mjs            # write index.jsonl
 *   node reindex.mjs --check    # report drift, write nothing, exit 1 if stale
 *
 * Exit: 0 ok · 1 drift (with --check) · 2 cannot run
 *
 * From another directory, prefix the absolute path — see README.md, §1
 * "How to invoke these tools" for the form your Node needs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Printed into runtime hints so they name a command that works from the caller's own
// directory. Forward slashes on purpose: a Windows path with backslashes is mangled by
// Git Bash, and the interpreter that resolved HERE is the one that will re-run the hint.
const SELF = HERE.replace(/\\/g, '/');
const INDEX = path.join(HERE, 'index.jsonl');

// Files that are part of the folder's apparatus, not reviews.
const NOT_A_REVIEW = new Set(['README.md', 'TEMPLATE.md', 'index.jsonl']);

// A file stamped by new-review.mjs but not yet written up is a TEMPLATE, not a review.
// These sentinels come from TEMPLATE.md and cannot appear in a finished review.
const TEMPLATE_SENTINELS = [
  '<what you actually did',
  'readable in 20 seconds',
  '<why it could not be checked>',
  '<title> [CRITICAL',
];

const CHECK_ONLY = process.argv.includes('--check');

// --- front-matter parsing ---------------------------------------------------
//
// Deliberately minimal: it handles exactly the shapes the header contract uses.
// Anything it cannot parse is an error, not a guess — a review whose header is
// silently misread is a review whose lookup keys are wrong.

function parseScalar(raw) {
  const v = raw.trim();
  if (v === '' || v === 'null' || v === '~') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return Number(v);

  // Inline flow mapping: { critical: 0, high: 2 }
  if (v.startsWith('{') && v.endsWith('}')) {
    const out = {};
    for (const pair of v.slice(1, -1).split(',')) {
      if (!pair.trim()) continue;
      const i = pair.indexOf(':');
      if (i === -1) throw new Error(`bad flow-map entry: ${pair}`);
      out[pair.slice(0, i).trim()] = parseScalar(pair.slice(i + 1));
    }
    return out;
  }

  // Inline flow sequence: [a, b, c]
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((s) => parseScalar(s));
  }

  // Quoted strings — strip one layer of quotes.
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function parseFrontMatter(text, file) {
  if (!text.startsWith('---')) {
    throw new Error('no YAML front-matter block (file must start with ---)');
  }
  const end = text.indexOf('\n---', 3);
  if (end === -1) throw new Error('front-matter block is not closed with ---');

  const block = text.slice(text.indexOf('\n', 3) + 1, end + 1);
  const fm = {};
  for (const line of block.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const i = line.indexOf(':');
    if (i === -1) throw new Error(`unparseable front-matter line: ${line}`);
    const key = line.slice(0, i).trim();
    try {
      fm[key] = parseScalar(line.slice(i + 1));
    } catch (e) {
      throw new Error(`${key}: ${e.message}`);
    }
  }
  return fm;
}

// --- scan ------------------------------------------------------------------

const REQUIRED = [
  'review_id', 'date_local', 'date_utc', 'subject', 'reviewer_agent', 'reviewer_seat',
  'round', 'repo', 'repo_path', 'branch', 'commit', 'scope', 'verdict', 'defects',
  'unproven', 'supersedes', 'superseded_by', 'tags',
];
const VERDICTS = new Set(['CLEAN', 'DEFECTS-FOUND', 'PARTIAL', 'INCONCLUSIVE']);

const rows = [];
const problems = [];

const entries = fs.readdirSync(HERE, { withFileTypes: true });

// A review inside a subdirectory would be INVISIBLE to this index, and silent
// invisibility is the exact failure this archive exists to prevent. The folder is
// deliberately flat, so say so loudly rather than skipping the contents.
const dirs = entries.filter((e) => e.isDirectory() && e.name !== '.git').map((e) => e.name);
if (dirs.length) {
  problems.push(
    `subdirectories present (${dirs.join(', ')}) — any review inside them is INVISIBLE to this ` +
      'index. The archive is deliberately flat: move them to the root, or extend this script to recurse.'
  );
}

const files = entries
  .filter((e) => e.isFile() && e.name.endsWith('.md') && !NOT_A_REVIEW.has(e.name))
  .map((e) => e.name)
  .sort();

for (const f of files) {
  let fm;
  let raw;
  try {
    raw = fs.readFileSync(path.join(HERE, f), 'utf8');
    fm = parseFrontMatter(raw, f);
  } catch (e) {
    problems.push(`${f}: ${e.message}`);
    continue;
  }

  // new-review.mjs writes the front-matter the moment it stamps the file, so an unfilled
  // template already looks complete to every check below: real subject, real review_id,
  // defects 0/0/0/0, unproven 0 — the exact "smell" the rule names. An indexed empty review
  // is worse than a missing one, because it is trusted. Refuse to index it, and say so.
  const unfilled = TEMPLATE_SENTINELS.filter((s) => raw.includes(s));
  if (unfilled.length) {
    problems.push(
      `${f}: UNFILLED TEMPLATE — still contains ${unfilled.map((s) => JSON.stringify(s)).join(', ')}. ` +
        'This is a stamped template, not a review, so it is NOT indexed. Write the findings, or ' +
        'remove the file (nothing has been filed yet).'
    );
    continue;
  }

  // EVERY problem excludes the file. That is not a style choice: the summary line below
  // states that the problem files "are NOT in the index", and for four of these checks that
  // statement used to be false — the file was pushed into the index anyway, carrying
  // `defects: null` with critical/high/medium/low leaked to the top level, where
  // `query.mjs --critical` could never see it and the listing rendered its defects as "-".
  // A warning that still publishes the record it warns about is the defect it claims to
  // prevent. So: collect the faults, then refuse the file as a unit.
  const faults = [];

  const missing = REQUIRED.filter((k) => !(k in fm));
  if (missing.length) faults.push(`missing keys: ${missing.join(', ')}`);

  const stem = f.replace(/\.md$/, '');
  if (fm.review_id !== stem) {
    faults.push(`review_id "${fm.review_id}" != filename stem "${stem}"`);
  }
  if (fm.verdict && !VERDICTS.has(fm.verdict)) {
    faults.push(`verdict "${fm.verdict}" is not one of ${[...VERDICTS].join('|')}`);
  }
  // The header contract writes defects as an inline flow map. A nested YAML block is NOT
  // parsed by parseScalar: `defects` becomes null and critical/high/medium/low leak to the
  // top level, so REQUIRED still passes and the index would carry wrong counts while
  // reporting no problem at all. Refuse that shape explicitly rather than indexing a lie.
  if (
    'defects' in fm &&
    (fm.defects === null || typeof fm.defects !== 'object' || Array.isArray(fm.defects))
  ) {
    faults.push(
      `defects must be an inline flow map — { critical: 0, high: 0, medium: 0, low: 0 } — ` +
        `got ${JSON.stringify(fm.defects)}. A nested YAML block is not parsed; its keys leak to the top level.`
    );
  }

  if (faults.length) {
    for (const p of faults) problems.push(`${f}: ${p}`);
    continue; // excluded, so the "NOT in the index" summary is literally true
  }

  rows.push({ file: f, ...fm });
}

// --- reciprocal supersede links ------------------------------------------------
//
// The contract requires BOTH halves: the new review sets `supersedes: <old>`, AND the old
// review gets `superseded_by: <new>`. Four of the five relationships filed before 2026-09-20
// had only the forward half, so the superseded reviews still read as CURRENT — which is the
// "stale verdict gets read as current" failure this archive exists to prevent. Nothing checked
// it, so nothing noticed. `relink.mjs` repairs a one-way link; this reports it so it cannot
// recur silently.
const byId = new Map(rows.map((r) => [r.review_id, r]));
for (const r of rows) {
  if (!r.supersedes) continue;
  const target = byId.get(r.supersedes);
  if (!target) {
    problems.push(
      `${r.file}: supersedes "${r.supersedes}", which is not in the index. A supersede link ` +
        'must point at a review that exists.'
    );
    continue;
  }
  if (target.superseded_by !== r.review_id) {
    problems.push(
      `${target.file}: superseded_by is ${JSON.stringify(target.superseded_by)} but ` +
        `"${r.review_id}" declares supersedes: ${r.supersedes}. The link is not reciprocal, so ` +
        `the older review still reads as current — run \`node ${SELF}/relink.mjs\`.`
    );
  }
}

// --- the OTHER direction of the same link --------------------------------------
//
// The loop above validates `supersedes:` against the index. Nothing validated
// `superseded_by:`, and the asymmetry was measurable: `new-review.mjs --supersedes <old>`
// sets the backward link the moment it stamps the new file, and if that stamped file is then
// abandoned or deleted — which the README explicitly permits while it is still a template —
// the old review stays marked superseded by a review_id that exists nowhere. Measured state:
// reindex exit 0, no problem reported, and `query.mjs --superseded` listing a live CLEAN
// review as replaced. An agent filtering out superseded reviews would drop a valid verdict in
// favour of a review that was never written.
//
// The check is on DISK, not on index membership, because a target that exists but is not yet
// indexed is the documented transient state (stamp, then write up) and the unfilled-template
// problem above already covers it. Only a target that exists NOWHERE is dangling.
for (const r of rows) {
  if (!r.superseded_by) continue;
  if (byId.has(r.superseded_by)) continue;
  if (fs.existsSync(path.join(HERE, `${r.superseded_by}.md`))) continue;
  problems.push(
    `${r.file}: superseded_by "${r.superseded_by}" exists nowhere — no such review_id in the ` +
      'index and no such file on disk. A live verdict is being presented as replaced by a ' +
      'review that was never written. Clear the field, or file the review it names.'
  );
}

// Newest last, so `tail index.jsonl` is the most recent review.
rows.sort((a, b) => String(a.review_id).localeCompare(String(b.review_id)));

const out = rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : '');

// --- report ----------------------------------------------------------------

for (const p of problems) console.error(`[reindex] PROBLEM ${p}`);

if (CHECK_ONLY) {
  const current = fs.existsSync(INDEX) ? fs.readFileSync(INDEX, 'utf8') : '';
  if (current === out) {
    console.log(`[reindex] up to date — ${rows.length} review(s)`);
    process.exit(problems.length ? 1 : 0);
  }
  console.error('[reindex] DRIFT — index.jsonl does not match the review files');
  process.exit(1);
}

fs.writeFileSync(INDEX, out, 'utf8');
console.log(`[reindex] wrote index.jsonl — ${rows.length} review(s)`);
if (problems.length) {
  console.error(`[reindex] ${problems.length} problem(s) above — those files are NOT in the index`);
  process.exit(1);
}
````


#### 3.5.3 `query.mjs` — the lookup surface other agents are told to use *first*


````javascript
#!/usr/bin/env node
/**
 * query.mjs — look up hostile reviews without opening a thousand files.
 *
 * Reads index.jsonl (the derived index) and filters it. Zero dependencies — `jq` is
 * not installed on this machine, so the folder must not depend on it.
 *
 * Usage:
 *   node query.mjs                          # every review, newest last
 *   node query.mjs --subject swan-coach     # case-insensitive regex on review_id+file+subject+scope+tags
 *   node query.mjs --verdict CLEAN
 *   node query.mjs --critical               # defects.critical > 0
 *   node query.mjs --high                   # defects.high > 0
 *   node query.mjs --unproven               # unproven > 0  (the honesty list)
 *   node query.mjs --agent sable
 *   node query.mjs --repo SS-PT
 *   node query.mjs --commit abc1234
 *   node query.mjs --superseded
 *   node query.mjs --tag disk
 *   node query.mjs --ids                    # review_id only, for piping
 *   node query.mjs --json                   # raw JSON lines
 *   node query.mjs --files                  # filenames only
 *
 * Filters compose (AND). Exit 0 with matches, 1 with none, 2 cannot run.
 *
 * From another directory, prefix the absolute path. Which form your Node needs —
 * `Z:/...` for Windows Node, `/mnt/z/...` for WSL's — is in README.md, §1
 * "How to invoke these tools". Getting it wrong is `Cannot find module`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Printed into runtime hints so they name a command that works from the caller's own
// directory. Forward slashes on purpose: a Windows path with backslashes is mangled by
// Git Bash, and the interpreter that resolved HERE is the one that will re-run the hint.
const SELF = HERE.replace(/\\/g, '/');
const INDEX = path.join(HERE, 'index.jsonl');

const argv = process.argv.slice(2);
const flags = new Set();
const opt = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) continue;
  const key = a.slice(2);
  const next = argv[i + 1];
  if (next === undefined || next.startsWith('--')) { flags.add(key); continue; }
  opt[key] = next;
  i++;
}

if (!fs.existsSync(INDEX)) {
  console.error(`[query] no index.jsonl — run \`node ${SELF}/reindex.mjs\` first`);
  process.exit(2);
}

// Warn (do not block) if the index is stale: a stale index answers confidently and
// wrongly, which is worse than no answer.
try {
  execFileSync(process.execPath, [path.join(HERE, 'reindex.mjs'), '--check'], { stdio: 'pipe' });
} catch {
  console.error(`[query] WARNING: index.jsonl is stale or has problems — run \`node ${SELF}/reindex.mjs\``);
}

let rows = fs
  .readFileSync(INDEX, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((l) => { try { return JSON.parse(l); } catch { return null; } })
  .filter(Boolean);

const before = rows.length;

if (opt.subject) {
  // An invalid pattern used to throw an uncaught SyntaxError out of `new RegExp` and exit 1 —
  // the documented code for "no matches". So a malformed query was indistinguishable from an
  // empty result, and the caller got a Node stack trace instead of an error. Measured with
  // `--subject "c-drive ("`, `"["`, `"a{2,1}"`, `"*x"`: all four crashed, all four exited 1.
  // "Cannot run" is exit 2, and it has to actually be exit 2.
  let re;
  try {
    re = new RegExp(opt.subject, 'i');
  } catch (e) {
    console.error(`[query] --subject ${JSON.stringify(opt.subject)} is not a valid regular expression: ${e.message}`);
    console.error('[query] exit 2 — the query could not run. Do NOT read this as "no matches".');
    process.exit(2);
  }
  // review_id and file are part of the surface, not just subject/scope/tags. The review_id is
  // this archive's primary key — it is the filename stem, the first column of every listing,
  // and the value a later review cites in `supersedes:`. An agent told "see review
  // 2026-09-19-130800-c-drive-forensics" must be able to find it by that string; before this,
  // `--subject <review_id>` returned nothing and the key was unqueryable.
  rows = rows.filter((r) =>
    re.test(r.review_id || '') || re.test(r.file || '') ||
    re.test(r.subject || '') || re.test(r.scope || '') || (r.tags || []).some((t) => re.test(t)),
  );
}
if (opt.verdict) rows = rows.filter((r) => r.verdict === opt.verdict.toUpperCase());
if (flags.has('critical')) rows = rows.filter((r) => (r.defects?.critical || 0) > 0);
if (flags.has('high')) rows = rows.filter((r) => (r.defects?.high || 0) > 0);
if (flags.has('unproven')) rows = rows.filter((r) => (r.unproven || 0) > 0);
if (opt.agent) rows = rows.filter((r) => r.reviewer_agent === opt.agent);
if (opt.repo) rows = rows.filter((r) => r.repo === opt.repo);
if (opt.commit) rows = rows.filter((r) => r.commit === opt.commit);
if (opt.tag) rows = rows.filter((r) => (r.tags || []).includes(opt.tag));
if (flags.has('superseded')) rows = rows.filter((r) => r.superseded_by != null);

rows.sort((a, b) => String(a.review_id).localeCompare(String(b.review_id)));

// --- output ----------------------------------------------------------------

if (flags.has('json')) {
  rows.forEach((r) => console.log(JSON.stringify(r)));
} else if (flags.has('ids')) {
  rows.forEach((r) => console.log(r.review_id));
} else if (flags.has('files')) {
  rows.forEach((r) => console.log(r.file));
} else {
  if (!rows.length) {
    console.log(`no reviews match (${before} in the archive)`);
  } else {
    const d = (r) => {
      const x = r.defects || {};
      const n = (x.critical || 0) + (x.high || 0) + (x.medium || 0) + (x.low || 0);
      return n ? `C${x.critical || 0}/H${x.high || 0}/M${x.medium || 0}/L${x.low || 0}` : '-';
    };
    console.log(`${'review_id'.padEnd(58)} ${'verdict'.padEnd(14)} ${'defects'.padEnd(18)} unprov  subject`);
    console.log('-'.repeat(150));
    for (const r of rows) {
      console.log(
        `${String(r.review_id).padEnd(58)} ${String(r.verdict).padEnd(14)} ${d(r).padEnd(18)} ` +
        `${String(r.unproven ?? '-').padEnd(7)} ${r.subject}`,
      );
    }
    console.log(`\n${rows.length} of ${before} review(s)`);
  }
}

process.exit(rows.length ? 0 : 1);
````


#### 3.5.4 `relink.mjs` — repairs a one-way supersede link


````javascript
#!/usr/bin/env node
/**
 * relink.mjs — repair one-way supersede links.
 *
 * The contract requires BOTH directions: the new review sets `supersedes: <old>`, AND the old
 * review gets `superseded_by: <new>`. Four of five filed relationships had only the forward
 * half, so the superseded reviews still read as current — the exact "stale verdict read as
 * current" failure the archive exists to prevent.
 *
 * This is the ONE sanctioned edit to a filed review. It is not "editing a review into
 * correctness": it changes no finding, no verdict and no count. It propagates the author's own
 * claim — already written in their `supersedes:` field — to the field the contract says must
 * carry it. The value is not a judgement; it is derivable.
 *
 * Refuses rather than guesses:
 *   - target missing from the index
 *   - target's `superseded_by` already names a DIFFERENT successor (a real conflict)
 *   - target's front-matter has no `superseded_by:` line to set
 *
 * Usage: node relink.mjs [--dry-run]     (or `node Z:/HostileReviews/relink.mjs` from
 *                                          anywhere else — see README.md §1)
 * Exit: 0 all links reciprocal · 1 repairs were needed (and were made) · 2 cannot run
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Printed into runtime hints so they name a command that works from the caller's own
// directory. Forward slashes on purpose: a Windows path with backslashes is mangled by
// Git Bash, and the interpreter that resolved HERE is the one that will re-run the hint.
const SELF = HERE.replace(/\\/g, '/');
const DRY = process.argv.includes('--dry-run');

const indexPath = path.join(HERE, 'index.jsonl');
if (!fs.existsSync(indexPath)) {
  console.error(`[relink] no index.jsonl — run \`node ${SELF}/reindex.mjs\` first`);
  process.exit(2);
}

const rows = fs.readFileSync(indexPath, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const byId = new Map(rows.map((r) => [r.review_id, r]));

let repaired = 0, refused = 0, already = 0;

for (const r of rows) {
  if (!r.supersedes) continue;
  const target = byId.get(r.supersedes);

  if (!target) {
    console.error(`[relink] REFUSE ${r.review_id}: supersedes "${r.supersedes}", which is not in the index`);
    refused++;
    continue;
  }
  if (target.superseded_by === r.review_id) { already++; continue; }
  if (target.superseded_by != null && target.superseded_by !== r.review_id) {
    console.error(
      `[relink] REFUSE ${target.review_id}: already claims superseded_by "${target.superseded_by}", ` +
        `but "${r.review_id}" also claims to supersede it. Two successors — resolve by hand.`
    );
    refused++;
    continue;
  }

  const p = path.join(HERE, target.file);
  if (!fs.existsSync(p)) {
    console.error(`[relink] REFUSE ${target.review_id}: file not on disk (${target.file})`);
    refused++;
    continue;
  }

  const before = fs.readFileSync(p, 'utf8');
  // Scope the edit to the front-matter block. A `superseded_by:` appearing in prose is not a
  // field, and rewriting it would be corrupting the review.
  const fmEnd = before.indexOf('\n---', 3);
  if (fmEnd === -1) {
    console.error(`[relink] REFUSE ${target.review_id}: front-matter block is not closed`);
    refused++;
    continue;
  }
  const fm = before.slice(0, fmEnd);
  const body = before.slice(fmEnd);

  if (!/^superseded_by:.*$/m.test(fm)) {
    console.error(`[relink] REFUSE ${target.review_id}: no superseded_by: line in the front-matter`);
    refused++;
    continue;
  }
  const patchedFm = fm.replace(/^superseded_by:.*$/m, `superseded_by: ${r.review_id}`);
  const after = patchedFm + body;

  if (DRY) {
    console.log(`[relink] DRY  would set ${target.review_id}.superseded_by = ${r.review_id}`);
    repaired++;
    continue;
  }

  fs.writeFileSync(p, after, 'utf8');

  // Assert off disk. Every write in this workstream has to be proven from the file, not from
  // the variable it came from.
  const check = fs.readFileSync(p, 'utf8');
  const line = check.slice(0, check.indexOf('\n---', 3)).match(/^superseded_by:.*$/m);
  if (!line || line[0] !== `superseded_by: ${r.review_id}`) {
    console.error(`[relink] FAILED ${target.review_id}: wrote, but the field reads ${JSON.stringify(line && line[0])}`);
    refused++;
    continue;
  }
  // The body must be byte-identical — this edit may not touch anything else.
  if (check.slice(check.indexOf('\n---', 3)) !== body) {
    console.error(`[relink] FAILED ${target.review_id}: the body changed. Restore from backup.`);
    refused++;
    continue;
  }

  console.log(`[relink] SET  ${target.review_id}.superseded_by = ${r.review_id}`);
  repaired++;
}

console.log(`\n[relink] reciprocal already: ${already} · repaired: ${repaired} · refused: ${refused}`);
if (refused) process.exit(2);
console.log(`[relink] run \`node ${SELF}/reindex.mjs\` to refresh the index`);
process.exit(repaired ? 1 : 0);
````


#### 3.5.5 `census-hostile.mjs` — the legacy-location census


````javascript
#!/usr/bin/env node
/**
 * census-hostile.mjs — generate the numbers the archive README hand-types.
 *
 * Reproduces the classes in Z:\HostileReviews\README.md §7 so the counts can be
 * asserted rather than trusted. Prints the table, then the sum check.
 *
 * Zero dependencies. Run: node census-hostile.mjs [repoRoot]   (from another directory,
 * prefix the absolute path — see README.md §1 "How to invoke these tools")
 */

import fs from 'node:fs';
import path from 'node:path';

// Flags must be stripped BEFORE reading the positional root, or `--all` becomes the root
// and the census silently reports zero of everything against a directory named "--all".
const ARGS = process.argv.slice(2);
const ALL = ARGS.includes('--all');
const positional = ARGS.filter((a) => !a.startsWith('--'));
const ROOT = positional[0] || path.join(os.homedir(), 'Desktop/@Everything/quick-pt/SS-PT');
const RX = /hostile/i;

// A path segment that marks a stale worktree checkout. These hold a duplicate copy of
// every tracked file, so a naive walk counts the same review once per worktree.
const isWorktreeCopy = (rel) => /(^|[\\/])(\.claude[\\/]worktrees|tmp[\\/]worktrees)[\\/]/.test(rel);
const isGitInternals = (rel) => /(^|[\\/])\.git[\\/]/.test(rel);

let all = 0;
const byClass = { worktree: 0, gitLogsRefs: 0, distinct: 0 };
const distinctByDir = new Map();
const worktreeNames = new Set();

function walk(dir, relBase = '') {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const rel = relBase ? `${relBase}/${e.name}` : e.name;

    // Do not descend into a nested .git of a worktree; its internals are counted
    // through the worktree copy itself, not as separate documents.
    if (e.isDirectory()) {
      if (e.name === '.git') continue; // handled by the .git/logs/refs pass below
      if (e.isSymbolicLink()) continue; // a junction is one file, not two
      walk(abs, rel);
      continue;
    }
    if (!e.isFile()) continue;
    if (!RX.test(e.name)) continue;

    all++;
    if (isWorktreeCopy(rel)) {
      byClass.worktree++;
      const m = rel.match(/(?:\.claude[\\/]worktrees|tmp[\\/]worktrees)[\\/]([^\\/]+)/);
      if (m) worktreeNames.add(m[1]);
      continue;
    }
    if (isGitInternals(rel)) {
      byClass.gitLogsRefs++;
      continue;
    }
    byClass.distinct++;
    const top = rel.split('/').slice(0, -1).join('/') || '(root)';
    distinctByDir.set(top, (distinctByDir.get(top) || 0) + 1);
  }
}

// .git/logs/refs/** — counted explicitly because the walk skips .git entirely.
function countGitLogsRefs(dir, relBase = '.git/logs/refs') {
  let n = 0;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const e of entries) {
    if (e.isDirectory()) n += countGitLogsRefs(path.join(dir, e.name), `${relBase}/${e.name}`);
    else if (e.isFile() && RX.test(e.name)) n++;
  }
  return n;
}

walk(ROOT);
const gitRefs = countGitLogsRefs(path.join(ROOT, '.git', 'logs', 'refs'));
// Fold the reflog files into the internals class.
byClass.gitLogsRefs = gitRefs;
const grand = byClass.worktree + byClass.gitLogsRefs + byClass.distinct;

console.log(`repo: ${ROOT}`);
console.log('');
console.log('| Class | Count |');
console.log('|---|---|');
console.log(`| Duplicates inside git worktree checkouts | ${byClass.worktree} |`);
console.log(`| .git/logs/refs/** | ${byClass.gitLogsRefs} |`);
console.log(`| Distinct documents outside the above | ${byClass.distinct} |`);
console.log(`| **Total** | **${grand}** |`);
console.log('');
console.log(`sum check: ${byClass.worktree} + ${byClass.gitLogsRefs} + ${byClass.distinct} = ${grand}`);
console.log(`raw name-matches seen during walk (pre-classification): ${all}`);
console.log(`distinct worktree directories contributing duplicates: ${worktreeNames.size}`);
console.log('');
const rows = [...distinctByDir.entries()].sort((a, b) => b[1] - a[1]);
console.log(`distinct documents by directory (${ALL ? 'all' : 'top 15'}):`);
rows.slice(0, ALL ? rows.length : 15).forEach(([d, n]) => console.log(`  ${String(n).padStart(4)}  ${d}`));
if (ALL) {
  const rowSum = rows.reduce((a, [, n]) => a + n, 0);
  console.log('');
  console.log(`directory-row sum: ${rowSum} (must equal distinct total ${byClass.distinct})`);
}
````



### 3.6 The supersede doctrine, verbatim — taken from a SECOND installed surface

The doctrine below was sliced from `~/.codex/AGENTS.md`. §3.2's rule block was sliced from
`~/.claude/CLAUDE.md`. The system claims this text is installed **identically in seventeen
instruction files**; you are being shown two of them so you can judge the claim from evidence
rather than from my assertion.

**Parity check performed at packet-build time:** the doctrine block is byte-identical between
`~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md`: **TRUE**.


````markdown
- **Supersede, never correct.** A later round writes a NEW file with
  `supersedes: <old-review_id>` and sets `superseded_by` on the old one. Never edit a filed
  review into correctness, never append a second review to an existing file, and **never
  delete**. The record of what was believed at the time is the value.
  **The one edit that is required, not forbidden:** setting `superseded_by` on the old
  review is the backward half of the same link, not a correction — it changes no finding,
  no verdict and no count, and leaving it unset makes the older review still read as
  current. `new-review.mjs --supersedes` writes it, `relink.mjs` repairs a missing one,
  and `reindex.mjs` reports a link that is not reciprocal.
````



---

## 4. WHAT I ALREADY FOUND — do not restate these; attack the fixes

Round 15 of my own hostile pass over this system produced eleven defects, all claimed fixed and
re-verified. **They are listed so you can attack the fixes**, and so you do not spend your reply
telling me things I have already written down.

The filed review is `2026-09-20-020945-rule-86-archive-round-15-the-doctrine-the` —
`verdict: DEFECTS-FOUND`, `defects: {critical: 0, high: 2, medium: 5, low: 4}`, `unproven: 8`.

| id | what was wrong | the fix as claimed |
|---|---|---|
| D27 | The doctrine forbade an action and, in a separate paragraph, required an exception to it, without joining the two. The prohibition governed, so 4 of 5 supersede links were one-way and an older review still read as current. | A clarification paragraph appended to all 17 copies, naming the backward link as the one required edit. |
| D28 | The invocation documented in the skill (`/mnt/z/...`) fails under Windows Node, resolving to `C:\mnt\z\...`. Four path forms measured; only two work. | Each tool derives its own path from `import.meta.url` and prints a correct hint; the README gained an environment→form table. |
| D31 | The flag that writes the backward link was absent from `--help` and from both documented recipes, and the indexer skipped reviews with no declared predecessor — so a missing link was invisible. | The flag documented in `--help` and both recipes; an existence check added to the indexer. |
| D32 | A test asserted equality against counts (290, 64) that other sessions were mutating mid-pass, producing regression-shaped failures for non-regressions. | The count table was deleted from the README; the test now asserts the *method*, and a second asserts the *absence* of hand-copied counts. |
| D33 | `superseded_by` was validated nowhere. Deleting a stamped predecessor left the indexer exiting 0 while `query --superseded` still listed a live review as replaced. | An on-disk existence check in `reindex.mjs`. |
| D34 | The supersede flag accepted a filesystem path, so it could write outside the archive. | A review-id grammar guard; a non-conforming value exits 2. |
| D35 | The test suite failed when *another agent* filed a review, because it asserted the index was already current. | The check now reindexes first and requires exit 0. |
| D36 | The rollout missed three repo-local harness instruction files entirely, and no Cursor surface anywhere carried the rule. | The block appended to the three repo files. |
| D37 | A malformed subject regex crashed the query tool with exit 1 — the "no matches" code — so the failure was unreadable. | try/catch, exit 2 with a message. |
| D38 | The README told readers to hand-copy the template, skipping the tool that exists to prevent exactly that. | §1 rewritten to point at the tool. |

**Known-open items I am NOT claiming are fixed** — a finding here is a duplicate:

- The three repo-local harness copies sit at an older revision than the canonical user-level one.
- The closeout gate script enforces review debt but has no notion of a review id, and
  `.git/hooks/` is empty. The rule is enforced by an agent reading it, not by a mechanism.
- The archive is a shared resource: during one pass the review count moved from 31 to 45, and a
  second agent session filed its own review three minutes after mine. Concurrent writers are
  normal here, not exceptional.
- An unrelated `adapter-core` parity check fails on a pre-existing divergence.

### 4.1 The honest status of my own dry-loop — hold me to this

I ran ten rounds (15–24). Seven found at least one defect. The last three were clean. **But the
last three were narrower than the first seven** — they were targeted consistency sweeps, and the
probes still running were substantially the regression suite for the fixes just made. So "three
clean rounds" is true and "the surface is exhausted" is **not** established. If your review finds
something, that is evidence for the narrower reading, and I would rather have that than
agreement. Do not let my §4 list anchor you into thinking the surface is closed.


---

## 5. THE LOAD-BEARING CLAIMS — falsify these

The system asserts the following. Each is a claim that can be false, and a false one is a
finding. This list is deliberately **claims to falsify, not my suspicions** — I have not told you
where I think the weak points are, because your independence is the value.

1. **"A review that is not filed did not happen."** Is there a path by which a review is produced,
   believed, and never filed — and does anything notice?
2. **The filename stem is the review id, and it is unique.** Can two reviews collide on one
   filename? What happens if they do — silent overwrite, or an error?
3. **The header is the machine-greppable lookup surface.** Can a legal-looking header fail to
   parse, or parse into something different from what a human reads? What about a subject
   containing a colon, a quote, a newline, or the character that terminates a YAML scalar?
4. **The index is derived, never maintained, so it cannot drift from the files.** Is that true at
   every entry point? Is there a read path that trusts a stale index?
5. **`supersedes` / `superseded_by` form a reciprocal pair.** What happens to a chain of three?
   To a cycle? To a link whose target was deleted? To two reviews both claiming to supersede the
   same predecessor?
6. **`unproven` is not optional, and zero on a non-trivial review is a smell.** Is the field
   load-bearing or decorative? Does anything read it?
7. **The severity counts mean something.** With no scale defined, what does
   `{critical: 0, high: 2, ...}` communicate to a reader, and can it be gamed or misread?
8. **`commit: dirty` records that a verdict is valid only for that tree.** Is that enforced,
   checked, or merely noted? Can a review cite a tree that no longer exists?
9. **"Before you review, look."** The rule tells an agent to query the archive first. Is the query
   surface capable of answering the question the rule asks it to answer — "has this been reviewed,
   and do the findings still hold"?
10. **The rule is enforced by compliance, and that is stated honestly.** Given that, is the rule's
    *wording* calibrated to the enforcement it actually has? A rule that reads as mandatory but
    has no mechanism is a different artifact from one that says so.

### 5.1 A specific trap to avoid, stated because it has bitten before

If you conclude that an artifact is missing, or that a claim is unsupported, **do not report
absence on the strength of not having been shown it.** This packet inlines what it inlines; the
repository contains more, and the archive contains 45 files of which you are seeing a handful.
Say "not supplied in this packet" rather than "does not exist", and I will treat those two very
differently. A wrong absence-claim is worse than no finding, because it sends me looking for
something that was never lost.


---

## 6. WHY THIS PACKET IS SHAPED THE WAY IT IS

Two facts about the transport, recorded so you can calibrate:

- You were given a read-only sandbox and **the reads may or may not work** — that is a known
  property of this transport, not a signal about you. This packet is therefore fully inlined: if
  your reads are refused, you still have everything. **If your reads do work, you are still asked
  not to use them**, because a review that depends on repo access is not reproducible by me.
- Consequently **every finding should be justifiable from the text in this packet alone.** If a
  finding needs a file you were not given, mark it UNVERIFIED and say what you would need. A
  conditional finding is useful; a confident finding about unseen code is not.

What the caller will do with your reply: read your opening prose for any self-reported
limitation and record it in the review header; adjudicate every finding against the real source
with file:line evidence, marking each CONFIRMED, REFUTED, OVERSTATED or UNVERIFIABLE; make the
fixes; and file your review into the archive with you named as the reviewer and the reasoning
effort recorded.
