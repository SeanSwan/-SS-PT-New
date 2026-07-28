# API Design & Backend Contracts — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 30.9s
> **Files:** docs/ai-workflow/brainstorms/inception-morph-engine-plan-2026-07-08.md
> **Generated:** 7/8/2026, 12:48:04 AM

---

# API Design Review – Inception Canvas / Lens Foundry  
*Based solely on the contents of `docs/ai-workflow/brainstorms/inception-morph-engine-plan-2026-07-08.md`*  

---  

## 1. Existing API Surfaces – Sufficiency Check  

| Surface (as described in the plan) | What the client needs | Does an existing endpoint already return enough data? | Verdict / Gap |
|------------------------------------|----------------------|------------------------------------------------------|---------------|
| **Component Registry** (list of reusable UI blocks, their props, and associated `data‑morph` anchors) | • Enumerate all registered components  <br>• Fetch a single component’s definition (JSX/TSX + prop schema)  <br>• Search components by name/tag/anchor  <br>• Register a new component (after sandbox review) | No explicit registry API is mentioned in the plan. The plan only says the registry exists as part of the **Engine**. | **New endpoint required** – CRUD + search. |
| **AI Harness / Protocol Adapter** (accepts voice/intent → calls external APIs → returns raw data) | • Send an intent payload (text/voice transcript)  <br>• Receive a **state document** (JSON) that describes the UI to render  <br>• Optionally retrieve intermediate API results for audit | The plan describes the harness as a *protocol adapter* but does not expose any HTTP endpoint for it. It is implied to be an internal module that the **Inception Router** calls. | **New endpoint required** – a public “/generate” (or similar) that the front‑end can call to trigger the harness. |
| **Inception Router (Morph/State Engine)** | • Apply the state document to the shared 12‑col grid and instantiate components  <br>• Persist the resulting Lens JSON (snapshot)  <br>• Retrieve a saved Lens by name/ID | The router is described as an internal engine piece; no HTTP surface is mentioned. Persistence of Lens JSON would need a store. | **New endpoint required** – Lens CRUD (create, read, list, delete). |
| **Trust Layer (Effect Tiers + Audit)** | • Tag each generated component with an effect tier (T0‑T4)  <br>• Store an immutable audit receipt for T3/T4 actions (send/file/pay)  <br>• Provide audit log query for compliance | No audit endpoint is mentioned. The trust layer is described as part of the Engine but not exposed. | **New endpoint required** – audit log ingestion & query. |
| **Lens Management (saved, versioned Lens documents)** | • Save a Lens (named deterministic JSON) after first generation  <br>• Load a Lens instantly for replay  <br>• Update a Lens (regenerate on demand)  <br>• List lenses owned by a user or organization | The plan says lenses are “snapshotted to a named deterministic JSON Lens document that loads instantly thereafter.” No API is described. | **New endpoint required** – Lens CRUD + versioning. |
| **Marketplace (third‑party Lens publishing & consumption)** | • Publish a Lens to the marketplace  <br>• Browse/search marketplace lenses  <br>• Purchase/subscribe to a lens  <br>• Receive royalties / platform cut | No marketplace API is referenced. The plan only describes the business model. | **New endpoint required** – marketplace CRUD, search, purchase flow. |
| **Open‑Protocol Harness (MCP‑UI / AG‑UI compatible)** | • Accept an MCP‑UI / AG‑UI payload from any agent  <br>• Translate it into the internal state document format  <br>• Return the rendered UI (or just the state doc) | The plan mentions the harness should be “open‑protocol” but does not define an endpoint. | **New endpoint required** – a webhook‑style “/agent‑render” that accepts the external protocol payload. |
| **Static Asset Serving (corpus landing pages, fonts, etc.)** | • Serve the 50 award‑caliber single‑file HTML pages (the corpus)  <br>• Serve Google Fonts (external) | The plan says the corpus lives in the repo and is static HTML. No API needed – static file serving is sufficient. | **Existing** – static file server (e.g., Express `static` middleware) is enough. |
| **Theme Token Service (CSS custom properties)** | • Provide the 9‑token CSS variable set (with fallbacks) for the current theme  <br>• Allow theme toggle via client‑side class swap | Tokens are pure CSS variables; the plan insists every color be a `var(--token, #fallback)`. No runtime API is needed to fetch them – they are shipped with the CSS bundle. | **Existing** – no API required. |

**Summary:** All dynamic, mutable, or searchable surfaces (Component Registry, AI Harness, Lens persistence, Trust/Audit, Marketplace, Agent‑protocol adapter) lack an explicit HTTP contract in the plan and therefore require new endpoints. Static assets and the CSS token system are already sufficient client‑side.

---  

## 2. Search / Query Needs – When Server‑Side Is Required  

| Query Pattern (client‑side filtering mentioned or implied) | Scale Concern | Recommendation |
|------------------------------------------------------------|---------------|----------------|
| **Listing components** – UI may show a searchable palette of registry blocks. | The registry will grow (potentially hundreds of components). Client‑side filtering of the full list becomes costly on low‑end devices and wastes bandwidth. | Implement **GET /components** with query params: `?search=<term>&tag=<tag>&limit=<n>&offset=<n>` (or cursor). Return paginated JSON + total count. |
| **Browsing lenses** – user’s personal lens library or marketplace catalog. | Lens count can reach thousands (marketplace). | **GET /lenses** (private) and **GET /marketplace/lenses** with pagination, filters (`owner`, `category`, `rating`, `price`), and full‑text search on name/description. |
| **Marketplace search** – full‑text + faceted filtering. | Marketplace is the “multi‑billion‑dollar path”; needs robust discovery. | Use a dedicated search service (e.g., PostgreSQL `tsvector` or Elasticsearch) behind **GET /marketplace/search** with facets. |
| **Audit log queries** – compliance officers filtering by date, user, effect tier. | Audit logs are append‑only and can grow large. | **GET /audit** with range filters (`startDate`, `endDate`), `userId`, `effectTier`, pagination. |
| **Component usage stats** (optional, for marketplace ranking). | May be needed for ranking lenses. | Provide **GET /components/:id/stats** (cached) rather than scanning all lenses client‑side. |

**Verdict:** Any list that can exceed a few dozen items should be paginated and filtered server‑side. The plan does not mention any existing pagination, so we must add it.

---  

## 3. New Endpoint Design – REST Shape Validation  

Below are the **minimum set of new endpoints** implied by the plan. Each entry includes verb, resource nesting, payload shape, and notes on multipart/form‑data if applicable.

### 3.1 Component Registry  

| Endpoint | Method | Description | Request Payload | Response Payload |
|----------|--------|-------------|-----------------|------------------|
| `/components` | `GET` | List/search components (paginated) | Query: `search`, `tag`, `limit`, `offset` | `{ items: Component[], total: Number, limit, offset }` |
| `/components` | `POST` | Register a new component (after sandbox approval) | `multipart/form-data`: <br>• `name` (string) <br>• `tag` (string[]) <br>• `source` (file – `.tsx` or `.jsx`) <br>• `propSchema` (JSON file) <br>• `previewImg` (optional image) | `{ id, name, tag, createdAt }` |
| `/components/:id` | `GET` | Get a single component definition | – | `{ id, name, tag, source: string, propSchema: Json, previewUrl?: string }` |
| `/components/:id` | `PUT` | Update component (only allowed for admins / original author) | Same as POST (partial allowed) | `{ id, name, tag, updatedAt }` |
| `/components/:id` | `DELETE` | Soft‑delete / archive component | – | `{ id, deletedAt }` |

*Notes:*  
- `source` is sent as a file to avoid huge inline JSON; the backend stores it in an object store (S3‑compatible) and returns a URL.  
- `propSchema` is a JSON Schema file; validated on upload.  
- All responses follow a consistent envelope: `{ data: ..., meta: {...} }` for extensibility.

### 3.2 AI Harness / Generation  

| Endpoint | Method | Description | Request Payload | Response Payload |
|----------|--------|-------------|-----------------|------------------|
| `/generate` | `POST` | Accept intent (voice transcript or text) and optional context, run the AI harness, return a **state document** | `{ intent: string, context?: Json, sessionId?: string }` | `{ stateDocument: LensJson, requestId: string, generatedAt: ISOString }` |
| `/generate/stream` | `GET` (SSE) | Optional streaming version for long‑running generation (progress updates) | Query: `intent`, `sessionId` | `data: { progress: number, stage: string }` … final `data: { stateDocument: LensJson }` |

*Notes:*  
- The endpoint is **stateless**; the caller can store the returned `stateDocument` as a Lens snapshot.  
- No file uploads are required here; the harness calls external APIs internally.  
- Rate‑limit (see §5).  

### 3.3 Lens Management (Snapshot / Replay)  

| Endpoint | Method | Description | Request Payload | Response Payload |
|----------|--------|-------------|-----------------|------------------|
| `/lenses` | `GET` | List user’s lenses (paginated) | Query: `search`, `limit`, `offset` | `{ items: LensMeta[], total, limit, offset }` |
| `/lenses` | `POST` | Save a newly generated state document as a Lens | `{ name: string, description?: string, stateDocument: LensJson, tags?: string[] }` | `{ id, name, slug, createdAt }` |
| `/lenses/:id` | `GET` | Retrieve a Lens (full JSON) | – | `{ id, name, stateDocument, version, createdAt, updatedAt }` |
| `/lenses/:id` | `PUT` | Update metadata (name, description, tags) | `{ name?, description?, tags? }` | `{ id, updatedAt }` |
| `/lenses/:id` | `DELETE` | Remove a lens (soft delete) | – | `{ id, deletedAt }` |
| `/lenses/:id/versions` | `GET` | List version history | – | `{ items: [{ version, createdAt }], total }` |
| `/lenses/:id/versions/:versionNumber` | `GET` | Get a specific version snapshot | – | `{ version, stateDocument }` |

*Notes:*  
- `stateDocument` is the exact JSON that the Inception Router consumes; it must be version‑immutable once stored.  
- The `slug` (`/lens/<slug>`) is derived from `name` for URL‑friendly access (see plan: “URLs survive the morph”).  

### 3.4 Marketplace  

| Endpoint | Method | Description | Request Payload | Response Payload |
|----------|--------|-------------|-----------------|------------------|
| `/marketplace/lenses` | `GET` | Browse/search marketplace lenses (public) | Query: `search`, `category`, `minPrice`, `maxPrice`, `sort`, `limit`, `offset` | `{ items: MarketplaceLensMeta[], total, limit, offset }` |
| `/marketplace/lenses/:lensId` | `GET` | Get marketplace lens details (price, owner, rating) | – | `{ lensId, name, ownerId, priceCents, rating, description, previewUrl, license }` |
| `/marketplace/purchase` | `POST` | Initiate purchase / subscription | `{ lensId, paymentToken }` (payment token from Stripe/PayPal) | `{ transactionId, licenseKey, expiresAt }` |
| `/marketplace/my-sales` | `GET` | Lens owner’s sales & royalties | Query: `limit`, `offset` | `{ items: SaleRecord[], total }` |
| `/marketplace/upload` | `POST` | Publisher uploads a new lens to the marketplace | `multipart/form-data`: <br>• `lensId` (existing lens ID) <br>• `priceCents` (integer) <br>• `license` (string) <br>• `previewImg` (file) | `{ marketplaceId, status: "pending-review" }` |

*Notes:*  
- Purchase flow assumes a PCI‑DSS‑compliant payment gateway; the backend only stores the transaction record.  
- Preview image uploaded as file; stored in object store, URL returned.  

### 3.5 Trust Layer – Audit Log  

| Endpoint | Method | Description | Request Payload | Response Payload |
|----------|--------|-------------|-----------------|------------------|
| `/audit` | `POST` | Ingest an audit event (called by the Trust Layer after a T3/T4 action) | `{ userId, actionType, effectTier, resourceId, details: Json, timestamp: ISOString }` | `{ id, recordedAt }` |
| `/audit` | `GET` | Query audit log (admin / compliance) | Query: `userId`, `startDate`, `endDate`, `effectTier`, `limit`, `offset` | `{ items: AuditEntry[], total, limit, offset }` |

*Notes:*  
- The endpoint is **append‑only**; no UPDATE/DELETE.  
- Must be tamper‑evident (e.g., write‑once storage or signed log).  

### 3.6 Open‑Protocol Harness (MCP‑UI / AG‑UI)  

| Endpoint | Method | Description | Request Payload | Response Payload |
|----------|--------|-------------|-----------------|------------------|
| `/agent/render` | `POST` | Accept an MCP‑UI / AG‑UI payload from any external agent, translate to internal state doc, and return it (or optionally trigger a lens save) | `{ mcpUiPayload: Json }` (per MCP‑UI spec) | `{ stateDocument: LensJson, requestId }` |
| `/agent/render/stream` | `GET` (SSE) | Streaming version for long‑running agent pipelines | Query: `mcpUiPayload` (base64) | SSE progress events → final state doc |

*Notes:*  
- The plan explicitly calls for an “open‑protocol harness” so agents can drive the canvas without custom adapters.  
- No file uploads needed here; the payload is JSON.  

---  

## 4. Multimodal / Large Payloads – Handling Strategy  

| Payload Type | Where it Appears in the Plan | Recommended Contract |
|--------------|-----------------------------|----------------------|
| **Component source files** (TSX/JSX) | Component Registry `POST /components` | **Upload‑then‑reference**: send as a `multipart/form-data` file field (`source`). Backend stores the file in an object store (S3‑compatible) and returns a permanent URL. The response contains only metadata; the frontend fetches the source via that URL when needed (or the SSR server reads directly from the store). |
| **Component prop schema** | Same as above | **Upload‑then‑reference** as a separate `propSchema` file (JSON). |
| **Preview images** (component thumbnail, lens preview) | Component Registry & Marketplace uploads | **Upload‑then‑reference** (`previewImg` field). Store as image, return URL; downstream consumers use

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
