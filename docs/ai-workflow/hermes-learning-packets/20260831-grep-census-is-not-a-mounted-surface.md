---
title: A grep census is not a mounted surface — audit counts must mount-check before recommending
date: 2026-08-31
originating_model: claude-fable-5[1m]
provenance: Fable-tier (builder pass by claude-opus-5[1m], hostile review + corrections by claude-fable-5[1m])
models_used:
  - model: claude-opus-5[1m]
    role: builder
    did: full OSS-equivalence audit of origin/main (dep census, duplicate detection, version checks via npm registry, 12 ranked adoptions), wrote OSS-COMPONENT-AUDIT-2026-08-31.md
    cost: $0 (subscription)
  - model: claude-fable-5[1m]
    role: hostile reviewer / Final Decider
    did: re-verified every load-bearing claim with mount/importer checks; corrected 5 overstated claims, added 5 new findings, disproved 5 of its own suspicions; verdict APPROVE-with-corrections
    cost: $0 (subscription)
skills_touched:
  - id: drift-check (hook)
    change: value re-proven
    failure_motivating: working tree was 2,303 commits behind origin/main; without the SessionStart drift warning the whole audit would have described a ghost tree
---

# A grep census is not a mounted surface

**Context:** OSS-equivalence audit of SwanStudios (`origin/main`, 5,403 frontend / 2,822 backend files). Opus built the audit from `git grep` counts; Fable hostile-reviewed it by mount-checking every count.

## The lesson

`git grep -l <lib> | wc -l` measures *text*, not *product*. Five of the audit's claims changed the moment each count was asked one follow-up question: **"and who imports THAT file?"**

- "Three toast systems" → two live + one dead (the only declared Radix package is consumed by a zero-importer file).
- "Two realtime stacks" → one live + one dead file (raw-WS hook: zero production importers; backend runs no raw-WS server).
- "438 backend files use console.log" → **19** in runtime dirs; the rest are CLI scripts where console is correct.
- "moment in 6 files" → **1 live** file; the rest orbit a dead calendar.
- "react-big-calendar needs bundle-splitting" → react-big-calendar has **no `<Calendar>` mount at all**; the dependency, a 17-file directory, and its global CSS overrides are scaffolding around nothing.

The procedural fix that survives: **in any audit, a count may not carry a recommendation until the count's members are classified live/dead by an importer or mount check** (Rule 26/27 logic applied to dependency audits, not just bug fixes). One extra grep per claim; it flipped 5 of ~20.

## Who did what

- **claude-opus-5** was RIGHT about: the stale-tree hazard (audited origin/main, not the checkout — the single decision that saved the whole exercise), the money-path findings (memory-store rate limits, float math on mounted `/api/orders`, 10× hardcoded Stripe apiVersion), the inert shadcn/Radix layer, 93 hand-rolled dialogs, 11 setInterval crons, zero frontend form library. All held under hostile review.
- **claude-opus-5** was WRONG about: the five counts above — every miss was the same failure shape (text census without a mount check), not five different mistakes.
- **claude-fable-5** raised 5 suspicions of its own and disproved all 5 against evidence (`trust proxy` set; auth.mjs is a shim not a rival; jose/jsonwebtoken split is deliberate; lockfile axios/styled current; momentLocalizer risk moot). A hostile pass that only confirms is suspicious; one that records its own dead ends is calibrated.

## Skills created or changed

None created. `drift-check`'s SessionStart warning directly caused the audit-origin/main decision — the failure it guards (auditing a stale checkout as if it were reality) would otherwise have consumed the entire session.

## Mistakes I made

- Repeated a documented corpus class: **"a test count is not a coverage claim" (packet 2026-08-28) is the same lesson as "a grep count is not a mounted surface"** — it recurred in a new costume within 3 days, across model seats. The class survives costume changes; the write-up did not stop the repeat, the mount-check procedure now might.
- Chained multi-probe greps with `&&`: a zero-match grep (exit 1) silently aborted the two checks behind it (`trust proxy`, emotion) — I nearly reported them as checked. Caught via exit code; re-ran with `;` separators. Multi-probe batches must not let one probe's miss cancel its siblings.
- Opus turn: typed the ORIENT header instead of rendering it — Stop-hook blocked the turn; re-rendered via `node scripts/orient.mjs`.
- Opus turn: heredoc write of the audit doc died on bash quoting (exit 2, unmatched quote); fell back to the Write tool instead of debugging shell escaping around a 200-line markdown body — right call, wrong first attempt.

## Error → fix → repeat ledger

| Error class | Repeats this session | Previously written up? | What stops it |
|---|---|---|---|
| Count-as-claim (grep census carried a recommendation without a mount check) | 5 instances in one artifact, caught in one review round | YES — same class as 2026-08-28 "a test count is not a coverage claim" → **documented-then-repeated** | Procedural: every audit count gets an importer/mount check before a verb attaches. Resolutional "be careful" is not the fix; the extra grep is |
| `&&`-chained probes: one miss cancels the rest | 1 (two checks lost, recovered) | no | Use `;` between independent probes; treat a probe batch's exit code as per-probe, not per-batch |
| Typed instead of rendered ORIENT | 1 | yes (hook exists for it) | The hook worked — blocked and forced the render |

## External-model calibration

No paid/external seats consulted. Both passes ran on subscription Claude seats; the free triangle (Codex/Gemini) was not fired — Sean explicitly routed the review to Fable.
