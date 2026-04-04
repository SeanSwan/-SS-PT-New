# API Design & Backend Contracts — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 109.7s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-FORMAT-COMPREHENSIVE-UPGRADE-PLAN.md
> **Generated:** 4/4/2026, 12:37:07 PM

---

# API Surface Review – Bootcamp Format Upgrade Plan  
*(Focus: AI‑Chat endpoints referenced in the plan’s “Phase 1 needs zero backend changes” claim)*  

---  

## 1. Existing API Sufficiency – `GET /api/ai-chat/conversations`  
**Finding:** The plan does **not** modify this endpoint, so we must verify whether the current shape satisfies the sidebar’s `ConversationSummary` needs (`title`, `context`, `messageCount`, `lastMessageAt`).  

**Typical current shape (inferred from existing codebase):**  
```json
[
  {
    "id": "c_123",
    "title": "Morning workout plan",
    "createdAt": "2025-08-20T14:02:00Z",
    "updatedAt": "2025-08-20T14:05:00Z",
    "lastMessage": { "content": "...", "createdAt": "2025-08-20T14:05:00Z" }
  }
]
```  
*Missing:* explicit `messageCount` and a standalone `lastMessageAt` (the nested `lastMessage.createdAt` can be used but adds client‑side complexity).  

**Verdict:** **Insufficient** for a clean sidebar implementation without extra client logic.  

**Recommendation:**  
- Add two fields to the conversation object:  
  ```ts
  messageCount: number;   // total messages in the conversation
  lastMessageAt: string;  // ISO timestamp of the most recent message
  ```  
- Keep `lastMessage` for backward compatibility (optional).  
- Update the Sequelize query to include `COUNT(messages) AS messageCount` and `MAX(messages.createdAt) AS lastMessageAt`.  

---  

## 2. Search Endpoint – Client‑Side Filtering of 20 Conversations  
**Finding:** The plan proposes filtering the already‑fetched list (≤20 items) in the browser.  

**Adequacy:**  
- ✅ **Acceptable for MVP** when the user’s conversation list is bounded (e.g., pagination or a hard limit of 20).  
- ❌ **Will degrade** as users accumulate hundreds of conversations; client‑side filtering forces full list transfer and blocks UI thread.  

**When to add server‑side search:**  
- Expected conversation count > 100 per user **or** latency > 100 ms on list fetch.  
- Anticipated growth from the “voice‑first AI coach” feature (users may create many short‑lived chats).  

**Recommendation:**  
Add a lightweight search endpoint now to avoid a later breaking change:  

```http
GET /api/ai-chat/conversations?search=<term>&limit=20&offset=0
```  

- **SQL:** `WHERE title ILIKE '%$1%' OR (content::text) ILIKE '%$1%'` (Sequelize `ILIKE` on a JSONB `content` column if messages are stored there).  
- Return the same `ConversationSummary` shape (including the new `messageCount`/`lastMessageAt`).  
- Keep the existing endpoint for “get all” (or paginated) list; deprecate client‑only filter once server‑side search is in place.  

---  

## 3. File Attachment Endpoint – `POST /api/ai-chat/conversations/:id/attachments`  
**Finding:** The plan proposes this REST‑style sub‑resource for uploading files (images, PDFs, etc.) to a conversation.  

**REST Design:**  
- ✅ **Correct** – treats attachments as a child collection of a conversation.  
- ✅ **Idempotent‑safe** – each POST creates a new attachment resource.  

**Multipart/Form‑Data Handling:**  
- Expect `Content-Type: multipart/form-data` with at least:  
  - `file`: the binary file (required).  
  - Optional `description`: string (for accessibility notes).  
- Backend must:  
  1. Validate file type/size (e.g., max 10 MB, allowed MIME types: image/*, application/pdf).  
  2. Store file in object storage (S3‑compatible) or local `uploads/` with a secure, random filename.  
  3. Persist a record: `{ id, conversationId, url, mimeType, size, uploadedAt, uploadedBy }`.  
  4. Return the created attachment object (201 Created).  

**Recommendation:**  
- Adopt the above contract.  
- Add a companion `DELETE /api/ai-chat/conversations/:id/attachments/:attachmentId` for cleanup.  
- Ensure the attachment URL is served via a CDN or signed URL (expires in 1 h) to avoid exposing raw storage.  

---  

## 4. Multimodal Message API – Sending Images to Gemini  
**Finding:** The plan mentions sending images with messages to Gemini but does not specify the API change.  

**Two common patterns:**  

| Pattern | Pros | Cons |
|---------|------|------|
| **Inline `attachments` array in message create request** (`POST /api/ai-chat/conversations/:id/messages`) | Single round‑trip; easy to reason about. | Requires the client to hold file binary until message send; retry logic more complex. |
| **Separate upload‑then‑reference** (upload file → get `attachmentId` → include IDs in message payload) | Decouples upload from message; enables reuse, progress UI, and resumable uploads. | Slightly more round‑trips (2 → 3). |

**Recommendation:** Use the **separate upload‑then‑reference** flow because:  

1. It aligns with the attachment endpoint already proposed.  
2. It supports optimistic UI (show attachment preview immediately).  
3. It simplifies rate‑limiting and retry handling for large files.  

**Message create request shape:**  
```json
{
  "content": "Describe this exercise form",
  "attachmentIds": ["att_abc", "att_def"], // array of previously uploaded attachment IDs
  "metadata": { /* optional: e.g., { source: "voice" } */ }
}
```  
The backend will fetch the attachment URLs/mimeTypes and forward them to Gemini’s multimodal endpoint.  

---  

## 5. Rate Limiting for New Operations  
| Operation | Frequency (per user) | Suggested Limit | Rationale |
|-----------|----------------------|-----------------|-----------|
| **Sidebar list** (`GET /api/ai-chat/conversations`) | Every page load / route change | **60 req/min** (burst + refill) | Allows frequent navigation while preventing abusive polling. |
| **Conversation rename** (`PATCH /api/ai-chat/conversations/:id`) | Infrequent (user‑initiated) | **10 req/min** | Rename is a low‑volume action; a tighter limit guards against spam. |
| **File upload** (`POST /api/ai-chat/conversations/:id/attachments`) | User‑driven, possibly multiple per chat | **5 req/min** **or** **50 MB/min** bandwidth cap | Protects storage and upstream Gemini costs; can be adjusted per‑tier (free vs. paid). |
| **Message send** (existing) | High (chat flow) | **120 req/min** | Keep existing limit; ensure attachment uploads don’t bypass it. |

*Implementation:* Use a Redis‑based token bucket (e.g., `express-rate-limit` with Redis store) keyed by `userId:action`.  

---  

## 6. WebSocket Integration – Push vs. Polling  
**Finding:** The plan notes that Socket.io already exists but does not specify whether conversation updates will use it.  

**Current state (assumed):** Sidebar data is fetched via polling or on‑demand REST calls.  

**Recommendation:**  
- **Leverage Socket.io for real‑time conversation updates**:  
  - **Events to emit:**  
    - `conversation:updated` (payload: `ConversationSummary`) – triggered on rename, new message, attachment add/delete.  
    - `conversation:created` (for new chats initiated elsewhere).  
    - `conversation:deleted` (rare, but useful for account‑wide cleanup).  
  - **Client side:** Maintain a local cache of the conversation list; apply incoming events optimistically, fall back to REST refetch on disconnect.  
- **Keep REST for CRUD operations** (create, rename, upload, delete) – the WS layer only pushes the *result* after the REST call succeeds.  
- **Benefits:** Eliminates unnecessary polling, reduces server load, provides instant UI feedback (e.g., new message badge appears without a delay).  

---  

## 7. Response Contract – Are Existing Shapes Adequate?  
**Finding:** The plan does not modify the response shape, so we must evaluate the current `ConversationSummary` contract.  

**Missing fields (see §1):** `messageCount`, `lastMessageAt`.  
**Potential extra useful fields:**  
- `unreadCount`: number of messages after the user’s last read timestamp (if read‑receipts are implemented).  
- `preview`: first 100 chars of the latest message (optional, for UI).  

**Recommendation:**  
Update the OpenAPI / TypeScript definition:  

```ts
export interface ConversationSummary {
  id: string;
  title: string;
  context?: string; // if you store a summary/system prompt
  messageCount: number;
  lastMessageAt: string; // ISO 8601
  // optional but helpful:
  unreadCount?: number;
  preview?: string;
  // keep existing for backward compatibility:
  createdAt: string;
  updatedAt: string;
  lastMessage?: Message; // optional
}
```  

Ensure all backend routes that return a conversation array or single object conform to this shape.  

---  

## 8. Caching Strategy – 5‑Minute Cache on Conversation List  
**Finding:** The plan mentions a 5‑minute cache but does not detail invalidation.  

**Assessment:**  
- A static 5‑minute TTL is **simple** but can serve stale data (e.g., a new message sent just after cache fill won’t appear until the next refresh).  
- For a chat sidebar, staleness > 30 s is noticeable and harms UX.  

**Recommendation:**  
Adopt a **hybrid approach**:  

1. **Short‑lived cache (30 s)** for the conversation list to absorb rapid UI re‑renders (e.g., switching tabs).  
2. **Event‑driven invalidation** via Redis pub/sub or Socket.io:  
   - After any mutation that affects the list (new conversation, rename, new message, attachment add/delete, delete conversation), publish a `conversation-list:invalidated` event.  
   - Subscribers (API instances) immediately purge the relevant user’s list cache.  
3. **Cache key:** `conversation-list:{userId}:{page}:{limit}` (if paginated) or simply `conversation-list:{userId}` for the “recent 20” view.  
4. **Fallback:** If the pub/sub mechanism fails, the 30‑second TTL guarantees eventual consistency.  

This yields near‑real‑time updates without the overhead of polling every few seconds.  

---  

### Summary of Action Items  

| # | Area | Change |
|---|------|--------|
| 1 | `GET /api/ai-chat/conversations` | Add `messageCount` & `lastMessageAt` fields. |
| 2 | Search | Add server‑side `GET /api/ai-chat/conversations?search=` endpoint (ILIKE on title + JSONB content). |
| 3 | Attachments | Implement `POST /api/ai-chat/conversations/:id/attachments` (multipart/form‑data) + `DELETE` counterpart. |
| 4 | Multimodal messages | Use separate upload‑then‑reference flow; add `attachmentIds` array to message create payload. |
| 5 | Rate limits | Sidebar list 60/min, rename 10/min, upload 5/min (or bandwidth cap). |
| 6 | WebSocket | Push `conversation:updated` events via Socket.io for real‑time sidebar sync. |
| 7 | Response contract | Update `ConversationSummary` TS interface & OpenAPI spec. |
| 8 | Caching | 30‑second TTL + Redis pub/sub invalidation on list‑affecting mutations. |

Implementing the above will make the AI‑chat backend robust enough to support the planned voice‑first AI coach, file‑sharing, and multimodal interactions while keeping the Bootcamp format upgrade truly **zero‑impact** on the existing API surface.  

---  

*Prepared for: SwanStudios API Architecture Review*  
*Date: 2025‑08‑27*  
*Reviewer: Backend API Architect*

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
