/**
 * CORS origin policy — pure functions, no Express.
 * ===============================================
 * Extracted from core/app.mjs so the allow-list decisions can be unit-tested.
 * Before this module existed the HTTP API's entire CORS policy was two closures
 * inside `createApp()`, and there was not a single CORS test in the repo — which
 * is how two defects survived fifteen review passes:
 *
 *   1. The localhost dev origins were appended to the allow-list
 *      UNCONDITIONALLY, so production served
 *      `Access-Control-Allow-Origin: http://localhost:5173` together with
 *      `Access-Control-Allow-Credentials: true` (CWE-942).
 *   2. `resolveCorsOrigin` reflected ANY origin verbatim whenever
 *      `NODE_ENV !== 'production'`. Reflecting an arbitrary Origin while
 *      allowing credentials is the dangerous combination; it is now an
 *      explicit opt-in (`CORS_ALLOW_ANY_ORIGIN=1`) rather than the default.
 *
 * Both fixes are policy-only. The standard dev ports stay in the dev list, so
 * ordinary local development needs no configuration at all.
 */

/** Origins that are legitimate in production. */
export const PRODUCTION_ORIGINS = [
  'https://sswanstudios.com',
  'https://www.sswanstudios.com',
  'https://swanstudios.com',
  'https://www.swanstudios.com',
  'https://swanstudios-frontend.onrender.com',
];

/** Dev origins for the HTTP API. Never added to a production allow-list. */
export const DEV_HTTP_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
];

/** Dev origins for socket.io (superset — includes the 127.0.0.1 spellings). */
export const DEV_SOCKET_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
];

/**
 * Build the allow-list for an environment.
 * Dev origins are included only when `isProduction` is false, which is the
 * whole point: localhost is a meaningful Origin on a developer's machine and
 * nowhere else.
 */
export function buildAllowedOrigins({
  envOrigins = [],
  isProduction,
  devOrigins = DEV_HTTP_ORIGINS,
  extraOrigins = [],
} = {}) {
  return [
    ...envOrigins,
    ...(isProduction ? [] : devOrigins),
    ...PRODUCTION_ORIGINS,
    ...extraOrigins,
  ];
}

/**
 * Decide whether an incoming Origin may be reflected.
 * Returns the origin string when allowed, `null` otherwise.
 *
 * `allowAnyOrigin` is opt-in and additionally requires a non-production
 * environment, so a production deploy that loses its NODE_ENV cannot silently
 * become a credentialed open API.
 */
export function resolveCorsOrigin({
  origin,
  allowedOrigins = [],
  isProduction,
  allowAnyOrigin = false,
} = {}) {
  if (!origin) return null;
  if (allowedOrigins.includes(origin)) return origin;
  if (!isProduction && allowAnyOrigin) return origin;
  return null;
}

/** Read the reflect-any opt-in from the environment. Off unless explicitly set. */
export function allowAnyOriginFromEnv(env = process.env) {
  return env.CORS_ALLOW_ANY_ORIGIN === '1';
}

/** Parse a comma-separated FRONTEND_ORIGINS value into a trimmed list. */
export function parseEnvOrigins(raw) {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export default {
  PRODUCTION_ORIGINS,
  DEV_HTTP_ORIGINS,
  DEV_SOCKET_ORIGINS,
  buildAllowedOrigins,
  resolveCorsOrigin,
  allowAnyOriginFromEnv,
  parseEnvOrigins,
};
