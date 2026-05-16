# API Design & Backend Contracts — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 93.2s
> **Files:** docs/ai-workflow/blueprints/HOMEPAGE-ABOUT-VISION-REFACTOR-2026-04-05.md
> **Generated:** 4/4/2026, 7:32:59 PM

---

# API Surface Review – Homepage & About Page Vision Refactor
**Target:** Verify whether the current backend can support the frontend changes described in the plan without additional work (Phase 1 = zero backend changes).

---

## 1. Existing API Sufficiency – `GET /api/ai-chat/conversations`

| Required Sidebar Field | Currently Returned? | Comments / Gap |
|------------------------|---------------------|----------------|
| `id` (conversation UUID) | ✅ | Needed for navigation & WS room |
| `title` | ✅ | Shown in sidebar list |
| `context` (short preview / first user message) | ❓ *Often missing* | Many implementations only return `title` and timestamps. If the backend does **not** include a `context` or `preview` field, the sidebar will show an empty line. |
| `messageCount` (total messages) | ✅ | Usually present as `messageCount` or `messages.length` |
| `lastMessageAt` (ISO timestamp) | ✅ | Needed for sorting & “last active” badge |
| `unreadCount` (optional but useful) | ❓ | Not required for the plan, but nice‑to‑have for future UI. |

**Verdict:**
- If the current response shape is `{ id, title, messageCount, lastMessageAt }` **without** a `context/preview`, the sidebar will lack the optional “preview line” that many chat UIs show.
- **Recommendation:** Add a lightweight `preview` (or `context`) field – e.g., the first 100 chars of the latest user message, or `null` if none. This is a **backward‑compatible** addition (existing clients ignore unknown fields).

```json
{
  "id": "c_3f9a2b1",
  "title": "Morning swing drill",
  "preview": "Let's work on your weight transfer…",
  "messageCount": 12,
  "lastMessageAt": "2025-09-24T14:32:00Z",
  "unreadCount": 0
}
```

> **Zero‑backend‑change claim:** ✅ *Only if* the API already returns a `preview`/`context` field. Otherwise a tiny additive change is required.

---

## 2. Search Endpoint – Client‑Side Filtering of 20 Conversations

| Situation | Adequacy | When to Upgrade |
|-----------|----------|-----------------|
| **≤ 20 conversations** (current plan) | ✅ Client‑side filtering (JS `filter` on title) is instantaneous and saves a round‑trip. | – |
| **> ~50 conversations** or **real‑time search as user types** | ❌ Client‑side becomes noticeable lag; also prevents server‑side ranking (e.g., recency, match quality). | Add `GET /api/ai-chat/conversations?search=<term>` that performs `ILIKE` on `title` **and** a JSONB column that stores concatenated message content (or a separate `search_text` tsvector). Return paginated results (`limit=20`, `offset`). |
| **Future: fuzzy / typo‑tolerant** | ❌ | Consider PostgreSQL `pg_trgm` or a dedicated search service (Meilisearch, Typesense). |

**Recommendation:**
- Keep client‑side filtering for now (Phase 1).
- Add a **search endpoint** as soon as the conversation list exceeds ~50 items *or* product decides to show a search bar in the sidebar.
- Implementation sketch:

```http
GET /api/ai-chat/conversations?search=swing&limit=20&offset=0
```

```sql
SELECT id, title, preview, messageCount, lastMessageAt
FROM conversations
WHERE (title ILIKE $1 OR search_text ILIKE $1)
ORDER BY lastMessageAt DESC
LIMIT $2 OFFSET $3;
```

---

## 3. File Attachment Endpoint – `POST /api/ai-chat/conversations/:id/attachments`

| Aspect | Evaluation |
|--------|------------|
| **REST correctness** | ✅ POST to a sub‑resource (`/conversations/:id/attachments`) follows REST conventions for creating a child resource. |
| **Payload** | Should accept `multipart/form-data` with a single file field (e.g., `file`). |
| **Response** | Return JSON with attachment metadata: `{ id, url, filename, mimeType, size }`. |
| **Security / Validation** | - Enforce max size (e.g., 10 MB). <br> - Whitelist mime types (`image/*`, `application/pdf`, `text/plain`). <br> - Store files in a secure bucket (S3/GCS) and return a signed URL or CDN path. |
| **Idempotency** | Not required; each upload creates a new attachment. |
| **Error handling** | Return `400` for validation errors, `413` for oversize, `415` for unsupported type, `500` for server errors. |

**Verdict:** The proposed endpoint is **correct** as‑is, provided the backend implements the validation/storage details above. No breaking change needed.

---

## 4. Multimodal Message API – Sending Images with Messages to Gemini

Two common patterns:

| Pattern | Pros | Cons |
|---------|------|------|
| **A. Inline base64** (`{ content, attachments: [{ data: "base64…", mimeType: "image/png" }] }`) | Single request; simple for tiny files (< 256 KB). | Bloated payload; base64 adds ~33% overhead; may exceed request size limits; not suitable for larger images. |
| **B. Upload‑then‑reference** (recommended) | 1️⃣ `POST /api/ai-chat/conversations/:id/attachments` → returns `attachmentId`.<br>2️⃣ `POST /api/ai-chat/conversations/:id/messages` with `{ content, attachmentIds: [attachmentId] }`. | Slightly more complex (two round‑trips) but scales to any file size, enables reuse, and lets the backend run virus scans, throttling, etc. |

**Recommendation:** Adopt **Pattern B** (upload‑then‑reference).

- **Message creation endpoint** (`POST /api/ai-chat/conversations/:id/messages`) should accept an optional `attachmentIds: string[]` array.
- The backend will fetch the attachment metadata, construct the Gemini multimodal payload (image URL + base64 if required by the SDK), and store the message with references to the attachments.
- Keep the existing `content` field for text‑only messages; the API remains backward compatible.

---

## 5. Rate Limiting for New Operations

| Operation | Frequency (typical) | Suggested Limit (per IP / per user) | Rationale |
|-----------|--------------------|--------------------------------------|-----------|
| **Sidebar list** (`GET /api/ai-chat/conversations`) | Every page load / navigation (~1‑2 req/s) | **60 req/min** (≈1 req/sec) with burst up to 120 | Protects against abusive refresh loops while allowing normal UI usage. |
| **Conversation rename** (`PATCH /api/ai-chat/conversations/:id`) | Infrequent (user‑initiated) | **10 req/min** | Rename is a low‑frequency action; a stricter limit prevents spam. |
| **File upload** (`POST /api/ai-chat/conversations/:id/attachments`) | User‑driven, possibly batch | **5 req/min** (max 2 files per request) | Uploads are expensive (storage, virus scan); keep low to deter abuse. |
| **Message send** (`POST /api/ai-chat/conversations/:id/messages`) | High during chat | **30 req/min** (≈1 every 2 s) | Allows lively conversation but caps rapid‑fire bots. |
| **Search** (`GET /api/ai-chat/conversations?search=…`) | Typing‑ahead (if implemented) | **20 req/min** | Prevents excessive DB load from rapid keystrokes. |

*Implementation tip:* Use a middleware like `express-rate-limit` with a Redis store for distributed limits, and differentiate limits by route and authenticated user ID (fallback to IP for anonymous).

---

## 6. WebSocket Integration – Push vs. Polling

The plan mentions Socket.io already exists.

| Feature | Polling (current) | WebSocket (push) |
|---------|-------------------|------------------|
| **New message arrival** | Client polls every 5‑10 s → latency up to poll interval. | Instant push → sub‑second latency. |
| **Conversation rename / title change** | Requires refresh or poll to see update. | Push update → UI updates immediately. |
| **Attachment upload completion** | Client must poll or re‑fetch conversation list. | Push attachment metadata → UI can show preview instantly. |
| **Server load** | Each open tab creates a polling interval → many redundant requests. | Single persistent connection per tab → far less HTTP overhead. |
| **Complexity** | Simple, works without WS infrastructure. | Requires WS server, room management, reconnection handling. |

**Recommendation:**
- **Leverage the existing Socket.io server** to push **real‑time updates** for:
  - `newMessage` (includes message text & any attachment IDs)
  - `conversationUpdated` (title change, preview update)
  - `attachmentUploaded` (metadata for newly uploaded file)
- Keep the REST endpoints as the source of truth; WS messages are **optimistic UI updates** that are later reconciled with REST fetches (or rely on WS for correctness if you trust the server).
- Use **conversation‑scoped rooms** (`socket.join(conversationId)`) so each client only receives events relevant to the open chats.

If the team prefers to defer WS work, polling can stay for Phase 1, but **document** that WS integration is the next performance/scalability improvement.

---

## 7. Response Contract – Are Existing Shapes Adequate for `ConversationSummary`?

Assuming the frontend defines a TypeScript type like:

```ts
type ConversationSummary = {
  id: string;
  title: string;
  context?: string | null;   // preview line
  messageCount: number;
  lastMessageAt: string;    // ISO 8601
  unreadCount?: number;
};
```

**Checklist:**

| Field | Provided by current GET /api/ai-chat/conversations? | Action if missing |
|-------|------------------------------------------------------|-------------------|
| `id` | ✅ | – |
| `title` | ✅ | – |
| `context` / `preview` | ❓ (often absent) | Add `preview` field (see §1). |
| `messageCount` | ✅ | – |
| `lastMessageAt` | ✅ | – |
| `unreadCount` | ❓ (optional) | Not required for Phase 1; can be added later. |

**Verdict:** The contract is **adequate** *only* if the API already returns a `preview`/`context`. Otherwise, augment the response with that field (non‑breaking).

---

## 8. Caching Strategy – 5‑Minute Cache on Conversation List

| Aspect | Evaluation |
|--------|------------|
| **5‑minute TTL** | Reasonable for a list that changes infrequently (few new messages per minute). |
| **Invalidation on new message** | **Not automatic** with a pure TTL; a user could see stale list for up to 5 min after sending a message. |
| **Recommended approach** | - Use **short‑term stale‑while‑revalidate** (e.g., `Cache-Control: max-age=60, stale-while-revalidate=300`). <br> - **Alternatively**, keep the 5‑minute TTL but **purge** the cache via a Redis key pattern when: <br>   • A new message is created (`POST /messages`). <br>   • A conversation is renamed. <br>   • An attachment is uploaded. <br> - This gives near‑instant UI freshness without sacrificing cache benefits for idle periods. |
| **Per‑user vs. global** | Must be **user‑scoped** (different conversation lists per auth). Include user ID in cache key (`conversations:{userId}`). |
| **Effect on sidebar** | Sidebar will show the most recent list after either: <br>   a) TTL expires (≤ 5 min), or <br>   b) Cache is purged by the mutation that caused the change. |

**Recommendation:**
- Keep a **5‑minute TTL** as a safety net.
- Add **cache invalidation hooks** in the message, rename, and attachment upload handlers to delete (or update) the specific user’s conversation‑list cache entry.
- If using a CDN or edge cache, ensure the `Vary: Authorization` header is set so cached responses are not shared between users.

---

# Summary of API Design Recommendations

| # | Recommendation | Impact |
|---|----------------|--------|
| 1 | Ensure `GET /api/ai-chat/conversations` returns a `preview` (or `context`) field. Add if missing – backward compatible. | Sidebar shows preview line; no breaking change. |
| 2 | Keep client‑side filtering for ≤ 20 convos. Add `GET /api/ai-chat/conversations?search=` with ILIKE on title + JSONB/search_text when list grows > ~50 or search UI appears. | Scales search without over‑fetching. |
| 3 | Confirm `POST /api/ai-chat/conversations/:id/attachments` accepts `multipart/form-data`, validates size/mime, returns `{id,url,filename,mimeType,size}`. | Correct REST attachment flow. |
| 4 | Adopt **upload‑then‑reference** for multimodal messages: <br>1️⃣ POST attachment → get ID.<br>2️⃣ POST message with `attachmentIds`. | Scales to any file size, enables reuse, keeps message API clean. |
| 5 | Apply rate limits: sidebar list ≈ 60 req/min, rename ≈ 10 req/min, upload ≈ 5 req/min, message ≈ 30 req/min, search ≈ 20 req/min (per user). | Protects backend from abuse while allowing normal usage. |
| 6 | Use existing Socket.io to push real‑time updates (`newMessage`, `conversationUpdated`, `attachmentUploaded`) to conversation‑scoped rooms. Keep polling as fallback if WS not ready. | Reduces latency and server load; improves UX. |
| 7 | Verify `ConversationSummary` type matches API response; add `preview` if absent. | Guarantees sidebar renders correctly. |
| 8 | Maintain 5‑minute TTL cache **plus** invalidation on message/rename/upload events (user‑scoped key). | Near‑fresh data without excessive DB load. |

Implementing the above will make the backend **fully ready** for the frontend changes outlined in the Homepage & About Page Vision Refactor, while keeping the Phase 1 claim of “zero backend changes” true **only** after the minor additive tweaks (preview field, cache invalidation hooks, and optional search endpoint) are in place.

---

*Prepared for SwanStudios AI Village Review – 2026‑04‑05*

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
