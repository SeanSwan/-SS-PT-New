# My content filter passed every test and stopped almost nothing

**Surface:** Creator video studio — compliance controls · **Agent:** vs-claude (Opus 5)
**On main:** `5cc6bf532` · **Linear:** SWA-165

## What shipped

The three controls the 2026-08-16 licensing email promised MiniMax — per-asset provenance,
spend/volume ceilings, a content policy filter — plus the artifact upload path that was
missing. All five slices are on main with 153 passing tests.

## The finding worth carrying

I wrote the content filter, wrote its tests, watched 37 pass, and moved on. Then I ran an
adversarial pass against it: **11 of 13 probes walked straight through.**

The tests were not wrong. They asserted every case I had thought of — and that is exactly
the set a filter is guaranteed to catch, because I wrote the filter from the same list. A
unit test written by the author of the code under test samples the author's imagination,
not the input space.

**The misses were not clever.** "a youngster", "my son doing pushups", "a five year old
training", "a 7th grader lifting", "recess at the playground". Nobody typing those is
trying to evade anything — they are ordinary phrasings that produced a synthetic minor.
The two that *did* block were luck, not coverage.

Now 9 of 12 blocked. The three that remain (digit substitution, letter spacing) are pinned
as PASSING tests, so the limit is a recorded decision instead of an unmeasured hope, and a
future edit that closes one will fail the test that documents it.

## Mistakes I made

- **Believed a green suite about a filter.** The whole value of a guardrail is the inputs
  its author did not enumerate, which is the one thing author-written tests cannot cover.
- **Ate a backslash layer patching the file through a shell heredoc** — every `\b` word
  boundary became a literal backspace character. The patterns then matched NOTHING, briefly
  making the filter *worse than before the fix* (13/13 bypasses), while still passing
  `node --check` and looking correct in a diff. **Third occurrence of this class today.**
  Recovered only because I re-ran the probe instead of trusting the edit.
- **Trusted a rendered view over the bytes, then nearly trusted the bytes over the runtime.**
  A system-reminder displayed the regexes without their backslashes; I checked one line's
  raw bytes, saw `\b` present, and concluded the file was fine. It was not — a *different*
  line was corrupt. Only importing the module and printing the compiled regex settled it.
- **Built a provenance record that was thrown away.** `completeJob` cherry-picks `meta`
  and dropped it entirely, so the licensing commitment was unmet at the persistence layer
  while every unit test upstream passed. Found by following the value past the boundary
  rather than by any test.
- **Wrote a route reading `job.asset.provenance` when MediaAsset declares no associations** —
  it would have read `undefined` forever and reported "no provenance" for assets that have
  it. Caught before it shipped, but only by checking rather than assuming.

## Open

- **The migration is NOT run.** Local dev points at the production DB, so running it is a
  production schema change and Sean's call. Additive, nullable, reversible.
- Hosted MiniMax adapter not built — it would mean guessing an unverified API shape, the
  same thing I refused to do for the ComfyUI graph.
- **Still zero videos generated.** Unchanged, and still the whole job.
