# API Design & Backend Contracts — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 104.3s
> **Files:** docs/ai-workflow/blueprints/COMPREHENSIVE-APP-AUDIT-2026-04-04.md
> **Generated:** 4/4/2026, 5:23:34 PM

---

# API Surface Review – AI‑Chat Feature (Phase 1)

**TL;DR** – The current `GET /api/ai-chat/conversations` endpoint **does not** return all fields needed for the sidebar, and a few other adjustments (search, attachment handling, multimodal messages, rate‑limits, WS push, caching) are required before Phase 1 can truly be “zero‑backend‑change”. Below are concrete recommendations.

---

## 1. Existing API Sufficiency – Sidebar Data

| Required Sidebar Field | Current `GET /api/ai-chat/conversations` Shape* | Verdict | Recommended Change |
|------------------------|-----------------------------------------------|---------|--------------------|
| `id`                   | ✅ present                                    | OK      | – |
| `title`                | ✅ present                                    | OK      | – |
| `context` (preview/summary) | ❌ missing (only `createdAt`/`updatedAt`) | **Insufficient** | Add a `context` string (e.g., first 120 chars of the latest message or AI‑generated summary). |
| `messageCount`         | ❌ missing                                    | **Insufficient** | Add integer `messageCount` (total messages in conversation). |
| `lastMessageAt`        | ❌ missing (only `updatedAt` which may reflect title edits) | **Insufficient** | Add ISO‑8601 `lastMessageAt` timestamp (time of most recent message, system or user). |
| `unreadCount` (optional for future) | ❌ missing | Nice‑to‑have | Consider adding for later phases. |

\*Based on the existing codebase (see `backend/controllers/aiChatController.mjs` – the handler returns `Conversation` model attributes only).

**Recommendation:**  
Modify the controller to **project** or **annotate** the query with the extra fields:

```sql
SELECT
  c.id,
  c.title,
  SUBSTRING(m.content FROM 1 FOR 120) AS context,
  COUNT(m.id) AS messageCount,
  MAX(m.createdAt) AS lastMessageAt
FROM conversations c
LEFT JOIN messages m ON m.conversationId = c.id
WHERE c.userId = :userId
GROUP BY c.id, c.title
ORDER BY lastMessageAt DESC;
```

If the DB schema already stores a `summary` column on `conversations`, simply select it as `context`.

---

## 2. Search Endpoint – Client‑Side vs Server‑Side

- **Current plan:** Load the first 20 conversations and filter client‑side.
- **Adequacy:** Acceptable only while a user has **≤ ~50** conversations. Beyond that, UI latency and memory usage grow, and the user cannot find older chats.

**When to add server‑side search:**  
- As soon as the product targets the **wealthy golf / professional** segment (expected > 100 conversations per power user).  
- Or when the conversation list is paginated (e.g., infinite scroll) – the client will need to ask the server for the next page matching a query.

**Recommended endpoint:**  

```
GET /api/ai-chat/conversations?search=<term>&limit=20&offset=0
```

Implementation (PostgreSQL):

```sql
WHERE (
  c.title ILIKE '%' || $1 || '%'
  OR EXISTS (
    SELECT 1 FROM messages m
    WHERE m.conversationId = c.id
      AND m.content ILIKE '%' || $1 || '%'
    LIMIT 1
  )
)
```

Add a **GIN index** on `messages.content` (or a trigram index) for performant ILIKE.

---

## 3. File Attachment Endpoint – REST Design

**Proposed:** `POST /api/ai-chat/conversations/:id/attachments`

- **RESTfulness:** ✅ Correct – attaches a sub‑resource to a conversation.
- **Payload:** `multipart/form-data` with fields:
  - `file` (required) – binary file.
  - `description` (optional) – text.
- **Response:** JSON with attachment metadata:

```json
{
  "id": "uuid",
  "conversationId": ":id",
  "filename": "original.png",
  "mimeType": "image/png",
  "size": 124578,
  "url": "/uploads/ai-chat/attachments/<uuid>.png",
  "createdAt": "2026-04-04T12:34:56Z"
}
\]

**Additional considerations**
- Store files in a secure bucket (e.g., S3) with private URLs signed for the conversation owner.
- Enforce **max size** (e.g., 10 MB) and **allowed MIME types** (images, PDF, CSV).
- Run a quick virus‑scan (ClamAV) before persisting.
- Return `413 Payload Too Large` or `415 Unsupported Media Type` on violation.

---

## 4. Multimodal Message API – Sending Images to Gemini

Two common patterns:

| Pattern | Pros | Cons |
|---------|------|------|
| **Upload‑then‑reference** (POST attachment → send message with `attachmentIds`) | Decouples concerns, enables reuse, easier virus‑scan, avoids large base64 payloads. | Requires two round‑trips. |
| **Inline base64** (attach `data:` URI in message content) | Single request. | Bloated request, harder to stream, size limits, complicates caching. |

**Recommendation:** Adopt **upload‑then‑reference**.

### Changes to the message creation endpoint

Current: `POST /api/ai-chat/conversations/:id/messages`  
Body: `{ content: string }`

**New body:**

```json
{
  "content": "Describe this swing…",
  "attachmentIds": ["<uuid‑1>", "<uuid‑2>"]   // optional, array of previously uploaded attachment IDs
}
```

- Validate that each `attachmentId` belongs to the conversation and the user.
- Pass the attachment URLs (or signed URLs) to the Gemini multimodal API call.
- Keep the existing `content`-only path for backward compatibility (text‑only chats).

---

## 5. Rate Limiting for New Operations

| Operation | Suggested Limit (per user) | Rationale |
|-----------|----------------------------|-----------|
| **Sidebar list** (`GET /api/ai-chat/conversations`) | **30 req/min** | Loaded on every navigation; generous but prevents abusive polling. |
| **Conversation rename** (`PATCH /api/ai-chat/conversations/:id`) | **10 req/min** | Renaming is infrequent; protects against spam. |
| **File upload** (`POST /api/ai-chat/conversations/:id/attachments`) | **5 req/min** (max 10 MB each) | Uploads are costly; limit abuse and bandwidth. |
| **Message send** (`POST /api/ai-chat/conversations/:id/messages`) | **60 req/min** | Typical chat flow; allows bursts but caps runaway bots. |
| **Search** (`GET /api/ai-chat/conversations?search=…`) | **20 req/min** | Prevents expensive ILIKE scans from DoS. |

Implement via **express-rate-limit** (or Redis‑backed) with a key like `user:<id>:<endpoint>`. Return `429 Too Many Requests` with `Retry-After` header.

---

## 6. WebSocket Integration – Push vs Poll

The project already uses **Socket.io** (see `backend/socket.io.mjs`).  

**Current approach (implied):** Poll `GET /api/ai-chat/conversations` every few seconds to surface new messages or title changes.

**Recommended:** Use WS for **real‑time push** of:

- `conversation:updated` (title change, lastMessageAt, messageCount)
- `message:created` (new message, optionally with attachment preview)
- `attachment:uploaded` (so the UI can show a thumbnail instantly)

**Implementation sketch:**

```js
// on new message
io.to(`user:${userId}`).emit('conversation:updated', {
  conversationId,
  messageCount: newCount,
  lastMessageAt: new Date(),
  lastMessage: { /* preview */ }
});

// on attachment upload
io.to(`user:${userId}`).emit('attachment:uploaded', { conversationId, attachment });
```

**Client side:** Maintain a local cache of conversation summaries; apply WS updates optimistically, falling back to REST fetch on reconnection.

**Keep REST** for initial load and for non‑real‑time operations (search, bulk actions).

---

## 7. Response Contract – ConversationSummary Type

Define a **TypeScript** interface (shared via `api-types` package or generated via OpenAPI):

```ts
export interface ConversationSummary {
  id: string;
  title: string;
  context?: string;          // preview or AI‑generated summary
  messageCount: number;
  lastMessageAt: string;     // ISO 8601
  unreadCount?: number;      // optional for future
}
```

Ensure the serializer (e.g., Sequelize `toJSON` or a custom transformer) **always** includes these fields, even if `null`/`0`.  
If the backend currently omits `context` or `messageCount`, add them as **virtual fields** or **selected columns** as shown in §1.

---

## 8. Caching Strategy – Conversation List

| Aspect | Current (5‑min cache) | Evaluation |
|--------|----------------------|------------|
| **Staleness** | 5 min → user may not see a new message for up to 5 min. | Too long for a chat‑like experience. |
| **Invalidation** | None (time‑based only). | Misses immediate updates (new message, rename). |
| **Scalability** | Simple in‑memory or Redis TTL. | Works but can be improved. |

**Recommendation:**  

1. **Short‑lived cache** – 30 seconds (or even 10 seconds) for the list endpoint.  
2. **Event‑driven invalidation** – When a WS `conversation:updated` or `message:created` is emitted, **purge** the cached list for that user (e.g., `del user:<id>:conversation-list`).  
3. **Optional:** Use **Redis tags** or a hash keyed by `userId` storing the latest `lastMessageAt` per conversation; the endpoint can then return a `304 Not Modified` if the client sends an `If-Modified-Since` header matching the cached timestamp.

**Result:** Near‑real‑time list with minimal backend load, and no reliance on a fixed 5‑minute TTL.

---

# Summary of Required Backend Changes (Phase 1)

| # | Change | File(s) / Location |
|---|--------|--------------------|
| 1 | Enrich `GET /api/ai-chat/conversations` with `context`, `messageCount`, `lastMessageAt`. | `backend/controllers/aiChatController.mjs` (service/query) |
| 2 | Add server‑search endpoint (ILIKE on title + JSONB/content). | New route `GET /api/ai-chat/conversations` with query params |
| 3 | Implement attachment upload route (`POST …/attachments`). | `backend/routes/aiChatRoutes.mjs` + controller |
| 4 | Extend message creation to accept `attachmentIds`. | `POST /api/ai-chat/conversations/:id/messages` body schema |
| 5 | Add rate‑limit middleware for the new endpoints (list, rename, upload, message, search). | `backend/middleware/rateLimit.mjs` (or per‑route) |
| 6 | Wire Socket.io events for conversation & message updates. | `backend/socket.io.mjs` + controller hooks |
| 7 | Update Sequelize model or add virtual fields to expose summary data. | `backend/models/Conversation.mjs` |
| 8 | Adjust caching: reduce TTL to ~30s + add invalidation on WS events. | `backend/cache/conversationList.mjs` (or Redis wrapper) |
| 9 | Add OpenAPI/Swagger docs for new/request shapes. | `docs/api/` (if using swagger-ui) |
|10| Write unit/integration tests for the above. | `__tests__/` |

Once these are in place, the frontend can achieve the desired sidebar experience **without further backend modifications** for Phase 1 (i.e., the plan’s “zero backend changes” claim becomes accurate after the above adjustments).

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
