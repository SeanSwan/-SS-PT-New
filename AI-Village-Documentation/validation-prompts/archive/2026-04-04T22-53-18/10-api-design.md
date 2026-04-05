# API Design & Backend Contracts — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 98.1s
> **Files:** docs/ai-workflow/blueprints/BOARD2-EXERCISE-MODIFICATIONS-PLAN.md
> **Generated:** 4/4/2026, 3:53:18 PM

---

## API Surface Review – AI‑Chat Workflow (based on the **Board 2 Exercise Modifications** plan)

Below is a concise, actionable audit of the existing AI‑chat endpoints against the requirements listed in the plan. Where the plan is silent (e.g., exact shape of `GET /api/ai-chat/conversations`), I note the **minimum** fields that must be present for the proposed UI to work and suggest concrete changes if they are missing.

---

### 1. Existing API Sufficiency – Sidebar Data  
**Claim:** *Phase 1 needs zero backend changes.*  

| Required Sidebar Field | Where it should come from | Current state (as inferred from typical implementation) | Verdict |
|------------------------|---------------------------|----------------------------------------------------------|---------|
| `id` (conversation UUID) | `GET /api/ai-chat/conversations` | ✅ Usually present | **OK** |
| `title` (conversation title) | Same endpoint | ✅ Usually present | **OK** |
| `context` (short preview / first user message) | Same endpoint | ❓ Often omitted; many APIs only return `messages` array | **Needs addition** |
| `messageCount` (total messages) | Same endpoint | ❓ Frequently missing; can be derived client‑side but adds overhead | **Needs addition** |
| `lastMessageAt` (timestamp of most recent message) | Same endpoint | ❓ Frequently missing | **Needs addition** |

**Recommendation**  
Add the three missing fields to the conversation list payload. If the backend already returns a `messages` array, you can compute `messageCount` and `lastMessageAt` in the service layer; otherwise, store denormalized counters on the `Conversation` model and update them via a Sequelize hook (`afterCreate`/`afterUpdate` on `Message`).  

```json
// Example shape after change
[
  {
    "id": "c5f3a2e1-…",
    "title": "Morning mobility routine",
    "context": "User asked: “What’s a good warm‑up for golf?”",
    "messageCount": 12,
    "lastMessageAt": "2025-08-31T14:22:07.000Z",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

> **Result:** No frontend changes are required beyond using the new fields; the claim of “zero backend changes” becomes true only after the above fields are added.

---

### 2. Search Endpoint – Client‑Side vs Server‑Side Filtering  

**Current approach (per plan):** Load the first 20 conversations and filter them client‑side (e.g., `Array.prototype.filter` on title).  

| Conversation Count | Client‑Side Viability | Server‑Side Need |
|--------------------|----------------------|------------------|
| ≤ 50               | ✅ Acceptable (tiny payload) | Optional |
| 51 – 200           | ⚠️ Still okay if payload < ≈ 30 KB; UI may feel sluggish on low‑end devices | Recommended for consistent UX |
| > 200              | ❌ Not acceptable – payload grows linearly, UI blocks | **Required** |

**When to add server‑search:**  
- As soon as the product expects **more than 50 active conversations per user** (a realistic ceiling for a SaaS with long‑term users).  
- When you anticipate **global search** (across all users, e.g., admin dashboard) or **full‑text search** on message bodies.

**Suggested endpoint:**  

```
GET /api/ai-chat/conversations?search=<term>&limit=20&offset=0
```

- Perform **ILIKE** on `title` (PostgreSQL) and optionally **JSONB** search on a `summary` column that stores concatenated message text (or use `pg_trgm`/`tsvector` for fuzzy matching).  
- Return the same `ConversationSummary` shape as the list endpoint (so the UI can reuse the component).  

**Implementation tip:** Add a database index:  

```sql
CREATE INDEX idx_conversations_title_ilike ON conversations USING gin (title gin_trgm_ops);
```

---

### 3. File Attachment Endpoint – REST Design  

**Proposed:** `POST /api/ai-chat/conversations/:id/attachments`  

| Aspect | Evaluation |
|--------|------------|
| **Resource orientation** | ✅ Attachments are a sub‑resource of a conversation – RESTful. |
| **HTTP method** | ✅ `POST` for creating a new attachment. |
| **Payload type** | Must be `multipart/form-data` (file + optional metadata). |
| **Response** | Should return the created attachment object (id, filename, mimeType, size, url, uploadedAt). |
| **Security** | Validate file type (whitelist: image/*, video/*, application/pdf) and size (e.g., ≤ 10 MB). Store files in a secure bucket (S3/GCS) and return a signed URL or CDN path. |
| **Idempotency** | Not required; each upload is a distinct resource. |

**Recommendation:** Keep the endpoint as‑is, but add:  

- **Query param** `?type=message` (future‑proof for other attachment types).  
- **Rate limit** (see §5).  
- **Error handling** – return `415 Unsupported Media Type` or `413 Payload Too Large` with a clear JSON error body.

---

### 4. Multimodal Message API – Sending Images to Gemini  

The current `POST /api/ai-chat/conversations/:id/messages` likely expects `{ content: string }`. To support images (and potentially other media) you have two clean options:

#### Option A – **Extended Request Body** (simplest for clients)

```json
POST /api/ai-chat/conversations/:id/messages
Content-Type: application/json

{
  "content": "Describe this swing",
  "attachments": [
    {
      "id": "att_9f3b2c1e",   // reference to a previously uploaded attachment
      "type": "image"
    }
  ]
}
```

- **Pros:** Single round‑trip after upload; easy to reason about; matches typical chat APIs (Slack, Discord).  
- **Cons:** Requires the client to have already uploaded the attachment (see §3) and obtained its ID.

#### Option B – **Upload‑Then‑Reference Flow** (more explicit)

1. `POST /api/ai-chat/conversations/:id/attachments` → returns `{ id, uploadUrl }`.  
2. Client uploads the binary to `uploadUrl` (presigned S3 URL).  
3. Client sends the message with `"attachmentId": "<id>"` as above.

- **Pros:** Decouples binary transfer from JSON; enables retry/resumable uploads.  
- **Cons:** Slightly more complex client flow.

**Recommendation:** Adopt **Option A** (extended body) because the plan already proposes a dedicated attachment endpoint; the client will naturally call it first, then send the message referencing the attachment ID.  

**Backend changes needed:**  

- Add `attachments?: Array<{ id: string; type: 'image' | 'video' | 'file' }>` to the message creation DTO.  
- In the service layer, fetch attachment records, verify they belong to the conversation, and pass their public URLs (or signed URLs) to the Gemini multimodal API.  
- Update Sequelize `Message` model to have a JSONB column `attachments` for persistence (or a join table `MessageAttachment` if you need querying).  

---

### 5. Rate Limiting for New Operations  

| Operation | Frequency (typical) | Suggested Limit | Rationale |
|-----------|--------------------|----------------|-----------|
| **Sidebar list** (GET `/api/ai-chat/conversations`) | On every page load / route change (≈ 1‑2 req/s per user) | **30 req/min** per IP / user | Allows generous refresh while preventing abusive polling. |
| **Conversation rename** (PATCH `/api/ai-chat/conversations/:id`) | Infrequent (user‑initiated) | **5 req/min** per user | Rename is a mutation; low limit protects against spam. |
| **File upload** (POST `/api/ai-chat/conversations/:id/attachments`) | Bursty (user may attach several files) | **10 req/min** per user, **max 5 MB/min** bandwidth | Prevents DoS via large file spam; still permits a handful of attachments per session. |
| **Message send** (POST `/api/ai-chat/conversations/:id/messages`) | High (chat flow) | **60 req/min** per user | Roughly 1 msg/sec – enough for natural conversation, blocks rapid‑fire bots. |
| **Search** (GET `/api/ai-chat/conversations?search=…`) | Moderate | **20 req/min** per user | Search can be heavier; keep it modest. |

**Implementation:** Use a middleware like `express-rate-limit` with a **Redis store** (if you run multiple Node instances) to share counters. Key the limit by `userId` (from JWT) falling back to IP for unauthenticated requests.

---

### 6. WebSocket Integration – Push vs Poll  

The plan mentions Socket.io exists. For a chat‑like UI, **real‑time push** is superior to polling for:

- New incoming messages (AI or human).  
- Updates to conversation metadata (title change, lastMessageAt, messageCount).  
- Attachment upload completion (to show preview instantly).  

**Recommendation:**  

1. **Maintain a Socket.io namespace** `/ai-chat`.  
2. On successful message creation (REST), **emit** an event to all sockets subscribed to that conversation:  

   ```js
   io.to(`conversation:${conversationId}`).emit('messageCreated', newMessage);
   ```

3. On attachment upload completion, emit `attachmentReady`.  
4. On conversation rename/update, emit `conversationUpdated`.  

**Client side:**  
- Keep the REST list endpoint as a **fallback** (e.g., on reconnect) and for initial load.  
- Use the socket events to update the sidebar and message list optimistically, reducing perceived latency to near‑zero.  

**When to keep polling:** Only if you need to support environments where WebSockets are blocked (corporate firewalls). In that case, fallback to short‑polling (every 15 s) with the same REST endpoint.

---

### 7. Response Contract – ConversationSummary Adequacy  

The sidebar expects a type roughly like:

```ts
type ConversationSummary = {
  id: string;
  title: string;
  context?: string;          // preview / first user message
  messageCount: number;
  lastMessageAt: string;    // ISO timestamp
};
```

**Current typical shape** (if only `id`, `title`, `createdAt`, `updatedAt` are returned) is **insufficient**.  

**Action:**  
- Add the missing fields (`context`, `messageCount`, `lastMessageAt`) to the serializer / Sequelize `scope` or `Model.prototype.toJSON`.  
- Ensure `lastMessageAt` is updated via a **Sequelize hook** on `Message.afterCreate`/`afterUpdate` that does:

  ```js
  Message.addHook('afterCreate', async (msg) => {
    await Conversation.update(
      { lastMessageAt: msg.createdAt, messageCount: Sequelize.literal('message_count + 1') },
      { where: { id: msg.conversationId } }
    );
  });
  ```

- If you prefer not to denormalize, compute `messageCount` and `lastMessageAt` with a sub‑query in the list endpoint (still a single SQL query) – but denormalization is cheaper at scale.

---

### 8. Caching Strategy – 5‑Minute Cache on Conversation List  

| Factor | Evaluation |
|--------|------------|
| **Staleness tolerance** | Users expect to see a new message **immediately** after sending. A 5‑minute cache would hide that update unless you bypass the cache on write. |
| **Write‑through invalidation** | If you **purge** the cache (or update the cached entry) whenever a new message, rename, or attachment is added, the 5‑minute TTL becomes merely a safety net for rare edge cases. |
| **Cache layer** | Using an in‑memory store (e.g., `node-cache`) or Redis with a short TTL is fine for read‑heavy workloads. |
| **Recommendation** | Keep the 5‑minute TTL **as a fallback**, but implement **explicit cache invalidation** on any mutation that affects the list: <br>• `POST /messages` <br>• `PATCH /conversations/:id` (rename) <br>• `POST /conversations/:id/attachments` (if you show attachment count/preview) <br>Use a pattern like `cache.del(`conversations:${userId}`)` or update the specific entry with the new data. |

**Result:** The UI feels instantaneous (thanks to WS push + optimistic UI) while the cache reduces load on the DB for idle users.

---

## Summary of API Design Recommendations

| # | Change | Why |
|---|--------|-----|
| 1 | Add `context`, `messageCount`, `lastMessageAt` to `GET /api/ai-chat/conversations` response | Supplies all sidebar data without client‑side derivation. |
| 2 | Keep client‑side filtering for ≤ 50 convos; add server‑side `GET /api/ai-chat/conversations?search=` with ILIKE/JSONB when > 50 or for full‑text needs. | Prevents payload bloat and guarantees consistent UX at scale. |
| 3 | Confirm `POST /api/ai-chat/conversations/:id/attachments` uses `multipart/form-data`, returns attachment metadata, enforces type/size limits, and is rate‑limited. | REST‑correct and secure. |
| 4 | Extend message POST body with optional `attachments: [{id, type}]` array (upload‑then‑reference flow). | Enables multimodal (image/video) messages to Gemini with a single logical request after upload. |
| 5 | Apply rate limits: sidebar 30/min, rename 5/min, upload 10/min (size‑capped), message 60/min, search 20/min (per user/IP). | Protects against abuse while allowing normal usage. |
| 6 | Use Socket.io to push `messageCreated`, `attachmentReady`, `conversationUpdated` events; keep REST list as fallback/reconciliation. | Eliminates polling latency for real‑time chat feel. |
| 7 | Ensure `ConversationSummary` shape matches sidebar needs (`id`, `title`, `context`, `messageCount`, `lastMessageAt`). Add missing fields via serializer or denormalized columns with hooks. | Guarantees UI has required data without extra client logic. |
| 8 | Keep a 5‑minute TTL cache on the conversation list **but** invalidate on any mutation (new message, rename, attachment). Optionally update the cached entry optimistically. | Reduces DB load while preserving up‑to‑date UI. |

Implementing the above will make the AI‑chat backend fully ready for the features described in the plan (sidebar, search, attachments, multimodal messages) while maintaining performance, security, and a clean developer experience.  

---  

*Prepared for SwanStudios – AI‑Chat Workflow Review*  
*Date: 2025‑09‑16*

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
