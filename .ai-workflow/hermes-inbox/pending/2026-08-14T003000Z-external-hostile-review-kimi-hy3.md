---
surface: qa-harness + backend-models
slug: external-hostile-review-kimi-hy3
agent: vs-claude (Opus 5)
date: 2026-08-14
---

# External hostile review (Kimi K3 + HY3): 13 of 17 findings real, including two of my tests that were decorations

## What happened

Sean authorised one paid external review each. Built a 67 KB packet — full source of every new
module, full diffs, verification already done, and an explicit list of what was NOT verified — and
gave each reviewer ONE remit (a dual-remit packet makes one model role-play both).

- **Kimi K3** — correctness / fail-open remit. $0.1224.
- **Tencent HY3** — absence remit. $0.0055.

Every finding was verified against source before any fix. 13 of 17 were real; 4 were refuted.

## The findings that mattered

**A gate can contain the exact bug class it was built to catch.** `readRegisteredModels` did not
strip comments, so a line like `// TODO: register PaymentPlan next sprint` inside the returned
object seeded that name into the REGISTERED set. A `getModel('PaymentPlan')` call site would then
pass the highest-severity assertion while the model was unregistered — the renewal-alert failure,
green, through the tripwire built to prevent it.

**Two of my own tests were passing for reasons unrelated to what they claimed.** The backend
fail-loud test threw ENOENT (Windows `/C:/...` path), not the guard — and went green only because
the FILE'S NAME contains "Registry" and the matcher was `/return \{|registry/i`. It would have
passed on any error whatsoever. The crawl-timeout test never cleared the env override that
`crawlTimeoutFor` checks first, so in any CI that sets it — the documented way to pin it — every
assertion passed with the named defect fully present.

**Then the same class bit me again while fixing it.** The frontend "table moved" test passed its own
spec file as the missing-anchor case; my new fixtures legitimately contain the string
`roleConfigurations`, so the anchor was found and the test failed on a different error. A guard test
must not depend on what happens to be written elsewhere in its own file.

## Lessons worth carrying

**A test can be a decoration.** Green does not mean "the assertion exercised the thing it names."
Both of mine were structurally incapable of failing for the stated reason. The cheap check is to
ask, for each assertion: *what would have to be true for this to pass while the defect is present?*
That question is what Kimi was asked, and it found both.

**Verifying before fixing is what makes an external review worth buying.** 4 of 17 findings were
wrong, including HY3's top-ranked one. Fixing all 17 would have meant three unnecessary changes and
one false alarm escalated to Sean.

**Fixing a silent-failure class requires proving the guard trips.** All four parser fixes now feed
synthetic broken sources through the parser and assert it shouts. Fixing silence without proving
noise is how the first version shipped.

## Mistakes I made

- **Shipped two tests that could not fail for their stated reason.** Both were written by me in this
  same session, both reviewed by me, both passed my own dry-loop. An external reviewer found them in
  one pass. My dry-loop rounds checked whether the SUITE was green, never whether an individual
  assertion was capable of going red.
- **Built a drift tripwire that contained its own bug class.** The comment-stripping helper existed
  in the same file and I applied it to one of two consumers.
- **Repeated the incidental-text failure a third time within one session** — the frontend "table
  moved" test — while actively fixing the first two instances of it.
- **Wrote a parser that accepted one quote style** after spending the session fixing a
  coverage-blindness bug caused by exactly that kind of narrow assumption.
- **Let a review time out and had to re-run it** — first Kimi call used a 60k output budget and hit
  the transport deadline, wasting a call. Second run at 14k succeeded in 58s.
- **Probed for the OpenRouter key in the wrong place first** — the worktree has no `.env`; the key
  is in the main repo. Same two-axis probe error as the Linear key, one turn after writing that
  lesson down. Caught immediately this time because the lesson was fresh.

## External-model calibration

- **Kimi K3, correctness/fail-open remit — HIGH VALUE.** 9 findings fixed, 4 valid-but-minor
  (weak size guards), 1 refuted (migration/ENUM mismatch — the migration matches exactly), 2
  correctly reported as no-finding (import-time boot safety; no bypass in the write allowlist).
  Its concrete-trigger discipline held: it dropped what it could not construct, and its "what would
  make this assertion pass with the defect present" analysis found both of my decoration tests.
  Worth calling again for correctness work.
- **Tencent HY3, absence remit — MIXED, still worth it.** Its #1 and #8 (highest-ranked) claimed the
  fix would mass-email real users; **disproven** — no outbound path exists anywhere in the service.
  Its "contactedBy may be missing" was also disproven (migration creates it). But its #2 — that a
  NAME check is not a VALUE check — was a genuinely sharp architectural catch I had missed, and its
  #5 produced a test worth having. Pattern: HY3 over-states severity and asserts unverified
  specifics, but its structural instincts are good. Use it for "what did I not think about",
  never for "is this claim true".
- Both were cheap enough ($0.13 total) that the calibration cost nothing meaningful.

## State for Hermes

- Commit `72332f5ae` on `claude/qa-harness-slice0-20260811`. Committed, NOT pushed.
- Reviews saved at `docs/ai-workflow/AI-HANDOFF/KIMI-HOSTILE-QA-HARNESS-2026-08-14.md` and
  `HY3-HOSTILE-QA-HARNESS-2026-08-14.md`.
- **Needs Sean:** if `SWAN_AUTOMATION_CRON_ENABLED=true` in Render, the RenewalAlert fix means the
  renewal job does its first-ever writes to `renewal_alerts` on the next tick. No sends, no
  user-visible effect, but it is a state change he should authorise. The job still only logs on
  failure rather than alerting.
- Open, not actioned (HY3, scope): no migration-vs-model gate; no mounted-route-vs-controller gate;
  no cron-error-alerting gate; no socket event gate; no required-env-var boot assertion.
