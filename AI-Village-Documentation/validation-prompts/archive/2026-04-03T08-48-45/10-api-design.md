# API Design & Backend Contracts — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 138.5s
> **Files:** docs/ai-workflow/blueprints/CLIENT-MANAGEMENT-REDESIGN-PLAN.md
> **Generated:** 4/3/2026, 1:48:45 AM

---

# API Surface Review – Client Management Redesign  
*(SwanStudios – React/TS frontend, Node/Express/Sequelize/PostgreSQL backend)*  

---  

## 1. Existing API Sufficiency  
**Claim:** *Phase 1 needs zero backend changes.*  

**Endpoint in question:** `GET /api/ai-chat/conversations`  

| Required sidebar field | Current response shape (as of latest spec) | Verdict |
|------------------------|--------------------------------------------|---------|
| `title`                | `conversations[].title` (string)           | ✅ Present |
| `context`              | `conversations[].context` (string | object) | ✅ Present (stores the initial system prompt or summary) |
| `messageCount`         | `conversations[].messageCount` (number)    | ✅ Present |
| `lastMessageAt`        | `conversations[].lastMessageAt` (ISO‑8601 string) | ✅ Present |

**Conclusion:** The existing payload already supplies all four fields needed for the AI‑chat sidebar (title, context, messageCount, lastMessageAt). **No backend change is required for Phase 1** – the claim holds true, assuming the contract hasn’t drifted.  

*Recommendation:* Add a lightweight integration test that asserts the shape of the conversation list object to guard against future drift.

---  

## 2. Search Endpoint – Client‑Side Filtering vs. Server‑Side Search  

**Current plan:** Fetch the first 20 conversations (presumably via `GET /api/ai-chat/conversations?limit=20&offset=0`) and filter locally in the UI.  

### When client‑side filtering is adequate  
- Conversation list per user is **small and bounded** (e.g., < 200 items).  
- Latency tolerance is high; the UI can afford to load the whole set once per session.  
- No need for fuzzy matching, highlighting, or ranking beyond simple title/substring match.  

### When to promote to server‑side search  
| Trigger | Reason | Suggested implementation |
|---------|--------|--------------------------|
| **> 200 conversations** (or growth trend > 50 %/mo) | Payload size → unnecessary bandwidth & memory on client. | Add `GET /api/ai-chat/conversations?search=<term>&limit=20&offset=0` that performs `ILIKE` on `title` **and** JSONB‑search on `messages` content (e.g., `WHERE title ILIKE $1 OR messages @> '[{"content": {"ilike": $1}}]'`). |
| **Highlighting / ranking** | UX expects matches to be bolded or sorted by relevance. | Return a `score` field (e.g., TS_RANK) and optionally `highlightedTitle`. |
| **Real‑time sync** (new conversations appear while user types) | Client‑side list would become stale. | Keep the endpoint stateless; each keystroke triggers a fresh request (debounced 300 ms). |
| **Facets / filters** (e.g., only show conversations with attachments) | Client would need to fetch all to filter. | Extend query string: `?hasAttachment=true&search=…`. |

**Recommendation:**  
- Keep the current client‑side filter for MVP (Phase 1).  
- Instrument a metric (`conversationCountPerUser`) and add a feature flag (`USE_SERVER_SEARCH`).  
- When the 95th‑percentile count exceeds **150**, flip the flag and deploy the server‑side endpoint described above.  

---  

## 3. File Attachment Endpoint – REST Design  

**Proposed:** `POST /api/ai-chat/conversations/:id/attachments`  

### REST correctness  
- **Resource:** Attachments belong to a conversation → nesting is appropriate.  
- **Verb:** `POST` creates a new attachment sub‑resource. ✅  
- **Idempotency:** Not required; each upload is a distinct file.  

### Multipart/form‑data handling  
| Part | Name | Type | Description |
|------|------|------|-------------|
| `file` | `file` | `binary` (multipart) | The actual file (image, PDF, etc.). |
| `conversationId` | implicit in URL | – | Already supplied via `:id`. |
| `description` (optional) | `description` | `string` | User‑provided caption. |
| `type` (optional) | `type` | `enum['image','document','audio','video']` | Helps UI render preview. |

**Implementation notes:**  
- Use a library like `busboy` or `multer` with limits (e.g., 10 MB per file, 5 files per request).  
- Store the file in an object store (S3‑compatible) and persist a record:  

```sql
CREATE TABLE ai_chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_chat_conversations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,          -- signed or public URL
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

- Return the created attachment object (including a temporary signed URL for immediate preview).  

**Recommendation:** The proposed endpoint is REST‑sound; just ensure multipart parsing, size/virus scanning, and proper error responses (413, 415, 400).  

---  

## 4. Multimodal Message API – Sending Images with Messages to Gemini  

Current message send endpoint (presumed):  

```
POST /api/ai-chat/conversations/:id/messages
{
  content: string,
  metadata?: {...}
}
```

### Options  

| Approach | Request shape | Pros | Cons |
|----------|---------------|------|------|
| **Inline base64** | `{ content, attachments: [{ data: base64, mimeType, filename }] }` | Single request, atomic. | Increases payload size (base64 ≈ 33 % overhead), limits file size, complicates streaming. |
| **Upload‑then‑reference** | 1️⃣ `POST /api/ai-chat/conversations/:id/attachments` → returns `attachmentId`<br>2️⃣ `POST /api/ai-chat/conversations/:id/messages` with `{ content, attachmentIds: [id] }` | Decouples upload, allows retries, re‑use of same file across messages, keeps message payload small. | Requires two round‑trips; need to handle orphaned attachments if message creation fails. |
| **Hybrid (presigned URL)** | Client obtains a presigned PUT URL from `/api/ai-chat/conversations/:id/attachments/upload-url`, uploads directly to storage, then sends message with `{ content, attachmentUrl }`. | Fastest client‑side upload, no server bandwidth for file bytes. | Requires CORS‑configured bucket and short‑lived signed URLs; slightly more complex client logic. |

**Recommendation for SwanStudios:**  
- Adopt the **Upload‑then‑reference** flow because it aligns with the existing attachment endpoint, keeps the message API lightweight, and enables reuse (e.g., sending the same diagram in multiple follow‑up messages).  
- Extend the message request body:  

```json
{
  "content": "Describe this pose",
  "attachmentIds": ["a3f9c2e1-…", "b7d4a1-…"]
}
```

- On the server, validate that each `attachmentId` belongs to the conversation and is of an allowed MIME type (image/* for Gemini vision).  
- If the client prefers a single‑shot flow for tiny images (< 256 KB), allow an optional `inlineAttachments` array with base64 data as a fallback, but document that it is discouraged for production.  

---  

## 5. Rate Limiting for New Operations  

| Operation | Frequency (typical) | Suggested limit | Rationale |
|-----------|---------------------|----------------|-----------|
| **Sidebar list** (`GET /api/ai-chat/conversations`) | Every page load / route change (≈ 1‑2 req/s per user) | **100 req/min** per IP / user | Generous; protects against abusive polling or misbehaving SPA. |
| **Conversation rename** (`PATCH /api/ai-chat/conversations/:id`) | Infrequent (user‑initiated) | **10 req/min** per user | Prevents rapid title‑spamming. |
| **File upload** (`POST /api/ai-chat/conversations/:id/attachments`) | User‑driven; could be bursty (multiple images) | **20 req/min** per user, **max 5 files/request** | Limits bandwidth & storage abuse while allowing a reasonable batch. |
| **Message send** (`POST /api/ai-chat/conversations/:id/messages`) | High (chat flow) | **30 req/min** per user | Matches typical conversational latency; still leaves headroom for bursts. |
| **Attachment URL generation** (if using presigned‑URL flow) | Same as upload | **20 req/min** per user | Mirrors upload limit. |

**Implementation tip:** Use a middleware like `express-rate-limit` with a Redis store to share limits across instances. Differentiate by `userId` (from JWT) where possible, falling back to IP for unauthenticated calls.  

---  

## 6. WebSocket Integration – Push vs. Polling  

The plan mentions an existing Socket.io instance.  

### Why push is beneficial for the AI‑chat sidebar  
- **New conversation creation** (e.g., user starts a fresh chat) should appear instantly without a manual refresh.  
- **Message arrival** (AI response) already likely uses WS for real‑time chat; extending WS to emit `conversation-updated` events (title change, new message, attachment added) keeps the sidebar in sync.  
- Reduces unnecessary polling traffic, especially when the user has many open tabs.  

### When polling may still be acceptable  
- If the conversation list changes **very infrequently** (e.g., < 1 change per hour per user) and the WS infrastructure is not yet hardened for horizontal scaling.  
- For legacy clients that cannot maintain WS connections (rare for a modern SPA).  

**Recommendation:**  
- Leverage the existing Socket.io server to broadcast a **`conversation:updated`** event whenever:  
  1. A new conversation is created.  
  2. A conversation’s title is renamed.  
  3. A message is added (increment `messageCount` and update `lastMessageAt`).  
  4. An attachment is added/removed.  
- The client should **subscribe** to this event on page load and update the sidebar optimistically, falling back to a periodic refetch (e.g., every 5 min) as a safety net.  
- Ensure the WS payload includes the minimal fields needed for the sidebar (`id`, `title`, `messageCount`, `lastMessageAt`, optionally `attachmentCount`).  

---  

## 7. Response Contract – Adequacy for Sidebar (`ConversationSummary`)  

Current `GET /api/ai-chat/conversations` returns an array of objects with at least:  

```ts
interface ConversationSummary {
  id: string;
  title: string;
  context?: string | null;
  messageCount: number;
  lastMessageAt: string; // ISO‑8601
  // optional: attachmentCount?, previewMessage?, etc.
}
```

**Missing for the redesigned sidebar (if any):**  
- **Unread indicator** – not required by the spec but could be derived from `lastMessageAt` vs. user’s last‑read timestamp (store per‑user read pointer).  
- **Attachment preview** – if the UI wants to show a thumbnail, you’d need `attachmentCount` or a `previewAttachmentUrl`.  

**Verdict:** The base contract satisfies the fields explicitly listed in the plan (title, context, messageCount, lastMessageAt).  

**Recommendation:**  
- Add two optional fields to the response to future‑proof the sidebar without breaking existing consumers:  

```ts
interface ConversationSummary {
  id: string;
  title: string;
  context?: string | null;
  messageCount: number;
  lastMessageAt: string;
  attachmentCount?: number;          // default 0
  unread?: boolean;                  // default false (calculated server‑side if read‑tracking exists)
}
```

- Keep them optional; existing clients will ignore them.  
- Document that `attachmentCount` reflects the number of rows in `ai_chat_attachments` for that conversation.  

---  

## 8. Caching Strategy – 5‑Minute Cache on Conversation List  

### Pros of a 5‑minute cache  
- Reduces load on the DB for the frequent sidebar refetch (every route change).  
- Acceptable staleness for a list that changes only when the user initiates a new chat or renames a conversation.  

### Cons / Risks  
- **New message arrival** – the sidebar’s `messageCount` and `lastMessageAt` become stale until the cache expires, causing a mismatch between the badge shown and the actual chat view.  
- **Conversation rename** – stale title shown until TTL expires.  

### Recommended approach  

| Layer | Technique | TTL / Invalidation |
|-------|-----------|--------------------|
| **API response cache** (e.g., `apollo-server-plugin-response-cache` or custom Redis‑based middleware) | Cache keyed by `userId` + optional query params (`limit`, `offset`, `search`). | **TTL = 60 s** (short) + **event‑based invalidation** on: <br>• `conversation:created` <br>• `conversation:updated` (title change) <br>• `message:created` (increment count) <br>• `attachment:created` (if you show attachment count) |
| **Client‑side optimistic update** | When WS pushes an update, mutate the local cache (e.g., Apollo `writeFragment` or Redux) immediately. | No server TTL needed for those fields; the short TTL merely guards against missed WS messages. |
| **Fallback** | If WS connection drops, rely on the short‑TTL cache to eventually refresh. | Guarantees eventual consistency within ≤ 60 s. |

**Why not 5 min?**  
A 5‑minute window would noticeably delay the appearance of a new conversation or updated badge, which feels sluggish for a chat‑centric UI. A **60‑second** cache with WS push gives near‑real‑time feel while still cutting DB load by ~98 % (assuming a user loads the sidebar ~10×/min).  

**Implementation sketch (Express middleware):**

```javascript
const cache = new Redis(); // or ioredis cluster
const CACHE_TTL = 60; // seconds

async function cacheConversationList(req, res, next) {
  const key = `conv-list:${req.user.id}:${req.query.limit || 20}:${req.query.offset || 0}:${req.query.search || ''}`;
  const cached = await cache.get(key);
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  // proceed to handler
  const originalSend = res.send;
  res.send = function (body) {
    cache.setex(key, CACHE_TTL, JSON.stringify(body));
    originalSend.call(this, body);
  };
  next();
}
```

- Invalidate via WS: when a `conversation:created`/`updated`/`message:created` event is processed, `cache.del(keyPattern)` for the affected user (or use a Redis `pubsub` channel to push invalidation).  

---  

## Summary of API Design Recommendations  

| # | Recommendation |
|---|----------------|
| **1** | Current `GET /api/ai-chat/conversations` already satisfies the sidebar fields (`title`, `context`, `messageCount`, `lastMessageAt`). No Phase 1 backend change needed; add contract test to guard against drift. |
| **2** | Keep client‑side filtering for MVP. Add a feature flag and monitor `conversationCountPerUser`. Switch to server‑side `ILIKE` on `title` + JSONB `messages` when the 95th‑percentile exceeds ~150 conversations per user. |
| **3** | `POST /api/ai-chat/conversations/:id/attachments` is REST‑correct. Implement multipart/form‑data with `file`, optional `description`, `type`. Store files in object storage, return attachment metadata (including a preview URL). |
| **4** | Use an **upload‑then‑reference** flow for multimodal messages: first POST attachment, then POST message with `attachmentIds`. Keep the message body lightweight; optionally allow tiny base64 inline attachments as a fallback. |
| **5** | Apply rate limits: <br>• Sidebar list – 100 req/min/user <br>• Rename – 10 req/min/user <br>• File upload – 20 req/min/user (max 5 files/req) <br>• Message send – 30 req/min/user <br>• Attachment URL (if used) – 20 req/min/user. |
| **6** | Push conversation updates via the existing Socket.io server (`conversation:created`, `conversation:updated`, `message:created`, `attachment:created`). Client updates sidebar optimistically and falls back to a short‑poll refetch if WS drops. |
| **7** | Extend the conversation summary response with optional `attachmentCount` and `unread` fields‑

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
