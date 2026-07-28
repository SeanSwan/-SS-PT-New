# API Design & Backend Contracts — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b:free | **Duration:** 45.9s
> **Files:** docs/ai-workflow/AI-HANDOFF/SWANGUARD-REFACTOR-AND-SITE-REDESIGN-MASTER-PLAN-2026-07-21.md
> **Generated:** 7/21/2026, 9:14:47 PM

---

# API Review – SwanGuard Refactor + SwanStudios Photographic‑Luxury Redesign  
*Based solely on the content of `docs/ai-workflow/AI-HANDOFF/SWANGUARD-REFACTOR-AND-SITE-REDESIGN-MASTER-PLAN-2026-07-21.md`*  

---

## 1. Existing API Sufficiency  

| Feature / Surface (from plan) | Data consumed (as described in plan) | Existing endpoint that *could* satisfy it* | Sufficiency verdict | Comments / Gap |
|-------------------------------|--------------------------------------|--------------------------------------------|---------------------|----------------|
| **Today – Brief + Alerts** | Daily intelligence brief (text + optional hero image/video), active alerts (type, severity, timestamp, dismiss‑action) | `GET /api/brief/today`  <br> `GET /api/alerts/active`  <br> `POST /api/alerts/:id/dismiss` | **Likely sufficient** – the plan only mentions auto‑loading panels; no new fields are called out. If the current payload already contains `title`, `body`, `heroUrl` (or `heroVideoUrl`), `alerts[]` with `id`, `type`, `message`, `severity`, `timestamp`, then no change is needed. | Verify that the brief payload includes a **photographic‑luxury hero URL** (for the “signature Morning Brief”). If missing, extend the brief endpoint (see §2). |
| **Intelligence – Civic / Comment / Influence / Wiki** | Lists of items (title, summary, source, timestamp, optional media) – filtered client‑by‑client in the plan (e.g., “show only civic items from last 7 days”). | `GET /api/intel?type=civic&limit=&offset=`  <br> `GET /api/intel?type=comment…`  <br> `GET /api/intel?type=influence…`  <br> `GET /api/intel?type=wiki…`  <br> (or separate type‑specific endpoints) | **Potentially insufficient** – the plan says “filter client‑side”. If the collections can grow beyond a few dozen items, client‑side filtering will cause unnecessary payload transfer and poor performance. Recommend server‑side search/pagination (see §2). |
| **Family – Trust / Fair Access / Readiness / Marketplace** | Trust status (approved/pending, owner‑gate flags), readiness score, marketplace product listings (title, price, image, CTA), fair‑access eligibility rules. | `GET /api/family/trust`  <br> `GET /api/family/readiness`  <br> `GET /api/family/marketplace?limit=&offset=`  <br> `POST /api/family/trust/approve`  <br> `POST /api/family/trust/revoke` | **Likely sufficient** – these are simple CRUD‑style reads/writes. No new data shape is mentioned. Ensure the trust payload includes the **owner‑gate flags** and **kill‑switch status** (required for the “critical action SLA”). |
| **Hermes – Inbox** | Message list (sender, subject, preview, timestamp, read flag, attachment flag). | `GET /api/hermes/messages?limit=&offset=`  <br> `POST /api/hermes/messages` (send)  <br> `PATCH /api/hermes/messages/:id/read` | **Likely sufficient** – standard inbox API. |
| **Owner – Console / Kill Switches / Grants / Observability** | Kill‑switch toggles (name, current state, last‑changed), grant records (ID, scope, granted‑by, expires), observability metrics (CPU, latency, error‑rate). | `GET /api/owner/kill-switches`  <br> `PATCH /api/owner/kill-switches/:id/toggle`  <br> `GET /api/owner/grants`  <br> `GET /api/owner/observability` | **Likely sufficient** – read‑only metrics and simple toggle endpoints. |
| **SwanStudios Public Site (photographic‑luxury redesign)** | Hero video/still URLs, asset metadata (alt text, credit), product/package data (title, price, description, CTA), auth/login flow. | `GET /api/site/hero` (returns video loop + fallback still)  <br> `GET /api/site/packages?limit=&offset=`  <br> `POST /api/auth/login`  <br> `POST /api/auth/logout` | **Likely sufficient** – the plan stores all imagery on R2 and only needs URLs; no new binary uploads to the API are mentioned. |

\*If any of the above endpoints do **not** exist today, treat them as **new** (see §2).  

**Overall claim in the plan:** “no backend changes” is **only true** if the existing endpoints already return the exact shapes described. The plan does not provide evidence of those shapes, so we must **verify** each endpoint’s current contract. Where the plan introduces a new UI concept (e.g., *signature Morning Brief* with a full‑bleed photographic hero) that is not obviously present in today’s brief payload, we flag a potential gap.

---

## 2. Search / Query Needs  

| Area where plan filters client‑side | Scale concern (estimated rows) | Recommendation |
|------------------------------------|--------------------------------|----------------|
| **Intelligence feeds** (civic, comment, influence, wiki) – plan says “filter client‑side” (e.g., show only civic items from last 7 days). | Each feed could easily reach **hundreds to thousands** of items over time (external news, wiki edits, social comments). | **Add server‑side filtering & pagination**. Endpoint shape: `GET /api/intel?type={civic|comment|influence|wiki}&since=ISO8601&limit=20&offset=0&sort=-timestamp`. Return `totalCount` for UI pagination. |
| **Marketplace product list** (if the Family space includes a store) – plan does not mention pagination, but a luxury‑training store could have dozens of SKUs. | < 200 items likely, but still good practice to paginate. | `GET /api/family/marketplace?limit=20&offset=0&search=…&category=…`. |
| **Alert list** – only active alerts are shown; number of active alerts is expected to be low (< 20). | Low volume → client‑side filtering acceptable. | No change needed. |
| **Message inbox** – Hermes inbox may grow; plan does not specify pagination. | Could reach hundreds per user. | Add `limit/offset` or cursor‑based pagination to `/api/hermes/messages`. |

**When to apply:** Implement server‑side pagination/search **immediately** for any collection that can exceed ~50 items or where the UI may need to sort/filter by date, type, or text. For truly tiny sets (active alerts, kill‑switches) client‑side is fine.

---

## 3. New Endpoint Design (if needed)  

Below are the **minimal set of new or altered endpoints** required to satisfy the plan’s UI data needs, assuming the current API does **not** already provide them.

| Endpoint | Verb | Resource nesting | Purpose | Request payload | Response payload | Multipart? |
|----------|------|------------------|---------|-----------------|------------------|------------|
| `GET /api/brief/today` | GET | – | Returns the **signature Morning Brief** (text + hero media). | – | `{ briefId, title, body, heroType: "image\|video", heroUrl, heroAlt, publishedAt, alerts: [{id,type,message,severity,timestamp}] }` | No |
| `GET /api/intel` | GET | – | Paginated, filterable intelligence feed. | Query: `type`, `since`, `limit`, `offset`, `search?` | `{ items:[{id,type,title,summary,sourceUrl,mediaUrl,mediaAlt,publishedAt}], totalCount, limit, offset }` | No |
| `GET /api/family/trust` | GET | – | Trust status + owner‑gate flags. | – | `{ trustId, status: "approved\|pending\|revoked", ownerGates:[{name,enabled}], killSwitches:[{id,name,state}] }` | No |
| `PATCH /api/owner/kill-switches/:id/toggle` | PATCH | – | Flip a kill‑switch (critical action ≤ 2 clicks). | `{ enabled: boolean }` | `{ id, name, enabled, changedAt }` | No |
| `GET /api/site/hero` | GET | – | Hero video loop (MP4/WebM) + fallback still for the public homepage. | – | `{ videoUrl, posterUrl, alt, credit }` | No |
| `POST /api/auth/login` | POST | – | Existing auth – ensure returns `accessToken` + `refreshToken` + `user` (minimal). | `{ email, password }` | `{ accessToken, refreshToken, user:{id,role,name} }` | No |
| `GET /api/hermes/messages` | GET | – | Paginated inbox. | Query: `limit`, `offset`, `unreadOnly?` | `{ items:[{id,senderId,subject,preview,timestamp,isRead,hasAttachment}], totalCount, limit, offset }` | No |
| `POST /api/hermes/messages` | POST | – | Send a new message (optional attachment). | `{ recipientId, subject, body }` **(or multipart if attachment)** | `{ id, senderId, recipientId, subject, body, timestamp }` | **Yes** – if attachment present, use `multipart/form-data` with field `attachment`. |
| `GET /api/family/marketplace` | GET | – | Product listings for the Family space. | Query: `limit`, `offset`, `search`, `category` | `{ items:[{id,title,price,currency,imageUrl,ctaUrl}], totalCount, limit, offset }` | No |

**Notes on design**

* All endpoints follow **RESTful nouns**, use **HTTP verbs** correctly, and avoid deep nesting unless a clear parent‑child relationship exists (e.g., kill‑switches under `/owner`).  
* Query parameters are used for filtering, pagination, and sorting – keeping URLs cache‑friendly.  
* Response shapes are **flat JSON objects** with explicit field names; no nested arrays deeper than one level to stay under the 300‑line/file guideline for client‑side reducers.  
* No endpoint returns HTML; all are pure JSON for consumption by the React/TS frontend.  
* Multipart is only needed for the **message‑attachment** use case (Hermes). All other large assets (images, video) are served via **signed URLs** from R2; the API only returns those URLs.

---

## 4. Multimodal / Large Payloads  

| Asset type | Where it appears in plan | Recommended API handling |
|------------|--------------------------|--------------------------|
| **Hero video loops / stills** (photographic‑luxury site) | Public homepage hero, possibly ambient b‑roll | Store on **Cloudflare R2** (or similar object storage). API returns **signed, time‑limited URLs** (`videoUrl`, `posterUrl`). No binary data in API responses. |
| **Intelligence media** (thumbnails, preview images) | Intel feed items | Same as above – store in R2, return `mediaUrl`. |
| **Marketplace product images** | Family → Marketplace | Same – R2 URLs. |
| **Message attachments** (Hermes) | Optional file upload with a message | **Upload‑then‑reference**: client POSTs file to `/api/upload` (or directly to R2 with a pre‑signed URL) → receives `attachmentId` → includes that ID in the `POST /api/hermes/messages` body. This keeps the message endpoint lightweight and avoids large base64 blobs. |
| **Audio** (not mentioned) | – | N/A |

**Why upload‑then‑reference?**  
* Keeps API response size small (< 10 KB).  
* Allows independent scaling of storage/CDN.  
* Enables client‑side progress UI and resumable uploads if needed.

---

## 5. Rate Limiting  

| Operation | Suggested limit (per user / per IP) | Rationale |
|-----------|--------------------------------------|-----------|
| `GET /api/brief/today` | 60 req/min | Low‑cost read; protects against abusive refresh loops. |
| `GET /api/intel` (paginated) | 30 req/min | Prevents scraping of intelligence feeds. |
| `GET /api/family/trust` / `GET /api/family/readiness` / `GET /api/family/marketplace` | 60 req/min | Typical user interaction frequency. |
| `PATCH /api/owner/kill-switches/:id/toggle` | 5 req/min | Critical action – limit accidental toggles. |
| `POST /api/hermes/messages` (send) | 20 req/min | Messaging should be reasonable; burst allowed for conversation. |
| `POST /api/auth/login` | 10 req/min | Standard brute‑force mitigation. |
| `POST /api/upload` (attachment pre‑sign) | 30 req/min | Upload bandwidth guard. |
| `GET /api/site/hero` (public) | 120 req/min (IP‑based) | Public homepage can be heavily cached; limit per IP to deter scrapers. |

*Use a token‑bucket or fixed‑window algorithm; return `429 Too Many Requests` with `Retry‑After` header.*  

*All authenticated endpoints should also enforce **per‑user** limits in addition to IP limits to prevent a single user from exhausting the quota for others.*

---

## 6. Realtime vs Polling  

| Feature | Current plan implication | Recommended approach |
|---------|--------------------------|----------------------|
| **Brief updates** (new Morning Brief each day) | Plan says “auto‑load on mount + refresh affordance

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
