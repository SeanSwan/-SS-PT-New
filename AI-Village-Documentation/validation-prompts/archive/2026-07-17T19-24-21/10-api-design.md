# API Design & Backend Contracts — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b:free | **Duration:** 33.7s
> **Files:** .claude/worktrees/unified-world-gallery-2026-07-16/docs/ai-workflow/AI-HANDOFF/WORLD-SWITCHER-MARKETING-REDESIGN-PLAN-2026-07-17.md
> **Generated:** 7/17/2026, 12:24:21 PM

---

**SwanStudios Marketing Redesign + World‑Switcher Theme System – API Review**  
*(Derived solely from the supplied plan; no external assumptions.)*  

---  

## 1. Existing API Sufficiency  

| Surface / Feature | Data Consumed (per plan) | Existing Endpoint? | Sufficiency Verdict | Notes / Gap |
|-------------------|--------------------------|--------------------|---------------------|-------------|
| **Contact form submission** | Sends the same payload as today to `/api/contact` (byte‑identical pipeline). | `POST /api/contact` (already exists). | **Sufficient** – no change required. | Ensure the endpoint continues to validate the same fields and returns the same success/error shape. |
| **World catalog (list of selectable Worlds)** | The UI needs to show‑case picker must display each World’s id, name, tiny preview, group (Natural/Cosmic/Luxury/Gaming/Editorial), palette‑accent, atmosphere recipe id, and default motion tier. The plan says the *Lens OS* `--world-*` contract already exists and worlds will “populate it”. No explicit fetch is mentioned, implying the data could be bundled in the frontend. | **None** identified in the plan. | **Insufficient** if the catalog is expected to be extensible (new worlds added without a redeploy). A read‑only endpoint is needed to serve the canonical list. |
| **Persisted user World preference** | The switcher persists the choice in `localStorage` now, with a note “*server later*”. When server‑side persistence is added, the client will need to read the user’s saved World on login and write updates when a new World is chosen. | **None** identified. | **Insufficient** – a new endpoint pair (GET/PUT) is required for user‑specific World selection. |
| **World‑graded video overlay / poster** | All assets (video, poster, CSS gradients) are static; no API call is described. | **None**. | **Sufficient** – purely client‑side. |
| **Motion‑tier lookup (SURFACE_MOTION_TIERS)** | Already shipped as a client‑side map; no server call. | **None**. | **Sufficient**. |
| **Any other marketing‑page data (copy, stats, etc.)** | The plan mentions a copy rewrite and claims‑vs‑reality audit but does not introduce new API‑driven content. All copy is assumed to be static or pulled from an existing CMS that is out of scope for this review. | **Not specified**. | **Out of scope** – assume existing CMS endpoints remain unchanged. |

**Conclusion:**  
- The only *definite* API gap is the **World catalog** and **user World preference** endpoints.  
- All other surfaces either reuse existing endpoints (`/api/contact`) or are fully client‑static.

---

## 2. Search / Query Needs  

| Query / Filter | Where it occurs (per plan) | Scale concern | Recommendation |
|----------------|---------------------------|---------------|----------------|
| **World list filtering / grouping** (Natural / Cosmic / Luxury / Gaming / Editorial) | UI renders groups; may allow search by name. | The catalog is tiny (≤ 10–20 worlds). Client‑side filtering is fine now and will remain fine even if the catalog grows to a few hundred entries. | No server‑side search/pagination required. Keep the list in memory after a single fetch. |
| **User preference lookup** | On app init, read the saved World for the current user. | Single record per user; trivial load. | No pagination needed. |
| **Contact form** | No search/filter. | N/A | N/A. |

**Verdict:** Client‑side filtering/pagination is adequate for all foreseeable scales.

---

## 3. New Endpoint Design  

### 3.1 World Catalog (Read‑Only)

| Attribute | Recommendation |
|-----------|----------------|
| **Verb** | `GET` |
| **Path** | `/api/v1/worlds` |
| **Description** | Returns the complete list of selectable Worlds. |
| **Query Params** | None required (optional `?group=…` for future UI filtering, but not needed now). |
| **Success Response** | `200 OK` with JSON array: <br>```json [ { "id": "swan-deep-field", "name": "Swan Deep Field", "group": "Natural", "paletteAccent": "#002060", "atmosphereRecipeId": "glacier-gradient", "defaultMotionTier": "M3", "previewUrl": "/assets/worlds/swan-deep-field-preview.webp" }, … ] ``` |
| **Failure Response** | Standard error envelope (`{error:{code,message}}`). |
| **Idempotency / Safety** | Safe, cacheable. |
| **Multipart** | Not applicable (no uploads). |
| **Versioning** | Place under `/api/v1/` to allow future evolution. |

### 3.2 User World Preference (Read/Write)

| Attribute | Recommendation |
|-----------|----------------|
| **Verb (Read)** | `GET` |
| **Path** | `/api/v1/me/world` |
| **Description** | Returns the World ID currently selected for the authenticated user. |
| **Success Response** | `200 OK` with JSON: `{ "worldId": "swan-deep-field" }` (or `null` if none set). |
| **Verb (Write)** | `PUT` (or `PATCH` – `PUT` is simpler for full replace). |
| **Path** | `/api/v1/me/world` |
| **Description** | Stores the user’s chosen World. |
| **Request Body** | JSON: `{ "worldId": "swan-deep-field" }` |
| **Success Response** | `200 OK` with same body (or `204 No Content`). |
| **Failure Response** | `400` if `worldId` not in catalog; `401` if unauthenticated; `409` if conflict (unlikely). |
| **Idempotency** | `PUT` is idempotent. |
| **Multipart** | Not applicable. |
| **Authentication** | Requires JWT / session cookie (same as other protected endpoints). |
| **Rate Limiting** | See §5. |

### 3.3 Optional: World‑Specific Asset Manifest (if future worlds need dynamic media)

| Attribute | Recommendation |
|-----------|----------------|
| **Verb** | `GET` |
| **Path** | `/api/v1/worlds/:worldId/assets` |
| **Description** | Returns URLs for world‑specific assets (e.g., poster, particle JSON, gradient definitions). |
| **Response** | `{ "posterUrl": "...", "particleConfigUrl": "...", "gradientCss": "..." }` |
| **Cache** | Long‑TTL (see §8). |
| **Note** | Not required for the current plan (all assets are static), but included as a forward‑compatible hook. |

---

## 4. Multimodal / Large Payloads  

- The plan does **not** introduce any image/audio uploads, video transcoding, or large request bodies.  
- All media (hero video, poster, world previews) are static assets served via the existing CDN/R2 bucket.  
- **Recommendation:** Keep the contract as **JSON only** for the new endpoints; no multipart/form‑data needed. If a future feature requires user‑uploaded world previews, switch to an **upload‑then‑reference** flow (POST to `/api/v1/uploads` returning a URL, then store that URL in the world record).

---

## 5. Rate Limiting  

| Endpoint | Suggested Limit | Rationale |
|----------|----------------|-----------|
| `GET /api/v1/worlds` | **100 req/min per IP** (or per authenticated user) | Read‑only, cacheable; generous limit to allow prefetch on page load. |
| `GET /api/v1/me/world` | **120 req/min per user** | Low‑frequency (once per session). |
| `PUT /api/v1/me/world` | **30 req/min per user** | Prevents abuse from rapid switching; still allows legitimate toggling. |
| (Optional) `GET /api/v1/worlds/:worldId/assets` | **80 req/min per IP** | Asset manifest is small; same as catalog. |

*Implementation:* Use the existing Express rate‑limit middleware (e.g., `express-rate-limit`) with separate limiters per route. Return `429 Too Many Requests` with retry‑after header.

---

## 6. Realtime vs Polling  

- World selection changes are **infrequent** (user initiates a switch).  
- No other entity needs to be notified instantly of a user’s world change (the UI updates optimistically).  
- **Recommendation:** Keep the interaction **request‑response (polling‑style)** – the client sends a `PUT` and updates its local state on success. No WebSocket/SSE needed.  
- If a future feature requires **shared world state** (e.g., collaborative sessions), then introduce a lightweight WebSocket channel, but that is out of scope for the current plan.

---

## 7. Response Contracts  

| Endpoint | Shape | Type Safety (TS) | Stability Guarantees |
|----------|-------|------------------|----------------------|
| `GET /api/v1/worlds` | `Array<World>` where `World = { id:string; name:string; group:string; paletteAccent:string; atmosphereRecipeId:string; defaultMotionTier:'M0'|'M1'|'M2'|'M3'; previewUrl:string }` | Define `World` interface in a shared `@types` package; exported to frontend. | Contract is **versioned** (`/api/v1/`). Adding new fields (e.g., `description`) is backward‑compatible; removing or renaming requires a new major version. |
| `GET /api/v1/me/world` | `{ worldId: string | null }` | Simple type. | Same versioning rule. |
| `PUT /api/v1/me/world` (request) | `{ worldId: string }` | Must be a valid `id` from the catalog (server validates). | Same. |
| `PUT /api/v1/me/world` (response) | Echo of request body or `204`. | – | – |

All responses should follow a **consistent envelope** (e.g., `{ data: …, meta: {} }` or `{ error: … }`) to ease client handling, but the plan does not mandate it; we recommend adopting the existing envelope used by `/api/contact` for consistency.

---

## 8. Caching Strategy  

| Endpoint | Cacheability | Suggested TTL | Invalidation Trigger |
|----------|--------------|---------------|----------------------|
| `GET /api/v1/worlds` | **Public** (same for all users) | **12 hours** (or `max-age=43200`) with `stale-while-revalidate=86400` | When a new World is added/removed or an existing World’s metadata changes (e.g., new accent color). Invalidate via **cache‑tag purge** or by bumping a version query param (`?v=2`). |
| `GET /api/v1/me/world` | **Private** (user‑specific) | **Session‑length** (no persistent cache; rely on cookie/auth) or **5 minutes** if you want to survive short reloads. | On successful `PUT` to the same endpoint (immediate update). |
| `PUT /api/v1/me/world` | Not cacheable (state‑changing). | – | – |
| (Optional) `GET /api/v1/worlds/:worldId/assets` | Public, asset‑specific | **30 days** (assets rarely change) | On asset version change (e.g., new poster). Invalidate via asset‑URL versioning or cache‑tag purge. |

**Implementation notes:**  
- Use `Cache-Control` headers on the API responses.  
- For the world catalog, also serve a **static JSON file** via the CDN with the same TTL; the API can be a thin proxy if you want to keep auth/logging.  
- Ensure that any change to the world catalog (admin UI) triggers a CDN purge or API cache purge.

---

## 9. Summary of API‑Related Recommendations  

1. **Add two new endpoints** (`GET /api/v1/worlds` and `GET/PUT /api/v1/me/world`) to serve the world catalog and persist user selection.  
2. Keep all existing endpoints unchanged (`/api/contact` remains the sole source of truth for the contact form).  
3. No server‑side search/pagination is required for the world list; client‑side filtering is sufficient.  
4. All new endpoints return JSON only; no multipart uploads are needed for the current scope.  
5. Apply modest rate limits (see §5) to prevent abuse while allowing normal usage.  
6. No realtime push is required; optimistic UI updates with a `PUT` suffice.  
7. Define strict TypeScript interfaces for the response shapes and version them under `/api/v1/`.  
8. Cache the world catalog aggressively (12 h) with a clear invalidation strategy; treat user preference as private/session‑scoped.  

These changes satisfy the plan’s claim of “no backend changes” **only** for the contact‑form pipeline; the world‑switcher functionality does require the above lightweight API additions. Once implemented, the marketing redesign can proceed with a clean, contract‑driven backend that scales gracefully as the world catalog grows.

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
