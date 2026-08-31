---
name: a-junction-inside-a-worktree-deletes-the-real-thing
date: 2026-08-31
originating_model: claude-fable-5
surface: swan-taste-brain (Prompt Studio S1-S5), Aftertaste/H3 pipeline
models_used:
  - model: claude-fable-5
    role: Final Decider — build, hostile review, incident recovery
    did: Built Prompt Studio S1-S5 and the LoRA dataset exporter; hostile-reviewed both; caused and recovered a destructive-delete incident.
    cost: subscription
  - model: general-purpose subagents (x3, free)
    role: live-web research
    did: H3 upgrade shortlist, community workflow practice, ComfyUI API integration recipe. Link-verified; spot-checks found no fabrication.
    cost: $0
skills_touched:
  - id: rule-20 (sibling sweep)
    change: reinforced
    failure: A ComfyUI port/output-dir upgrade was reviewed as an isolated change; the consumer that read those two values (a separate repo) was never enumerated, so the render loop was silently disconnected.
  - id: rule-75 (trailhead truth)
    change: reinforced
    failure: A spec said a data acquisition was BLOCKED and unbuilt; the data had been on disk for ten days. A doc I wrote myself went stale within the same session.
---

# A junction inside a git worktree deletes the real thing

## The lesson

`git worktree remove --force` follows directory junctions and **deletes the target, not the link.**

To baseline-test a pre-change commit I created a throwaway worktree, then linked three gitignored
directories into it so the code could run (`mklink /J node_modules`, `sources`, `taste`). The removal
then walked through those junctions and emptied the **real** `node_modules` and the **real**
`sources/` — 29 MB of licensed corpus that is gitignored and therefore unrecoverable from git.

The generalisation is not about git: **any recursive delete may traverse a link you created for
convenience.** The convenience and the danger are the same feature.

What made it survivable was luck plus a habit: a sibling worktree from another agent still held an
intact copy, and I verified the restore by byte-size and by recomputing the corpus counts (223 /
4,340 / 407 / 5,434 / 9,521) rather than by seeing files reappear.

**The procedural fix, which is the only kind that survives:** before creating a link inside anything
disposable, decide how that thing will be destroyed. If the answer is a recursive delete, **copy
instead of linking**, or delete the link explicitly first (`rmdir` the junction, never `rm -rf` the
parent). A read-only need is not a safe need — the link is bidirectional even when your intent is not.

## Who did what

- **Fable 5** did all of it: the build, the hostile reviews that found the real defects, and the
  destructive mistake. No external model was consulted for the build.
- **Three free general-purpose subagents** did live-web research in parallel and were accurate where
  spot-checked. One of their conclusions was later **corrected by a practitioner transcript Sean
  supplied**: the research treated 4-step distilled video variants as broadly good; a creator who
  tested the released 4-step finetune reports it is text-to-video only and poor. Research that
  aggregates published claims will inherit the optimism of those claims — a practitioner's negative
  result outranks a vendor's positive one.
- **A concurrent agent's worktree** (Codex's, untouched by me) is what made the incident recoverable.
  Parallel agents are usually a collision risk; here redundancy was the safety net.

## Skills created or changed

- **Rule 20 (sibling sweep)** — reinforced. Upgrading the local ComfyUI (port 8188→8189, new output
  directory) was treated as self-contained. A different repo read both values from a config file and
  was silently pointed at the retired install. The sweep must cross repository boundaries when a
  value is an interface, not an implementation detail.
- **Rule 75 (trailhead truth)** — reinforced twice in one session. A spec claimed a catalog "was
  never scraped" ten days after it was scraped, and a handoff I wrote in the morning was stale by
  evening. Docs that state *status* rot fastest; the fix applied was to make the UI read counts from
  disk so the surface cannot repeat a written-down number.

## Mistakes I made

- **Created junctions inside a worktree I then force-removed**, destroying the real `node_modules`
  and the real licensed corpus. Recovered from a sibling worktree; verified by recomputing counts.
- **Ran a secret scan without pinning the working directory**, so I could not tell which repository
  it had scanned, and had to re-establish that by counting staged files.
- **Reached for three ad-hoc secret-grep variants** before using `scripts/scan-secrets.sh`, which
  existed the whole time. The permission layer blocked all three — the guardrail did its job while I
  ignored the sanctioned tool.
- **Wrote a test whose setup silently did nothing.** `createProject` takes an options object; I
  called it positionally, so no project was created, `tasteFor` returned null, and the corpus-law
  checks "passed" against an empty object for the wrong reason. Caught only because one unrelated
  assertion failed. Added an explicit setup control.
- **Shipped a dry-run-only exporter and nearly called it done.** The real memory has zero judged
  renders, so every check exercised the empty case; the write path had never executed. Fixed by
  building a real fixture render and writing an actual image/caption pair.
- **A guard I "fixed" was almost fixed wrongly.** Two browser assertions hardcoded a three-tab count
  and failed when a deliberate fourth tab landed. Bumping 3→4 would have preserved the number and
  destroyed the meaning; one of them was actually protecting "favourites is a drawer, not a tab."
  Rewrote both to assert what they mean.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Recursive delete traversing a link I created | 1 | No | Procedural: copy instead of link, or remove the link before the parent. Not "be careful". |
| Test setup that silently no-ops, giving false green | 1 | Yes — this is the "validate the instrument" law | An explicit **setup control** assertion that fails loudly when the fixture did not get built |
| A claim resting on an unexecuted code path | 1 | Yes — PROOF-BEFORE-DONE | A fixture that forces the path to run, asserting on real bytes (PNG magic) not on absence of error |
| Command status read after a pipe | 1 (blocked) | Yes — the top failure class | The `exit-status-gate` hook refused it before it ran. A hook beat prose again. |
| Doc asserting a status the code contradicts | 2 | Yes — Rule 75 | Made the surface read counts from disk, so the number cannot be re-asserted by hand |

The pattern across the repeats: **every one of these was already documented, and documentation did
not prevent any of them.** The two that were actually stopped were stopped by mechanisms — a
PreToolUse hook, and an assertion that fails. The one with no mechanism (the junction) is the one
that caused damage.

## External-model calibration

- **Free research subagents (x3):** high value, zero cost, no fabrications found on spot-check. One
  aggregate conclusion was overturned by a practitioner's hands-on negative result. Use them for
  breadth; do not let them settle a quality question that someone has actually tested.
- **No paid seat was consulted.** Nothing in this session met the bar — the work was building against
  a known spec plus adversarial review of my own output, which is exactly what a hostile loop is for.
