# API Design & Backend Contracts — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 103.6s
> **Files:** docs/ai-workflow/blueprints/MULTI-WORKSTREAM-QA-ENHANCEMENT-PLAN.md
> **Generated:** 3/31/2026, 4:40:03 PM

---

# API Surface Review: Multi-Workstream QA & Enhancement Plan

## 1. Existing API Sufficiency for Sidebar Data
**Verification:**  
The `GET /api/ai-chat/conversations` endpoint **does not currently return sufficient data** for the sidebar `ConversationSummary` type based on standard implementation patterns in the codebase (`useAIChat.ts` hooks).  

**Missing Fields:**  
- `messageCount`: Not denormalized; would require loading all messages per conversation (inefficient for sidebar).  
- `lastMessageAt`: Typically derivable from messages but not exposed in list endpoint.  
- `context`: Stored per conversation but may not be included in list payload (only in `loadConversation`).  

**Recommendation:**  
Modify the list endpoint to return a lightweight summary with:  
```json
{
  "id": "uuid",
  "title": "string",
  "context": "string | null", // e.g., "workout_generation"
  "messageCount": "number",
  "lastMessageAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp" // for rename/archive detection
}
```
**Implementation:**  
- Add `message_count` and `last_message_at` as computed columns in Sequelize (using subqueries on `messages` table).  
- Include `context` from `conversations` table (already present per `useAIChat.ts` context handling).  
- **Phase 1 Impact:** Requires backend change (contradicts plan's "zero backend changes" claim for Phase 1). If Phase 1 is strictly UI-only, defer this to Phase 2 and use client-side enrichment (with performance caveats).

---

## 2. Search Endpoint Adequacy
**Current Approach:**  
Client-side filtering of ~20 conversations is **adequate for MVP** given:  
- Low conversation volume per user (<50 active chats).  
- Minimal payload size (summary objects only).  
- Avoids premature optimization.  

**When to Add Server-Side Search:**  
Trigger server-side search when:  
- Average conversations/user > 100 (based on golf/professional user behavior).  
- 95th percentile sidebar load time > 300ms (measure via RUM).  
- Search latency becomes noticeable on mid-tier devices (e.g., iPhone SE).  

**Recommended Server-Side Endpoint:**  
```http
GET /api/ai-chat/conversations?search=<term>&limit=20&offset=0
```
- Search `title` (ILIKE) and `JSONB` message content (if messages stored as JSONB array).  
- Use PostgreSQL GIN index on `(title)` and `(messages)` for ILIKE performance.  
- Return same summary shape as list endpoint for UI consistency.  
- **Do not** implement full-text search initially; ILIKE suffices for short titles/content snippets.

---

## 3. File Attachment Endpoint Design
**Proposed Endpoint:**  
`POST /api/ai-chat/conversations/:id/attachments`  

**REST Compliance:**  
✅ **Correct** – Follows sub-resource pattern for conversation-scoped attachments.  

**Multipart/Form-Data Handling:**  
- **Required Fields:** `file` (binary), optional `description` (string).  
- **Response:**  
  ```json
  {
    "id": "attachment_uuid",
    "conversationId": "conversation_uuid",
    "url": "https://cdn.sswanstudios.com/attachments/...",
    "filename": "original_name.jpg",
    "mimeType": "image/jpeg",
    "size": 124578,
    "uploadedAt": "ISO 8601 timestamp"
  }
  ```
- **Critical Implementation Details:**  
  1. Stream upload directly to S3 (avoid buffering in Node.js).  
  2. Enforce limits: 10MB/file, 5 attachments/conversation, allowed types: `image/*`, `application/pdf`.  
  3. Virus scan via ClamAV stream before S3 upload (non-blocking).  
  4. Return presigned URL for direct client-to-S3 upload (advanced) or handle via backend (simpler).  
  5. **Do not** store file metadata in `messages` table; use join table `conversation_attachments`.

---

## 4. Multimodal Message API Changes
**Current Limitation:**  
`POST /api/ai-chat/conversations/:id/messages` only accepts `{ content: string }`.  

**Recommended Approach:**  
**Upload-then-reference flow** (decouples upload from message send):  
1. Client uploads image(s) via `POST /conversations/:id/attachments` → gets `attachmentId`.  
2. Client sends message with:  
   ```json
   {
     "content": "Describe this exercise form",
     "attachmentIds": ["att_123", "att_456"] // array of UUIDs from upload step
   }
   ```
3. Backend validates attachment ownership/conversation scope before processing with Gemini.  

**Why not inline base64?**  
- Avoids bloated request bodies (base64 adds ~33% overhead).  
- Enables upload progress bars and retry logic.  
- Aligns with existing attachment endpoint (consistency).  
- **Backend Change Required:** Add `attachmentIds` array validation and Gemini multimodal prompt construction.

---

## 5. Rate Limiting Recommendations
| Operation          | Limit (Per User)      | Strategy                          | Rationale                                                                 |
|--------------------|-----------------------|-----------------------------------|---------------------------------------------------------------------------|
| Sidebar List       | 60 req/min            | Fixed window                      | Matches typical page refresh rate; prevents abuse during rapid navigation. |
| Conversation Rename| 10 req/min            | Token bucket (burst=5)            | Prevents spammy renaming; allows quick corrections.                       |
| File Upload        | 5 req/min (max 50MB/min) | Leaky bucket (size-based)       | Thwarts DoS via large files; accommodates legitimate multi-image uploads. |
| Message Send       | 30 req/min            | Fixed window                      | Matches natural chat pacing; leaves headroom for typing indicators.       |

**Implementation:**  
- Use `express-rate-limit` with Redis store for distributed accuracy.  
- Exclude `GET /health` and static assets from limits.  
- Return `429` with `Retry-After` header and standardized error JSON.

---

## 6. WebSocket Integration for Real-Time Updates
**Current State:**  
Socket.io exists but is likely underutilized (plan mentions it exists but doesn't specify usage).  

**Recommendation:**  
**Push conversation updates via WebSocket** instead of polling for:  
- New messages (update `lastMessageAt`, `messageCount` in sidebar).  
- Conversation rename/archive/delete (instant UI reflection).  
- Attachment upload completion (show preview in chat).  

**Event Schema:**  
```javascript
// Server → Client
socket.emit('conversationUpdated', {
  conversationId: 'uuid',
  patch: { lastMessageAt: '...', messageCount: 5 } // Partial update
});

socket.emit('conversationRenamed', {
  conversationId: 'uuid',
  title: 'New Title'
});

socket.emit('conversationRemoved', { conversationId: 'uuid' });
```

**Client Handling:**  
- Use `useConversationSidebar.ts` to maintain optimistic UI state.  
- Apply patches immutably (e.g., Redux Toolkit or Zustand).  
- **Fallback:** Keep polling (every 60s) as backup for disconnected clients.  
- **Phase 1 Impact:** Requires backend WebSocket event emission (minor change) but zero API contract changes.

---

## 7. Response Contract Adequacy
**Current State:**  
`GET /api/ai-chat/conversations` likely returns:  
```json
[
  { "id": "uuid", "title": "string", "createdAt": "...", "updatedAt": "..." }
]
```
**Missing for Sidebar:** `context`, `messageCount`, `lastMessageAt`.  

**Recommendation:**  
Standardize all conversation-related endpoints to return camelCase JSON with:  
- **Required Summary Fields:** `id`, `title`, `context`, `messageCount`, `lastMessageAt`, `updatedAt`.  
- **Optional Detail Fields** (in `loadConversation`): `messages`, `attachmentIds`, `archivedAt`.  

**Example Summary Object:**  
```json
{
  "id": "conv_abc123",
  "title": "Golf swing analysis",
  "context": "workout_generation",
  "messageCount": 12,
  "lastMessageAt": "2024-06-15T14:30:00Z",
  "updatedAt": "2024-06-15T14:30:00Z"
}
```
**Backend Action:**  
- Update Sequelize `scope('summary')` to include computed fields.  
- Ensure `useAIChat.ts` maps response to `ConversationSummary` TypeScript type.

---

## 8. Caching Strategy Evaluation
**Current Plan:** 5-minute cache on conversation list.  

**Assessment:**  
❌ **Inappropriate** for chat application:  
- Users expect new conversations to appear instantly (e.g., after "New Chat" click).  
- 5-minute staleness causes confusion (e.g., renamed conversation shows old title).  
- Wastes backend resources caching data that changes frequently.  

**Recommended Strategy:**  
1. **Eliminate list caching** – Conversation lists are small (<100 rows) and cheap to compute with proper indexing.  
2. **Use WebSocket for invalidation** – Push updates make caching redundant for real-time consistency.  
3. **Cache individual conversations** – Cache `loadConversation(id)` for 5 minutes (immutable after load unless new message arrives).  
4. **Implement stale-while-revalidate** for list endpoint:  
   - Serve stale cache immediately (if <60s old).  
   - Fetch fresh data in background.  
   - Update cache and UI on success.  

**Invalidation Triggers:**  
- New message in conversation → update list item via WebSocket.  
- Conversation rename/archive/delete → WebSocket event.  
- New conversation created → WebSocket `conversationAdded` event.  

**Backend Impact:**  
- Remove any `apicache` or `node-cache` middleware from list endpoint.  
- Add WebSocket emitters in message/session controllers (already implied by existing services).

--- 

## Summary of Required Backend Changes
| Feature                     | Zero Backend Change? | Required Changes                                                                 |
|-----------------------------|----------------------|--------------------------------------------------------------------------------|
| Sidebar Data Sufficiency    | ❌                   | Add `messageCount`, `lastMessageAt`, `context` to list endpoint (Sequelize scopes). |
| Search Endpoint             | ❌ (future)          | Add `GET /conversations?search=` with ILIKE on title/JSONB content.            |
| File Attachments            | ❌                   | New endpoint + S3 integration + validation.                                    |
| Multimodal Messages         | ❌                   | Add `attachmentIds` to message request body + Gemini multimodal handling.       |
| Rate Limiting               | ❌                   | Add middleware for new operations (uploads, renames).                          |
| WebSocket Updates           | ⚠️ (partial)         | Emit conversation events (uses existing Socket.io; minimal backend work).       |
| Response Contract           | ❌                   | Adjust list endpoint shape to include summary fields.                          |
| Caching Strategy            | ❌                   | Remove list cache; rely on WebSocket + individual conversation caching.        |

**Note on Plan's "Zero Backend Changes" Claim:**  
This holds **only for Workstream 1 UI fixes** (Issues 1-5). All proposed enhancements (attachments, multimodal, search) require backend changes and should be scoped to Phase 2+. Prioritize API stability for Phase 1 by focusing on UI/UX fixes that consume existing contracts.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
