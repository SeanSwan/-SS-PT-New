/**
 * Rate Limiter Middleware
 * ======================
 *
 * Provides rate limiting for API endpoints to prevent abuse
 * Uses in-memory storage for development (consider Redis for production)
 *
 * Created: 2026-01-05
 * Part of: API Security Layer
 */

import rateLimit from 'express-rate-limit';

// API Rate Limiter - 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for health checks and static assets
  skip: (req) => {
    return req.path === '/health' ||
           req.path === '/api/health' ||
           req.path.startsWith('/static/') ||
           req.path.startsWith('/assets/');
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Stricter rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    error: 'Too many login attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/api/health'
});

// Admin endpoints rate limiter (more restrictive)
export const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit admin actions
  message: {
    success: false,
    error: 'Too many admin requests, please try again later.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// File upload rate limiter (stricter for uploads)
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit file uploads
  message: {
    success: false,
    error: 'Too many file uploads, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Public waiver VERSIONS read limiter (30 req / 5 min per IP).
 *
 * GET /api/public/waivers/versions/current is unauthenticated and used to run
 * an unbounded findAll + sanitize-html pass per hit (SWA-140 W3) — trivially
 * amplifiable DB+CPU load from one IP. 30/5min is generous for a legitimate
 * signer (the page fetches once, retries a few times on bad WiFi) and kills
 * scripted hammering. Pairs with the 60s in-process cache in the controller.
 */
export const waiverVersionsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: 'Too many requests — please wait a few minutes and try again.',
    message: 'Too many requests — please wait a few minutes and try again.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Atelier published-permalink resolver (120 req / 15 min per IP).
 *
 * GET /api/atelier/public/:id is mounted with NO AUTH by design: a public site cannot
 * hold an admin session. Its safety rests on UUIDv4 ids not being enumerable and on the
 * published-only predicate — neither of which bounds VOLUME. Every hit costs a database
 * lookup plus a SigV4 presign, and the endpoint exists precisely to be embedded in pages
 * that may be loaded by many people at once.
 *
 * 600/15min — forty a minute sustained — and the number is chosen against the WRONG
 * failure, deliberately. My first pass wrote 120, reasoning from what one reader costs.
 * That is not who shares an IP: fifty people in an office behind one NAT opening a page
 * with six images is three hundred requests in a burst, all legitimate, all one `req.ip`.
 * A limiter that 429s them has traded real availability on a PUBLIC embed endpoint for
 * protection it does not really provide.
 *
 * What it does provide: no single host can turn a permalink into an unbounded presign
 * treadmill. What it does NOT provide, said plainly rather than implied: any defence
 * against a distributed flood. That is a CDN's job, and the 5-minute Cache-Control above
 * is what lets one do it.
 *
 * Per-IP is correct here — core/app.mjs sets `trust proxy` to 1, so `req.ip` is the real
 * client behind Render's proxy and not the proxy itself. Keyed on the proxy this would be
 * one global bucket for every visitor at once.
 */
export const atelierPublicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: { success: false, error: 'rate_limited' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public waiver submission rate limiter (10 req / 15 min per IP)
export const waiverLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  // Both fields — see contactLimiter. Public-form consumers read `data.message`.
  message: {
    success: false,
    error: 'Too many waiver submissions, please try again later.',
    message: 'Too many waiver submissions, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Public contact / pricing-inquiry rate limiter (5 req / 15 min per IP).
 *
 * POST /api/contact is PUBLIC (prospects aren't logged in) and each accepted
 * submission fans out to SendGrid email + Twilio SMS — real per-message cost,
 * delivered to the owner AND owner's second recipient — plus a CRM lead row.
 * The storefront "Ask About Pricing" button makes this endpoint trivially
 * reachable, so an unthrottled flood would burn Twilio spend, blow up the
 * owners' phones, and poison the lead pipeline. Stricter than waiverLimiter
 * for that reason. 5 leaves room for a genuine prospect asking about several
 * packages; it kills automated abuse.
 *
 * Per-IP keying is correct here: core/app.mjs sets `trust proxy` to 1, so
 * req.ip resolves to the real client, not Render's proxy.
 */
export const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  // `message` AND `error` carry the same text on purpose: the public form
  // consumers read `data.message` (PricingInquiryModal, OrientationForm), while
  // this module's older limiters used `error`. Sending both means a throttled
  // PROSPECT sees "try again in a few minutes" instead of a generic failure —
  // a false-positive block must stay recoverable, because a lost lead costs
  // vastly more than the handful of messages the cap saves.
  message: {
    success: false,
    error: 'Too many inquiries from this IP. Please try again in a few minutes.',
    message: 'Too many inquiries from this IP. Please try again in a few minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Public funnel-telemetry beacon limiter (POST /api/telemetry/funnel — P0-4 SWA-29).
 * More generous than contactLimiter because a beacon costs only ONE tiny DB row (no
 * SendGrid/Twilio spend) and a real browsing session legitimately fires several
 * visit/ref events — but still bounded so an unauthenticated flooder can't balloon
 * the acquisition_events table. Per-IP (trust proxy = 1). A throttled beacon just
 * drops silently; telemetry is best-effort and never user-visible.
 */
export const telemetryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: 'rate_limited' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Public orientation / "Schedule Your Free Consultation" rate limiter
 * (5 req / 15 min per IP).
 *
 * POST /api/orientation/submit is explicitly public. Each submission writes an
 * Orientation row, raises an admin notification, and intakes SENSITIVE data
 * (healthInfo + waiver initials). Unthrottled it can be used to flood the
 * owner's notifications, poison the consultation pipeline that acquisition
 * depends on, and mass-inject junk health records. A real prospect books a
 * consultation once, so 5 is generous.
 */
export const orientationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  // Both fields — see contactLimiter. OrientationForm reads `errorData.message`.
  message: {
    success: false,
    error: 'Too many consultation requests from this IP. Please try again in a few minutes.',
    message: 'Too many consultation requests from this IP. Please try again in a few minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Post-Save Handoff re-entry rate limiter (30 req / 5 min per IP).
 *
 * GET /api/workout/sessions/:id/handoff is authenticated but triggers a real
 * assembly (60-session proof load + NBA resolve, up to 2500ms of DB work) on
 * every hit with no cache. A legit user re-opens a handoff a handful of times;
 * 30/5min is generous for humans and kills scripted hammering of the endpoint
 * as a DB-load amplification vector (flagged by the Kimi go-live review).
 * Response shape: standard 429 + generic JSON body (express-rate-limit default). This leaks nothing
 * about the target session: the limiter keys on per-IP REQUEST COUNT before auth, independent of
 * whether the session exists — so a 429 cannot function as an existence oracle. (The route itself
 * still 404s identically for miss AND unauthorized.)
 */
export const handoffLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many requests. Please try again in a few minutes.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Public food-scanner rate limiter (60 req / 15 min per IP).
 *
 * GET /api/food-scanner/scan/:barcode, /search, /product/:id, /ingredient/:id
 * and the explain endpoints are PUBLIC (the /food-scanner page works logged-out).
 * But an anonymous scan is not free: a cache miss fans out to Open Food Facts /
 * FatSecret and CREATES a FoodProduct row + increments scanCount. Unthrottled,
 * barcode enumeration (8-14 digit space) becomes unbounded outbound traffic and
 * unbounded row creation. 60/15min covers a human scanning a whole pantry;
 * it kills enumeration. Per-IP is correct (trust proxy = 1, see contactLimiter).
 */
export const foodScannerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    error: 'Too many scanner requests from this IP. Please try again in a few minutes.',
    message: 'Too many scanner requests from this IP. Please try again in a few minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * E2EE key-bundle fetch — GET /api/encryption/keys/:userId
 *
 * Every call CONSUMES one of the target's one-time prekeys
 * (keyStoreService.mjs::fetchKeyBundle marks it isUsed) and nothing replaces it
 * until that user's client replenishes. So any authenticated account can drain
 * another user's prekey pool by looping this endpoint.
 *
 * Severity is genuinely LOW and should not be inflated: the Signal design
 * degrades gracefully. Once the pool is empty the bundle still returns with
 * `oneTimePreKey: null` and sessions still establish off the signed prekey —
 * the loss is the extra forward-secrecy the one-time key would have given that
 * first message, not availability of messaging.
 *
 * KEYED PER (actor, target), NOT PER IP — deliberately unlike every other
 * limiter in this file. The attacker here is authenticated, so an IP key is both
 * evadable (rotate egress) and harmful (a gym's shared NAT would throttle real
 * clients). A legitimate actor needs a given target's bundle a handful of times
 * — once per device session, then it is cached — so 20/hour per pair is far
 * above real use.
 *
 * WHAT THIS DOES NOT DO — do not overstate it. An earlier version of this
 * comment claimed 20/hour forces pool exhaustion to "cost many distinct
 * accounts". That is arithmetically false and was corrected on 2026-08-14: a
 * typical pool is ~100 one-time prekeys, so ONE account at 20/hour drains it in
 * five hours and sustains ~480/day, which outpaces any realistic client
 * replenishment. What the limit actually buys is the difference between
 * draining a pool in seconds and holding it empty at a slow, visible rate — a
 * fair trade for a LOW-severity issue, but not prevention.
 *
 * Two known gaps, deliberately left open rather than papered over:
 *   - there is no per-ACTOR ceiling, so one account may take 20/hour from every
 *     user at once; per-pair keying is what protects legitimate group fan-out,
 *     and the fix is a second, generous per-actor limiter, not a smaller max
 *   - the default MemoryStore is per-process, so behind N replicas the real
 *     budget is 20xN per pair
 *
 * The IP fallback should never fire: `protect` is mounted before this on the
 * only route that uses it. It exists so a future re-mount without auth degrades
 * to throttling rather than to one shared bucket for every caller.
 */
export const preKeyFetchLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => {
    const actor = req.user?.id;
    // Key on the RESOLVED target, never the raw path text. This limiter runs
    // before express-validator touches the param, so `req.params.userId` here is
    // whatever the caller typed. The handler resolves it with `parseInt(x, 10)`,
    // and parseInt is lenient: `902`, `0902`, `+902`, `902.0` and `902a` are all
    // user 902. Keying on the raw string gave each spelling its own bucket while
    // every one of them consumed the same victim's prekeys — measured at 100
    // consumptions against a limit of 20 before this was normalized. The key must
    // resolve the target exactly the way the handler does, or the limit counts
    // spellings instead of victims.
    const parsed = Number.parseInt(req.params?.userId, 10);
    const target = Number.isInteger(parsed) && parsed > 0 ? String(parsed) : 'invalid';
    // Everything unresolvable shares one bucket on purpose: those requests cannot
    // reach a real user's pool, and giving each its own key would let a caller
    // mint one store entry per request for the full window.
    return actor ? `u:${actor}:t:${target}` : `ip:${req.ip}:t:${target}`;
  },
  message: {
    success: false,
    error: 'Too many key-bundle requests for this user. Please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  apiLimiter,
  authLimiter,
  adminLimiter,
  uploadLimiter,
  waiverLimiter,
  contactLimiter,
  orientationLimiter,
  handoffLimiter,
  foodScannerLimiter,
  preKeyFetchLimiter,
};