# API Design & Backend Contracts — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 238.5s
> **Files:** docs/ai-workflow/blueprints/ONBOARDING-WORKFLOW-OVERHAUL-PLAN.md
> **Generated:** 4/2/2026, 8:47:53 PM

---

# API Surface Review – Onboarding Workflow Overhaul  
*SwanStudios (React + TS + styled‑components / Node + Express + Sequelize + PostgreSQL)*  

---

## 1. Existing API Sufficiency – Sidebar Data  

**Current endpoint (as referenced in the plan)**  
```http
GET /api/ai-chat/conversations
```

**What the sidebar needs (ConversationSummary)**  
| Field            | Type   | Purpose |
|------------------|--------|---------|
| `id`             | UUID   | Conversation key |
| `title`          | string | Displayed in list |
| `context`        | enum   | Chip badge (Coach, Workouts, …) |
| `messageCount`   | number | Badge count |
| `lastMessageAt`  | ISO‑8601 timestamp | Sort / “last seen” |
| `unreadCount`    | number (optional) | Highlight new activity |
| `preview`        | string (optional) | Snippet of last message |

**Assessment**  
- The existing route (based on the repo’s `aiChatRoutes.mjs`) currently returns only `{ id, title, updatedAt }` (or similar).  
- **Missing:** `context`, `messageCount`, `lastMessageAt` (or a reliable timestamp), and any unread/preview data.  

**Recommendation**  
1. **Enrich the SELECT** in the conversation list query to join the `messages` table (or use aggregated columns) and compute:  
   ```sql
   SELECT
     c.id,
     c.title,
     c.context,
     COUNT(m.id) AS messageCount,
     MAX(m.createdAt) AS lastMessageAt,
     SUM(CASE WHEN m.isRead = false THEN 1 ELSE 0 END) AS unreadCount,
     SUBSTRING(MAX(m.content) OVER (PARTITION BY c.id ORDER BY m.createdAt DESC LIMIT 1), 0, 100) AS preview
   FROM conversations c
   LEFT JOIN messages m ON m.conversationId = c.id
   WHERE c.userId = :userId
   GROUP BY c.id, c.title, c.context
   ORDER BY lastMessageAt DESC;
   ```
2. If the DB schema does not store `context` on the conversation, add a `context` column (enum) to `Conversations` and populate it when the AI context chip is switched.  
3. Return the shape above as the **ConversationSummary** type used by the sidebar component.  

> **Result:** Zero client‑side transformation needed; the sidebar can render directly from the API payload.

---

## 2. Search Endpoint – Client‑Side vs Server‑Side  

**Plan:** Client‑side filtering of the first 20 conversations (already fetched for the sidebar).  

**When it’s adequate**  
- ≤ 50 conversations per user (typical for a casual user).  
- Search limited to `title` only (no content search).  
- UI latency tolerance > 150 ms is acceptable.  

**When server‑side search becomes necessary**  
| Condition | Reason |
|-----------|--------|
| **> 100 conversations** per user (power users, trainers with many active chats) | Client‑side filtering would require loading all rows → unnecessary bandwidth & memory. |
| **Search across message content** (e.g., “show me chats where we discussed squat form”) | Requires `ILIKE` on `messages.content` or a full‑text search vector; cannot be done client‑side without downloading every message. |
| **Real‑time suggestions** as the user types (debounced < 300 ms) | Server can return ranked results faster than scanning a large local array. |
| **Faceting / filters** (by context, date range, unread) | Better expressed as query parameters. |

**Recommendation**  
1. **Keep client‑side filtering** for the MVP (≤ 20‑30 chats) – it’s simple and zero‑backend‑change.  
2. **Add a server‑search endpoint** when any of the above conditions appear:  
   ```http
   GET /api/ai-chat/conversations/search?q=<string>&context=<enum>&from=<date>&to=<date>&limit=20&offset=0
   ```
   - Search `title ILIKE :q` **OR** `to_tsvector('english', content) @@ plainto_tsquery(:q)` on a joined `messages` subquery (or a materialized view).  
   - Return the same `ConversationSummary` shape so the sidebar can reuse the component.  
   - Add appropriate indexes:  
     ```sql
     CREATE INDEX ON conversations USING gin (to_tsvector('english', title));
     CREATE INDEX ON messages USING gin (to_tsvector('english', content));
     ```

---

## 3. File Attachment Endpoint – REST Design  

**Proposed:**  
```http
POST /api/ai-chat/conversations/:id/attachments
```
- **Multipart/form‑data** with fields:  
  - `file` (binary)  
  - optional `description` (string)  

**Assessment**  
- REST‑ful: attaches a sub‑resource to a conversation.  
- Correct HTTP verb (`POST` creates a new attachment).  
- Multipart is the standard for file uploads.  

**Recommendations**  
1. **Validate** on the server:  
   - MIME type whitelist (images: `image/*`, documents: `application/pdf`, `text/plain`).  
   - Size limit (e.g., 10 MB per file, 50 MB total per conversation).  
   - Virus‑scan (ClamAV) or at least a basic file‑type magic check.  
2. **Store** the file in an object store (S3‑compatible) and save only the URL + metadata in an `Attachments` table:  
   ```sql
   CREATE TABLE attachments (
     id UUID PRIMARY KEY,
     conversationId UUID REFERENCES conversations(id) ON DELETE CASCADE,
     url TEXT NOT NULL,
     mimeType VARCHAR(100),
     sizeBytes INTEGER,
     description TEXT,
     uploadedAt TIMESTAMPTZ DEFAULT now()
   );
   ```
3. **Response shape** (201 Created):  
   ```json
   {
     "id": "uuid",
     "conversationId": "uuid",
     "url": "https://cdn.sswanstudios.com/attachments/...",
     "mimeType": "image/png",
     "sizeBytes": 124578,
     "description": "Screenshot of squat form",
     "uploadedAt": "2025-09-16T14:32:10Z"
   }
   ```
4. **Security** – generate a short‑lived, signed URL (if using S3 presigned URLs) or serve via a proxy endpoint that checks ownership before streaming.  

---

## 4. Multimodal Message API – Sending Images to Gemini  

**Current message send (text‑only)**  
```http
POST /api/ai-chat/conversations/:id/messages
{
  "content": "What’s wrong with my form?",
  "context": "Coach"
}
```

**Goal:** Allow the client to attach one or more images (or other media) that Gemini can interpret.  

**Two common patterns**  

| Pattern | Pros | Cons |
|---------|------|------|
| **Upload‑then‑reference** (separate attachment endpoint) | - Re‑uses existing attachment flow.<br>- Allows virus scanning, size limits, reuse.<br>- Keeps message payload small. | - Requires two round‑trips (upload → send message). |
| **Inline base64 / multipart message** | - Single request.<br>- Simpler for very small files. | - Bloated request size (base64 ≈ 33% overhead).<br>- Harder to enforce limits, scan, cache. |

**Recommendation** – **Adopt the upload‑then‑reference flow** (consistent with the attachment endpoint).  

1. **Client flow**  
   1. User picks image(s) → client calls `POST /api/ai-chat/conversations/:id/attachments` for each file.  
   2. Server returns attachment metadata (`id`, `url`).  
   3. Client sends the message:  
      ```http
      POST /api/ai-chat/conversations/:id/messages
      {
        "content": "Check my squat depth",
        "context": "Coach",
        "attachments": [   // array of attachment IDs
          "a1b2c3d4-...",
          "e5f6g7h8-..."
        ]
      }
      ```
2. **Backend changes**  
   - Extend `Message` model: add a JSONB column `attachmentIds` (or a join table `MessageAttachments`).  
   - In the message handler, fetch attachment URLs, prepend them to the prompt for Gemini (e.g., `![image](<url>)`), and forward to the Gemini multimodal endpoint.  
   - Ensure the attachment belongs to the same conversation and that the user has permission.  
3. **Rate limiting** – treat each attachment upload as a separate operation (see §5).  

---

## 5. Rate Limiting for New Operations  

| Operation | Frequency (typical) | Suggested Limit | Rationale |
|-----------|--------------------|----------------|-----------|
| **Sidebar conversation list** (GET `/api/ai-chat/conversations`) | Every page load / route change (≈ 1‑2 req/s per user) | **100 req/min** per IP / user | Allows generous refresh while preventing abusive polling. |
| **Conversation rename** (PATCH `/api/ai-chat/conversations/:id`) | Infrequent (user‑initiated) | **10 req/min** per user | Rename is cheap; limit to stop spam. |
| **File upload** (POST `/api/ai-chat/conversations/:id/attachments`) | Bursty (user may drag‑drop several files) | **20 req/min** per user, **max 5 files per request** | Prevents DoS via large file uploads; still permits reasonable batch uploads. |
| **Message send** (POST `/api/ai-chat/conversations/:id/messages`) | High (chat flow) | **30 req/min** per user | Matches typical chat latency; protects Gemini API usage. |
| **AI‑driven client creation** (POST `/api/admin/clients` or AI action) | Rare (admin/trainer) | **5 req/min** per role | Guard against automated account creation. |

**Implementation**  
- Use a middleware like `express-rate-limit` with a **Redis store** (shared across instances).  
- Key format: `:route/:userId` (or `:ip` for unauthenticated routes).  
- Return `429 Too Many Requests` with `Retry-After` header.  

---

## 6. WebSocket Integration – Push vs Poll  

**Current state** – Socket.io is already initialized but the plan mentions only polling for the sidebar list.  

**Advantages of pushing conversation updates via WS**  
- Instant reflection of: new message, rename, attachment upload, unread count change.  
- Reduces unnecessary GET `/api/ai-chat/conversations` polling → lower server load & bandwidth.  
- Enables real‑time UI cues (e.g., “typing…”, “AI is thinking…”) without extra endpoints.  

**Recommendation**  
1. **Maintain a lightweight presence channel** per user:  
   - Event: `conversation:updated` payload = `{ conversationId, lastMessageAt, messageCount, unreadCount }`.  
   - On receipt, the client updates the corresponding row in its local conversation cache (or refetches only that conversation if needed).  
2. **Keep the REST list endpoint** as a fallback for:  
   - Initial load (populate the cache).  
   - Recovery after a WS disconnect.  
   - Non‑WS environments (e.g., SSR, crawlers).  
3. **Implementation steps**  
   - After persisting a new message, attachment, or rename, emit to the room `user:<userId>`:  
     ```js
     io.to(`user:${userId}`).emit('conversation:updated', {
       conversationId,
       lastMessageAt: new Date(),
       messageCount: ++count,
       unreadCount: /* calc */ 
     });
     ```
   - Client side: debounce UI updates (e.g., 100 ms) to avoid thrashing if many events fire rapidly.  
4. **Security** – verify the socket handshake JWT matches the user making the change; only emit to rooms the user belongs to.  

> **Result:** Near‑real‑time sidebar with minimal polling; retains REST for robustness.

---

## 7. Response Contract – Sidebar ConversationSummary  

**Existing response (hypothetical)**  
```json
[
  { "id": "uuid", "title": "Chat about squats", "updatedAt": "2025-09-16T12:00:00Z" }
]
```

**Missing fields for ConversationSummary** (see §1)  
- `context`  
- `messageCount`  
- `lastMessageAt` (or `updatedAt` if it truly reflects the latest message)  
- `unreadCount` (optional but valuable)  
- `preview` (optional)  

**Recommendation**  
- **Upgrade the DTO** returned by `GET /api/ai-chat/conversations` to the full `ConversationSummary` shape.  
- If adding columns to the DB is not immediate, compute them in the query (as shown in §1) or via a lightweight SQL view.  
- Keep the endpoint **backward compatible** by not removing existing fields; simply add the new ones.  
- Update the TypeScript interface in the frontend:  
  ```ts
  export interface ConversationSummary {
    id: string;
    title: string;
    context: ChatContext; // enum: 'Coach' | 'Workouts' | …
    messageCount: number;
    lastMessageAt: string; // ISO
    unreadCount?: number;
    preview?: string;
  }
  ```

---

## 8. Caching Strategy – Conversation List  

**Current plan** – 5‑minute cache on the conversation list (likely implemented with `apollo-client` or a custom in‑memory cache).  

**Evaluation**  
- **Pros:** Reduces load on the DB for static lists.  
- **Cons:**  
  - A new message arriving within the 5‑minute window will **not** appear until the cache expires → stale UI (especially problematic for the sidebar where users expect to see the latest chat).  
  - Renames, attachment uploads, or context changes suffer the same latency.  

**Recommendation**  
1. **Adopt a short‑lived, stale‑while‑revalidate cache**:  
   - Cache duration: **30 seconds** (or even **15 seconds**) for the list request.  
   - On each request, if the cache is fresh (< 30 s) return it immediately; simultaneously issue a background request to update the cache.  
   - This gives near‑instant UI updates while still protecting against thundering herd.  
2. **Cache invalidation events** (via WebSocket or optimistic UI):  
   - When a WS `conversation:updated` event arrives, **update the specific entry** in the client cache (no need to refetch the whole list).  
   - For operations that affect the *entire* list (e.g., marking all conversations as read), issue a targeted refetch or broadcast a `conversationList:invalidated` event.  
3. **Server‑side caching (optional)** – If using a CDN or API gateway, set `Cache-Control: public, max-age=30, stale-while-revalidate=60`. Ensure the Vary header includes `Authorization` so cached responses are user‑specific.  

**Result:** Users see new messages/renames within a few seconds, while the backend still benefits from reduced request volume for idle users.

---

# Summary of API Design Recommendations  

| # | Area | Action |
|---|------|--------|
| 1 | Sidebar data | Enrich `GET /api/ai-chat/conversations` to return `context`, `messageCount`, `lastMessageAt`, `unreadCount`, `preview`. |
| 2 | Search | Keep client‑side filter for MVP; add `GET /api/ai-chat/conversations/search` with ILIKE/

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
