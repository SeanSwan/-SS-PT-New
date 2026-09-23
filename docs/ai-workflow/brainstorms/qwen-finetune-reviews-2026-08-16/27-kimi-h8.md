# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/brainstorms/qwen-finetune-reviews-2026-08-16/25-PACKET-SLICES-H8.md
**Seed:** (none)
**Tokens:** 10144 in / 21317 out | **Cost:** ~$0.3502 | **Wall:** 355.6s | **finish_reason:** stop

---

**Verdict: NOT DRY.**

**H8-1 — GLM H7-3 is still not closed for empty argv tokens.**  
`next()` rejects only `undefined` and `value.startsWith('--')`. An empty-string token is still accepted:

```js
const next = () => {
  const value = argv[i + 1];
  if (value === undefined || value.startsWith('--')) throw ...;
  i += 1; return value;
};
```

That leaves two bad outcomes:

- `--train ""` / `--profile ""` still silently disable a control: `opts.train === ''` skips `contaminationGate`; `opts.profile === ''` skips the track-validator gate. These are exactly the controls H7-3 was supposed to stop “vanishing.”
- For numeric flags it is worse than a refusal: `Number('') === 0`, so `--timeout-ms ""` becomes `0`, `--num-ctx ""` becomes `0`, and `--audit-seed ""` becomes integer `0` instead of an error.

Fix: reject empty/blank numeric values and empty string values before coercion, e.g. `if (value === undefined || value === '' || value.startsWith('--')) throw`, and in `numArg` reject `String(value).trim() === ''`. Smokes needed: `run --train ""` throws; `run --profile ""` throws; `run --audit-seed ""` throws; `run --timeout-ms ""` throws.

**H8-2 — forced recovery still has a non-directory `sealed` hole.**  
The H7 “file named `sealed` does not qualify” invariant is only guarded in `onlyEmptySealed`. The `--force` evidence path still does:

```js
const superseded = (dir) => existsSync(dir) && readdirSync(dir).some(...);
```

If the run dir contains a regular file named `sealed`, `--force` can reach `superseded(sealedDir)` and throw `ENOTDIR` instead of the intended H4-3/H5-1 refusal. Add the same directory guard there:

```js
const superseded = (dir) => existsSync(dir) && statSync(dir).isDirectory()
  && readdirSync(dir).some((n) => n.includes('.superseded-'));
```

Lower-confidence but worth deciding explicitly: the H7-m1 selector exemption is callee-blind. It exempts any `('#hex')` opening a quoted first argument, so `setColor('#f00')` flips from red to green even though that is not necessarily a DOM selector. If kept, restrict it to selector APIs (`querySelector`, `querySelectorAll`, `matches`, `closest`) or record it as an accepted residual.

**DISSENT (the DRY argument, rejected):** one could call an empty quoted token “explicit input,” not a dangling flag. I reject that. H7-3’s invariant is fail-closed when a safety flag has no usable value; an empty argv token is exactly the no-usable-value case that survives tokenization, and for numeric flags JS actively coerces it to `0`. Until empty tokens refuse, the H7-3 fix is incomplete.
