# Refusing to capture only protects the inputs you enumerated

**When:** 2026-07-29 (UTC) · **Linear:** SWA-75 · **Shipped:** `9c2f7ee5a` on `origin/main`

## The defect

The error reporter I shipped earlier the same day captured `req.originalUrl` **verbatim** into both the stored route and the grouping fingerprint. Reproduced before fixing:

```
fingerprint = "Error|/api/auth/reset?token=aaaaaaaa...|500"
```

A password-reset token is a live account-takeover primitive. Any 5xx on that route wrote a working one into the error store — and once a sink is registered, would ship it to a third party. Same for `?key=`, `?email=`, JWTs, phone numbers.

Second effect nobody would have noticed: every distinct token produced a different fingerprint, so one broken route fragments into hundreds of "problems" — defeating the grouping the reporter exists to provide.

## The lesson

**"Refuse to capture" is only a containment strategy for the inputs you enumerate.**

That reporter's PII tests covered the body, the headers, the identity fields and the error message — every place I had *thought about*. The URL was the one input captured without a test, and it was the one that leaked. The strategy was sound; the enumeration was incomplete.

Practical form: for any structure that leaves the process, list every field it carries and ask of each one *"what is the worst thing that could be in here?"* — then test that specific worst thing. Not "does scrubbing work" but "is this field even enumerated."

## The fix, and why removal beat scrubbing

`normalizeRoute()` strips the query string and fragment BEFORE the value is stored or fingerprinted. Deliberately removal, not pattern-matching: the path is what makes an error actionable, the query adds nothing diagnostic, and relying on regexes to recognise every future secret shape is the weaker guarantee. Mutation-proven — removing the strip fails 6 of 7 tests.

## Verified clean the same round, nothing changed

- All 6 models in the erasure list exist on disk and every FK really is `userId`. That list was written from memory and a wrong column would have made erasure silently delete nothing while reporting success (rule 58).
- `ClientNote` carries BOTH `userId` (the client) and `trainerId` (the author) — so targeting `userId` erases notes ABOUT a person, not notes they WROTE. Worth knowing before anyone "corrects" it.
- `models/associations.mjs` genuinely returns all 7 keys the erasure service expects, so it is compatible with the real registry and not only with the hand-made mock in its own tests. A service that skips missing models silently must have this checked, or it reports success having done nothing.

*IDs and roles only. No PII, credentials, or customer data.*
