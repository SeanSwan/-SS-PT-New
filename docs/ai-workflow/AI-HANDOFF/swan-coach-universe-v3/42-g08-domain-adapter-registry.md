# G08 — Dashboard domain adapter registry (surface layer)

Artifact `SCU-G08-42`. Version 1. Date: 2026-09-11. Owner: Sean.
Route: packet [31](31-gwen-execution-handoff.md) G08/domains row, contract
[32](32-gwen-domain-and-verification-contract.md) waves, adapter contracts
[19](19-one-coach-domain-contracts.md), tab audit [18](18-dashboard-tab-audit.md).

## Gap truth

The ACTION adapter layer already exists and is receipt-backed: 22 command
registry files (139 commands, execution lanes, capability policy, confirmation
sheet, proposal approval — G01–G05 slices). What does not exist is the SURFACE
adapter layer packet 19 requires: every audited dashboard surface declared with
{surfaceKey, routePattern, role, targetSource, entitySources, contextDomains,
capabilities, refreshKeys, privacyClass, activationFlag, manualFallbackRoute},
served as a server-validated capability manifest, with unknown/unproved
surfaces stuck at explain-only.

## Scope (this slice)

1. NEW `backend/services/ai/dashboardSurfaceRegistry.mjs` — all 24 domains
   D01–D24 declared in the packet-19 shape. Activation is receipt-gated:
   `active` only where a working command/writer or read-only evidence path
   exists in THIS task's receipts (D01 coach/PLAUD, D02 planner, D03 logger,
   D05 read/brief, D11 pain, D13 equipment, D19 read-only progress evidence
   from G07); every other row is `explain` with its existing dashboard route as
   the manual fallback — the contract's own designed end state for unproved
   rows ("a missing write adapter is explicitly displayed, not silently
   pretended"). D07/D09/D10/D17/D22 stay explain/navigate exactly as the
   contract fixes.
2. `getSurfaceCapabilityManifest({role, surfaceKey})` — server-validated role
   visibility; unknown surface or prototype-key probes resolve to explain-only;
   active rows verify their commandKeys exist in the initialized command
   registry (a catalog name is not proof — the test enforces membership).
3. NEW `frontend/src/services/dashboardSurfaceContext.ts` — route-pattern →
   surfaceKey mapper + manifest consumption helper (browser declarations
   describe context, not grants; no capability logic client-side).
4. DA contract tests at the registry level: 01 scoped visibility, 02 role/
   unknown deny, 03 hostile key probes cannot alter policy, 07 active rows
   declare refreshKeys + real commandKeys, 08 explain rows carry working
   manual fallbacks, plus 24-domain completeness.

## Out of scope (contract-assigned elsewhere)

Wave 2–4 write adapters stay explain rows until their own writer receipts exist
(design, not deferral debt). Full authenticated journeys over all 127 entries +
nested workspaces = G11's browser/release matrix. No new endpoints in this
slice — the manifest is served through the existing ai-command surface in a
follow-up wiring slice if Astra requires it.

## Verification

Vitest registry DA tests + frontend mapper tests. Tests are written first and
constitute the contract; new-module RED at import level is NOT valid RED per
the build protocol, so this slice's RED story is documented as green-lock on
new modules with the behavioral contracts asserted against the initialized
command registry. Baseline disclosed per rule 56.
