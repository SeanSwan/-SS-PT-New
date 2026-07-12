# Worker Build Prompt — Hermes OS Visual Depth Upgrade (paste this to the builder agent)

You are building the Hermes OS visual upgrade EXACTLY as specified by Fable. Your job is
execution fidelity, not design. Two binding documents, in precedence order:

1. `docs/ai-workflow/blueprints/HERMES-OS-VISUAL-DEPTH-BLUEPRINT-2026-07-11.md` — THE spec.
   Read it fully before any code. The defect register (§1), invariants (§2), slice order
   (§3), visual locks (§4), verification protocol (§5), and gates (§6-§9) are all binding.
2. `docs/ai-workflow/AI-HANDOFF/HERMES-BRAIN-COCKPIT-ULTIMATE-UPGRADE-2026-07-08.md` —
   parent spec (v2 + Slice-0 locked decisions) for anything the blueprint defers to it.

Operating rules:
- Read CLAUDE.md first; Rule 67 lane discipline (claim `scripts/hermes/brain*` +
  `scripts/hermes/status-page*` in your lane file); work on a fresh main-based branch
  `claude/hermes-os-visual-<date>` in an isolated worktree.
- Build slice V1 ONLY, run the blueprint §5 verification protocol, write the Rule 61
  consolidated slice report with 414px + 1920px screenshots, queue the review REQ — then
  continue V2. STOP after V2: the blueprint §6 hard checkpoint requires Fable's screenshot
  review before V3–V6.
- Where the blueprint gives a number (px, %, ms, counts, thresholds), use that number.
  Where it names a file, create exactly that file. If something is ambiguous or two specs
  conflict, STOP and ask Sean — do not decide design yourself.
- Every slice ends with: full `node --test scripts/hermes/`, determinism double-render,
  governance greps, secret scan, live render opened and LOOKED at (hostile design pass),
  commit per slice (no push until Sean's batch word, Rule 70), Hermes-inbox memo per
  rules 68-69.
- Never claim done without naming the verification (Rule 19/28). The final gate for every
  slice: the page Sean double-clicks (`Hermes-Command-Center.cmd`, pinned runner-repo —
  blueprint §7) actually shows the work.
