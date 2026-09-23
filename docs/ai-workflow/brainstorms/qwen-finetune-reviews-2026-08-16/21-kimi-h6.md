# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/brainstorms/qwen-finetune-reviews-2026-08-16/19-PACKET-SLICES-H6.md
**Seed:** (none)
**Tokens:** 12337 in / 15347 out | **Cost:** ~$0.2672 | **Wall:** 233.2s | **finish_reason:** stop

---

# HOSTILE REVIEW VERDICT — H6: **NOT DRY**

Three genuinely fixable findings remain. One is a regression hole opened by H5-1's own fix; one is a provable regex gap not on the accepted-residual list; one is an unguarded integrity assumption.

---

## H6-1 — H5-1's fix re-introduces the deadlock in a new window (high confidence)

The force guard recognizes exactly three canonical artifact names as run-dir evidence:

```js
const looksLikeRunDir = existsSync(join(runDir, 'run-card.md'))
  || existsSync(join(sealedDir, 'mapping.json'))
  || existsSync(join(sealedDir, 'outputs.jsonl'));
```

But the supersede step **renames all canonical artifacts to `*.superseded-<stamp>`** before generation starts. Any crash in the window between the rename and the first successful `appendFileSync` — e.g., the first `chatOnce` failing because the endpoint is down, the exact crash mode H5-1 was built to recover from — leaves a directory containing **only** `run-card.md.superseded-…`, `sealed/mapping.json.superseded-…`, etc. The next `--force` is then refused as "wrong --out-dir?" — the same deadlock class H5-1 was meant to kill, reopen at a different window.

Fix: treat `*.superseded-*` (any depth, top level or under `sealed/`) as run-dir evidence, or run the evidence check over `readdirSync` entries rather than fixed names. Add a smoke: force-run → crash before first item → second `--force` must proceed.

## H6-2 — eval item id uniqueness is never enforced, yet every join is id-keyed (medium confidence)

`validateRow` checks message shape only. Downstream, ids are the join key everywhere:

- `sliceById = Object.fromEntries(outputs.map(...))` — duplicate ids collapse, last write wins, slice misassigned;
- truncated exclusion filters by `truncatedIds.includes(o.id)` — one truncated item silently excludes every same-id sibling from the sheet;
- blinded mapping/sheet naming is id-derived.

Fix: enforce uniqueness in `validateRow`/`runCompare` (explicit-id duplicates → throw; only the `item-N` fallback guarantees uniqueness today).

## H6-3 — hex branch 2's `\s+` vs branch 1's `\s*` is a provable, unlisted escape (medium-high confidence)

```js
(?<=[\w)\]]\s+|,\s*)${HEX_BODY}(?=\s*[;})!])
```

Branch 1 tolerates zero whitespace after `: = quote ( )`; branch 2's word-class requires **one-or-more** whitespace. `border:1px solid#ccc;` tokenizes as legal CSS (the `solid` identifier terminates at `#`), yet escapes both branches: no whitespace for `[\w)\]]\s+`, no comma, previous char not in `[:='`"`()]`. This is not in the accepted residuals (those cover *missing terminators*, not missing whitespace). Fix: `\s*` on the word-class alternative; the terminator lookahead still protects the selector controls (`#face,`, `#beef {`). Add `solid#ccc;` to the committed red matrix.

Checked and cleared: fresh/empty/junk force paths, the declared 14-case hex matrix, M3 loud degradation, m3 PROBE marker, m4 explicit-profile throw, H5-2 fail-closed Result check, H5-3 seven-artifact supersede chain.

---

## MANDATORY DISSENT

H6-1 is the only must-fix: it defeats the stated purpose of H5-1 under a realistic failure mode. H6-3 I regard as either a cheap fix or a residual the author must *explicitly* accept, as they did for `, #b,` — but the current ledger's wording ("no-terminator escapes") does not honestly cover the whitespace-adjacency hole, and an unlisted escape is worse than an accepted one. H6-2's blast radius is inferred from this file's own id-keyed joins; `buildBlindedPairs`/`scoreVerdicts` were not in the packet, so if either enforces uniqueness internally, H6-2 downgrades to documentation debt. If all three are answered plausibly, DRY next round is fair.
