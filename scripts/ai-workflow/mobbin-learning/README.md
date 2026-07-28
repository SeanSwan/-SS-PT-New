# Mobbin Learning Evidence Gate

This folder is the executable P0 boundary for distilled Mobbin research. It does not connect to Mobbin and must never receive connector secrets, screenshots, raw page content, account data, or customer data.

## Files

- `evidence-gate.mjs` - validator, evidence writer, append-only audit, and K1-K5 ledger writer.
- `evidence-gate.test.mjs` - Node regression tests.
- `evidence-v2.schema.json` - portable evidence contract.
- `evidence-policy.json` - denied-field and dedupe policy.
- `identity-registry.json` - non-secret actor IDs and roles.
- `control.json` - manual mode, kill switch, and weekly caps.
- `swan-element-baseline.json` - provenance-aware snapshot of current Swan capabilities.
- `recommendation-policy.json` - notification thresholds and hard rules.
- `element-recommendation.mjs` - compares distilled candidates with the Swan baseline.
- `element-recommendation.test.mjs` - scorer regression tests.

## Verify

```powershell
node --test scripts/ai-workflow/mobbin-learning/evidence-gate.test.mjs
node --test scripts/ai-workflow/mobbin-learning/element-recommendation.test.mjs
```

## Write one inspected evidence record

Use run-specific output paths outside Git. Arguments use `--name=value` form.

```powershell
node scripts/ai-workflow/mobbin-learning/evidence-gate.mjs `
  --input=C:\tmp\mobbin-run\candidate.json `
  --evidence-dir=C:\tmp\mobbin-run\evidence `
  --audit=C:\tmp\mobbin-run\audit.jsonl `
  --dedupe-ledger=C:\tmp\mobbin-run\dedupe.jsonl `
  --existing-keys=C:\tmp\mobbin-run\existing-keys.json
```

`existing-keys.json` uses `{ "keys": ["k1:value", "k2:value"] }`. Accepted evidence is created with exclusive-write semantics, so an existing evidence ID is not overwritten. Exit code `2` means policy rejection; exit code `1` means malformed input or an I/O failure.

Canon promotion is not part of this tool. See `docs/ai-workflow/design-brain/mobbin-learning-system.md`.