---
date: 2026-08-25
originating_model: claude-opus-5
surface: swan-forge / strangler codemod / public frontend
decision: A tool's one-sentence charter is the only review standard that survives three adversarial rounds; catalog defaults must be primitives, never a consumer's taste.
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: builder + final decider + own-vantage hostile rounds
    did: wrote the codemod and the migration, adjudicated 30+ panel findings (verified each against code before acting, disproved 6), found the re-export-shim defect no reviewer saw, ran the mobile/reduced-motion and build-artifact rounds
    cost: subscription
  - model: stealth/ox-alpha
    role: hostile reviewer, 3 rounds
    did: 7 round-1 findings (all real; one architectural — catalog authority), a silent-write vector in round 2, refused to credit a test whose diff was withheld, APPROVE in round 3 with two actionable dissents
    cost: ~$0 (pooled)
  - model: glm-5.3
    role: hostile reviewer, 3 rounds
    did: 9 round-1 findings (5 real, 4 disproven), two silent lexer vectors in round 2 that nobody else found, traced the tightened invariant test against the historical bug, APPROVE in round 3
    cost: ~$0 (pooled)
skills_touched:
  - id: rule-84 (Forge-First UI)
    change: exercised
    failure: a reachable high-conversion surface was deferred from the "public tier first" migration; without a dated ledger row the law would have been false advertising
  - id: packages/swan-forge/EXCEPTIONS.md
    change: first real row added
    failure: the deferral had no paper trail until a reviewer named it a governance dodge
  - id: SWA-210 (new)
    change: created
    failure: a deferral justified only by reasoning ("screenshots time out on fonts") becomes permanent by inertia unless it carries a ticket and a named fix
---

## The lesson

A codemod's header said: **"Reports (never silently rewrites)."** Across three adversarial rounds
and roughly thirty findings, every single blocking defect was a violation of that one sentence —
a tag inside a string rewritten with nothing left behind to catch it, an import statement inside a
documentation template silently repointed, a close tag inside a comment stealing the pairing from
the real one. Nothing else blocked. Not style, not coverage, not architecture.

The sentence did the work because it was **falsifiable and singular**. A reviewer could take any
input, run it, and ask one question: did this write something without telling anyone? Findings
sorted themselves into blocking and non-blocking without argument. Contrast the findings that
did NOT hold up: four of one reviewer's round-1 claims were about repo configuration (aliases,
glob imports, a fail-open default) and all four were refuted by reading the actual config — they
were reasoning about a codebase they could not see, with no single sentence to check against.

**Write the charter sentence before the tool, and make it the thing that can be violated.** Then
the review has a spine, and "is this done" stops being a matter of taste.

## The second lesson: taste must never be a default

The first cut of the button skin baked the original component's size table into the catalog CORE.
It rendered perfectly. Both reviewers independently rejected it, and the reason is the one that
generalizes: **if deleting the site's theme pack does not return you to a sane, neutral result,
the pack is not a skin — it is a patch.** The fix moved every taste value (heights, radii, weight,
letter-spacing) into the pack behind published custom properties, leaving core on catalog
primitives. One 56px literal survived the first cleanup and was caught in the next round; the fix
was not to delete it but to add the missing primitive and make the invariant test fail on ANY
numeric literal in a size fallback. A hole in an invariant test is worse than no test, because it
manufactures assurance.

Corollary discovered while fixing it: the new primitive was filed under an "Accessibility floors
(NOT themeable)" banner. 56px is taste; the floor is 44px, one line above. Filing taste under an
accessibility banner grants it protection it has not earned, and the next reader will treat it as
a safety claim. **Taxonomy errors in a token file are future doctrine errors.**

## Who did what

**Opus 5 (me)** built the migration and the codemod, and was wrong first: the original scanner
tracked string quotes only at brace depth zero, so a `}` inside a quoted string desynced it —
producing zero conversions on a file whose import had already been swapped, i.e. a silent broken
build. I found that one myself before the panel ever saw it, and it set the standard the panel
then held me to. I also adjudicated every panel finding against the actual code rather than
accepting them, which is how six were disproven; and I found the defect neither reviewer could
have — a one-hop re-export shim that the import guard was misclassifying — only by running the
tool across all 52 legacy sites instead of the 9 the PR touched. **The vantage found it, not the
insight.**

**Ox Alpha** was the strongest on charter and governance: it demanded the deferred conversion
surface be ledgered rather than merely explained, refused to credit a test whose diff was not in
the packet ("tests I can't read are tests I can't credit"), and caught that a rollback was no
longer inert because the pack change had been mixed into the consumer change. Zero of its findings
were disproven across three rounds.

**GLM 5.3** was the strongest lexer attacker: in round two it landed two silent vectors nobody
else saw, including one where an unterminated apostrophe in JSX text suppressed masking for the
rest of the line and let a later template literal be rewritten. It also VERIFIED the tightened
invariant test against the historical bug line to prove it would have failed. But four of its
round-one findings were confident claims about repo configuration that the config refuted.
**Its code-level attacks are worth more than its infrastructure claims.**

## Skills created or changed

- **EXCEPTIONS ledger got its first real row** — a reachable, high-value surface deferred from a
  MANDATORY migration, with owner, expiry, reason, and a filed second-party review request. The
  failure it encodes: a deferral explained in prose is invisible in ninety days; a deferral with an
  expiry date expires.
- **SWA-210 created** for the screenshot-receipt debt, with the named technical fix and a
  definition of done pinned to a specific future PR rather than floating. Motivated by a reviewer's
  observation that deferrals gravitate to the busiest possible future moment.
- **Rule 84 exercised end to end** for the first time on a public surface, which is what surfaced
  both the ledger gap and the catalog-authority error.

## Mistakes I made

- **Stated a test count I never read.** A commit message claimed "73/73"; the true figure was
  70/70. I derived it arithmetically instead of reading the runner's last line. This is a
  Proof-Before-Done violation in miniature: the number LOOKED like evidence and was not.
- **Fixed a path bug with the same path bug inside the fix.** The shim resolver resolved the
  shim's re-export target relative to the importing file rather than the shim itself. My own
  fixture caught it within a minute — but only because I wrote the fixture before trusting the fix.
- **Built and dispatched a review packet from a commit that did not exist.** A guard had blocked
  the commit; I generated the packet from what I assumed was HEAD and launched two paid reviews
  against it. Killed both before they returned. Two consults wasted, and the near-miss was a panel
  reviewing a revision that was never made.
- **Twice trusted my own instrument over the system.** A grep written without a space after the
  colon reported the build was missing its tokens; a hand-rolled typecheck config stricter than the
  project's reported an error the project does not have. Both were one re-run from becoming
  confident false findings in a closeout.
- **Reached for `git commit -C HEAD`,** which reuses the previous message — it would have attached
  a stale description to a new commit. Aborted mid-command, but the reflex was there.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before it recurred? | What finally stopped it |
|---|---|---|---|
| Believing a tool's negative result without a second vantage | 3 (grep-no-space, over-strict tsconfig, and earlier a chunk-name deploy check) | **Yes — this is a standing rule and a standing memory, and it still recurred three times** | Nothing procedural yet. The only thing that worked was a habit of re-running any absence claim before writing it down. **This class needs the check inside the probe, not in the model's intention** — every diagnostic that reports "missing" should itself try the second form before returning. |
| Path/relativity assumption unverified | 2 (shim target relative to importer; packet built from wrong HEAD) | No | Writing the fixture before trusting the fix. The general form: *relative to what?* is a question with an answer, and the answer is cheap to print. |
| A number in a report that was not read from output | 1 | Yes (test-delta discipline exists precisely for this) | Correcting it in the next commit and disclosing to the panel. The durable fix is mechanical: paste the runner's summary line, never retype it. |
| Shell heredoc mangling escaped characters in generated content | 4 (a fixture's `\n` three ways, then this packet's apostrophes) | No | Abandoning the shell and using a direct file write. **Content containing escape sequences or quotes must never round-trip through a shell heredoc** — the repo already has a heredoc-escape gate for exactly this, and I hit the same wall from the other side. |

The first row is the one that matters. It has been documented, it has a rule, it has a memory
entry, and it recurred three times in a single session anyway — which is proof that documentation
is not a fix for it. The correction that survives is the one built into the instrument: a probe
that reports absence must try the second vantage itself before it is allowed to say "missing."

## External-model calibration

| Model | Findings real | Disproven on verification | Best at | Cost |
|---|---|---|---|---|
| Ox Alpha (`stealth/ox-alpha`) | 7 / 7 round 1, 4 / 4 round 2 | 0 across 3 rounds | charter violations, governance dodges, rollback integrity, refusing unevidenced credit | pooled (~$0) |
| GLM 5.3 | 5 / 9 round 1, 2 / 2 round 2 | 4 (all repo-configuration claims) | lexer-level silent vectors, verifying a test against a historical bug | pooled (~$0) |

Routing conclusion: for parser/tool correctness, run **both** — their round-1 findings barely
overlapped, and each found blocking defects the other missed in round 2. Neither model's claims
about repo configuration should be acted on without checking the config first.
