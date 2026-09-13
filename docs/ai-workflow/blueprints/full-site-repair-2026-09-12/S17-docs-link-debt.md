# S17 — Documentation link-debt closure

Final slice of the canonical `full-site-repair-2026-09-12` packet. Opened
2026-09-13, after the deployed release `e07d4b9` left exactly one CI check red.

## 1. Requirement and origin

**Job:** the repository's own `Documentation Link Check` workflow has been
failing on every run. The release verdict records it as an honest limit:
*"the historical documentation checker still has 1870 dead links across 105
unchanged files."* Sean selected this as the final slice of the repair packet,
under the standing constraint recorded in the handoff:

> Repair as a separate scoped documentation maintenance task with a baseline.
> **Do not weaken checker or relabel it green.**

**Outcome required:** the check passes because the documentation in scope is
actually correct, and the residual is an explicit, enumerated, shrink-only
ledger — not because the check was silenced.

**Non-goals:** rewriting frozen historical records, editing vendored upstream
skill bundles, deleting documentation to make a number smaller, raising
timeouts, adding retries, or narrowing the checked scope without a recorded,
evidenced reason per entry.

## 2. What was actually wrong

Three independent defects, each measured rather than assumed.

### 2.1 Discovery swept the whole repository

The workflow delegated everything to
`gaurav-nelson/github-action-markdown-link-check@v1`. With no `folder-path`
input, that action runs (read from its `entrypoint.sh`):

```
find . -name '*.md' -not -path './node_modules/*' -exec markdown-link-check {} ...
```

That includes directories which are not maintained documentation: frozen
archives, saved model transcripts, and vendored upstream skill bundles.

### 2.2 Local and CI ran different engines, six minor versions apart

`package-lock.json` resolves `markdown-link-check` to **3.14.2**. The action
global-installs **3.8.7**, pinned in its own `entrypoint.sh` at the resolved
action SHA `5c5dfc0ac2e225883c0e5f03a85311ec2830d368`.

The version is corroborated by the CI log itself: it resolves `request`, a
dependency only `link-check` <= 3.12.x has, and contains no `needle` (3.13+
replaced `request` with `needle`). An earlier draft of this document said
3.13.7; that came from reading the action's `master` branch instead of the
pinned SHA, and was wrong.

The strictness difference is measurable in one direction and not the other:

- **Same-document anchors: newly validated.** The CI log (engine 3.8.7) contains
  **zero** anchor failures across all 105 failing files, while 3.14.2 reports
  **55** anchor failures in the checked scope alone. 3.8.7 did not validate
  heading anchors — its local-file check is a bare `fs.access`, with no notion of
  a heading id; 3.14.2 does.
- **`mailto:`: the domain half is new.** 3.8.7 checks the *syntax* of the address
  only (`isemail`); 3.14.2 additionally resolves the domain's MX records. Ten
  distinct placeholder addresses were measured flipping from `alive 200` under
  3.8.7 to `dead 400` under 3.14.2. The 4 `mailto:` failures present in the CI log
  are exactly the syntactically malformed ones (`testclient_...@test.com`), which
  both engines reject.

Two earlier drafts got this wrong in opposite directions — first claiming 3.14.2
introduced `mailto:` checking outright, then claiming `mailto:` checking was
"not new". Both are corrected here against a direct run of the pinned engine.

**Consequence.** Of the 105 dead links in the checked scope, **67 are of a class
the old engine did not evaluate at all** (55 anchors + 12 domain-resolving
`mailto:`), and 38 are of the class both engines evaluate. Treat the CI log's own
counts and the 3.14.2 counts as two different measurements on two different days,
not as a partition of one another.

### 2.3 Nothing reproduced CI locally

Root `package.json` declared
`check-docs-links: npx markdown-link-check docs/**/*.md docs/*.md README.md --config .github/markdown-link-check-config.json`
— a small fraction of what CI swept, running a third engine version. To be
precise about how much it hid: that command covers 23 of the 28 failing files and
**84 of the 105** dead links, so the debt was not invisible to it — it was
partially visible and completely unreconciled with CI, which is worse, because
running it produced a false sense of coverage.

A gate that is permanently red, unmatched by any local command, and running an
unpinned engine protects nothing. GitHub's API settles the "for months" claim:
across the 100 most recent `docs-check` runs (2026-04-08 to 2026-09-13) there were
98 failures and 2 startup failures — **zero successes**.

## 3. Baseline reconciliation

Parsed from the failing job log captured for the parent commit `aafe387a9` — the
last run of that workflow before the release, and the source of the "1870 dead
links" figure. (An earlier draft called it "the log for `e07d4b9`"; the log's own
checkout line says `aafe387a9`, and GitHub reports **zero** `docs-check` runs for
`e07d4b9` itself. The numbers are unaffected: `e07d4b9` changes no Markdown, and
the log's 2930 files are `e07d4b9`'s tree.) Parsed by
`.mega-blueprints/artifacts/docs-link-debt-20260913/parse-docs-log.mjs`.

| Quantity | Value |
|---|---|
| Files the action reported failing | 105 |
| Dead links the action reported | 1870 |
| Raw `[✖]` lines in the log | 3740 |
| Raw lines ÷ reported, **per file** | exactly 2 for all 105 files (0 mismatches) |

The action's verbose mode prints each dead link twice per file. De-duplicating by
string is wrong — **632 of the 1870** summary printings differ byte-for-byte from
their inline counterpart (11 differ at the level of the link target). The per-file
`ERROR: N dead links found!` count the checker itself emits is authoritative; the
parser takes the first N `[✖]` lines of each file block and reconciles to exactly
1870.

Authoritative re-measurement with the locked engine (3.14.2), full run over the
repaired tree:

| Quantity | Value |
|---|---|
| Tracked Markdown files | 2931 |
| In the checked scope | 1145 |
| In the excluded ledger | 1786 |
| Dead links in scope, after repair | **0** |
| Dead links in the excluded ledger | 1865 |

(The counts are one higher than the pre-repair tree because this document is
itself tracked Markdown and in scope.)

The pre-repair in-scope figure quoted in earlier drafts was 92. That number came
from a run made **while the repairs were being written**, so it is a snapshot of
a moving tree and is not reproducible; hostile review caught this.

### 3a. The pre-repair baseline, measured cleanly

Re-measured by checking out `e07d4b9` into a pristine worktree (verified: zero
modified Markdown), dropping in the gate and manifest, and running
`--scope=in` with the locked engine:

| Quantity | Value |
|---|---|
| Dead links in the checked scope **before repair** | **105** |
| Files affected | 28 |
| — same-document anchors | 55 |
| — `mailto:` at non-resolving domains | 16 |
| — everything else (internal paths, external URLs) | 34 |

Receipt: `.mega-blueprints/artifacts/docs-link-debt-20260913/baseline-pristine-in-scope.json`.

Two honest caveats about that receipt, both raised by hostile review:

- It was produced with a **pre-review revision** of the gate (its log says
  `confirming 28 of 28 failing file(s)`; the current gate re-checks only
  transient failures and would confirm far fewer). The link set it records is
  still the right set, but it does not evidence the confirmation mechanism as it
  now stands.
- At least one entry is **transient inflation**:
  `https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/` was recorded as
  dead (socket hang up) and answers HTTP 200 to `curl` and to the same engine
  today. It was never repaired. So 105 is a slight over-count of genuine defects;
  the true figure is a handful lower.

For comparison, under the same scope partition the CI log (engine 3.8.7) contains
**37** in-scope dead links across **17** files: 13 external, 24 internal. The two
figures are measurements by different engines on different days, and are not a
partition of one another. (An earlier draft said 25 files here; 25 was the
contaminated receipt's file count, not this one's.)

## 4. Scope decision

One principle, applied uniformly:

> The link check guards **maintained documentation** — pages a reader is
> expected to navigate today. Frozen historical records and vendored upstream
> bundles are excluded, because their content must not be rewritten and
> link-checking them produces a permanent red signal that cannot be cleared.

Every exclusion cites its evidence and must match a declared class pattern
(rule 33 classification). The full record is `scripts/ci/docs-link-scope.json`.

| Excluded path | Class | Mechanism | Evidence |
|---|---|---|---|
| `.agents/`, `.claude/`, `.continue/`, `.cursor/` | vendored upstream content | whole prefix | `skills-lock.json` records upstream `source` + `computedHash` per skill |
| `archive/` | archive-only historical record | whole prefix | the directory is itself named `pending-deletion` |
| `docs/ai-workflow/archive/` | archive-only historical record | whole prefix | archived phase audits describing files later retired |
| `docs/_attic/` | archive-only historical record | whole prefix | attic by name |
| `AI-Village-Documentation/validation-prompts/` | QA artifact / generated output | whole prefix | written by `scripts/validation-orchestrator.mjs` (its prompt and report directories). `scripts/hermes-village.mjs` shares the same generator code but writes to `hermes-village-prompts`, not this path. |
| `docs/ai-workflow/validation-reports/` | QA artifact / generated output | whole prefix | `scripts/validation-orchestrator.mjs:191` sets `legacyReportDir` to this path |
| `docs/ai-workflow/AI-HANDOFF/` | archive-only historical record | **pinned to a commit** | see below |

### The one directory that is an active write target

An earlier draft classified `docs/ai-workflow/AI-HANDOFF/` as frozen and excluded
it by prefix. Hostile review falsified that, correctly:

- `CLAUDE.md` rule 48 requires audit records to be landed in exactly this
  directory (`CLAUDE.md:212`, `:251`), and `ACTIVE-INDEX.md` points at it.
- **216 files were added there in the 30 days** before this slice.

Excluding the directory wholesale would have exempted every *future* audit record
from the link check — turning a one-time cleanup into a permanent blind spot.
The entry therefore pins `frozenAsOf: e07d4b9…`: only files that existed at that
commit are ledger debt, and anything written there afterwards is checked like any
other documentation. The other entries keep whole-prefix exclusion because a
newly generated transcript or newly vendored skill is equally not-ours and
equally unrepairable.

This is enforced by tests, not just described: `partition` is covered for both
modes, and an entry for an active write target without `frozenAsOf` fails.

### Why the generated transcripts are a provable class

`scripts/consult-gemini.mjs:120` persists `groundingMeta.groundingChunks[].web.uri`
verbatim. Those are Google Search grounding redirect URLs
(`vertexaisearch.cloud.google.com/grounding-api-redirect/...`) that are
session-scoped and expire by construction — they were never stable links. No
edit can repair them, and rewriting the transcripts would falsify saved research
output.

Measured, not estimated (`.mega-blueprints/artifacts/docs-link-debt-20260913/verify-disputed-numbers.mjs`):

| Quantity | Value |
|---|---|
| Grounding redirect URLs in the excluded ledger (every area) | **1118** |
| Dead links inside the two generated-transcript directories | 1170 |
| — of which grounding redirect URLs | 1046 |
| — of which ordinary external 404s | 124 |

An earlier draft said "1118 of the 1867 excluded dead links are exactly these",
which conflated the ledger-wide grounding total with the transcript
directories' contents; hostile review caught it. The 124 non-grounding links in
those directories are ordinary external link rot in generated output, and are
excluded for the same reason: the directory is machine-written and regenerating
it would restore whatever the generator emits at the time.

### Composition of the excluded ledger

| Share | Class |
|---|---|
| 62.7% | generated transcripts (both generated-output directories) |
| 30.9% | frozen historical receipts |
| 4.2% | vendored skill bundles |
| 2.1% | frozen archived audits / pending-deletion / attic |

Only **89** of the 1786 excluded files contain any dead link at all; the rest are
excluded because they are frozen, not because they are broken.

### What the exclusions do NOT buy

- Excluded files are **still checked on every run**. Only their failure is
  downgraded from a gate failure to a recorded ledger row.
- The gate **fails if any ledger row exceeds its recorded baseline**, comparing two
  counters separately. This is weaker than "debt can only shrink", and the
  difference is stated rather than glossed:
  - **deterministic** dead links (a relative path or a same-document anchor — the
    same answer on every machine) are gated at **exactly zero growth**;
  - **external** URLs are gated with a tolerance of **two per row**, because
    third-party availability is not a property of this repository and demonstrably
    varies by vantage point (see §6). A zero tolerance there means the job flaps on
    other people's outages, which is how this check came to be ignored.
  - The split was not a precaution. The first CI run of this branch failed on one
    link; after that was reconciled, the next run failed on a *different* row. The
    per-link evidence is in §6. This is the design fix for that, not another bump.
  - Counters are still count-based, not identity-based: a net-zero swap inside one
    already-excluded file is not detected. A new *file* is no longer absorbed (see
    the active-write-target rule above), and `--record` remains a deliberate,
    reviewed act that lands in the diff.
- **An unrecorded entry fails closed.** If a manifest entry has no recorded
  `deadLinks`/`unreadable`/`files`, the gate exits 2 and says so, rather than
  silently exempting it forever.
- The exclusion set is **pinned by a test**, so adding an entry fails until that
  list is updated in the same commit — putting the change in the diff where a
  reviewer sees it. Every entry must also carry a classification, a reason,
  evidence and a machine-checkable class pattern; must match tracked files; and
  must not nest inside another entry.
- The **guard tests run in CI**, in the same workflow, before the link check. A
  test that runs nowhere guards nothing.
- `docs/archive/` holds one dead link and was deliberately **not** excluded —
  the link was repaired instead, so the exclusion list did not grow after the
  baseline was measured.

## 5. Repairs in scope

**105 dead links across 28 files** before repair (§3a), by root cause:

| Root cause | Repair |
|---|---|
| Repo-root-relative paths written from inside `AI-Village-Documentation/` (target exists at repo root) | add the missing `../` prefix |
| Superseded onboarding prompt (`...-V2.md`; V5 is the live file) | repoint to V5 |
| Wrong production domain in web URLs (`swanstudios.com`; production is `sswanstudios.com`) | correct the host — **web URLs only**; `support@swanstudios.com` is the real support mailbox (`frontend/src/config/env-config.ts:103`) and was left alone |
| Path case mismatch (`components/admin/` vs `components/Admin/`) | correct the case — this passed on Windows and failed on Linux CI |
| Table-of-contents anchors that never matched a heading slug (55) | recompute from the heading |
| Targets deleted with no successor (`backend/test-*.mjs`, retired Galaxy-Swan theme doc, `frontend/src/pages/workout/README.md`) | de-link; state the retirement. For the one-line `docs/index.md` index entry the whole stale row was removed, because the row's only purpose was the link |
| Placeholder addresses at reserved/example domains (`test.com`, `*.dev`, `company.com`) — 16 | render as inline code — they are illustrative identifiers, and `mailto:` to them would bounce |
| External link rot | repoint to the verified current URL, or to an archived copy when the site is gone |
| A code fence left unclosed, hiding two headings from every renderer | close the fence where the block's content actually ends |

### Anchor repairs were real, and were verified against GitHub

The 55 anchor failures are not a checker artifact. `## 📚 OVERVIEW` slugifies to
`-overview`, not `overview`, and most broken anchors were hand-shortened
placeholders (TOC `#2-chart-data-pipeline` against heading
`## 2. CHART DATA PIPELINE — Connect Victory Charts to Real API`). An earlier
draft said 51; the receipt says 55 (47 pure rewrites + 8 dispositions), and 55 is
correct.

Because `markdown-link-check` computes anchors by an explicitly documented
"simple text comparison" rather than GitHub's algorithm, every repaired anchor
was cross-checked with `github-slugger` — the library GitHub itself uses.
**105 of 105 distinct anchors across the eight affected files resolve under
both.** Four anchors were a special case: the auto-fixer's first pass produced
the checker's slug `#-user-interface-layout`, which the checker accepts but
`github-slugger` does not, because `github-slugger` keeps the Unicode variation
selector (U+FE0F) that the checker strips. Those four headings had their leading
emoji removed so that both engines produce the same plain slug. (All four anchors
*failed* the checker at HEAD as well — what passed was the auto-fixer's form, not
the original.) That is one of only two content changes in this slice, and it
affects exactly four heading lines.

The second content change is the unclosed code fence described below. Every other
edit is a link target, a link's surrounding label, or a stale index row.

### Two deliberate checker suppressions, both disclosed in-file

Both are hosts that serve nothing to automated clients while working normally in
a browser. Neither is link rot, and neither can be repaired by editing the URL:

1. `AI-Village-Documentation/FIGMA-AI-SETUP-GUIDE.md` — a Dribbble tag URL. That
   host answered every automated client with an empty HTTP 202 bot-check,
   reproduced with two independent fetchers.
2. `docs/ai-workflow/references/archive/ROUTER-UPGRADES-GT6.md` — `www.makemkv.com`.
   This host answers automated clients erratically and sometimes not at all:
   measured across this slice and two hostile reviews it returned HEAD `000`,
   GET `000`, GET-with-browser-User-Agent `200` once and `000` on other attempts,
   and a sibling run saw the apex `https://makemkv.com/` answered. The checker
   also stalled on it for over 30 seconds. The earlier draft's clean
   "browser User-Agent gets HTTP 200" is not reproducible and has been removed;
   the suppression stands because the host is unreliable to automation, not
   because a UA gate was demonstrated.

Each suppression is a `<!-- markdown-link-check-disable-next-line -->` on one
line with its reason written above it. No global ignore pattern was added and
`aliveStatusCodes` was **not** widened. Suppressing the second one also stops a
hostile host from stalling every CI run.

## 6. The gate

`scripts/ci/check-docs-links.mjs`, run by `.github/workflows/docs-check.yml`
after `npm ci`, so CI and a developer machine execute the same engine, the same
config, and the same file selection. `npm run check-docs-links` is that command.

Rules are unchanged: dead-link classification, `aliveStatusCodes`,
`ignorePatterns` and timeouts all still come from
`.github/markdown-link-check-config.json`, which this slice **did not modify**.

One robustness addition, described exactly as implemented. The re-check is
**file-scoped and transient-only**:

- a file is re-checked, up to **five** times with a two-second pause between
  attempts, only if **every** failing link in it is transient — a connection-level
  fault, a timeout, 408, 429, or a 5xx;
- if the file contains **any** definitive 4xx failure, the file is reported as-is
  and never re-checked, so a real 404 cannot be laundered into a pass;
- the outcome of the last attempt is what is reported. A link that answers
  successfully on retry is reported alive; that is the purpose of the retry, and
  it does mean an intermittently-available link can pass while a consistently
  dead one cannot;
- one consequence, found by hostile review, is that a transient fault in a file
  that *also* holds a hard 404 is not re-confirmed. Such a file fails on the real
  404 anyway, so the outcome is unchanged; the transient entry is reported
  alongside it.

**This does not make external hosts reliable, and the gate can still flap.**
Measured across five full runs of the finished gate: four exited 0, and one
failed on `orthoinfo.aaos.org/en/diseases--conditions/common-knee-injuries/`,
which `curl` served as HTTP 200 throughout and which the checker saw fail on five
consecutive attempts during that window. That residual is inherent to checking
third-party URLs on a schedule; the response is to re-run the job, not to
suppress a working link. What changed is the size of the blast radius: a flaky
external host now fails one job with a named link, instead of the entire check
being permanently red and ignored.

**External reachability also differs by vantage point, which the ledger has to
absorb.** The first CI run of this branch failed on ledger growth of exactly one
link. Diffing CI's uploaded receipt against the local one named the difference
precisely:

| Link | Locally | In CI |
|---|---|---|
| `fda.gov/food/nutrition-facts-label/how-understand-and-use-nutrition-facts-label` | alive | **404** |
| `fitnessnav.com/global-digital-nutrition-report-2026` (×2) | **404** | alive |
| `scribd.com/digital-transformation-vr` (×2) | **404** | alive |

So a baseline recorded on a Windows dev box and enforced on an Ubuntu runner can
fail on links nobody changed. The `AI-HANDOFF` row is now recorded from CI — the
environment that enforces it — at the higher observed value, with the provenance
written into the manifest (`baselineNote`). That is not a tolerance: no slack is
added, and any *new* dead link beyond the recorded count still fails the run. The
one genuinely dead link this exposed (`fda.gov`) sits inside a frozen receipt and
is therefore recorded as debt rather than repaired.

The motivating case is real: `orthoinfo.aaos.org/…/common-knee-injuries/`
returned HTTP 200 to `curl` while the checker saw status 0 and then 520 on
consecutive attempts, which failed this slice's verification at random. (That
observation is recorded here and in the script comment only; it was not captured
to an artifact before the host settled, and hostile review could not reproduce the
520.)

Excluded files are handled differently on purpose: a failing excluded file is
re-confirmed **only when its ledger entry is already over its recorded baseline**.
Its dead links are acknowledged debt, so re-checking the slowest frozen files
three times on every run would cost minutes and change no outcome.

The engine version is recorded in the manifest; a different installed version is
a hard error rather than a silent behaviour change.

### Where the evidence lives

Some numbers in this document are reproducible from a clone; some are not, and
the difference is stated rather than blurred:

- **Reproducible from the repository:** the gate's behaviour, the scope
  partition, and the ledger comparison (`node scripts/ci/check-docs-links.mjs`
  and the guard tests). A reader can re-run these and get the same answers.
- **Not reproducible from a clone:** the pre-repair baselines (105, 92, the CI
  log's 1870/105/3740) and the analysis scripts that derive them. They live under
  `.mega-blueprints/artifacts/docs-link-debt-20260913/`, which is **untracked and
  not gitignored** — an earlier draft cited `.gitignore:521`, which is wrong twice
  over (that line is blank, and `git check-ignore` does not match the path). It
  travels as local evidence in the handoff package rather than in the repository,
  by the packet's convention. The CI log they are derived from is itself a release
  artifact of the parent packet.

## 7. Acceptance criteria

| ID | Criterion | Status |
|---|---|---|
| A1 | Every dead link in scope is repaired or de-linked with a stated reason | **met** — `gate-green.log`, exit 0: "0 dead links across 1144 in-scope files" |
| A2 | The gate still fails on a real broken link | **met** — planted-failure harness run, exit 1 naming the link; plus one genuine in-scope failure caught in production |
| A3 | The gate runs the same engine and config as CI | **met** — workflow runs the repo script after `npm ci`; config unmodified |
| A4 | Exclusions are explicit, evidenced, and enumerated in-repo | **met** — manifest + guard tests |
| A5 | Excluded debt cannot grow past its recorded baseline | **met with a stated limit** — per-entry growth fails the run; a `--record` run does not re-confirm excluded files, so a baseline can be marginally inflated (see §4) |
| A6 | Local and CI run the same tool version | **met** — manifest records 3.14.2; drift exits 2 |

## 8. Applicability

- Wireframes: **N/A** — no user interface; Markdown content, a CI workflow and a
  Node script only.
- Diagrams: **N/A** — no runtime flow introduced. The flow is linear:
  enumerate tracked Markdown → partition by manifest → check → fail on in-scope
  death or on ledger growth.
- ERD / migrations / permissions: **N/A** — no schema, no authz surface.
- Performance: bounded by third-party network I/O, as before. The confirmation
  pass adds wall time only for in-scope failures and over-baseline ledger rows —
  in a clean run, for no files at all. Suppressing the `makemkv.com` hang removes
  a multi-minute stall per run.

## 9. Rollback

Revert the slice commit. The workflow returns to the third-party action and the
check returns to its previous red state. No runtime, schema, or deployed
behaviour is touched.

## 10. Findings recorded for follow-up (not fixed here)

1. **Test credentials committed in a document.**
   `docs/ai-workflow/blueprints/OPERATIONS-READY-TESTPLAN-AND-GAPS.md` contains a
   table of test accounts with passwords. Out of scope for a link-debt slice;
   flagged rather than silently altered.
2. **Residual `V2` staleness.** Several documents still name
   `AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V2.md` inside code spans where no link
   exists. Only the broken links were repointed to V5; a repo-wide rename is a
   separate content task.
3. **Unreadable file in a frozen archive.**
   `archive/pending-deletion/2026-05-15/mcp-docs/.../MCP-SERVER-CONFIGURATION-GUIDE.md`
   makes the checker throw. It is recorded in the ledger as unreadable rather
   than repaired, because the path is frozen.

## 11. Corrections made after hostile review

Round-1 hostile review returned REVISE with three false headline claims and
several inaccurate details. All were reproduced and corrected rather than
argued with:

| Claim in the draft | Reality | Where fixed |
|---|---|---|
| CI ran `markdown-link-check@3.13.7` | CI ran **3.8.7** (pinned in the action's `entrypoint.sh` at the resolved SHA). The draft had read the action's `master` branch. Corroborated by the CI log resolving `request`, which 3.13+ no longer uses. | §2.2, workflow comment, script header |
| 3.14.2 introduced `mailto:` validation | Half true. 3.8.7 checks address *syntax* only; 3.14.2 adds **MX** resolution, so 12 domain-class addresses flip from alive to dead. | §2.2 |
| "92 in-scope where the CI log showed 37" was a strictness measurement | The 92 came from a run made **while the tree was being edited** (17 of its 25 files have mtimes after the receipt). Not reproducible as a snapshot. | §3, §5 |
| "1118 of 1867 excluded dead links are grounding redirects" | Conflated the ledger-wide grounding total (1118) with the transcript directories' contents (1046 grounding + 124 ordinary 404s). | §4 |
| 51 anchor failures | 55. | §5 |
| "A failure is only reported after three confirmation attempts agree" | True only for the checked scope; excluded files at baseline are not re-confirmed. `--record` never re-confirms excluded files. | §6, §4 |
| "A stray directory literally named `"archive`" | A `git ls-files` C-quoting artifact for emoji filenames. There is no such directory. | finding removed |
| RED-proof RUN 1 transcript | The saved file was the `--record` run, not the growth run. Re-captured. | `RED-PROOF.md` |
| "debt can only shrink and a new exclusion cannot hide new breakage" | Too strong; see the stated limit in §4. | §4 |

Verified as correct and unchanged: the 1870/105/3740 reconciliation, the
in-scope/excluded partition arithmetic, and 105/105 anchors resolving under
`github-slugger`.

### Round 2

Three hostile reviewers ran in parallel against the corrected text. Verdicts:
REVISE, REVISE, REVISE. **No link repair was found incorrect** — every repointed
target sampled resolved correctly, all 105 anchors were independently reproduced
under both engines, the fence repair was verified to restore two headings without
breaking rendering, the domain fix was confirmed complete for every checker-visible
URL, and both suppressions were accepted as legitimate. The defects were in the
gate's mechanism and in this document.

Mechanism defects, all fixed:

| Defect | Why it mattered | Fix |
|---|---|---|
| The confirmation pass could launder a real failure. A reviewer ran a local server answering 404 then 200, and the gate reported "OK — 0 dead links". | The gate could pass a genuinely broken link. | Re-checking is now confined to transient faults (connection error or 5xx). A definitive 4xx fails immediately. |
| `docs/ai-workflow/AI-HANDOFF/` was excluded as frozen, but CLAUDE.md rules 48/212/251 require audit records to be written there and 216 files landed in 30 days. | Every future audit record would have been exempt from the link check. | The entry pins `frozenAsOf`, so only pre-existing files are debt and new files are checked. |
| An unrecorded manifest entry was silently exempt forever. | A lost baseline would disable a row without anyone noticing. | The gate exits 2 on an unrecorded entry. |
| The guard tests ran in no pipeline, and adding a live documentation directory passed all of them. | The guards guarded nothing. | Tests run as a workflow step before the link check; the exclusion set is pinned so widening it fails until the pin is updated in the same commit. |

Document defects, all corrected: the `mailto:` claim (wrong twice, in both
directions); a forward reference to a nonexistent §3a; the pre-repair total never
stated (now 105 from a pristine checkout); two different 37-element sets presented
as one decomposition; "51 anchor failures" (55); "four anchors initially passed
the checker" (they failed it at HEAD too — what passed was the auto-fixer's
leading-hyphen form); the `makemkv.com` rationale overstating a clean
User-Agent gate where measurement shows flakiness; a false repo-hygiene finding
about a directory named `"archive` (a `git ls-files` C-quoting artifact); and
"debt can only shrink" where count-based debt can be moved by a net-zero swap.

One documentation fix went the other way. `docs/index.md` had its stale
"Workout Page README" row deleted; a reviewer pointed out the surrounding index
keeps retired rows labelled as retired, so the row was restored in that style.

### Round 3

Two more hostile reviewers, both REVISE. One of them found a defect that would
have made this slice fail its own CI on every trigger, which is exactly what
review is for. All findings were reproduced before being fixed.

| Defect | Why it mattered | Fix |
|---|---|---|
| `actions/checkout` fetches **one commit** by default, so the `frozenAsOf` commit was absent in CI and the gate failed closed: **exit 2 on every trigger**, the check never ran. | The slice would have shipped a permanently red job — the exact failure it exists to remove. | The freeze is an explicit `frozenFiles` list in the manifest. No dependency on clone depth or git history. Verified by running the gate in a real `git clone --depth 1`: guard tests 16/16, gate resolves and runs. |
| The confirmation pass kept the **last** attempt while its comment claimed every attempt must agree; a host answering `500,500,200` produced "OK — 0 dead links". | A real failure could be reported as a pass, and the code contradicted its own documentation. | The rule is now stated as implemented: file-scoped, transient-only, last attempt reported, and a file containing any definitive 4xx is never re-checked. |
| The guard test called `partition()` **without** frozen sets, inverting the gate's semantics: adding the audit record CLAUDE.md rule 48 mandates would have turned CI red before the gate ran. | The guard would have blocked the very workflow it protects. | `partition()` reads the list from the manifest, so gate and tests call it identically. |
| Excluded-entry confirmation compared failing-**file** counts against recorded **dead-link** baselines. | The trigger was arbitrary; the excluded ledger was effectively never re-confirmed. | Dead links are compared to dead links. |
| `Infinity` passed the baseline check (`typeof Infinity === 'number'`), so a one-token manifest edit could disarm the ledger silently, and the guard suite still passed. | A silent, permanent exemption. | Baselines must be finite; `null`/`NaN`/`Infinity` exits 2, and the guard asserts finiteness. |
| Links whose engine status is `error` were invisible, and six live in-scope instances existed (machine-absolute `c:\Users\...` paths). | The workflow's success banner was untrue while in-scope files held unparseable links. | Those links are repaired, and `error` now counts as a failure. The gate is deliberately stricter than the CLI here. |
| Suppressed links were silent. | Self-exemption was invisible. | Suppressed links are counted and printed, and appear in the receipt. |

Document corrections in round 3: a false file count (25 → 17), two composition
percentages, a stale tree size, an overstated "invisible locally" claim, a wrong
`.gitignore` citation, a CI-log provenance mis-citation (the log is for
`aafe387a9`, and GitHub reports zero `docs-check` runs for `e07d4b9`), the
`hermes-village.mjs` attribution, and two sentences round 2 had missed. The
pristine baseline is now disclosed as measured with a pre-review revision of the
gate and as containing at least one transient inflation.
