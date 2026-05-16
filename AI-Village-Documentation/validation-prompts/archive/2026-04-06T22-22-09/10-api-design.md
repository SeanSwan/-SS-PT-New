# API Design & Backend Contracts — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 102.0s
> **Files:** docs/ai-workflow/AI-HANDOFF/COMPREHENSIVE-SITE-REFRACTOR-BRIEF-2026-04-06.md
> **Generated:** 4/6/2026, 3:22:09 PM

---

# API Surface Review – SwanStudios AI Chat Refactor
*Based on the **Comprehensive Site Refactor Brief** (2026‑04‑06) and the stated goal of “Phase 1 needs zero backend changes.”*

---

## 1. Existing API Sufficiency – `GET /api/ai-chat/conversations`

| Claim in Plan | What the Sidebar Needs | Likely Current Shape* | Verdict |
|---------------|------------------------|-----------------------|---------|
| Phase 1 requires **zero backend changes** for the AI‑chat sidebar. | `title`, `context` (preview/summary), `messageCount`, `lastMessageAt` (timestamp of most recent message). | Typical conversation object in a Sequelize/Postgres setup includes: `id`, `userId`, `title`, `createdAt`, `updatedAt`, `lastMessage` (JSONB or relation), `messageCount` (virtual or column). | **Probably sufficient** **if** the endpoint already returns: <br>• `title` <br>• `lastMessage` (or a `preview` field) → can be used for `context` <br>• `messageCount` (either stored column or computed via association) <br>• `updatedAt` (or `lastMessageAt` derived from `lastMessage.createdAt`). <br>**If any of those fields are missing, a minimal backend tweak is required** (e.g., add a virtual `messageCount` or expose `lastMessage.createdAt` as `lastMessageAt`). |

> **Recommendation** – Verify the current payload. If it lacks any of the four fields, add a **backend‑only** selector/virtual field (no contract change) so the frontend can continue to work without a version bump.

---

## 2. Search Endpoint – Client‑Side Filtering of 20 Conversations

- **Current approach** (per plan): fetch the first 20 conversations (presumably ordered by `updatedAt` desc) and filter locally on the client.
- **Adequacy**: Acceptable **only** while the total conversation count per user stays low (< ~100) and the UI never needs to show more than the first 20 sorted items.
- **When to switch to server‑side search**:
  1. **Growth trigger** – average conversation count > 200 per active user **or** pagination beyond the first page is required.
  2. **UX trigger** – user expects instant results as they type (search‑as‑you‑go) and the client‑side list would cause noticeable lag or stale data.
  3. **Data trigger** – search must look inside message bodies (JSONB content) or across metadata (tags, tags‑like fields).

- **Recommended server‑side endpoint**:

  ```http
  GET /api/ai-chat/conversations?search=<term>&limit=20&offset=0
  ```

  - **SQL/Sequelize**: `WHERE title ILIKE '%${term}%' OR content::text ILIKE '%${term}%'` (if a `content` JSONB column stores concatenated message text).
  - **Index**: GIN index on the JSONB column (`content`) + B‑tree on `title` for ILIKE performance.

> **Recommendation** – Keep client‑side filtering for MVP/Phase 1, but instrument a **feature flag** that flips to server‑side search once any of the triggers above is met.

---

## 3. File Attachment Endpoint – `POST /api/ai-chat/conversations/:id/attachments`

| Aspect | Evaluation |
|--------|------------|
| **REST correctness** | ✅ Correct – attaches a sub‑resource (attachment) to a conversation. |
| **HTTP verb** | ✅ `POST` for creation. |
| **Payload** | Should accept **multipart/form‑data** with at least: <br>• `file` (binary) <br>• optional `description` (string) <br>• optional `metadata` (JSON string) |
| **Response** | Return the created attachment object: `{ id, conversationId, filename, mimeType, size, url, uploadedAt }`. |
| **Storage** | Plan mentions Cloudflare R2 – ensure the handler streams directly to R2 (or via a presigned URL) to avoid loading the file into Node memory. |
| **Validation** | Enforce max size (e.g., 10 MB), allowed MIME types (image/*, video/*, application/pdf), and virus‑scan if needed. |
| **Security** | Verify the authenticated user owns `:id` conversation before allowing upload. |

> **Recommendation** – Keep the endpoint as‑is, but add: <br>1. **Ownership middleware** (check `conversation.userId === req.user.id`). <br>2. **Stream‑to‑R2** using the AWS‑SDK v3 compatible client (no temporary buffer). <br>3. **Response** includes a temporary, signed URL (if R2 requires) or a public CDN URL.

---

## 4. Multimodal Message API – Sending Images with Messages to Gemini

The existing message‑send endpoint is likely:

```http
POST /api/ai-chat/conversations/:id/messages
{ content: string }
```

To support images (and potentially other modalities) we have two clean options:

### Option A – **Extended Request Body** (single‑step)

```json
{
  "content": "Describe this exercise form",
  "attachments": [
    { "id": "<attachmentId>", "type": "image" },   // reference previously uploaded attachment
    { "data": "<base64>", "mimeType": "image/png" } // inline (not recommended for large files)
  ]
}
```

- **Pros**: One round‑trip, easy to reason about.
- **Cons**: Requires the client to know the attachment ID beforehand (forces upload‑then‑reference flow anyway) or to send large base64 payloads (bad for performance).

### Option B – **Upload‑Then‑Reference Flow** (recommended)

1. **Upload file** → `POST /api/ai-chat/conversations/:id/attachments` → returns `{ id, url }`.
2. **Send message** → `POST /api/ai-chat/conversations/:id/messages`

   ```json
   {
     "content": "Describe this exercise form",
     "attachmentIds": ["<attachmentId>"]   // array of IDs from step 1
   }
   ```

- **Pros**: Decouples large binary transfer from message metadata, enables retry, progress UI, and reuse of the same attachment across multiple messages.
- **Cons**: Slightly more complex client orchestration (but trivial with a helper hook).

> **Recommendation** – Adopt **Option B**. Keep the existing `/messages` endpoint unchanged except for adding an optional `attachmentIds: string[]` field. The backend will: <br>• Validate each ID belongs to the conversation and the user. <br>• Fetch the file URLs/metadata and forward them to Gemini (or store them with the message for later retrieval).

---

## 5. Rate Limiting for New Operations

| Operation | Frequency (typical) | Suggested Limit | Rationale |
|-----------|--------------------|----------------|-----------|
| **Sidebar list** (`GET /api/ai-chat/conversations`) | Every page load / route change (≈ 1‑2 req/s per user) | **100 req/min** per IP/user | Allows generous polling while preventing abusive loops. |
| **Conversation rename** (`PATCH /api/ai-chat/conversations/:id`) | Infrequent (≤ 5 /min per power user) | **30 req/min** per user | Protects against accidental rapid renames. |
| **File upload** (`POST /api/ai-chat/conversations/:id/attachments`) | Bursty (user may attach several files in a session) | **10 req/min** per user, **max 5 MB per request** | Prevents DoS via large file spam; still permits a handful of attachments per session. |
| **Message send** (`POST /api/ai-chat/conversations/:id/messages`) | High (chat flow) | **120 req/min** per user | Matches typical typing pace; leaves headroom for bot responses. |
| **Search** (`GET /api/ai-chat/conversations?search=…`) | Typing‑ahead (potentially high) | **60 req/min** per user | Combine with debounce on client (e.g., 300 ms) to stay under limit. |

> **Implementation** – Use a middleware like `express-rate-limit` with a **Redis store** (already likely present for Socket.io) to share limits across instances. Apply different limits per route via route‑specific limiters.

---

## 6. WebSocket Integration – Push vs. Polling

- **Current**: Plan mentions Socket.io exists but the AI‑chat sidebar likely polls `GET /api/ai-chat/conversations` on interval or on mount.
- **Pros of WebSocket push**:
  - Instant update of `messageCount`, `lastMessageAt`, and new conversation titles (rename) without polling overhead.
  - Reduces unnecessary HTTP traffic, especially important for mobile battery life.
  - Enables real‑time indicators (typing, read receipts) for a richer chat feel.
- **Cons / Complexity**:
  - Requires maintaining socket rooms per user/conversation.
  - Must handle reconnection and missed events (e.g., store a “last seen” timestamp and reconcile on reconnect).

> **Recommendation** – **Add a lightweight WebSocket layer** for conversation‑list updates:

1. **Event**: `conversation:updated` payload `{ conversationId, title?, messageCount?, lastMessageAt? }`.
2. **Room**: Each user joins a private room `user:<userId>`; server broadcasts to that room when any of their conversations change.
3. **Fallback**: Keep the existing polling endpoint as a safety net (e.g., refetch on socket reconnect).

This approach yields **near‑real‑time UI** with minimal backend change (just a publish after message creation/rename/upload).

---

## 7. Response Contract – ConversationSummary Shape

The sidebar expects a TypeScript type similar to:

```ts
type ConversationSummary = {
  id: string;
  title: string;
  context?: string;      // preview or first line of last message
  messageCount: number;
  lastMessageAt: string; // ISO timestamp
};
```

**Current GET /api/ai-chat/conversations** (assumed) likely returns:

```json
[
  {
    "id": "c_123",
    "title": "Morning routine",
    "createdAt": "2026-04-01T08:00:00Z",
    "updatedAt": "2026-04-05T14:22:00Z",
    "messageCount": 12,
    "lastMessage": { "id": "m_456", "content": "...", "createdAt": "2026-04-05T14:22:00Z" }
  }
]
```

- **Mapping**:
  - `title` → direct.
  - `context` → derive from `lastMessage?.content` (trim to 100 chars).
  - `messageCount` → direct if stored; otherwise compute via `messages.count`.
  - `lastMessageAt` → `lastMessage?.createdAt` or fall back to `updatedAt`.

If the API **does not** include `messageCount` or `lastMessage`, the frontend would need to make additional requests per conversation – unacceptable for a sidebar.

> **Recommendation** – Ensure the endpoint **always** returns `messageCount` (integer) and either `lastMessage` **or** a dedicated `lastMessageAt` field. If adding a column is undesirable, create a **virtual getter** in the Sequelize model:

```js
Conversation.getOptions = {
  getterMethods: {
    messageCount() { return this.messages?.length ?? 0; },
    lastMessageAt() { return this.messages?.reduce((a,b)=> a.createdAt > b.createdAt ? a : b)?.createdAt ?? this.updatedAt; }
  }
};
```

No contract change for consumers; the shape stays the same.

---

## 8. Caching Strategy – 5‑Minute Cache on Conversation List

| Aspect | Evaluation |
|--------|------------|
| **Current** | 5‑minute (300 s) cache on `GET /api/ai-chat/conversations`. |
| **Pros** | Reduces load on DB for frequently‑accessed sidebar; acceptable if data is relatively static. |
| **Cons** | New messages, renames, or attachment uploads will not be visible until cache expires → stale UI. |
| **Invalidation Needed** | ✅ **On any mutation** that affects the list: <br>• New message in a conversation (changes `messageCount` & `lastMessageAt`). <br>• Conversation rename (`title`). <br>• New conversation creation. <br>• Conversation deletion. |
| **Suggested Approach** | - Use **Redis** with **tags** or **patterns**: cache key `user:<id>:conversations`. <br>- On any mutation (message create, conversation update/delete), **delete** that key (or set a short TTL). <br>- Optionally, implement **write‑through**: after successful mutation, update the cached list incrementally (e.g., push new conversation, bump counters). |
| **Cache Duration** | 5 minutes is fine **if** invalidation is immediate on mutation. Without invalidation, consider lowering to **30‑60 seconds** or adopting a **stale‑while‑revalidate** pattern (serve stale, fetch fresh in background). |

> **Recommendation** – Keep the 5‑minute TTL **but** add **cache‑purge hooks** on the following endpoints: <br>• `POST /api/ai-chat/conversations/:id/messages` (new message) <br>• `PATCH /api/ai-chat/conversations/:id` (rename) <br>• `POST /api/ai-chat/conversations` (create) <br>• `DELETE /api/ai-chat/conversations/:id` (remove) <br>This yields near‑real‑time freshness without sacrificing the DB‑load benefits of caching.

---

## 9. Consolidated API Design Recommendations

| # | Area | Action | Reason |
|---|------|--------|--------|
| 1 | **Conversation List** | Verify `GET /api/ai-chat/conversations` returns `messageCount` and `lastMessageAt` (or `lastMessage`). Add virtual getters if missing. | Guarantees sidebar has all needed data without extra calls. |
| 2 | **Search** | Keep client‑side filtering for Phase 1; add a feature flag to switch to server‑side `GET /api/ai-chat/conversations?search=` with ILIKE on `title` and JSONB `content` when conversation count > 200 or pagination needed. | Scales gracefully; avoids premature optimization. |
| 3 | **Attachments** | Retain `POST /api/ai-chat/conversations/:id/attachments` (multipart/form‑data). Add ownership check, stream‑to‑R2, and return attachment metadata. | REST‑correct, secure, efficient for large files. |
| 4 | **Multimodal Messages** | Extend `POST /api/ai-chat/conversations/:id/messages` with optional `attachmentIds: string[]`. Keep upload‑then‑reference flow. | Decouples binary transfer, enables reuse, aligns with Gemini input format. |
| 5 | **Rate Limits** | Apply per‑route limits: sidebar 100 req/min, rename 30 req/min, upload 10 /min

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
