All new runtime and test files must remain within 300 lines. Existing large instruction files are scoped edits, not forced refactors.

| Order | File | Purpose/imports/exports | Slice |
|---|---|---|---|
| 1 | `scripts/lib/lane-orientation.mjs` | Node child-process, filesystem, path built-ins; exports `orient`, `shellCommand`. | S1 |
| 2 | `scripts/lane-at-root.mjs` | Node spawn/path/url built-ins; CLI only. | S1 |
| 3 | `scripts/hooks/lane-session-start.mjs` | Imports `orient`; resolves root; removes pruning. | S1 |
| 4 | `scripts/hooks/lane-session-start.test.mjs` | Replace live-ledger tests with fixture and dependency-injection tests. | S1 |
| 5 | `scripts/lane-at-root.test.mjs` | Verify real child cwd, argv, and exit propagation in fixtures. | S1 |
| 6 | `scripts/lane.mjs` | Add complete discovery through existing parser/resolver. Full source supplement required. | S2 |
| 7 | `scripts/lane-discovery.contract.test.mjs` | Validate complete-discovery behavior using actual helper in isolated fixtures. | S2 |
| 8 | `.ai-workflow/coordination/README.md` | Replace named-seat operations, reconcile age and retention wording. | S3 |
| 9 | `docs/ai-workflow/references/AI-PAIR-CODING-PROTOCOL.md` | Replace two-agent discovery procedure and absolute prevention claims. | S3 |
| 10 | `CLAUDE.md` | Apply corrected canonical instruction block. | S3 |
| 11 | `AGENTS.md`, `CODEBUDDY.md`, `GEMINI.md` | Regenerate mirrored bodies in isolation; update relevant hand-owned coordination text separately. | S3 |
| 12 | `SOUL.md`, `.opencode/SEAT.md` | Only identified coordination sections; supplied context required. | S3 |
| 13 | `.cursor/rules/01-coordination-lane.mdc`, `.github/copilot-instructions.md` | Install canonical coordination procedure and accurate evidence language. | S3 |
| 14 | `.codebuddy/settings.json` | Timeout/wiring adjustment only after actual semantics are verified. | S3 |
| 15 | `.claude/settings.json` | Audit current hook deadline; change only if necessary and verified. | S3 |
| 16 | `scripts/coordination-docs.test.mjs` | Positive coverage and forbidden-claim checks over candidate documents. | S3 |
| 17 | This package’s checkpoint and test records | Record candidate identity and actual evidence. | S4 |

**Existing pattern to preserve**

```js
const out = execFileSync(process.execPath, [LANE, 'digest'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  cwd: ROOT,
  timeout: DIGEST_TIMEOUT_MS,
}).trim();
```

[VERIFIED] Supplied hook pattern. Extend its failure classification and isolate it for testing.

Do not modify `scripts/sync-agents-mirror.mjs` merely because it appears in the uncommitted file list. Its source and required Gemini behavior must first be supplied. Reuse it if already sufficient.
