**Registry binding**

Commands below are for the authorized repository integrator. They were not run in this consult.

| Fact depended on | Packet evidence | Re-derivation command | Read status |
|---|---|---|---|
| Production button themes/effects | `GlowButton.tsx:104–170,501–511,638,650–662` | `rg -n "primary|accent|gilded|success|danger|ghost|pointermove" frontend/src -g GlowButton.tsx` | Packet only |
| Shared low-motion policy | `clientCardSystem.ts:4–8` | `rg -n "pointer|sweep|client cards" frontend/src -g clientCardSystem.ts` | Packet only |
| Old animation assertion | `clientCardSystem.contract.test.ts:159–162` | `rg -n "whileHover|whileTap" frontend/src -g clientCardSystem.contract.test.ts` | Packet only |
| Trainer navigation | `TrainerStellarSidebar.tsx:53–93` | `rg -n "trainerNavConfig|path:|section:" frontend/src -g TrainerStellarSidebar.tsx` | Packet only |
| Dashboard route entries | `UniversalDashboardLayout.routes.tsx:138,148,156–206` | `rg -n "equipment|sprint-planner|video-call|plaud|earnings" frontend/src -g UniversalDashboardLayout.routes.tsx` | Packet only |
| Synthetic wearable path | `WearableDataPanel.tsx:205–218` | `rg -n "Math.random|handleManualSync|wearable" frontend/src -g WearableDataPanel.tsx` | Packet only |
| Video placeholders | `VideoRoom.tsx:256–262,329–348` | `rg -n "LiveKit|production|video|freeze" frontend/src -g VideoRoom.tsx` | Packet only |
| Export parser seams | `wearableDataService.ts:197,252,266` | `rg -n "parseAppleHealthExport|parseFitbitExport|parseGarminExport" frontend/src -g wearableDataService.ts` | Packet only |
| Marketing percentages | `TrainerOnboardingPage.tsx:215–218` | `rg -n "82|15|Earnings" frontend/src -g TrainerOnboardingPage.tsx` | Packet only |
| Current package dependencies | Review D6; complete file absent | `Get-Content frontend/package.json` | UNKNOWN |
| Actual token emitter | Not supplied | `rg -n "setProperty|createGlobalStyle|themePalettes" frontend/src/context frontend/src/styles` | UNKNOWN |
| Physical user key/model definitions | Not supplied | `rg -n 'tableName.*Users|sequelize.define|primaryKey' backend/models` | UNKNOWN |

Search results locate evidence; they do not prove mounting, runtime protection, or token emission. The integrator must supplement them with actual exports, rendered callers, complete contracts, and runtime measurements.

**Name registry**

Owner: `F/names.ts`.

| Constant | Exact string | Required display sites |
|---|---|---|
| `HOME` | Home | Route title, nav, page heading |
| `MY_CLIENTS` | My Clients | Trainer nav, route title, heading, ARIA |
| `CLIENTS_AND_TEAM` | Clients and Team | Admin nav, route title, heading, ARIA |
| `EQUIPMENT` | Equipment Manager | Route/nav/heading |
| `SPRINT` | Sprint Planner | Route/nav/heading |
| `VIDEO` | Video Assessment | All participating role routes/nav/headings |
| `INTAKE` | Intake & Devices | All participating role routes/nav/headings |
| `EARNINGS` | My Earnings | Trainer route/nav/heading |
| `RETRY` | Retry | Shared failure states |
| `RETURN_DASHBOARD` | Return to dashboard | Shared denied/unavailable states |
| `POLICY_PENDING` | Earnings terms are being configured. | Earnings and replaced marketing copy |
| `NO_DEVICE` | No device connected. | Legacy panel and device empty state |

New display-site line numbers do not yet exist. The implementation receipt must record actual locations; inventing them now would violate registry binding.

**Navigation contract**

Each descriptor contains:

```ts
type RouteDisposition =
  | { kind: 'primary'; group: string; order: number }
  | { kind: 'contextual'; parentId: string; linkTestId: string }
  | { kind: 'redirect'; targetId: string }
  | { kind: 'disabled'; reason: string };

type WorkspaceRouteDescriptor = {
  id: string;
  roles: Role[];
  nameKey: keyof typeof WORKSPACE_NAMES;
  relativePath: string;
  disposition: RouteDisposition;
  capability: string;
};
```

Preserve verified existing relative paths. Bind equipment `/equipment`, sprint `/sprint-planner`, and video `/video-call` to primary navigation when operational. Keep existing `/plaud` bookmarks through an explicit redirect to the new intake entry after it is mounted. New `/earnings` is trainer-only.

Full role prefixes and client intake paths require B-01; the packet does not establish them completely.

**Token contract**

Current emitted list: **UNKNOWN**.

Proposed consumed alias list:

```text
--td-bg
--td-surface
--td-raised
--td-text
--td-muted
--td-border
--td-action
--td-on-action
--td-focus
--td-glow
--td-data
```

Required measurement: `consumed − centrally emitted = ∅`, followed by browser palette-switch and contrast tests. A fallback rendering successfully does not satisfy this gate.

**Page-shell contract**

`F/WorkspaceShell.tsx` owns width, padding, grid, heading spacing, and state placement. All pages in `02` use it. Nested sections may span columns but cannot introduce another page maximum width.

**Mode matrix**

| Shared component | Admin | Trainer | Client |
|---|---|---|---|
| Workspace shell/header/state | Authorized pages | Authorized pages | Only authorized video/intake pages |
| SwanSurface / GlowButton | Same appearance policy | Same appearance policy | Same appearance policy |
| Client workspace/card | Authorized broad scope; assignment capability | Assigned clients; coaching capabilities | Not mounted |
| Team tab | Explicit team-management capability | Not mounted | Not mounted |
| Equipment content | Authorized managed profiles | Authorized owned/shared profiles | Not added by this package |
| Sprint content | Existing authorized scope | Existing authorized scope | Not added by this package |
| Video consent/stage | Authorized participant/admin action only | Assigned-client participant | Own assessment only |
| Assessment notes | Authorized trainer notes | Assigned-client notes | Shared summary only |
| Audio intake | Direct workspace; authorized subject | Direct workspace; assigned subject | Own records; new processing entitlement-gated |
| Device connections/history | Authorized scope; no credential display | Assigned client data with granted access | Own connections/data |
| Import review | Authorized subject and consent | Assigned subject and consent | Own import; processing entitlement-gated |
| Coach snapshot review | Authorized scope and explicit approval | Assigned scope and explicit approval | Own approved handoff where entitled |
| Earnings page | Not added to admin by this package | Own statement only | Not mounted |
| Effects controller | Same preference and performance limits | Same | Same |

All other-role combinations deny by default.

**r3 evidence overlay**

The table above is historical packet evidence. Current containment bindings and exact source paths are in [15-current-bindings.md](15-current-bindings.md). The previously withdrawn “nine unreachable routes” finding stays withdrawn; contextual Teach Me links must be included in any new census. A source link does not establish runtime reachability. Seasonal palettes and Earnings remain new decisions/features, not restorations.
