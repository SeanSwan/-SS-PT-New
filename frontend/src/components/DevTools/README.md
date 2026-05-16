# SwanStudios Development Tools

## Quick Authentication Panel

This module provides development-only diagnostics. Quick role switching with fake users/tokens has been retired; use real backend authentication with explicitly seeded users.

## Features

- Live backend login checks
- Persistent status visibility between refreshes
- API endpoint diagnostics
- Retired test-account reset controls
- Minimizable panel that stays out of the way

## How to Use

The Development Tools panel is **automatically enabled in development mode only**. You don't need to do anything special to activate it - when you run the application in development mode, the panel will appear in the bottom-right corner of the screen.

### Login Testing

Use the real login page or configure local `VITE_DEV_*` values for the dev login form. The panel must not mint fake tokens or fake users.

The panel will show your current role and provide a logout button if needed.

### Test Account Credentials

No shared default credentials are documented here. Use local-only environment variables or backend seed scripts that require explicit passwords.

### Resetting Test Accounts

The old one-click reset endpoint is retired. If test users are needed, seed them with backend scripts that require explicit credentials.

## Implementation Notes

### Components

1. **DevLoginPanel**: The floating UI component visible in the app
2. **DevToolsProvider**: A wrapper component that conditionally renders dev tools based on environment
3. **dev-auth-helper.ts**: Utilities for managing authentication state in development
4. **devAuthService.ts**: Service for communicating with the development API endpoints

### Backend Integration

The tool connects to the following API endpoints:

- `GET /api/dev/seed-test-accounts`: Retired; returns a non-success response
- `GET /api/dev/health-check`: Checks if the development API is functioning

## Security Notes

- The development tools are automatically disabled in production environments
- The backend routes are protected by environment checks and will return 404 in production
- No sensitive authentication data is exposed through these tools

## Troubleshooting

If the quick login buttons don't work:

1. Ensure your backend server is running
2. Check that the DATABASE_URL in your .env file is correctly set
3. Verify that the dev-routes.mjs is properly registered in server.mjs
4. Check the browser console for any error messages

If you need to manually reset the test accounts, you can run:

```bash
cd backend
node scripts/seed-test-accounts.mjs
```
