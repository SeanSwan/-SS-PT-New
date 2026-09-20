| Slice | Entry and deliverable | Required exit |
|---|---|---|
| **S0R — preservation/location** | Preserve original packet and console. Resolve D7; relocate only if approved. | T-MOVE; exact file manifest; fresh engine command/result; CLI import smoke; no engine code diff. C1 or HR14f failure remains a blocker, not waived. |
| **S1R — bridge/contract hardening** | Accepted location; existing nine-route surface. Correct write policy, health refresh, encoding, DTOs, read cancellation. | Existing bridge/web suites plus T-SEC/T-CONTRACT/T-HEALTH; built app fixture smoke; no new route. |
| **S2 — roster/drawer** | S1R checkpoint. Resolve off-thread; commit in parent; real same-generation claims. | T-ADD/T-BRAIN/T-W4; existing T-B3/B19/B22; desktop and 375px keyboard walkthrough. |
| **S3a — query/canary** | S2 checkpoint. Search and canary panels; backup remains visibly blocked. | T-W5/T-OPS-read; no new route. |
| **S3b — repair** | Engine journal-concurrency gate passes; shared operation slot proven. | T-OPS-repair; actual engine record mapped to result; exactly one added repair route. |
| **S3c — backup** | Sean resolves transcript-backup exception and destination policy in an amended contract. | **BLOCKED.** No route, no implementation, no fabricated acceptance test. |
| **S4 — daily run** | S3a/S3b checkpoints; journal race gate; real child lifecycle fixture. | T-B4/B5/T-RUN/W6; matching terminal record; restart/unknown and Windows detachment evidence. |
| **S5 — constellation** | S2 accessible roster; D1/D9 contracts accepted. | T-T1/T-T2/W7/E3, Sean’s visual follow-through; documented fallback if usability fails. |
| **S6 — integrated release candidate** | S1R–S5 complete; S3c either completed under approved exception or explicit scope decision. | Eleven-width evidence; accessibility; performance; full combined review; archive filing. |
| **S7 — transfer** | S6 plus Sean’s explicit go. | Tag and copied source manifest, matching hashes, receiver-side build and review. |

At every row: **do not advance to the dependent slice until its checkpoint passes**. A partial slice may be reviewed but cannot inherit PASS from another slice.

**Exact command groups**

From repository root, after setting the approved console path:

```powershell
$consolePath = 'scripts/creator-brains/console'
# Use 'packages/creator-brains-console' only after approved relocation.

$bridgeTests = @(Get-ChildItem "$consolePath/test" -Filter '*.test.mjs' |
  Sort-Object Name | ForEach-Object FullName)
node --test @bridgeTests

npm --prefix "$consolePath/web" test
npm --prefix "$consolePath/web" run typecheck
npm --prefix "$consolePath/web" run build

$engineTests = @(Get-ChildItem 'scripts/creator-brains/test' -Filter '*.test.mjs' |
  Where-Object Name -ne 'live.test.mjs' |
  Sort-Object Name | ForEach-Object FullName)
node --test @engineTests
```

No comment masquerades as a live-test exclusion.

Browser command, from `C/web` after S6’s isolated configuration exists:

```powershell
npx --no-install playwright test --config playwright.console.config.ts
```

Record actual counts and exit codes. Do not assert the historical 105/48/183 counts will remain constant.
