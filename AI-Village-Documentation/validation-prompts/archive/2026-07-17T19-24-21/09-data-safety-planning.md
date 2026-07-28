# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-sonnet-4.6 | **Duration:** 88.4s
> **Files:** .claude/worktrees/unified-world-gallery-2026-07-16/docs/ai-workflow/AI-HANDOFF/WORLD-SWITCHER-MARKETING-REDESIGN-PLAN-2026-07-17.md
> **Generated:** 7/17/2026, 12:24:21 PM

---

# DATA SAFETY AUDIT REPORT
## SwanStudios World-Switcher Marketing Redesign Plan
**Audit Date:** 2026-07-17 | **Auditor Role:** Production Data Safety Auditor | **Platform:** sswanstudios.com (live paying customers)

---

## EXECUTIVE SUMMARY

This plan is **primarily a frontend/UX redesign** with minimal direct backend data writes. However, several implicit data paths, a confirmed P0 build break, and multiple "server later" deferrals create real production risk. The plan's claim of "no backend changes" is **partially false** — world-preference persistence, the contact pipeline, and the claims-vs-reality audit all touch or imply backend state. Seven findings follow.

---

## FINDING 1 — World Preference Storage: Unbounded localStorage + Deferred Server Write

**Severity: HIGH**

### What the plan says
> "persisted per-user (localStorage now, server later)"

### The risk
The plan defers server-side persistence but does not define the schema for "server later." When that migration happens, the write path will be:

```
users table (or a new user_preferences table)
  └── world_selection: VARCHAR / JSONB
```

**Unbounded growth vector:** If this lands as a JSONB column on the `users` table (the path of least resistance), and if the schema is later extended to store per-page world overrides, history, or A/B experiment flags, the JSONB blob grows without a defined size ceiling. No max-length constraint is specified in the plan.

**Race condition:** When the "server later" write is implemented, if two sessions (mobile + desktop) update world preference simultaneously with optimistic updates and no last-write-wins or version field, one write silently loses.

**Privacy implication:** World preference is behavioral/personalization data. If stored server-side, it becomes PII-adjacent under GDPR/CCPA (it is a persistent user behavioral record). The plan has no retention policy for this data.

### Recommendations
```sql
-- Safe schema when "server later" arrives:
ALTER TABLE user_preferences
  ADD COLUMN world_selection VARCHAR(64)
    CHECK (char_length(world_selection) <= 64)
    DEFAULT 'crystalline-dark',
  ADD COLUMN world_updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN world_version INTEGER DEFAULT 1; -- optimistic lock

-- NOT on users table directly — keep preferences normalized
-- NOT JSONB unless you define a CHECK constraint on array length
```

- Define the server schema NOW, even if the write is deferred, so the localStorage key matches the future column name exactly.
- Add `world_version` for optimistic-lock conflict detection before the server write ships.
- Document world preference as a retained behavioral record in the privacy policy before server persistence goes live.

---

## FINDING 2 — Contact Pipeline: "Byte-Identical" Claim Hides Schema-Drift Risk

**Severity: HIGH**

### What the plan says
> "keep the real `/api/contact` pipeline byte-identical"
> "Decompose the 1,182-line file"

### The risk
"Byte-identical pipeline" and "decompose the 1,182-line file" are in direct tension. Decomposing a 1,182-line file means moving code. Moving code means the Sequelize model, the route handler, and the validation layer can drift from each other during the refactor — even if the developer intends zero behavioral change.

Specific drift vectors:
1. **Sequelize model vs. real DB columns:** If the contact form currently writes to a `contact_submissions` table (or equivalent), and the decomposition moves the model definition to a new file, a missed import or a renamed field silently drops a column write in production. Real customer inquiries are lost with no error surfaced to the user.
2. **Validation layer:** The 1,182-line file almost certainly contains inline validation. If validation is extracted to a new module and the import is wrong, the endpoint accepts malformed data or rejects valid submissions.
3. **Email/notification side-effect:** Contact pipelines typically trigger an email (SendGrid, Nodemailer, etc.). If the side-effect is in the decomposed file and the refactor breaks the import chain, emails stop silently.

### Recommendations
- **Before decomposing:** write an integration test that POSTs a known payload to `/api/contact` and asserts: (a) HTTP 200, (b) DB row created with all expected columns, (c) notification side-effect fired (mock the mailer). This test must pass before AND after the decomposition.
- **Schema-drift check:** run `sequelize db:migrate:status` and compare model fields to `\d contact_submissions` (or equivalent) in the production DB before touching the file.
- **Do not decompose and redesign in the same commit.** Decompose first (green tests), then redesign the UI layer.

---

## FINDING 3 — Swan Video / Poster Asset: Missing File is a Live Production Gap

**Severity: HIGH**

### What the plan says
> "the essential-tier poster `/swans-poster.webp` **does not exist** (blank hero on reduced-motion/low-power)"

### The risk
This is not a future risk — it is a **current production defect** affecting real users right now:
- Users with `prefers-reduced-motion: reduce` (accessibility users, battery-saver users, corporate proxies that block video) see a **blank hero** on the home page.
- The LCP (Largest Contentful Paint) metric is degraded for all users because the poster-first load path is broken, directly harming SEO and Core Web Vitals scores on a revenue-generating page.
- The R2 fallback path (`/Swans.mp4`) means if R2 is unavailable, the video fails AND the poster fails — total hero blackout.

**This is not a data safety issue in the traditional sense, but it is a production data integrity issue:** the `src` attribute of the `<video>` element references a non-existent asset. In a SaaS context, a broken hero on the acquisition page is a revenue-safety issue.

### Recommendations
- **Immediate (before any redesign work):** Extract the poster frame and deploy `/swans-poster.webp` to the same CDN/R2 bucket as the video. This is a one-command fix:
  ```bash
  ffmpeg -i Swans.mp4 -ss 00:00:02 -vframes 1 -q:v 2 swans-poster.webp
  ```
- Add a CI check that asserts all `<video poster="...">` attributes resolve to a 200 response.
- The poster must be in the R2 bucket, not just the local `/public` fallback, to match the video's CDN path.

---

## FINDING 4 — Retired Galaxy-Swan Purple: Live Production Data Integrity Violation

**Severity: HIGH**

### What the plan says
> "P1 — retired Galaxy-Swan purple is LIVE in prod via `rgba(120,81,169,…)` across ~10 files (verified in `/v3/index.*.css`)"

### The risk
The `tokenDiscipline.contract.test.ts` test bans retired-brand hex AND rgb values. The fact that `rgba(120,81,169,…)` is live in `/v3/index.*.css` means **the contract test is either not running in CI, not covering the built CSS output, or is being bypassed.** This is a data integrity violation of the token system — the "sole-declarer/sole-injector" lock is broken in production.

From a data safety perspective: if the contract test is not catching this in the built artifact, it is also not catching other token violations. The entire token discipline system's integrity is in question.

### Recommendations
- The contract test must run against the **built CSS output** (`/v3/index.*.css`), not just source files.
- Add a grep-based CI step:
  ```bash
  # Fail build if retired purple appears in any built artifact
  grep -r "120,81,169\|7851A9\|#7851a9" dist/ && exit 1 || exit 0
  ```
- This must be fixed before the World Switcher ships — if the switcher cycles through worlds and one world re-exposes the retired purple via a CSS specificity conflict, the contract is broken again silently.

---

## FINDING 5 — P0 Build Break: npm ci Failure Blocks All Production Deployments

**Severity: CRITICAL**

### What the plan says
> "P0 — frontend build is broken on clean install. `@zxing/browser@^0.1.5` is in `package.json` but MISSING from `package-lock.json`; `npm ci`/Render cannot build."

### The risk
This is the most severe finding in the entire plan. **Every other item in this plan is moot if the build cannot deploy.**

Specific production risks:
1. **Hotfix lockout:** If a security vulnerability or data breach requires an emergency hotfix, the broken `npm ci` means the hotfix cannot deploy via the normal CI/CD pipeline. The team would be forced to use a dirty `npm install` (which mutates `package-lock.json` unpredictably) or manually patch production — both are dangerous.
2. **Render cold-start failure:** Render uses `npm ci` by default. A cold start (e.g., after a dyno restart, a deploy, or a scaling event) will fail, taking the frontend offline for paying customers.
3. **Lock file integrity:** A `package-lock.json` that does not match `package.json` means the lock file cannot be trusted for any package. The actual installed dependency tree in production is unknown.

### Recommendations
```bash
# Immediate fix sequence:
npm install @zxing/browser@^0.1.5  # regenerates lock file entry
git add package-lock.json
git commit -m "fix(deps): add @zxing/browser to package-lock.json [P0]"
# Then verify:
npm ci  # must succeed on a clean node_modules
```

- **This must be the first commit before any other work in this plan.**
- Add a CI step that runs `npm ci` on every PR to prevent recurrence.
- Audit whether `@zxing/browser` is actually used. If it is a transitive dependency that was manually added to `package.json` without being directly imported, remove it and let it be managed as a transitive dep.

---

## FINDING 6 — Claims-vs-Reality Audit: Denormalized Marketing Counts Can Drift

**Severity: MEDIUM**

### What the plan says
> "every marketing claim traces to a real feature/DB count or gets softened"
> "26+ years, NASM-protocol, Swan Coach not 'AI'"
> "stats truth"

### The risk
If any marketing page displays a live count sourced from the database (e.g., "X clients trained," "Y sessions completed," "Z% success rate"), these are **denormalized aggregates** that can drift from source of truth:

1. **Soft-delete drift:** If clients or sessions are soft-deleted (`deleted_at IS NOT NULL`), but the marketing count query does not filter on `deleted_at`, the displayed number is inflated. This is a false advertising risk on a live commercial platform.
2. **Cached counts:** If counts are cached (Redis, in-memory, or a materialized view), and the cache is not invalidated on delete, the number shown to prospects is stale.
3. **No count at all:** If "stats truth" means the copy is hardcoded ("26+ years"), that is safer from a drift perspective but must be manually updated — the plan does not specify a review cadence.

### Recommendations
- Audit every numeric claim on marketing pages. For each: is it (a) hardcoded copy, (b) a live DB query, or (c) a cached aggregate?
- For live DB queries, ensure the query includes `WHERE deleted_at IS NULL` (or equivalent soft-delete filter).
- For cached aggregates, define a TTL and an invalidation trigger.
- For hardcoded copy, add a comment: `{/* MANUAL UPDATE REQUIRED: verify against DB before each release */}`
- Do not display live user counts on public marketing pages without explicit owner sign-off — this exposes business metrics to competitors.

---

## FINDING 7 — WorldLayer Atmosphere Assets: No Cleanup Strategy for Future Media

**Severity: MEDIUM**

### What the plan says
> "World catalog → theme registry bridge: map the 10 gallery worlds into theme system as `World` entries (id, palette-accent, atmosphere recipe id, motion default)"
> "new worlds = new catalog rows, zero re-architecture"

### The risk
The plan describes worlds as "catalog rows" — implying a database table or registry with entries. If worlds have associated atmosphere assets (background images, particle configs, gradient blobs, video loops), and if worlds can be added or removed:

1. **Orphaned assets:** When a world is removed from the catalog, its atmosphere assets (stored in R2/S3/CDN) are not cleaned up. Over time, storage costs accumulate from orphaned files.
2. **Missing cleanup hook:** The plan has no `ON DELETE` strategy for world assets. If a world entry is deleted from the catalog table, the associated CDN assets remain.
3. **JSONB atmosphere recipe:** If `atmosphere recipe id` resolves to a JSONB blob stored in the DB, and that blob contains base64-encoded assets or large SVG strings, the `world_catalog` table can grow unboundedly as worlds are added and old versions are retained.

### Recommendations
```sql
-- Safe world catalog schema:
CREATE TABLE world_catalog (
  id VARCHAR(64) PRIMARY KEY,
  display_name VARCHAR(128) NOT NULL,
  palette_accent VARCHAR(7) NOT NULL,  -- hex, validated by CHECK
  atmosphere_recipe_id VARCHAR(64) NOT NULL,
  motion_default SMALLINT CHECK (motion_default BETWEEN 0 AND 3),
  asset_manifest JSONB,  -- keys only, NOT blobs; max 2KB CHECK
  is_active BOOLEAN DEFAULT TRUE,  -- soft-delete, not hard-delete
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT asset_manifest_size CHECK (
    octet_length(asset_manifest::text) < 2048
  )
);
```

- Store asset **keys/paths** in the catalog, never asset **content**.
- Implement a CDN cleanup job triggered when `is_active` is set to `FALSE`.
- If atmosphere recipes are separate rows, add `ON DELETE RESTRICT` to prevent orphaning a recipe that is still referenced by an active world.

---

## FINDING 8 — Rate Limiting: World-Switcher Preference Writes Have No Rate Limit

**Severity: LOW** (escalates to MEDIUM when "server later" ships)

### What the plan says
> "persisted per-user (localStorage now, server later)"
> "header control showing worlds with tiny live previews"

### The risk
The world switcher is a UI control in the header — visible on every page, clickable at any time. When the "server later" persistence is implemented:

1. A user (or a bot) rapidly cycling through all 10 worlds generates 10 write requests in rapid succession.
2. If the preference endpoint is `/api/user/preferences/world` (or similar) and it is not rate-limited, it is a low-cost write amplification vector.
3. The "tiny live previews" in the picker UI may trigger asset prefetch requests for each world on hover — 10 worlds × N assets = potentially 50–100 requests per hover interaction with no debounce specified.

### Recommendations
- Debounce the localStorage write (and future server write) to 500ms after the last selection change.
- When the server write ships, apply a rate limit of 10 writes/minute per user on the preference endpoint.
- The live preview hover should use CSS-only previews (color swatches from CSS custom properties) — not asset fetches — to avoid the prefetch amplification.

---

## CONSOLIDATED RISK MATRIX

| # | Finding | Severity | Affects Live Users Now? | Blocks Deploy? |
|---|---------|----------|------------------------|----------------|
| 5 | P0 npm ci build break | **CRITICAL** | Yes (no hotfix path) | **YES** |
| 1 | World preference unbounded growth + race condition | **HIGH** | No (deferred) | No |
| 2 | Contact pipeline schema-drift during decomposition | **HIGH** | Risk during refactor | No |
| 3 | Missing swans-poster.webp (blank hero, broken LCP) | **HIGH** | **Yes (right now)** | No |
| 4 | Retired Galaxy-Swan purple live in prod | **HIGH** | **Yes (right now)** | No |
| 6 | Denormalized marketing counts drift from source | **MEDIUM** | Possible | No |
| 7 | WorldLayer asset orphan / JSONB unbounded growth | **MEDIUM** | No (future) | No |
| 8 | No rate limit on world preference writes

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
