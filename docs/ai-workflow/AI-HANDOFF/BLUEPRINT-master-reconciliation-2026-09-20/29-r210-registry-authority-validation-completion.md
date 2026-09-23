# 29 — R2-10 "registry / authority validation" completion record

**Status:** COMPLETE — the last of the three code defects carried open in `VERIFICATION-NOTES.md` §C.3.
**Round 2 lane:** order 9's second component (the repository-qualified amendments).
**Predecessors:** `27-c3-repair-reach-completion.md` (R2-08), `28-c2-repair-evidence-validation-completion.md` (R2-06/R2-07).

---

## 1. The defect being repaired (R2-10, Medium)

> *"A filesystem-generated registry is not an authority validator."*

The `preflight: registry` callback established three things and then let them stand in for a
fourth claim it could not support:

| Established | NOT established |
|---|---|
| the path exists (`localFile`) | that the referenced document **grants** the scope |
| `status` is one of three literals | that the document's text says what the registry says |
| `precedence` is an integer | that precedence is coherent against a decision |

A directory walk proves *"a file is there."* It does not prove *"this file authorises this scope."*
Existence was being read as authority.

### Astra's two named bypasses, reproduced as measured behaviour

**Bypass 1 — the alias escape.** An alias was pushed straight into the path-collision set:

```js
allPaths.push(lane.canonicalPackagePath, ...lane.aliases);   // BEFORE
```

Uniqueness was then asserted over those raw strings. So `../../unrelated` participates in the
comparison **without ever being passed through `localFile()`** — the one function that would have
rejected a path escaping the repository. Two consequences, both real: an escaping path is compared as
a *string* rather than refused as a *location*; and `a/../b` compares unequal to `b` while naming one
location, so the collision check can be defeated by re-spelling the very path it exists to catch.

**Bypass 2 — the incorrect document.** The REJECTED-vs-authority guard compared raw strings:

```js
assert.ok(!lane.authorities.some(a => a.path === d.path));   // BEFORE
```

Two defects in one line. The comparison never normalized, so a REJECTED document could be cited as an
authority merely by spelling its path differently. And when the paths *did* match, the rejection was
a bare `assert.ok` — no reason code, so a caller could not tell a semantic contradiction from a
fixture error.

### The repair — three results, kept separate

R2-10's fix text requires *"Keep **path exists**, **document status**, and **authority is valid** as
separate results."* That separation is now explicit rather than implied, and it is **observable**: the
callback accumulates two independent result sets and asserts both are non-empty.

```js
const existsResults = [];      // path exists
const authorityResults = [];   // authority is valid (declared semantics)
...
assert.ok(existsResults.length > 0, 'no path-existence results were recorded');
assert.ok(authorityResults.length > 0, 'no authority-validity results were recorded');
```

`normalizeRepoPath` is the single choke point. It rejects absolute paths, control characters and
backslashes, and refuses any path containing an empty, `.` or `..` segment — so a path that escapes
the repository cannot reach the uniqueness comparison at all. Normalization happens **before** the
comparison, which makes a re-spelled path collide with its target.

`assertAuthoritySemantics` validates one entry's *declared* semantics independently of its path's
existence — normalized path, non-empty scope, integer precedence, and for an alias an explicit
`aliasOf` target. A self-alias (`aliasOf === path`) is rejected as a **naming cycle**, not accepted as
a second name.

The REJECTED guard now normalizes both sides and carries `E_AUTHORITY_UNBOUND`, so a REJECTED
document cited as an authority is rejected **for its designated reason**:

```js
assert.ok(!lane.authorities.some(a => normalizeRepoPath(a.path, 'authority path') === docPath),
  `E_AUTHORITY_UNBOUND: lane ${lane.id} cites REJECTED document ${docPath} as an authority`);
```

---

## 2. Order 9's second component — Astra's acceptance matrix, materialized

`scripts/blueprint-master-evidence.regression.test.mjs` gains its own registry fixture. The registry
is a **separate artifact** from the snapshot, so it gets its own document tree:

- the **real eight lane directory names** are used, because the checker asserts
  `lane 1 canonicalPackagePath = ${base}BLUEPRINT-cinematic-frontend-2026-09-19`;
- only the four shapes the registry check reads are emitted — canonical path, one authority, one
  document, the `aliases` array;
- `registryPath` is derived with `path.relative(...).split(path.sep).join('/')`, because `localFile`
  rejects absolute paths and drive letters. The first attempt failed here with a `:` in the path.

Each case runs the **control in the same fixture shape first** and requires it to pass, so a failure
cannot be manufactured by fixture breakage.

```
ok  AT-05 valid synthetic registry control
ok  AT-06 rejects an alias that escapes the repository for its designated reason
ok  AT-07 rejects a REJECTED document cited as an authority for its designated reason
# tests 7  # pass 7  # fail 0
```

One fixture detail worth recording, because it was a **failed** first attempt: the rejected variant
originally created a separate `DOC.md`, which never collided with the authority path — so AT-07 was
green by *not exercising the guard*. In the rejected variant, `docPath = authorityPath`: **one
document simultaneously cited as an authority and marked REJECTED.** A rejected-but-uncited document
would test nothing.

---

## 3. Load-bearing proof — two mutations, each detected by its named case

`scripts/.mutation-proof-r210.mjs` degrades one mechanism at a time and requires the *named* case to
fail. It carries a **syntax-error guard**: a mutation that merely breaks the file's syntax is not
counted as a detection, because a parse failure would fail every case and prove nothing about the
mechanism.

```
DETECTED  N1 — aliases bypass normalization (R2-10 bypass 1)
   expected AT-06; pass=6 fail=1
   failed: AT-06 rejects an alias that escapes the repository for its designated reason
DETECTED  N2 — a REJECTED document may be cited as an authority (R2-10 bypass 2)
   expected AT-07; pass=6 fail=1
   failed: AT-07 rejects a REJECTED document cited as an authority for its designated reason

RESTORED — pass=7 fail=0
```

`pass=6 fail=1` and not `fail=7` is the point: each mutation kills **exactly** its named case. The
N2 mutation replaces a whole block rather than one line — the first attempt replaced only the message
line and left an unclosed `assert.ok(`, which is precisely the syntax breakage the guard exists to
reject.

---

## 4. Verification summary

| Suite | Command | Result |
|---|---|---|
| Matrix A (C2 + R2-10) | `node --experimental-vm-modules scripts/blueprint-master-evidence.regression.test.mjs` | **7/7 pass** |
| Matrix B (C3) | `node scripts/intake-reach.regression.test.mjs` | **8/8 pass** |
| Mutation proof (C3) | `node scripts/.mutation-proof-c3.mjs` | **4/4 detected**, restore green |
| Mutation proof (R2-10) | `node scripts/.mutation-proof-r210.mjs` | **2/2 detected**, restore green |
| Real-corpus smoke (C3) | `node scripts/intake-reach.mjs --root frontend/src --specs …` | 4578/4578 scanned, **1** diagnostic, exit **6** |

The real-corpus diagnostic is a genuine pre-existing defect, not a false positive:
`components/common/ConstructionBanner.integration.tsx` declares `AppContent` twice. Exit `6` is
correct — the scan is INCOMPLETE, so absence is not assertable.

---

## 5. What this does NOT claim

This repair closes R2-10's *named* bypasses. It does **not** create the trusted authority boundary,
and the code says so in its own header comment:

> *"What this still does NOT do, deliberately: it does not authenticate the referenced document's own
> text, because that requires the trusted collection boundary R2-06 names and which does not exist."*

- The callback reports **declared** authority and never claims **verified** authority.
- R2-06's own conclusion applies unchanged: *"Authenticity requires a trusted collection/authority
  boundary; adding more self-authored JSON does not create one."*
- Real caller-path proof (G3 isolated run with bound collection provenance) remains **NOT RUN** and
  is not implied by this matrix.

**Product admission remains blocked.** With R2-10 closed, all three §C.3 defects are repaired — that
closes the *code* column of round 2, not the admission decision. Round 3 is still owed, and its named
target remains the admission caller path.
