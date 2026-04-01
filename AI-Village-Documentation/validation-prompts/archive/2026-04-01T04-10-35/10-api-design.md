# API Design & Backend Contracts — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 227.0s
> **Files:** docs/ai-workflow/blueprints/SOCIAL-RPG-COMMUNITY-UPGRADE-PLAN.md
> **Generated:** 3/31/2026, 9:10:35 PM

---

# API Design Review: AI Chat Features (SOCIAL-RPG-COMMUNITY-UPGRADE-PLAN)

## Executive Summary
After reviewing the plan against the existing AI chat backend (inferred from typical Sequelize/Express patterns), **Phase 1 does *not* require zero backend changes**. The current `GET /api/ai-chat/conversations` endpoint likely lacks critical sidebar fields, and several new endpoints (attachments, multimodal messages) need design adjustments. Below are specific, actionable recommendations.

---

## 1. Existing API Sufficiency: Sidebar Data Requirements
**Finding:** The plan claims Phase 1 needs zero backend changes, but the sidebar requires `title`, `context`, `messageCount`, and `lastMessageAt` per conversation.  
**Risk:** If the current `GET /api/ai-chat/conversations` returns only `{ id, userId, createdAt, updatedAt }` (common baseline), the UI will break or require wasteful client-side enrichment.

**Recommendation:**  
Modify the conversation list endpoint to return a **`ConversationSummary`** shape directly:

```typescript
// GET /api/ai-chat/conversations
Response: ConversationSummary[]
interface ConversationSummary {
  id: string;
  title: string; // Auto-generated or user-set (e.g., first 50 chars of first message)
  context: string | null; // Optional AI context (e.g., workout focus, user goals)
  messageCount: number; // Total messages in conversation
  lastMessageAt: string; // ISO timestamp of most recent message
  // Optional but useful for UI:
  unreadCount?: number; // For badge indicators
  lastMessagePreview?: string; // First 100 chars of last message (client can trim)
}
```

**Implementation:**  
- Use Sequelize `scope` or `attributes` with `include` to compute `messageCount` via `COUNT(messages)` and `lastMessageAt` via `MAX(messages.createdAt)`.  
- Derive `title` dynamically if not stored (e.g., `LEFT(messages.content, 50)`), but consider persisting it on rename to avoid repeated computation.  
- **Do not** rely on client-side enrichment for core sidebar data—this defeats the purpose of a summary endpoint.

---

## 2. Search Endpoint: Client-Side vs. Server-Side
**Finding:** Client-side filtering of 20 conversations is adequate *only* if the total conversation count per user remains low (<100). For power users (trainers, long-term clients), this will degrade UX.

**Recommendation:**  
Implement server-side search **immediately** (not as a future phase) because:  
- The AI chat feature is core to the $9.99/mo tier—users will accumulate conversations rapidly.  
- Client-side filtering wastes bandwidth (fetching all conversations) and delays UI updates.

**Endpoint Design:**  
```http
GET /api/ai-chat/conversations?search=<term>&limit=20&offset=0
```
- **Search scope:** `ILIKE` on `title` + `JSONB` containment on `messages` (if using PostgreSQL JSONB for message history) OR full-text search on a `tsvector` column.  
- **Response shape:** Same `ConversationSummary[]` as the list endpoint (consistent contract).  
- **Pagination:** Keyset pagination (`lastMessageAt` cursor) preferred over `offset` for scalability.  
- **Fallback:** If search term is empty, return the standard sorted list (by `lastMessageAt DESC`).

**When to add:** **Now**—before Phase 1 launch. Delaying this will force a breaking change later when client-side filtering fails at scale.

---

## 3. File Attachment Endpoint: REST Design
**Finding:** `POST /api/ai-chat/conversations/:id/attachments` is **mostly correct** but ambiguous about multipart handling and attachment lifecycle.

**Recommendation:**  
Adopt a **two-step upload flow** for reliability and security (standard for user-generated content):

1. **Pre-signed URL (Preferred)**  
   - `POST /api/ai-chat/conversations/:id/attachments/sign`  
     Body: `{ filename: string, mimeType: string, maxSize?: number }`  
     Response: `{ url: string, fields: { key, policy, signature, ... }, expiresIn: number }`  
   - Client uploads directly to S3/GCS using the pre-signed URL.  
   - On success, client calls:  
     `POST /api/ai-chat/conversations/:id/attachments`  
     Body: `{ fileKey: string, originalName: string, mimeType: string, size: number }`  
     Response: `{ attachmentId: string, url: string, thumbnailUrl?: string }`

2. **Direct Multipart (If pre-signed URLs are infeasible)**  
   - Keep `POST /api/ai-chat/conversations/:id/attachments` with `multipart/form-data`.  
   - **Critical:** Enforce strict limits:  
     - Max 5 files per request  
     - Max 10MB per file (images/video)  
     - Allowed types: `image/*`, `video/mp4`, `application/pdf`  
   - Store files in a dedicated bucket (e.g., `swanstudios-ai-attachments/{userId}/{conversationId}/`) with virus scanning.

**Why not single-step multipart?**  
- Prevents tying up API workers during slow client uploads.  
- Enables better error handling (client can retry upload without hitting API rate limits).  
- Aligns with existing Socket.IO chat infrastructure (decouples media transfer from signaling).

---

## 4. Multimodal Message API: Sending Images to Gemini
**Finding:** The plan does not specify how image data flows to the Gemini model via the chat API.

**Recommendation:**  
Extend the existing message creation endpoint (`POST /api/ai-chat/conversations/:id/messages`) with an optional `media` array. **Do not** use a separate "upload-then-reference" flow for inline images—it adds latency and complexity for the common case.

**Request Body:**  
```typescript
interface SendMessageRequest {
  content: string; // User's text prompt (can be empty if only sending media)
  media?: Array<{
    type: 'image' | 'document'; // Future-proof for PDFs, etc.
    url: string; // Publicly accessible URL from attachment upload
    thumbnailUrl?: string; // For image previews in chat UI
    // Optional Gemini-specific hints:
    mimeType?: string; // e.g., 'image/jpeg'
    size?: number; // In bytes
  }>;
  // Existing fields (e.g., temperature, maxTokens) can remain
}
```

**Response:**  
Return the created message object (including AI response once generated) or a temporary ID for optimistic UI updates.

**Why this works:**  
- Attachments are uploaded first (via Section 3), yielding a `url`.  
- The client includes that `url` in the `media` array when sending the message.  
- Backend fetches the file from storage (or uses a signed URL) to pass to Gemini.  
- Avoids double handling (no need to re-upload via multipart in the message request).  
- Supports future media types (e.g., voice notes) with minimal changes.

**Alternative (if security prohibits public URLs):**  
Use signed, short-lived URLs (e.g., 5-minute expiry) from the attachment upload step. Backend validates signature before fetching.

---

## 5. Rate Limiting for New Operations
**Finding:** The plan does not specify rate limits for new AI chat operations, risking abuse or accidental DoS.

**Recommendation:**  
Apply tiered limits based on user authentication and operation cost:

| Operation                | Authenticated User (Free) | Authenticated User (Paid) | Anonymous (if allowed) | Notes |
|--------------------------|---------------------------|---------------------------|------------------------|-------|
| `GET /api/ai-chat/conversations` (sidebar) | 30 req/min | 60 req/min | Not allowed | Critical for UI—higher limit for paid tiers |
| Conversation rename      | 5 req/min | 10 req/min | Not allowed | Low-frequency action |
| File attachment upload   | 10 req/min | 20 req/min | Not allowed | Based on storage/CDN costs |
| Message send (text)      | 20 req/min | 40 req/min | Not allowed | Matches typical chat UX |
| Message send (with media)| 5 req/min | 10 req/min | Not allowed | Higher cost due to AI processing |
| Search conversations     | 15 req/min | 30 req/min | Not allowed | Can be expensive with ILIKE/JSONB |

**Implementation:**  
- Use a middleware like `express-rate-limit` with Redis store (shared across instances).  
- Key by `userId` + `route` (or `userId:ip` for anonymous fallback).  
- Return `429 Too Many Requests` with `Retry-After` header.  
- **Exclude** WebSocket heartbeat/ping from rate limits (handled separately).

---

## 6. WebSocket Integration: Real-Time Updates
**Finding:** The plan mentions Socket.io exists but relies on polling for conversation list updates (implied by 5-minute cache).

**Recommendation:**  
**Push conversation list updates via WebSocket**—polling is inefficient and degrades UX for a core feature.

**Events to Broadcast:**  
- `conversation:created` (new chat started)  
- `conversation:updated` (title changed, last message received, message count incremented)  
- `conversation:deleted` (if supported)  

**Payload Example:**  
```json
{
  "event": "conversation:updated",
  "data": {
    "conversationId": "abc123",
    "patch": {
      "messageCount": 5,
      "lastMessageAt": "2026-03-31T10:30:00Z",
      "lastMessagePreview": "Completed 3 sets of squats..."
    }
  }
}
```

**Client Handling:**  
- Maintain a local cache of `ConversationSummary` objects.  
- Apply patches optimistically (with fallback to refetch on error).  
- **Do not** replace the entire list on every update—this causes UI flicker.

**When to Keep Polling:**  
Only as a fallback for clients that lose WebSocket connection (reconcile on reconnect).  
**Eliminate** the 5-minute cache—real-time updates make it obsolete and reduce staleness.

---

## 7. Response Contract: Sidebar Adequacy
**Finding:** The existing response shape for `GET /api/ai-chat/conversations` is **likely insufficient** (see Section 1).

**Recommendation:**  
Adopt the `ConversationSummary` interface defined in Section 1 as the **canonical shape** for:  
- Sidebar list  
- Search results  
- Any UI component showing a conversation preview  

**Ensure consistency:**  
- If other endpoints return conversations (e.g., `GET /api/ai-chat/conversations/:id`), they should include at least the `id`, `title`, and `lastMessageAt` fields to avoid over-fetching.  
- Use a serializer/transformer layer (e.g., Sequelize `get()` virtuals or a DTO) to guarantee shape regardless of DB changes.

---

## 8. Caching Strategy: Conversation List
**Finding:** A 5-minute cache on the conversation list is **inappropriate** for a real-time chat feature.

**Recommendation:**  
**Remove server-side caching** for the conversation list endpoint. Instead:  

1. **Leverage WebSocket updates** (Section 6) to keep the client cache fresh.  
2. **Use client-side caching** with short TTL (e.g., 30 seconds) for fallback during WS reconnects.  
3. **Cache only expensive operations** (e.g., search results with complex ILIKE/JSONB queries) for 1-2 minutes, keyed by `userId:searchTerm:limit:offset`.  

**Why this works:**  
- Conversation lists change frequently (new messages, renames)—server-side caching serves stale data.  
- WebSocket push delivers updates with <1s latency, eliminating the need for periodic polling.  
- Reduces backend load (no cache invalidation logic) while improving UX.  

**Exception:** Cache the *user's settings* (e.g., preferred AI model, theme) if expensive to compute, but not the conversation list.

---

## Summary of Required Backend Changes
| Area                     | Change                                                                 | Priority |
|--------------------------|------------------------------------------------------------------------|----------|
| Conversation List Endpoint | Add `title`, `context`, `messageCount`, `lastMessageAt` to response    | ⚠️ High  |
| Search Endpoint          | Implement `GET /api/ai-chat/conversations?search=` with ILIKE/JSONB    | ⚠️ High  |
| Attachments Endpoint     | Switch to pre-signed URL flow or enforce strict multipart limits       | ⚠️ High  |
| Message Endpoint         | Add optional `media` array for multimodal input                        | ⚠️ High  |
| Rate Limiting            | Add per-user, per-route limits with Redis backend                      | ⚠️ Medium|
| WebSocket                | Broadcast `conversation:updated` events for real-time sidebar sync     | ⚠️ Medium|
| Caching                  | Remove 5-min cache on conversation list; rely on WS + client cache     | ⚠️ Medium|

**Bottom Line:** Phase 1 requires **targeted backend updates** to support the sidebar, search, attachments, and multimodal messages. Addressing these now will prevent rework and ensure a smooth launch of the AI chat enhancements. Implement WebSocket push and proper rate limiting concurrently to lay the foundation for scalable real-time features.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
