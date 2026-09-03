---
surface: vs-claude
utc: 20260826T013000Z
topic: Swan Coach dispatcher authorization proven exhaustively; the registry's role list was missing the default role
tags: [swan-coach, command-lane, authz, contract-tests]
---

## What I did / learned
- Built the slice the previous handoff named next (SWA-64 §5.1): nothing asserted that a
  below-role caller is denied before reaching a Swan Coach dispatcher. Now proven over all
  139 registered commands x 4 caller roles = 303 below-role pairs. Zero reach a dispatcher.
- `dispatch` has THREE call sites, not one. The request pipeline checks ROLE; the two
  confirmation-lane sites (non-destructive and destructive redemption of a pending
  operationId) check OWNERSHIP, expiry and single-use instead, plus HMAC on the destructive
  path. Role is verified once, at mint. Both lanes now have contracts.
- The command registry's `USER_ROLES` listed `['admin','trainer','client']` and omitted
  `user` — which is the User model's DEFAULT role and the one 12 commands gate on. No
  runtime consumer read it, so nothing was ever denied wrongly; it misled a TEST that
  trusted it and skipped a whole role dimension while reading as exhaustive. Fixed, and the
  contract now reads the model ENUM directly so a fifth role cannot escape it.
- Measured a vacuity hazard worth remembering: params are validated BEFORE role is checked,
  so a below-role probe sending `{}` is rejected by the schema, not by the role gate. With
  empty params 116 of 303 pairs (38%) never reached the gate — a suite that "passed" while
  proving nothing. Synthesizing schema-valid params takes 293 of 303 to the gate; the
  remaining 10 are pinned by name with the Zod issue that blocks them.

## Why it matters to Hermes
- When asked whether Swan Coach can be made to do something above a caller's role: the
  answer is now evidence-backed for the request path, and the honest limit is ownership vs
  role — a caller whose role is revoked after minting an operation can still redeem it
  inside the 120s expiry. Say that limit rather than claiming blanket coverage.
- `endpoint` on a command is still declarative metadata; nothing dispatches on it. That was
  established last session and is now permanently asserted. Do not build authz reasoning on
  it.
- `allowedRoles` from the route-table harness remains untrustworthy for 54% of rows
  (`ceilingUnknown`). Unchanged by this slice.

## State right now
- Branch `claude/coach-endpoint-truth-v2-20260824`, committed locally, NOT pushed, NOT
  merged, NOT deployed, NOT human-reviewed. Every GitHub Actions gate is still dead at the
  account level, so local verification is the only gate.
- Files: two new contracts (`aiCommandDispatcherAuthorization`, `aiCommandConfirmLaneOwnership`),
  two new test helpers (`zodParamFixture`, `dispatcherReachability`), one registry constant fixed.
- Next slice: dispatcher SELF-gating. This proves the pipeline denies before a handler runs;
  it does not prove any handler denies on its own. And ownership — that a correctly-roled
  trainer cannot act on a client who is not theirs — is still untested.

## Mistakes I made
- Wrote a reachability scanner whose regex was built through a shell heredoc; the heredoc
  collapsed `\\b` to a literal backspace character, so the scanner matched nothing and
  reported zero foreign importers — a clean-looking result that was entirely false. Caught
  only because I had put a positive control in the scanner (it must see the imports it is
  certain exist), which read 0/110. Rule: never author a regex through a heredoc or
  `node -e`; write the script with a file tool.
- Repeated that same escaping mistake three more times in the same session — twice in
  `node -e` one-liners and once writing an anchor string that became a literal newline
  inside a JS string literal. The handoff I was working from documented this exact class in
  its §7. I read it and hit it anyway, four times.
- Shipped three successive VACUOUS drafts of one assertion. "The operation is deleted"
  passed with single-use deletion removed, because the expiry branch also deletes. Narrowing
  it to "deleted between the ownership check and the success return" still passed on the
  destructive path, because the signature-tampering branch also deletes. Only "deleted after
  the last early return" actually fails when the consume is removed. Each draft looked
  strictly better than the last and each was still unfalsifiable.
- Two mutations "did not fire" and I nearly recorded the assertions as vacuous. They were
  not — my mutations had hit the wrong one of two identical guard sites, because
  `str.replace(..., count=1)` took the first occurrence and the real target was the second.
  Rule: when a mutation does not fire, establish whether the mutation or the assertion is at
  fault before changing either.
- Wrote a header claiming "the pipeline is the only door to a dispatcher" after verifying
  only the import graph. There are three call sites. Caught in my own hostile pass, but it
  had already been committed to prose as fact.
- Trusted `USER_ROLES` as the role list because it was exported from the registry the
  commands live in. It was wrong, and the test that used it under-scoped itself by 42% while
  reporting exhaustive coverage.

## External-model calibration
- None. No paid or external seat was consulted this session; every finding above came from
  the implementation and its own mutation harness.
