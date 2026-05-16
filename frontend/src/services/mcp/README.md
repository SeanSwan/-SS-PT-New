# Retired MCP Adapter Layer

The old SwanStudios MCP server stack is retired. The files in this directory keep legacy import names stable while routing active behavior through SwanStudios REST APIs.

## Current Rules

- Do not add localhost MCP defaults.
- Do not call `/api/mcp` from active frontend surfaces.
- Do not return pretend online MCP status.
- Use `/api/workout`, `/api/v1/gamification`, `/api/social`, `/api/client/analytics`, `/api/form-analysis`, and nutrition APIs for runtime work.

## Compatibility Files

- `workoutMcpService.ts`: REST-backed compatibility adapter for old workout imports.
- `gamificationMcpService.ts`: REST-backed compatibility adapter for old gamification imports.
- `mcpConfig.ts`: fail-closed retired status helper.
- `index.ts`: compatibility exports and retired status helpers.

The retirement contract is locked by `frontend/src/__tests__/mcp-retirement.contract.test.ts`.
