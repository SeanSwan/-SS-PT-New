---
surface: vs-claude
slug: i-copied-the-bug-by-copying-the-pattern
date: 2026-08-20
worktree: c:/tmp/sspt-atelier-studio @ feat/front-page-atelier-run
commits: bf60ab80f, 4b3a543d5, bba9dffa0, ab1518517, f3be339a8
board: SWA-178
---

# Option C shipped, and the aggregator I mirrored had a live bug

Sean chose option C and delegated the button colour. Both done, plus the fork's dead
door. Committed on the branch, not pushed (Rule 70 batch cadence). `HomePage.V4`
untouched; no live UX changed, because C was chosen over A specifically to avoid that.

**What C actually is:** the contact API accepted no `subject` and no `intent`, so both
forms folded the subject into the message body, which lands in `Lead.notes` verbatim.
A trainer inquiry was countable only by full-text-scanning a free-text column, and a
copy edit to "Trainer inquiry" would have broken the count with no error. The API now
carries an allowlisted intent, the vocabulary has one definition shared by both public
funnels, and `GET /api/leads/stats` returns a `byIntent` tally computed from rows it
already fetched.

**Colour pick:** of the twelve metallic ramps, exactly three are already brand tokens —
Ice Wing, Wing Purple, Gilded Fern. The first two are each other's documented partner
under the Dual-Button Glow rule. The other nine are hues I authored, so "the ones that
we have" chose itself. Arctic Cyan stays out and is now asserted out: data/chart token,
banned from buttons.

**Stopped one inch short, deliberately.** No UI renders `byIntent`. The marketing panel
already fetches the response and already renders `byChannel` in the same shape, so the
tile is a small mirror — but it is a design-placement call in a file near the 300-line
cap, and I would have been building it blind. Next slice, not an oversight.

## Mistakes I made

- **I copied a live bug by faithfully copying a pattern.** `aggregateLeadIntents`
  mirrored `aggregateLeadChannels`, including its plain-`{}` accumulator. A lead tagged
  `prism:intent:__proto__` made `acc[key]` resolve to `Object.prototype` — truthy, so
  the init guard skipped — and the `+= 1` landed on `Object.prototype.count`, giving
  every object in the process an inherited `count:NaN`. Verified by execution. The
  original had it too and predates me. Both fixed with `Object.create(null)`. Fixing
  only my copy would have left the source to be mirrored again.
- **Found it by reading my own diff, not by a test.** Ten hostile rounds of behaviour
  tests passed over it. What surfaced it was looking at `acc[intent]` and asking what an
  attacker-supplied key does — a question no green test asks.
- **I nearly shipped a gate that could not fail.** My first door check searched the
  document for `/contact?intent=trainer` and PASSED with the door reverted to `href="#"`,
  because the explanatory note I wrote below the doors names the same path. It was
  matching my own prose about the door. Only injecting the regression exposed it. Same
  shape as last session's sweep that searched its own documentation — second occurrence
  of that exact error class in two sessions.
- **I claimed "works end to end" before tracing it to the database**, then found the
  contact API accepts neither `subject` nor `intent`. The claim was true by luck.
- **I asserted a count instead of reading it, again.** Expected 2 `Object.create(null)`
  and got 3 — the third was my own comment mentioning the phrase. Fourth false alarm
  this session from a count matching prose rather than code. Checked rather than
  assumed, which is the only reason it was a non-event.
- **I grepped a file that does not exist** (`backend/core/middleware.mjs`) and briefly
  treated its empty output as evidence there is no body-sanitizing middleware. There
  isn't one — but I had not established that when I first believed it.
- **Fixed one form and would have left its twin.** Caught on the round after: the
  dormant v-next contact form had the identical intent-drop, and that file already
  carried a note from a previous agent explaining why omitting parity there is
  dangerous. I had read that note and still nearly repeated it.

## External-model calibration

No external or paid model consulted. $0.00. Recorded so absence is a decision, not a gap.

DRY-LOOP: CLEAN×2 (rounds: 12).
