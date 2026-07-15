# BLUEPRINT: Dictation-First Planner ↔ Logger Sync + Swan Coach Real-Time Plan Editing
**Forged:** 2026-07-14 · **Architect:** Fable 5 (Final Decider) · **Status:** READY FOR BUILDER

## What this builds (Sean's vision, amplified)
1. **Planner → Logger sync, airtight:** a plan created in the Workout Planner shows up in the
   Workout Logger premade — exercises, sets, reps, tempo, rest — with ONLY weight left to fill.
   (The transport already exists; this package hardens it and adds last-used-weight suggestions
   so even the weight field starts smart.)
2. **Swan Coach tab inside the Workout Planner:** Sean dictates ("give me a leg day for this
   client, swap the leg press for goblet squats, make it two sets each") and Swan Coach edits the
   planner state IN REAL TIME — same brain, same command lane the rest of the app uses.
3. **Dictation in the Workout Logger:** talk to set weights/reps ("leg press set two, ninety
   pounds, eleven reps") using the five FRONTEND_DISPATCH logger commands that already exist.
4. **PDF note:** plan PDFs already auto-attach on create/update (shipped 2026-07-14,
   `41d07423d..de31a5b91`). Do NOT rebuild that. Slice 6 only verifies it end-to-end.

## Why this package exists
Fable architected; you (the builder) execute. Every decision that matters is made in these files.
The feature rides three PROVEN in-repo patterns (excerpts included in 01/03/04):
- `FRONTEND_DISPATCH` command method → browser CustomEvent → surface hook (5 live logger commands).
- `useCoachBrowserSpeechInput` + `useCoachCommandVoiceCapture` dictation glue (Coach Command Center).
- `loadPlan=today` planner→logger route contract + `useWorkoutPlanLoading` fallback chain.

## Build order
Read 01 → 06 fully before writing code. Then execute `05-slices.md` strictly in order:
S1 planner Coach dock → S2 backend planner commands → S3 planner AI-event hook →
S4 logger dictation → S5 weight suggestions → S6 sync hardening + verification + audit record.

## Builder Contract (binding)
You are the builder, not the architect. Follow the package to the letter. Where the package
decides, you do not re-decide — even if you'd do it differently. Where the package is silent on
something that matters, STOP and return the question; do not improvise. Build ONE slice at a
time; after each slice, output the diff + the acceptance-criteria evidence (test output, curl
results, screenshots) and WAIT for the checkpoint verdict before continuing. Never claim a
criterion passed without pasting its output.

## Working environment
- Branch off `origin/main` (≥ `de31a5b91`) in a fresh worktree. Rule 67 lanes apply: claim your
  files in `.ai-workflow/coordination/`, never `git add -A`.
- Tests: `cd frontend && npx vitest run <paths>` · `cd backend && npx vitest run tests/unit tests/api`
- Type check: `cd frontend && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
- Commit per slice `type(scope): description`; ONE push at batch end (Rule 70). Pre-push:
  `git ls-files --others --exclude-standard backend/` and `git diff --name-only HEAD backend/`
  must both be empty of surprises (Rule 42).

## Package map
| File | Contents |
|---|---|
| 01-architecture.md | System overview, mermaid flows/sequences, component tree |
| 02-wireframes.md | Planner Coach dock, logger mic, all states, exact copy |
| 03-contracts.md | Command registry entries, event payloads, endpoint + hook signatures |
| 04-build-order.md | File-by-file: path, budget, imports/exports, in-repo example to mimic |
| 05-slices.md | Six slices with executable acceptance criteria + STOP lines |
| 06-bans.md | House rules + feature-specific do-NOTs |
| 07-checkpoints.md | Checkpoint protocol + verdict log |
