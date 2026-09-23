# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/brainstorms/qwen-finetune-reviews-2026-08-16/10-PACKET-SLICES-H3.md
**Seed:** (none)
**Tokens:** 19784 in / 9610 out | **Cost:** ~$0.2035 | **Wall:** 142.7s | **finish_reason:** stop

---

# NOT DRY — the K2 "fix" is absent from the committed source

The packet's own NOTE invites probing K2's fix shape ("check the implementation"). Probed. The reset semantics the ledger asserts are not in the code.

## H3-K2-a (defect: fix-not-implemented, severity HIGH)

`runCompare` contains **no truncation and no quarantine**. After the `--force` gate it does:

```js
mkdirSync(sealedDir, { recursive: true });
const outputsPath = join(sealedDir, 'outputs.jsonl');
...
appendFileSync(outputsPath, `${JSON.stringify(record)}\n`, 'utf8');
```

`appendFileSync` appends. On a `--force` rerun into a used run dir, fresh records are concatenated onto the **stale** `outputs.jsonl`. `verdicts.jsonl` is never touched at all — it survives untouched. Consequences on `score`:

- **Stale verdicts vs new mapping — the original K2 defect, still live.** Old `verdicts.jsonl` is scored against a newly generated mapping (re-rolled left/right). F7 can't catch it: F7 validates mapping-vs-run-card, not verdict freshness. Results are silently mis-armed.
- **Duplicated/stale output rows** pollute `sliceById` (last-wins) and inflate/miscount `pendingIdeals` in `scoreRun`.
- The import line (`appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync`) has no `unlinkSync`/`renameSync` either — nothing to implement the claimed `.stale-<stamp>` rename.

Either the ledger misdescribes reality or the fix never landed; both are findings. Concrete repair, one branch after the `--force` gate:

```js
if (opts.force && existsSync(runDir)) {
  if (existsSync(outputsPath)) writeFileSync(outputsPath, '', 'utf8'); // reset, not append
  const vp = join(runDir, 'verdicts.jsonl');
  if (existsSync(vp)) renameSync(vp, join(runDir, `verdicts.stale-${stamp}.jsonl`));
}
```

(Or `unlinkSync`. Point: no fix exists; pick one.)

## H3-F7-a (skip-on-missing check, severity MEDIUM)

```js
const cardCommitment = runCardText.match(/sealed\): ([0-9a-f]{64})/)?.[1];
if (cardCommitment && cardCommitment !== mappingCommitment(mappingRaw)) { throw ... }
```

If the run card lacks a parseable commitment — hand-edited card, templated-away line, older card — `cardCommitment` is `undefined` and the swap check **passes silently**. Absence of the commitment is treated as absence of evidence. A judge/operator who blanks the line defeats F7. The gate must mirror its sibling (judge pin): when `run-card.md` exists, a missing/malformed commitment is a throw, and anything-defeats-the-new-mapping requires `--force` provenance, not regex luck.

Same fragility pattern sits in the judge-pin check: `/Judge: <pin/` only fires when that literal template survives. Delete the "pin" marker entirely and scoring proceeds. Both gates are "throw only if suspicious-looking text present."

## Residuals observed (low, still fixable)

1. `agent-tuning-dataset.mjs parseArgs` — unknown `--flag` hits the fallthrough `else if (!arg.startsWith('--'))`, which is false, so it's **silently ignored** (F3 hardened the generator and `compare-tuned` only; the dataset helper still swallows typos that F3 was about).
2. `--audit-seed 1.5` passes `numArg` (finite) and only dies later inside `buildBlindedPairs` ("requires integer"). Enforce integerness at parse for a cleaner failure surface — cosmetic.

F1, F2, F4, F5, K1, K3, K4, K5, both GLM nits, and both self-caught mechanisms read back as genuinely fixed; F6's value-position lookbehind is a documented trade-off (quoted `'#cafe'` still flags, but the `#cafe`-never-flag claim survives as intent-level, and retired-palette list covers the by-name cases). No further attack found on those.

The honest verdict is NOT DRY, anchored on K2: the ledger claims RESET/quarantine, the source shows neither.
