# Owner Admin Account Control

Purpose: let Sean test and control client, trainer, and user accounts without sharing or resetting passwords.

## Current Policy

This system is owner-only by default. A normal admin role is not enough.

The backend fails closed unless at least one of these Render environment variables is configured:

- `OWNER_ADMIN_EMAILS`: comma-separated owner admin emails
- `OWNER_ADMIN_IDS`: comma-separated owner admin user ids

Use the narrowest value possible. For Sean-only operation, set only Sean's admin email or user id.

## What It Allows

From the admin dashboard owner account panel, an allowlisted owner admin can:

- open a temporary client, trainer, or user dashboard session
- force logout an account by clearing its refresh token
- block an account
- deactivate an account for retention review
- reactivate an account

Admin accounts cannot be targeted from this panel. Self-targeting is also denied.

## Security Contract

- Owner allowlist is required in addition to `role: admin`.
- Impersonation tokens are access-token only and do not create refresh tokens.
- Target accounts must be active, unlocked, and `accountStatus: active` to open a dashboard test session.
- Locked and inactive users are rejected by protected API middleware, so block/deactivate stops current access tokens too.
- Force logout only clears refresh tokens. Existing access tokens remain usable until expiry unless the account is blocked or deactivated.
- Every impersonation start and lifecycle command writes `admin_account_audit_logs` with actor id, target id, action, reason, previous state, and next state.
- Audit rows are append-only at the Sequelize model hook layer.

## Future Delegation

Do not widen this to every admin. If Sean later delegates operations, add that person as an admin and explicitly allowlist their email or user id only after a separate security review.

## Render Setup

Set one of these on the backend service before using the feature:

```text
OWNER_ADMIN_EMAILS=sean-admin-email@example.com
```

or:

```text
OWNER_ADMIN_IDS=123
```

The deployment migration creates `admin_account_audit_logs`. Render currently runs backend migrations during the build step through `npm run migrate:production`.
