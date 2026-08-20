# Hold the subject constant, vary one axis — how to make a taste-cut decidable

**Surface:** Swan homepage hero — variant field · **Agent:** vs-claude (Opus 5)
**On main:** `124bcd22c` + variant doc · 10/10 rendered on the operator's own GPU

## The method that made this work

Sean asked for "ten different versions I can choose from" for his main page video, with
different worlds — glaciers, mountains, waterfalls, NatGeo/Windows-wallpaper grade.

The decision I made: **every variant runs the IDENTICAL swan action and the IDENTICAL seed;
only the world changes.** Same birds, same crossing, same locked camera, seed fixed at 4242
across all ten.

If both the subject and the setting varied per version, the taste-cut would be comparing two
things at once and the choice would be muddy — "I like #3" would not say whether he liked the
fjord or liked how that particular generation drew the swans. Fixing the seed also means
every difference he sees is caused by the PROMPT, not by generation luck.

**Rule: when producing a field of options for a human to choose from, vary exactly ONE axis
and freeze everything else — including the random seed. A field that varies two axes is not
a choice, it is a lottery, and the human cannot tell you WHY they picked one.**

## Cheap auditions before the expensive film

These ten are 4.46s each (~100s render). The real deliverable is a 15s four-clip chained
procession. Rendering ten full 15s versions would have been ~70 minutes of GPU and would have
answered the same question.

**Rule: settle the highest-variance decision at the LOWEST fidelity that can decide it.
The world question is decidable in 4 seconds; pacing and story are not, and nobody should
try to judge them from an audition.**

## Recommending without pre-empting

I gave a recommendation (`glacier-lagoon` or `blue-hour-tarn` — cold, text-legible, swans
brightest in frame) and an explicit judging order: does text survive on it, does it loop,
does it fight the palette, do the swans still read. Then said plainly that the point of
rendering ten is that his eye decides.

**Rule: on a taste call, supply the criteria and a recommendation, then get out of the way.
Withholding an opinion is unhelpful; substituting your opinion for theirs is worse. Both are
avoidable by making the criteria explicit — then a disagreement is informative rather than
just a veto.**

## Mistakes I made

- **Told Sean "15 seconds at best quality" before measuring** whether one generation could
  produce 15 seconds. It cannot — the ceiling is 4.458s at 720p. The correction came from
  probing, but the promise preceded the probe, and that ordering is backwards.
- Earlier the same day I shipped a graph whose settings contradicted its own documentation.
  Caught by cross-checking doc against artifact — a check that should be routine, not lucky.

## Open

- **Sean's cut is pending.** Ten worlds delivered as real footage, not descriptions.
- **The logo swan is deliberately absent from the variants** — introducing the brand bird
  while also varying the world would confound the comparison. It arrives in the procession.
- **720p is the LoRA ceiling.** A full-bleed 4K hero should be upscaled in post, never
  re-rendered larger; past its trained resolution the model degrades to temporal mush rather
  than gaining detail.
- **Sean-gated:** Linear credential expired (CONFIGURED BUT TOKEN REJECTED, HTTP 401, USER
  scope) — needs regeneration and a full restart.
