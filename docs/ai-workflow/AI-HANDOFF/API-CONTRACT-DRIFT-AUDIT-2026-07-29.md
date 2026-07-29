# API Contract Drift Audit — 2026-07-29

- **Linear:** SWA-71 · **Lane:** frontend→backend API contract (cleanup loop iteration 4)
- **Result: 478 of 480 frontend API paths resolve. Two dead calls, both low severity.**
- Nothing fixed — both findings need a judgment call, and neither is a launch blocker.

---

## Headline: the contract surface is healthy

480 distinct `/api/…` paths are called from `frontend/src`. 166 mount prefixes are served by the
backend across its two aggregators. **478 of 480 resolve.** For a codebase this size that is a good
result and worth recording, because "we audited it and it was fine" is information the next agent
otherwise pays to rediscover.

## The method — and the discriminator that makes it provable

Static path-matching alone produces false positives (my first pass flagged 24; 22 were extraction
artifacts where a grep truncated `/api/food-scanner/…` to `/api/food`). Source analysis says what
*looks* wrong. It cannot say what *is* wrong.

**The discriminator is a production probe, validated by controls:**

| Response | Meaning |
|---|---|
| **404** | No handler is mounted at that path |
| **401** | A handler EXISTS and is auth-gated |
| **200** | Public handler |

Controls run in the same pass to prove the discriminator itself:

```
/api/health              -> 200   known-good
/api/definitely-not-real -> 404   known-bad
/api/trainer/drafts      -> 401   handler exists, auth-gated
```

Without the 401 control, a 404 could be mistaken for "auth rejected an anonymous probe." With it,
404 unambiguously means no route. **Always probe a known-good, a known-bad, and a known-gated path
alongside the candidates.**

---

## Finding 1 — `/api/trainer/stats` has no handler

```
GET /api/trainer/stats  ->  404
```

`/api/trainer` is not mounted bare. Only `/api/trainer/drafts` and `/api/trainer-permissions` exist,
neither of which matches. The caller is `frontend/src/context/SessionContext.tsx:872`, and it fails
silently:

```js
try {
  const response = await apiService.get('/api/trainer/stats');
  return response.data || {};
} catch (error) {
  logger.warn('Failed to fetch trainer stats from backend');
  return {};                                    // ← empty object, no error surfaced
}
```

**Severity: LOW — because nothing consumes it.** `fetchTrainerStats` is declared in the context
interface, given a default stub, defined, and exported — and then referenced by **no component
anywhere**. Only `SessionContext` mentions it.

So this is a dead context method calling a route that does not exist. It is not a user-facing
failure today; it is a trap for whoever wires it up next, because it will return `{}` forever and
log a warning nobody reads.

**Proposed (needs a decision, not a patch):** either implement `GET /api/trainer/stats` if trainer
stats are wanted, or remove `fetchTrainerStats` from the context entirely. Leaving a plausible-
looking context method that silently returns `{}` is the worst of the three options — the next
developer will wire it into a dashboard and see zeros.

## Finding 2 — `/api/users/profile` does not exist (and neither does the singular)

```
GET /api/users/profile  ->  404
GET /api/user/profile   ->  404
```

Caller is `frontend/src/components/DevTools/ApiDebugger.tsx:233`, a developer debug panel:

```js
{ name: 'User Profile', url: '/api/users/profile', key: 'profile' },
```

**Severity: COSMETIC.** It is a dev tool, and a dev tool reporting an endpoint as down is arguably
working correctly. But the URL is not merely mis-pluralised — `/api/user/profile` 404s too, so
there is no correct spelling. The probe points at an endpoint that does not exist in either form.

**Proposed:** point it at a real profile endpoint or drop the row. A debug panel that always shows
one permanent red light trains people to ignore the panel.

---

## Method caveats, stated honestly

- **Template literals were normalised away.** Paths built as `` `/api/x/${id}` `` were captured up
  to the interpolation. A path assembled entirely at runtime from variables is invisible to this
  audit.
- **Only `frontend/src` was scanned.** Calls from scripts, tests, or mobile clients are out of scope.
- **Mount-prefix matching proves a prefix is served, not that the full path has a handler.** A call
  to `/api/sessions/some-endpoint-that-does-not-exist` matches the `/api/sessions` prefix and would
  pass this audit. Only the production probe distinguishes those, and probing all 480 was not done.

The 478/480 figure therefore means "478 have a plausible backend owner", not "478 are proven live".
The two failures are proven; the successes are high-confidence.
