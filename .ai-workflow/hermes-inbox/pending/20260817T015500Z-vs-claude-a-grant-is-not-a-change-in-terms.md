# A grant is not a change in terms

**Surface:** Creator video studio — H3 licence · **Agent:** vs-claude (Opus 5)
**On main:** `b1160b9e5` · **Linear:** SWA-165

## What happened

MiniMax approved Sean's request. He asked for commercial H3 by default. Done, persisted at
Windows user scope, and verified with a real render whose provenance reads
`grantRecorded: true, usedCommercially: true`.

The interesting part is what I did NOT do. The obvious implementation of "make it
commercial" is to edit the catalogue so H3's licence says `commercialUse: 'permitted'`.
That would have been one line and it would have been wrong.

**The terms did not change. Sean acquired a grant against unchanged terms.** H3 is still a
licence that requires a written grant for US commercial use — it is simply that one party
now holds one. Collapsing those into "permitted" erases the distinction, and because
provenance freezes the licence snapshot into every asset, every future record would then
assert that H3 was openly permitted. Months later nobody could answer *why* a given asset
was allowed: because the model is open, or because this operator was authorised?

So the terms stay `requires-grant` and the grant is recorded separately, in its own
fail-closed allowlist. The provenance record now says both things at once, which is the
only accurate description.

## The guard that paid for itself

The first commercial H3 run failed instantly with `E_NO_INPUT`. `buildGraph` hardcoded the
prompt field name `text` — correct for Wan's `CLIPTextEncode`, wrong for H3's
`MiniMaxH3ImageToVideo`, which calls it `prompt`.

It failed **loudly** because that injector was written to refuse to CREATE a field it does
not find. Without that rule ComfyUI would have accepted the undeclared input, ignored it,
rendered the template's placeholder prompt at full GPU cost, and reported success — and I
would have shipped a "working" commercial pipeline that silently generates the wrong video.

That guard was written days ago on a hunch about a failure I had not yet seen. This was its
first encounter with a second implementation, and it caught it on contact.

## Mistakes I made

- **Reported all touched files under the 300-line cap last turn when one was at 306.** I
  stated a measured fact without re-measuring it after my own edits. Fixed by extracting
  `comfyuiGraph.mjs` — 227 + 115 — rather than shaving comments again.
- **Deleted `generate()` while extracting it.** My first extraction script spliced from
  `loadGraph` to `findOutputFile`, and `generate` sat between them. Caught by checking the
  exports afterwards; restored from git and redone bottom-up.
- **Hardcoded a field name from the only model I had.** `text` was not a considered choice,
  it was the first thing that worked, and it silently encoded "Wan is the only model".
- **Recorded a legal grant on a verbal report** without evidence attached. Correct to act on
  — it is Sean's business and his call — but the provenance now asserts `grantRecorded:
  true` with nothing behind it, so the doc carries an explicit EVIDENCE OWED flag rather
  than a quiet gap.

## Open

- **Sean owes the approving email** — sender, date, reference number — filed into the
  licensing doc, so `grantRecorded: true` is substantiable by someone who was not here.
- Migration `20260816230000` still not run.
