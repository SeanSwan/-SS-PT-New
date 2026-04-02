# API Design & Backend Contracts — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 96.3s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-SPRINT-PLANNER-AND-PAIN-CHART-UPGRADE-PLAN.md
> **Generated:** 4/1/2026, 10:59:40 PM

---

# API Surface Review: Bootcamp Sprint Planner + Pain Chart Upgrade + Bootcamp Calendar

## 1. Existing API Sufficiency — GET /api/ai-chat/conversations
**Verification**: The plan claims Phase 1 requires zero backend changes for the AI chat sidebar. Assuming the current `GET /api/ai-chat/conversations` endpoint returns an array of conversation objects with at least:
- `id` (string/UUID)
- `title` (string)
- `context` (string, e.g., last message preview or summary)
- `messageCount` (integer)
- `lastMessageAt` (ISO timestamp)
...then it is **sufficient** for the sidebar `ConversationSummary` type.  
**Recommendation**: If the current response lacks any of these fields (e.g., missing `context` or uses `updatedAt` instead of `lastMessageAt`), add them to maintain backward compatibility. No changes needed if fields align.

## 2. Search Endpoint — Client-Side Filtering Adequacy
**Assessment**: Client-side filtering of 20 conversations is **only adequate** if:
- The total conversations per user are consistently low (<50), *and*
- The API fetches a fixed, small subset (e.g., `?limit=20&sort=lastMessageAt desc`) before client filtering.  
**When to Add Server-Side Search**: Implement server-side search (using `ILIKE` on `title` + `JSONB` content search) when:
- Conversation counts per user exceed 100+ (common in long-term SaaS usage).
- Search requires scanning message content (not just titles), making client filtering inefficient.
- Features like fuzzy search, highlighting, or pagination are needed.  
**Recommendation**: Add server-side search endpoint `GET /api/ai-chat/conversations?search=<term>&limit=20&offset=0` now to avoid future refactoring. Use PostgreSQL `ILIKE` for title and `@>`/`?` operators for JSONB content search.

## 3. File Attachment Endpoint — REST Design
**Assessment**: `POST /api/ai-chat/conversations/:id/attachments` is **REST-correct** for creating a sub-resource (attachment) under a conversation.  
**Multipart Handling**: Must support `multipart/form-data` with:
- File field (e.g., `attachment`)
- Optional metadata (e.g., `description`, `contentType`)
**Recommendations**:
- Use `multer` (Express) with disk/S3 storage (e.g., AWS S3 via `multer-s3`).
- Validate file types (allow images: `jpg/png/webp`, max 10MB) and scan for malware.
- Return attachment metadata: `{ id, url, filename, contentType, size, uploadedAt }`.
- Secure endpoints: Verify user owns the conversation before allowing uploads.

## 4. Multimodal Message API — Image Handling with Gemini
**Current Limitation**: Sending images requires changes to the message creation flow.  
**Recommended Approach**: **Separate upload-then-reference flow** (preferred over embedding base64 in request body):
1. **Upload Image**: `POST /api/upload` (multipart) → returns `{ fileId, url, expiresAt }`.
2. **Send Message**: `POST /api/ai-chat/conversations/:id/messages` with body:
   ```json
   {
     "content": "Describe this exercise form",
     "attachments": [{ "fileId": "abc123", "type": "image" }]
   }
   ```
**Why Not Embed?**:
- Base64 bloats request size (~33% overhead), risking payload limits.
- Gemini API expects image URLs or base64; referencing uploaded files is cleaner and reusable.
- Enables retry logic for failed uploads without resending messages.  
**Alternative**: If atomicity is critical, extend the message endpoint to accept `multipart/form-data` with `content` and `file` fields—but this complicates error handling and is less scalable.

## 5. Rate Limiting for New Operations
**Assessment**: Current plan lacks explicit rate limits; defaults may be too lax.  
**Recommended Limits (Per User)**:
| Operation                | Limit          | Rationale                                                                 |
|--------------------------|----------------|---------------------------------------------------------------------------|
| Sidebar list (GET convs) | 60 req/min     | High frequency (page loads), but caching reduces actual load. Burst-friendly. |
| Conversation rename      | 10 req/min     | Low-frequency action; prevents abuse (e.g., rapid renaming scripts).      |
| File upload              | 5 req/min      | High-risk for DoS/storage abuse; pair with file-size limits (e.g., 10MB).  |
**Implementation**: Use `express-rate-limit` with Redis store for distributed limits. Exempt authenticated users with premium tiers if applicable.

## 6. WebSocket Integration — Real-Time Updates
**Assessment**: Polling the conversation list (e.g., every 5s) is inefficient; Socket.io exists but isn’t leveraged for real-time updates.  
**Recommendation**: **Push conversation updates via WebSocket** instead of polling:
- Emit events on:
  - `new-message`: `{ conversationId, message }` → updates sidebar badge/last message.
  - `conversation-updated`: `{ conversationId, updates: { title, messageCount } }` → for renames.
  - `attachment-added`: `{ conversationId, attachment }` → for file uploads.
- **Client Logic**: Maintain local conversation state; update optimistically on emit, reconcile on server confirmation.
- **Fallback**: Keep polling (e.g., 30s interval) for clients without WebSocket support, but prioritize Socket.io.  
**Impact**: Reduces API load by ~90% for active users and provides instant UX.

## 7. Response Contract — Sidebar Adequacy
**Assessment**: Existing `GET /api/ai-chat/conversations` response **is likely adequate** if it matches this TypeScript shape:
```typescript
type ConversationSummary = {
  id: string;
  title: string;
  context: string; // e.g., last 100 chars of last message
  messageCount: number;
  lastMessageAt: string; // ISO 8601 timestamp
};
```
**Verification Needed**: Confirm the API returns:
- `context` as a meaningful preview (not `null` or full message).
- `messageCount` as integer (not string).
- `lastMessageAt` in UTC ISO format (not Unix timestamp).  
**Recommendation**: If mismatched, add a backend adapter to transform legacy fields (e.g., map `preview` → `context`, `updatedAt` → `lastMessageAt`). Do not change the public contract without versioning.

## 8. Caching Strategy — Conversation List
**Assessment**: A static 5-minute cache is **inappropriate** for a chat sidebar:
- Causes stale UI (e.g., new messages not visible for up to 5 min).
- Defeats purpose of real-time features (WebSocket/new message indicators).  
**Recommended Strategy**:
- **Short-Term Cache**: Cache for **15- seconds

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
