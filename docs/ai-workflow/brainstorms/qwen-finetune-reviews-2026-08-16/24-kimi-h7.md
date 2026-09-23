# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/brainstorms/qwen-finetune-reviews-2026-08-16/22-PACKET-SLICES-H7.md
**Seed:** (none)
**Tokens:** 9529 in / 16646 out | **Cost:** ~$0.2783 | **Wall:** 279.5s | **finish_reason:** stop

---

## Verdict: NOT DRY

Two genuine H6-fix regressions, both in the exact blast radius of the H6 ledger, with executable red repros. H7-1 reopens the crash-window deadlock the H6 fix claims to close; H7-2 leaves a falsy-id hole in the "throw before any model call is paid for" guarantee. One low-confidence minor follows.

---

### H7-1 — The deferred-mkdir fix reopens the deadlock it claims to close: crash between `mkdirSync(sealed)` and first `appendFileSync` leaves an *empty `sealed/`*, which is **neither absent nor evidence** → permanent `--force` refusal AND plain-run refusal.

The GLM H6-1 fix comment asserts: "an early failure … leaves literally nothing." False for the failure window *internal to the first item*: `done === 0` mkdir runs, then `appendFileSync` — and any kill or FS-level throw (ENOSPC, EROFS, EACCES, EMFILE, SIGKILL) between those two syscalls leaves `runDir` containing exactly one entry: an **empty `sealed/` directory**.

Red repro (executed against the gate logic):

```js
// simulate the crash residue, then attempt recovery
mkdirSync(runDir, { recursive: true });
mkdirSync(join(runDir, 'sealed'));           // crash lands here, before first append

// rerun WITHOUT --force:
existsSync(runDir) && readdirSync(runDir).length > 0
// → ['sealed'] → throws "run dir ... is not empty" (refused)

// rerun WITH --force:
//   run-card.md?      no
//   sealed/mapping?   no
//   sealed/outputs?   no
//   superseded(runDir)?  'sealed'.includes('.superseded-') → no
//   superseded(sealedDir)? readdirSync(sealed) = [] → .some() → no
// → throws "--force refused: none of ..." (refused)
// DEADLOCK — the exact recovery class H5-1/H6-1 were ratified on.
```

The evidence list and the emptiness gate now disagree about what an empty `sealed/` means. Pre-H6 code pre-created `sealed/`, so this footprint was *always* recoverable (force saw `outputs.jsonl` once appends started, and the dir screw was the GLM H6-1 complaint only for pre-loop failures). The fix moved the window rather than closing it.

**Fix (recovery-path carve, consistent with H5-1 doctrine — deadlock prevention, not window theology):**

```js
const entries = existsSync(runDir) ? readdirSync(runDir) : [];
const onlyEmptySealed = entries.length === 1 && entries[0] === 'sealed'
  && statSync(join(runDir, 'sealed')).isDirectory()
  && readdirSync(sealedDir).length === 0;
if (entries.length > 0 && !onlyEmptySealed) {
  // ... existing force/evidence/supersede block ...
}
// otherwise fall through; mkdirSync(recursive) at first append is idempotent
```

(`statSync` import added; the isDirectory check keeps a foreign file-named-`sealed` from being waved through.)

---

### H7-2 — Duplicate-id gate (H6-2) leaks falsy ids and type-mismatched ids, both of which collide downstream *after* model calls are paid for.

```js
const explicitIds = items.map((r) => r.id).filter(Boolean);
```

`filter(Boolean)` drops `0`, `''`, `false`. But the record builder is nullish-coalescing — `row.id ?? \`item-${done+1}\`` — so `id: 0` and `id: ""` are treated as *valid* ids downstream. Two rows with `id: 0` (zero-indexed exports are common) sail through the new gate, both records carry `id: 0`, and then:

- `sliceById = Object.fromEntries(outputs.map(o => [o.id, ...]))` — silent overwrite;
- `truncatedIds.includes(o.id)` / judgeable exclusion — cross-item contamination;
- blinding pairs keyed on id — the "second net" (`buildBlindedPairs` uniqueness throw) trips only **after** generation, which is precisely the failure H6-2 was ratified to pre-empt ("duplicates must die BEFORE any model call is paid for").

Same hole, second species: `id: 1` and `id: "1"` — `indexOf(id) !== i` is strict-type, so they pass the gate, then collide as object keys in `Object.fromEntries`.

**Fix:**

```js
const normIds = items
  .map((r) => (r.id == null ? null : String(r.id)))
  .filter((s) => s !== null && s !== '');
const seen = new Set();
for (const id of normIds) {
  if (seen.has(id)) throw new Error(`duplicate eval id "${id}" — ... (H6-2/H7-2).`);
  seen.add(id);
}
```

(and let `validateRow` reject empty-string ids outright, since `''` is a malformed id, not a duplicate.)

---

### m1 (low confidence, honest severity) — Branch-1 `()` in the lookbehind class re-breaks F6's "id selectors are not flagged" promise for call expressions.

The F6 comment guarantees "id selectors (#cafe, #face) that happen to spell hex are not flagged." Branch 2 honors that via the terminator guard. But H4 restored `(` to branch 1's class, and branch 1 has **no guard** — so:

```js
document.querySelector('#cafe');   // lookbehind ( → hex body #cafe\b → FLAGGED
container.querySelector('#face');  // same
```

A quoted-string selector argument is not a hardcoded hex *color*, yet it now flags — while `linear-gradient(#f00,…)` rightly still flags via both branches. This was not among the ratified residuals (`:is()` lists, comment-internal hex, `url(" #fff")`). Fixable by mirroring the url/href exemption pattern for `querySelector(`/`matches(` — or by promoting `(` to a guarded branch; either way, it's a real false-positive class, though admittedly a narrow one (hex-spelling ids only). Flagging it as a minor, not a headline.

---

## DISSENT (mandatory)

- **Against H7-1 ("SIGKILL-only window, below threshold"):** the packet ratified *both* H6 crash findings on the principle that recovery paths must not deadlock; the fix's own comment claims "literally nothing," and that claim is falsified by its own syscall ordering. Severity here is the *completeness* of the deadlock (both `--force` and plain run refuse), not the width of the window. Also, `appendFileSync` can throw synchronously for FS reasons — this is not a kill-only window. Dissent fails.
- **Against H7-2 ("`id: 0` is unrealistic"):** the gate's invariant is "every downstream join is id-keyed"; `filter(Boolean)` contradicts the `??` semantics eight lines apart in the same function. Zero-indexed integer ids are a normal export shape. The fix is four lines. Dissent fails.
- **For fairness:** GLM m1 (CRLF) stays disproven — the `m`-flag/`.`-consumes-`\r` reasoning is sound and I am not re-raising it. The accepted residuals (gradient mid-list with stop positions, quote-wrapped prose hex, `:is()`, comment-internal hex, `url(" #fff")`) are untouched; H7-2 and m1 are not residual-washing, they are post-H6 states.

**NOT DRY.** H7-1 and H7-2 are genuine and fixable; the round stands open.
