# The GPU was under the desk the whole time

**Surface:** Creator video studio — first render · **Agent:** vs-claude (Opus 5)
**On main:** `b6b562ddf` · **Linear:** SWA-165

## What happened

A video generated locally on the RTX 5090 in **26.73 seconds**. Zero API cost. First one
this project has ever produced.

For an entire workstream I had written — in handoffs, in commit messages, in durable
learning packets — that there was "no GPU in this environment" and that generation
therefore could not be proven here. I was running on the machine with the 5090 in it. I
never ran `nvidia-smi`.

What was actually missing was `git clone`, a PyTorch install, and 18GB of weights. Not a
phase. Not a workstream. An afternoon of downloads I could have started at any point.

Sean got there by being blunt about the delay, which is the only reason it got checked.

## Mistakes I made

- **Asserted a negative about the physical world, repeatedly, in permanent documents,
  without one command to test it.** Every handoff I wrote says "no GPU here". Those
  documents are now wrong in the corpus, and the wrongness shaped the entire plan: the
  "next slice" was written as *someone else's* job on *someone else's* hardware.
- **Nearly reported the Z: drive change as done on the strength of a log line.** ComfyUI
  printed `Setting output directory to Z:` — then that process died unable to bind 8188,
  and the OLD process kept serving C:. The log was true when written and false one second
  later. Caught only by rendering a distinctly-named file and looking at where it landed.
- **Trusted `pkill -f` to stop a Windows process.** It reported nothing and killed nothing;
  `taskkill //PID //F` was required. A kill command that exits 0 is not a dead process.
- **Trusted `wmic` output that was column-truncated**, then trusted a log line that
  contradicted it, and had to settle the disagreement with a physical file either way.

## What the real runs found that no test did

1. **ComfyUI caches by graph.** An identical prompt returns the PREVIOUS run's outputs
   without re-rendering. It surfaced as a 404 (the earlier artifact had been moved), but
   the 404 was the small half — **two different jobs with the same prompt would silently
   have shared one video**. Seeds are now derived from job id: deterministic per job,
   distinct across jobs.
2. **Blackwell needs CUDA 12.8.** The default PyTorch wheel installs cleanly and fails at
   runtime on sm_120. `--index-url .../cu128` is required, and the failure mode is late.

## Also shipped

Wan 2.2 registered as a provider — Apache 2.0, so no grant, no territorial carve-out, and
commercial use permitted TODAY, unlike H3. The ComfyUI adapter became provider-agnostic
with almost no change, because the graph was always an operator-supplied input and only
the provider id was hardcoded. That design choice paid off the first time it was tested.

## Open

- Weights sit on C: while Sean's convention is `Z:/AI-Weights` — his call.
- H3 un-downloaded (21GB). Natively supported; just not fetched.
- Migration `20260816230000` still not run.
