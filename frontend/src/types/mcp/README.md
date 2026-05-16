# Retired MCP Compatibility Types

The original MCP server stack is retired. This directory remains only because
legacy hooks and service adapters still import these type names while their
runtime behavior is routed through first-party SwanStudios REST APIs.

Do not add new product code here. New workout, gamification, progress, and
assistant work should use domain-specific API/service types instead.

Current compatibility files:

- `workout.types.ts`: legacy workout adapter contracts.
- `gamification.types.ts`: legacy gamification adapter contracts.
- `service.types.ts`: shared retired-adapter response/status contracts.
- `index.ts`: compatibility re-exports.

Retirement rules:

- No localhost MCP defaults.
- No `/api/mcp` calls from active UI.
- No fake online MCP status.
- Keep changes narrow until the importing hooks are renamed away from `Mcp`.
