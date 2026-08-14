# Continuation prompt — paste this into a fresh session

> Sean: copy everything inside the fenced block below into a new chat. It carries the context this
> session accumulated so the next agent starts oriented instead of re-deriving it (and without the
> token cost of the original thread).

```
Read docs/ai-workflow/AI-HANDOFF/HANDOFF-hostile-review-gate-system-2026-08-13.md first — it is
self-contained and tells you what we are building, what is done, and what is blocked. Then continue
the work below.

CONTEXT IN ONE PARAGRAPH
We are replacing a hostile-review gate that enforces a magic string with one that enforces evidence.
The old gate passes if my closing message contains "DRY-LOOP: CLEAN×2" and any "PROOF:" line, so a
real review and a typed claim are indistinguishable. Kimi K3 reviewed the process, refuted my first
diagnosis, and architected the replacement (BLUEPRINT-PART-A and PART-B in the same directory:
mermaid diagrams, ASCII wireframes, a 25-file build order, and 10 slices with literal executable
acceptance criteria). Slice 1 is committed as ed65bd909 but its "complete" verdict is RE-OPENED as
UNVERIFIED, because it was built on a branch ~1,858 commits behind origin/main using instruments
since proven faulty.

MY STANDING RULES FOR THIS WORK
1. Kimi K3 opens every hostile-review cycle, returns every 20th verified round, AND reviews at every
   push — whichever comes first. Hostile reviews use high-end models only; this is an enterprise app
   and I want accuracy over cost. Kimi calls need explicit --remit (the default persona is a UI
   design reviewer) and SWAN_KIMI_TIMEOUT_MS raised above 900s.
2. Never tell me something is missing, absent, broken, empty, clean, or complete until you have run
   the SAME check against something you know is present. If the control also comes back negative,
   your instrument is broken and the finding is void. This rule exists because you told me twice that
   a key I had correctly set was missing — your probe was silently malformed.
3. On Windows/Git Bash: MSYS_NO_PATHCONV=1 before any command taking /flags (reg, sc, net, schtasks,
   wmic) and before `git show <rev>:<path>`. Never pipe a command whose exit code matters. Never send
   a probe's stderr to /dev/null when you intend to believe its negative. Never use
   `probe || echo "not found"` — use a tri-state case on $?.
4. Delete a target artifact before regenerating it, so a leftover cannot impersonate a fresh result.
   Verify freshness (mtime / subject_sha), not just existence and size.
5. A mutation score computed against a red test baseline is meaningless — assert green first.
6. Commit per slice locally; push once per batch. Do not wait on deploys between slices.
7. Report in two parts, plain-English first, then technical. Tell me the next slice at every closeout.
8. Emit a Hermes memo at substantial closeouts, and include a "Mistakes I made" section — especially
   repeats. That is the highest-value training signal I get.

FIRST DECISION TO MAKE WITH ME (do not skip)
The working branch is ~1,858 behind / ~104 ahead of origin/main. Merging main in produces conflicts
in 1,128 files, and other agents commit to this branch concurrently. All 10 files of ed65bd909 are
net-new to main, so a cherry-pick collides with nothing. Recommendation on the table: `git worktree
add` a clean tree from origin/main, cherry-pick ed65bd909, and continue there. Confirm the approach
with me before writing code — the previous session's largest failure was building into a stale tree
whose missing lesson-recall-gate.mjs never ran.

THEN, IN ORDER
a. Reconcile the tree, then RE-QUALIFY Slice 1 on it (its verdict is currently UNVERIFIED).
b. Where main's gates and this branch's gates overlap, pick one and delete the loser in the same
   commit — two partially-active gate systems referencing mutually-missing files is worse than either.
c. Apply blueprint amendments A1-A6 (they override Parts A/B where they conflict): verdict schema
   with tri-state UNKNOWN, consumer-checked subject_sha instead of mtime, preconditions as renderable
   fields, PIPESTATUS/pipefail + temp-then-rename artifact writes, gate self-qualification with an
   embedded known-bad fixture, and hook-only writes to the trust root.
d. Build the claim-integrity skill from BLUEPRINT-claim-integrity-skill-KIMI-2026-08-13.md and
   REVIEW-claim-integrity-skill-HY3-2026-08-13.md, then run Slices 2-10 back to back.

WHAT I OWE (remind me at session start until done)
- Rotate the Render API key. A key-shaped string was sitting as a Windows environment variable NAME
  and passed through an LLM context. The local copy was deleted and verified gone; only I can revoke
  it at Render.
- Fully restart Claude Code so LINEAR_API_KEY reaches the MCP server and scripts/linear-cli.mjs.
- DMARC record (SWA-13) and Render static-site headers (SWA-93) are still open.

HOW I WANT YOU TO WORK
Hustle. Run slices back to back without checking in between them, but never claim something is done
without current-session proof in the same message and a hostile pass that came back dry. Use
mechanical vantages for hostile rounds — locale rerun, golden corpus, mutation run, double-parse —
not re-reading your own code. If you catch yourself about to say "should be fixed" or "looks good",
stop and go get the evidence instead.
```
