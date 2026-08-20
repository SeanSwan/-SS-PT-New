---
surface: vs-claude
slug: i-fixed-the-one-i-was-looking-at
date: 2026-08-20
worktree: c:/tmp/sspt-atelier-studio @ feat/front-page-atelier-run
commits: 68ba7225f, 4c6176c63
board: SWA-178
---

# The hard blocker was already built, and pointed somewhere else

Picked up the front-page handoff. Its §8 named `/trainers` the hard blocker and the
best use of a session, on the premise that a trainer's click lands in a client signup
form. Verified before building. The premise is false.

Every trainer CTA already routes to `/contact` (`HeroSection.tsx:41`,
`TrainersSection.tsx:127`), `PrismCapture.tsx:176` and `PrismRefraction.tsx:132`
both carry `?intent=trainer`, and `ContactV3.tsx:879` reads it. A contract test
*forbids* public trainer self-registration — so the page the handoff asked for would
have failed a gate on its way in.

The real gap is narrower and survives: `intent:'trainer'` is validated and tagged in
the capture route with **zero senders**, and the signal that does travel ends up as
prose in `Lead.notes` (`contactRoutes.mjs:152` accepts no `subject`, no `intent`;
both forms fold it into the message). The structured channel exists and is empty.

Wrote a Canonical Surface Receipt with the correction, a Rule 27 classification, and
three scoped options. Nothing runtime touched; `HomePage.V4` untouched. Awaiting
Sean's scope call.

## Mistakes I made

- **Inferred three line numbers instead of asking for them.** Cited
  `OptimizedSignupModal.tsx:1215-1216`, `leadCaptureRoutes.mjs:33` and `:163` off
  unnumbered `head`/`sed` output. All three wrong. Caught by my own hostile round 2.
  Fix: `grep -n` the symbol, never count lines from a range dump.
- **Then I repeated it, in the document that documents it.** Round 2 fixed the bad
  numbers in §2 and I moved on. Round 10 found `leadCaptureRoutes.mjs:33` still in
  the §3 table — same wrong number, same file, two sections below the paragraph I had
  just written about getting line numbers wrong. I fixed the instance in front of me
  and never swept for siblings, which is Rule 20 and already has a rule.
- **Then the fix for that failed too.** I documented a sweep to catch the repeat.
  Round 12 ran it verbatim and it reported false hits — the paragraph documenting the
  sweep contains the strings the sweep searches for. A skip-list patch also failed for
  the same reason. What finally worked was structural: scope the sweep to the claim
  region and exclude the meta region, plus a control line.
- **Claimed "works end to end" before tracing it to the database.** Round 2 caught
  that I had never checked whether the contact API even accepts the intent. It does
  not. The claim was right by luck — the forms fold it into the message — and I would
  not have known.
- **Classified a surface without evidence.** Called the vNext contact form
  "competing/ambiguous" on a guess. Round 3 showed it is playground-only
  (`playgroundRegistry.ts:52`) and not on the public route at all.
- **Shipped a command that dies from the repo root.** My receipt's sibling-sweep said
  `grep … src …` with no `cd`. Round 6 ran it verbatim: `grep: src: No such file or
  directory`. The repo's own gotcha #1 says `cd` in every call.
- **Three false alarms from imprecise instruments.** A grep filter, a `head`-masked
  exit code, and a citation count each produced a number that looked like a defect and
  was not. Every time, looking at the actual hit resolved it in one call. The standing
  correction is a control line: prove the probe can see a positive before believing a
  zero.

## The pattern

Every one of these is the same shape: I fixed what was in front of me and trusted a
number instead of the thing. The corrections that held were mechanical — run the
command from the directory it names, grep the symbol for its line, scope the sweep
structurally, print a control. The ones that did not hold were resolutional — "be
careful with line numbers." I wrote that one down and then broke it eight rounds later.

DRY-LOOP: CLEAN×2 (rounds: 14).
