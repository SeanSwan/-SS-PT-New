# SwanStudios Authentication Method Rollout

Status: implementation complete on `feat/auth-modernization-20260728`; every new method is off by default.

## Product decision

Authentication grants access. It does not force onboarding. The existing user-dashboard onboarding launch card remains voluntary, and waiver/compliance enforcement stays an independent policy boundary.

Recommended launch order:

1. Keep email/password as the universal fallback.
2. Enable Google first after provider-console and production callback verification.
3. Enable Apple next; schedule client-secret JWT rotation before its expiry.
4. Enable magic-link email after SendGrid delivery and one-time-token verification.
5. Enable Facebook after Meta review and a linked-account test.
6. Keep TikTok off until Login Kit approval and a deliberate acquisition case justify it.
7. Add passkeys as a separate WebAuthn slice after RP ID/origin, recovery, and credential-management UX are approved.

Instagram is not offered as a consumer login provider. Its current API is oriented around professional account management. GitHub is also omitted because SwanStudios is not a developer product; adding it would create choice and support cost without an established member need.

## Production configuration

No provider secret belongs in git. Add values to the backend Render service only.

Common:

- `AUTH_FRONTEND_URL=https://sswanstudios.com`
- `AUTH_CALLBACK_BASE_URL=https://sswanstudios.com`
- `SESSION_SECRET` must be high entropy.
- `USE_REDIS_SESSIONS=true` and a working `REDIS_URL` are required before horizontal scaling so OAuth state survives provider redirects across instances.
- Run both new migrations before enabling any method.

Provider callback URLs:

- Google: `https://sswanstudios.com/api/auth/oauth/google/callback`
- Apple: `https://sswanstudios.com/api/auth/oauth/apple/callback`
- Facebook: `https://sswanstudios.com/api/auth/oauth/facebook/callback`
- TikTok: `https://sswanstudios.com/api/auth/oauth/tiktok/callback`

Feature flags remain `false` until that provider has credentials and a completed production smoke test. The discovery endpoint publishes only methods whose flag and full server configuration are present.

## Security contract

- Google and Apple use signed OIDC ID tokens with issuer, audience, and nonce verification.
- Google also uses S256 PKCE. Every flow uses server-stored, single-use state.
- Facebook uses server-side code exchange plus `appsecret_proof` for profile retrieval.
- Provider access and refresh tokens never enter SwanStudios URLs or API responses; the short-lived Swan completion grant is fragment-delivered and scrubbed before exchange.
- Identity ownership is `provider + immutable provider subject`; mutable email is not an identity key.
- A verified matching email never silently links an existing SwanStudios account. Provider enrollment requires an authenticated session plus current-password step-up; provider-only accounts need a future equivalent reauthentication UX before linking is enabled for them.
- Magic-link tokens are HMAC-hashed at rest, expire after 15 minutes, are consumed atomically once, allow only one active token per user, and are delivered in a URL fragment so the raw token is not sent in an HTTP referrer.
- Public magic-link requests return the same immediate response for known and unknown emails; delivery work continues asynchronously so account-specific mail latency is not exposed.

## Passkey boundary

The public capability contract includes `passkey: false`, but no fake or partial passkey button is shown. A production passkey slice must include a WebAuthn credential table, registration from an authenticated session, discoverable-credential authentication, challenge storage, RP ID/origin enforcement, counter handling, recovery, credential naming/revocation, and real-device testing. Current W3C WebAuthn Level 3 describes discoverable credentials as passkeys; the server implementation should use a maintained WebAuthn library rather than hand-rolled cryptography.

## Evidence required before each flag is enabled

- Provider console shows the exact production callback URL.
- Start, consent/cancel, callback, one-time exchange, logout, and repeat login all pass.
- Existing-email collision returns link-required, not an automatic merge.
- Disabled/inactive/locked accounts cannot establish a session.
- Android Chrome at 360px with the software keyboard can focus and enter the password.
- iPhone XR 414px, tablet, desktop, QHD, and 4K show no overlap or horizontal overflow.
- Logs contain no email address, authorization code, provider token, magic token, JWT, or secret.
- Kill-switch test proves changing the provider flag to `false` removes its button and rejects new starts.

## Primary references

- Google OpenID Connect: https://developers.google.com/identity/openid-connect/reference
- Sign in with Apple REST API: https://developer.apple.com/documentation/signinwithapplerestapi
- TikTok Login Kit: https://developers.tiktok.com/doc/login-kit-overview
- W3C WebAuthn Level 3: https://www.w3.org/TR/webauthn-3/