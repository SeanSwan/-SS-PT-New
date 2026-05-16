# Frontend Mock API Services Archive

Archived during the 2026-05-15 cleanup pass.

## Why These Files Moved

These files created simulated frontend data or enabled local fallback behavior that could hide broken live API calls. The active app should fail honestly and use seeded backend data instead of swapping in fake client, workout, progress, notification, or exercise records.

## Files

- `enhanced-mock-api-service.ts`
- `mock-api-service.ts`
- `mock-client-progress.ts`
- `mock-exercise-service.ts`
- `mockDataHelper.ts`

## Restore Rule

Restore only inside a dedicated test fixture folder or a storybook-style sandbox. Do not reconnect these helpers to app startup, dashboard state, authentication, workout flows, notifications, or production routes.
