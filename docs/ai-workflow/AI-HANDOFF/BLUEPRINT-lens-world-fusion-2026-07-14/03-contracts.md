# 03 — CONTRACTS (exact shapes; the builder does not re-decide these)

## 1. Recipe schema v2.1 — ADDITIVE atmosphere axis (F0)

In `frontend/src/core/style-lens-os/v2/recipeV2.ts` (all additions optional — every existing
recipe stays valid; schema string stays `smart-lens/recipe-v2`):

```ts
export const ATMOSPHERE_LAYER_KINDS = ['gradient', 'pattern', 'grain'] as const;
export type AtmosphereLayerKind = (typeof ATMOSPHERE_LAYER_KINDS)[number];
export interface AtmosphereLayer {
  kind: AtmosphereLayerKind;
  /** id into the ATMOSPHERE_ASSET_CATALOG (adapter-side, data-only). NEVER a URL. */
  assetId: string;
  /** 0.01–0.12 — worlds.md WEATHER discipline; validator clamps/rejects outside. */
  opacity: number;
  /** may this layer animate under motionMode 'auto'? (CSS transform/opacity only) */
  animated?: boolean;
}
export interface RecipeAtmosphere {
  layers: readonly AtmosphereLayer[];        // max 3 total, max 2 animated (M2 caps)
  /** REQUIRED: the zero-motion story — used under still/reduced-motion. */
  stillPoster: { assetId: string };
}
// RecipeV2 gains: atmosphere?: RecipeAtmosphere;
```

Validation (extend `validateRecipeV2`): layers ≤3; animated ≤2; opacity in [0.01, 0.12];
`assetId` matches `^[a-z][a-z0-9-]{1,64}$`; `stillPoster` required when `atmosphere` present.
New sanctioned token in the allowlist: `world-chart-secondary` (charts may consume it; the Swan
Wing Purple fixed secondary remains the fallback when a recipe omits it — contrast-gated in F6).

## 2. Atmosphere asset catalog (F0, adapter-side data)

NEW `frontend/src/adapters/style-lens-swan/v2/atmosphereCatalog.ts` (≤120 lines):

```ts
export interface AtmosphereAsset {
  id: string;                       // e.g. 'frost-weave', 'aurora-band', 'grain-03'
  kind: AtmosphereLayerKind;
  /** CSS value ONLY: gradient string or inline SVG data-URI pattern. NO remote URLs. */
  css: string;
  /** worlds.md provenance: which world/family inspired it, for the receipt. */
  inspiration?: string;
}
export const ATMOSPHERE_ASSET_CATALOG: Readonly<Record<string, AtmosphereAsset>>;
```
Seed with 8 assets (builder copies exactly; Fable-taste, Law A — Swan tokens only):
`aurora-band` (Ice Wing→Wing Purple 12% radial band), `frost-weave` (SVG crosshatch 6%),
`orbit-rings` (concentric conic 8%), `ridge-mist` (horizontal linear fade 10%),
`ice-shaft` (diagonal luminance shaft 8%), `deep-field` (sparse dot SVG 5%),
`grain-03` (SVG turbulence grain 3%), `tide-lines` (sine-wave SVG 7%). Exact CSS strings are the
builder's ONLY delegated aesthetic choice in F0, bounded: Swan token colors via
`color-mix(in srgb, var(--accent-*) N%, transparent)`, opacity per catalog id above, no raw hex
outside Crystalline fallbacks.

## 3. Server persistence (F1)

Model — NEW `backend/models/UserAppearanceProfile.mjs` (Sequelize, mimic an existing compact
model file's style):
```js
// table: user_appearance_profiles
id INTEGER PK autoincrement
userId INTEGER NOT NULL UNIQUE REFERENCES "Users"(id) ON DELETE CASCADE   // PascalCase table — house law
profile JSONB NOT NULL
overlay JSONB NULL
profileSchemaVersion STRING NOT NULL DEFAULT '1'
createdAt/updatedAt TIMESTAMPTZ
```
Migration: NEW `backend/migrations/*-create-user-appearance-profiles.cjs` (`.cjs` — Windows/house
law). FK MUST reference `"Users"` (never lowercase `users` — dual-table production gotcha).

Routes — NEW `backend/routes/appearanceProfileRoutes.mjs`, mounted in the server route index as
`app.use('/api/appearance', appearanceProfileRoutes)` (builder: list all `app.use` mounts touching
`/api/appearance*` in the slice receipt — Rule 31 shadow audit):

| Method | Path | Auth | Body | 200 response |
|---|---|---|---|---|
| GET | `/api/appearance/profile` | required (own user only) | — | `{ success: true, profile, overlay, updatedAt }` (404 → `{ success: true, profile: null, overlay: null }` — first visit is not an error) |
| PUT | `/api/appearance/profile` | required (own user only) | `{ profile, overlay? }` | `{ success: true, profile, overlay, updatedAt }` |

PUT validation (server-side, fail-closed 422 `{ success:false, error:'INVALID_PROFILE', details:[...] }`):
- `profile.styleLensId` matches `^[a-z][a-z0-9-]{1,64}$` (server does NOT need the catalog — an
  unknown id is safe: clients resolve unknown → null → host defaults).
- `profile.motionMode` ∈ `auto|lean|still`; `density` ∈ `comfortable|compact`;
  `paletteThemeId` = `crystalline-dark`; `profileSchemaVersion` = `1`.
- `overlay` validated per §4; unknown keys REJECTED (not stripped — reject, so drift surfaces).
- Rate limit: reuse the standard authenticated limiter pattern in the routes folder.
- ZERO PII: the payload is ids/enums only; never log payload values, log userId + outcome only.

## 4. UserStyleOverlay (F4) — the bounded customization contract

```ts
export interface UserStyleOverlay {
  schema: 'swan-style-overlay/v1';
  /** key into ACCENT_CHOICES below — never a raw color */
  accent?: 'ice-wing' | 'wing-purple' | 'gilded-fern' | 'aurora' | 'tide';
  fontPairing?: 'swan-default' | 'editorial' | 'mono';
  /** id into ATMOSPHERE_ASSET_CATALOG, pattern-kind only, or 'none' */
  pattern?: string;
  density?: 'comfortable' | 'compact';
}
```
ACCENT_CHOICES (adapter data; each entry pre-validated ≥4.5:1 on Carbon/Obsidian — values are
final, builder copies): `ice-wing → var(--accent-primary,#60C0F0)`, `wing-purple →
var(--accent-secondary,#8B5CF6)`, `gilded-fern → var(--accent-gold,#C6A84B)`, `aurora → #7F79D9`,
`tide → #66D4DE`. FONT_PAIRINGS: `swan-default` (Plus Jakarta Sans / Sora), `editorial` (Plus
Jakarta Sans display + Cormorant Garamond Italic accents), `mono` (Fira Code display accents,
Sora body). Overlay compiles to AT MOST: `--world-accent`, `--user-pattern` (one extra atmosphere
pattern layer), font-pairing data-attr `data-swan-font-pairing`, density data-attr. Overlay NEVER
touches: action/button backgrounds, chart series colors (accent flows to charts only via the
existing `--world-accent` seam), text color, spacing scale beyond density, or any layout token.

Tier gate (server + client, same table): FREE `{}` only · GUARDIAN `accent|pattern|density` ·
CRYSTALLINE all keys. Server checks the user's tier on PUT and 403s locked keys with
`{ success:false, error:'TIER_LOCKED', lockedKeys:[...] }`.

## 5. Distillation seed (F5) — factory output contract

`swan-world-factory` gains a `--distill <worldId>` mode writing
`experiments/world-factory/distill/<worldId>.seed.json` (gitignored lane, like other factory
output):
```json
{
  "worldId": "world.natural-sublime.glacier-cathedral",
  "catalogVersion": "world-catalog.2026-07-12.v2",
  "lawATranslation": {
    "suggestedTokens": { "world-accent": "...", "world-panel": "...", "world-title-font": "..." },
    "suggestedAtmosphere": { "layers": [...], "stillPoster": {...} },
    "moodFamily": "calm|technical|playful|luxe|atmospheric",
    "typographyLean": "...", "motionCeiling": "M2"
  },
  "provenance": { "worldsMdSection": "...", "distilledAtUtc": "...", "seed": "..." }
}
```
The seed is a PROPOSAL. A human (Fable) taste pass turns it into the final `RecipeV2` literal,
then the existing A4 five-entry pipeline (`docs/ai-workflow/references/LENS-ADD-A-STYLE.md`)
ships it. First batch (F5, exactly these six): Glacier Cathedral, Evergreen Dominion, Nebula
Drift, Webb Deep Field, Alpine Apex, Prairie Horizon → catalog ids `glacier-cathedral`,
`evergreen-dominion`, `nebula-drift`, `webb-deep-field`, `alpine-apex`, `prairie-horizon`,
recipe ids `swan.<catalog-id>.v2`, `dashboardChrome: false` for all six.

## 6. Client persistence adapter (F1) — exact seam

`core/style-lens-os/appearancePersistence.ts` currently wraps a `StorageLike`. Do NOT rewrite it.
NEW `frontend/src/adapters/style-lens-swan/serverAppearanceSync.ts` (≤120 lines) exporting:
```ts
export interface ServerAppearanceSync {
  fetchProfile(): Promise<{ profile: AppearanceProfile | null; overlay: UserStyleOverlay | null }>;
  pushProfile(profile: AppearanceProfile, overlay?: UserStyleOverlay | null): Promise<boolean>;
}
```
Wire-up lives where `StyleLensProvider` is mounted (`frontend/src/App.tsx:244`): fetch on auth
ready → if server `updatedAt` newer than local → `beginPreview + commitPreview` the server value
(silent); every successful local commit → `pushProfile` fire-and-forget with the offline receipt
on failure. Uses the app's existing authenticated api client (same one the dashboard services
use — mimic an existing service file; do not hand-roll fetch/headers).
