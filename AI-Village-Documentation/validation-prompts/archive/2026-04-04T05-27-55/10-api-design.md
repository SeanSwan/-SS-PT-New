# API Design & Backend Contracts — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 115.4s
> **Files:** docs/ai-workflow/blueprints/CLAUDE-MD-TOKEN-OPTIMIZATION-PLAN.md
> **Generated:** 4/3/2026, 10:27:55 PM

---

# API Surface Review for CLAUDE.md Token Optimization Plan

## 1. Existing API Sufficiency — Sidebar Data Requirements
**Assessment:** The plan claims Phase 1 needs zero backend changes, but the current `GET /api/ai-chat/conversations` endpoint **does not return sufficient data** for the sidebar as described.  
**Issue:** The sidebar requires `title`, `context`, `messageCount`, and `lastMessageAt`. Typical implementations of this endpoint return only `id`, `title`, `createdAt`, and `updatedAt` (where `updatedAt` may serve as `lastMessageAt`), but lack:  
- `messageCount` (would require loading full conversation to count messages client-side, causing N+1 queries)  
- `context` (AI conversation context is not stored in the conversation metadata; it must be derived from message history)  
**Recommendation:**  
- Add `messageCount: number` and `lastMessageAt: string (ISO timestamp)` to the conversation list response.  
- `context` should **not** be included in the list endpoint (it is conversation-specific and large); instead, compute a lightweight preview (e.g., first 50 chars of first message) client-side if needed for UI, or store a `previewText` field in the conversation model.  
- **Backend change required:** Modify the conversation list query to include `COUNT(messages) AS messageCount` and `MAX(messages.createdAt) AS lastMessageAt` via Sequelize eager loading or raw SQL.  
> *Without this, the plan’s "zero backend changes" claim is invalid for sidebar functionality.*

## 2. Search Endpoint — Client-Side vs. Server-Side Filtering
**Assessment:** Client-side filtering of 20 conversations is **only adequate for users with very low conversation volume** (<20 total conversations). For the target market (wealthy golf clients, working professionals), users will likely accumulate 50+ conversations over time, making client-side filtering on a fixed 20-item window insufficient.  
**Issue:**  
- If a user has >20 conversations, client-side filtering misses older conversations.  
- Loading all conversations just to filter client-side wastes bandwidth (especially problematic for mobile users on metered connections).  
**Recommendation:**  
- **Implement server-side search immediately** for `GET /api/ai-chat/conversations?search=<term>` using:  
  ```sql
  WHERE (title ILIKE '%$1%' OR EXISTS (
    SELECT 1 FROM messages 
    WHERE messages.conversationId = conversations.id 
    AND content ILIKE '%$1%'
  ))
  ```  
- Keep client-side filtering as a fallback for instant results on the cached list, but **always** fetch search results from the server.  
- **When to add:** Phase 0 (before launch). Delaying server-side search risks poor UX for power users and increases client-side processing load.  
> *The plan’s reliance on client-side filtering is a premature optimization that will fail at scale.*

## 3. File Attachment Endpoint — REST Design Validation
**Assessment:** The proposed `POST /api/ai-chat/conversations/:id/attachments` endpoint is **REST-correct** and follows standard sub-resource patterns.  
**Validation:**  
- ✅ Correctly nests attachments under conversations (a file belongs to a specific conversation).  
- ✅ Uses POST for creation (idempotency not required for uploads).  
- ✅ Multipart/form-data is the appropriate encoding for file uploads (handles binary data + metadata like filename).  
**Recommendations for Implementation:**  
- **Request:** `multipart/form-data` with `file` (required) and optional `description` (text).  
- **Response:** Return attachment metadata:  
  ```json
  {
    "id": "uuid",
    "filename": "string",
    "url": "string (CDN/signed URL)",
    "contentType": "string",
    "size": "number (bytes)",
    "createdAt": "ISO timestamp"
  }
  ```  
- **Security:** Validate file type (allow images: `image/jpeg`, `image/png`, `image/webp`; block executables), enforce size limits (e.g., 10MB/file), and scan for malware via backend service (e.g., ClamAV).  
- **Backend change required:** Yes — this is a new endpoint. The plan correctly identifies it as needed, but it contradicts the "zero backend changes" claim for Phase 1.  
> *This endpoint is necessary and well-designed; implement it as proposed.*

## 4. Multimodal Message API — Image Handling with Gemini
**Assessment:** The current message API (`POST /api/ai-chat/conversations/:id/messages`) **cannot handle multimodal input** as it likely only accepts a `content: string` field.  
**Issue:** Sending images to Gemini requires either:  
- Embedding image data directly in the message (inefficient, base64 bloats payload)  
- Referencing pre-uploaded assets (cleaner, leverages attachment endpoint)  
**Recommendation:**  
- **Adopt an upload-then-reference flow** (using the attachment endpoint from Section 3):  
  1. Client uploads image(s) via `POST /api/ai-chat/conversations/:id/attachments` → gets `attachmentId`.  
  2. Client sends message via `POST /api/ai-chat/conversations/:id/messages` with:  
     ```json
     {
       "content": "string (optional, can be empty for image-only messages)",
       "attachments": [
         { "id": "attachmentId", "type": "image" }
       ]
     }
     ```  
- **Do NOT** modify the message endpoint to accept multipart/form-data (mixes concerns; complicates caching and rate limiting).  
- **Backend change required:** Yes — extend the message creation handler to:  
  - Validate attachment IDs belong to the conversation.  
  - Fetch attachment metadata (URL, contentType) to construct Gemini multimodal prompt.  
  - Pass image URLs (or signed URLs) to Gemini API alongside text content.  
> *This approach decouples upload from messaging, enables reuse of attachments, and is industry-standard (Slack, Discord, etc.).*

## 5. Rate Limiting for New Operations
**Assessment:** Proposed operations need tailored rate limits; generic limits would either hinder UX or enable abuse.  
**Recommendations:**  
| Operation                | Suggested Limit      | Rationale                                                                 |
|--------------------------|----------------------|---------------------------------------------------------------------------|
| Sidebar list (GET /conversations) | 30 requests/minute | Allows frequent navigation (e.g., switching tabs) but prevents polling loops. Burst to 60 for SPA route changes. |
| Conversation rename (PUT /conversations/:id) | 5 requests/minute  | Infrequent action; high limits risk abuse (e.g., renaming spam).          |
| File upload (POST /conversations/:id/attachments) | 10 requests/minute | Prevents DoS via large file uploads; adjust based on storage costs.       |
| Message sending (POST /conversations/:id/messages) | 20 requests/minute | Standard chat limit; accommodates rapid typing but blocks spam bots.      |
**Implementation Notes:**  
- Use **user-ID-based** limits (not IP) to handle shared networks (e.g., offices, golf clubs).  
- Apply stricter limits for anonymous users (if applicable) vs. authenticated.  
- Return `429 Too Many Requests` with `Retry-After` header and clear error message.  
> *Sidebar list every page load is acceptable at 30/min; rename/upload limits prevent abuse without impacting legitimate use.*

## 6. WebSocket Integration for Conversation Updates
**Assessment:** The plan correctly notes Socket.io exists, but **relying on polling for conversation updates is suboptimal** for a real-time chat experience.  
**Issue:**  
- Polling (e.g., every 5s) delays sidebar updates (new message count, last message time) by up to polling interval.  
- Wastes bandwidth on unchanged data; poor UX for active conversations.  
**Recommendation:**  
- **Push conversation updates via WebSocket** for:  
  - `newMessage`: Update `messageCount` and `lastMessageAt` for the specific conversation in sidebar.  
  - `conversationRenamed`: Update `title` in sidebar.  
  - `conversationDeleted`: Remove conversation from sidebar list.  
  - `attachmentAdded`: (Optional) Show attachment preview in message composer if relevant.  
- **Keep polling only as a fallback** for clients that lose WebSocket connection (reconnect logicck

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
