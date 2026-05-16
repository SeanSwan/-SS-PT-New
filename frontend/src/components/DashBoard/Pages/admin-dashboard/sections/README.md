# Admin Dashboard Sections

This directory documents the older admin-dashboard section modules that remain
near the current dashboard source. The active shell is
`frontend/src/components/DashBoard/UniversalDashboardLayout.tsx`; verify route
mounts before changing or reviving anything in this folder.

## Active Guidance

- Use SwanStudios first-party APIs for admin, workout, gamification, social,
  analytics, and scheduling workflows.
- Do not add MCP server management UI. MCP management routes are retired and
  return fail-closed responses.
- Prefer the active workspace modules under
  `frontend/src/components/DashBoard/workspaces/` for new admin UX work.

## Historical Sections

- `ClientsManagementSection.tsx`: older client-management section.
- `PackagesManagementSection.tsx`: older package-management section.
- `ContentModerationSection.tsx`: older moderation section.
- `NotificationsSection.tsx`: older notification section.
- `AdminSettingsSection.tsx`: older settings section.

## Retired MCP Section

The MCP server section was archived. Runtime diagnostics should use these
replacement surfaces instead:

- `/api/workout`
- `/api/v1/gamification`
- `/api/social`
- `/api/client/analytics`
