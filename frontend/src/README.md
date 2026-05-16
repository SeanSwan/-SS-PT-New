# SwanStudios Frontend Source Notes

The frontend uses React, TypeScript, styled-components, and SwanStudios REST APIs.

## Retired MCP Names

Some legacy files and hooks still include `Mcp` in their names for import compatibility. They must stay fail-closed or route through first-party APIs.

Current replacements:

- Workout data: `/api/workout`
- Gamification data: `/api/v1/gamification`
- Social posts and challenges: `/api/social`
- Client analytics: `/api/client/analytics`
- Form analysis: `/api/form-analysis`

Do not add local MCP server URLs, `/api/mcp` calls, or fake online MCP status. The frontend contract test is `frontend/src/__tests__/mcp-retirement.contract.test.ts`.
