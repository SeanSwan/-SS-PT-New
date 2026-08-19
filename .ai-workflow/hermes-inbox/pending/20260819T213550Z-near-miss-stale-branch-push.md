---
surface: git / release safety
agent: vs-claude (Opus 5)
date: 2026-08-19
---

# Near-miss: "push the render" on a 5-day-stale branch would have reverted 187 commits

## What happened
Sean asked to push and deploy. The working branch was 30 commits AHEAD and 187 commits
BEHIND origin/main (cut Aug 14, main had moved to Aug 19). Pushing it to main would have
deleted 226 files and 39,771 lines of other agents' work — including CLAUDE.md, AGENTS.md,
backend routes, models, migrations and a week of Hermes inbox memos. Caught before pushing;
branch pushed to its own ref instead. origin/main untouched.

## The lesson
**"Commits ahead" is not the push blast radius. `git diff --stat origin/main..HEAD` is.**
A stale branch's diff against main contains the REVERSAL of everything main gained since the
merge-base. My own change surface was 46 files / 6,388 insertions / ZERO deletions; the push
diff was 361 files with 39,771 deletions. The two numbers look nothing alike, and only the
second one describes what the push does.

Check before ANY push to a deploy-linked branch:
    git rev-list --count HEAD..origin/main          # how stale am I
    git diff --stat origin/main..HEAD               # what would land
    git diff --name-only --diff-filter=D origin/main..HEAD | wc -l   # what would DIE
A non-zero delete count on a branch whose author deleted nothing is the alarm.

## Second finding, same check
None of the 46 files run on Render — all are scripts/, docs/, .claude/ hooks and skills. The
deploy would have rebuilt a byte-identical application. Worth saying out loud when someone
asks to deploy: "this change cannot affect the running app" is useful information, not
pedantry.

## Mistakes I made
- I did not check staleness at any point across TWELVE rounds of work on this branch. The
  session-start drift banner said "1948 commits behind" about a different tree and I read it
  as background noise rather than as a prompt to check THIS one.
- Nothing was lost, only because the check happened before the push rather than after.
