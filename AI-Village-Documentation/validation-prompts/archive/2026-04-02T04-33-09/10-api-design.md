# API Design & Backend Contracts — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 100.2s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-CREATOR-UPGRADE-PLAN.md
> **Generated:** 4/1/2026, 9:33:09 PM

---

# API Surface Review: Bootcamp Creator Upgrade Plan  
*Focus: Integration with existing AI Chat API for Coach Assistant feature*  

## Executive Summary  
The Bootcamp Creator plan proposes embedding a **Coach Assistant** (chat interface) using the existing AI chat infrastructure. While the plan claims "Phase 1 needs zero backend changes," our review reveals **critical gaps** in the current AI chat API that **require backend modifications** to support bootcamp-specific context, file attachments, multimodal input, and real-time updates. Below are targeted recommendations to align the API with the Bootcamp Creator's requirements.  

---  

### 1. Existing API Sufficiency for Sidebar  
**Finding**: The plan assumes `GET /api/ai-chat/conversations` returns sufficient data (`title`, `context`, `messageCount`, `lastMessageAt`) for a sidebar. However:  
- The `context` field (if it exists) is likely **generic** and not structured to store bootcamp-specific metadata (e.g., associated `bootcampTemplateId`, `classStyle`, or equipment profile).  
- Without bootcamp context in the conversation object, the Coach Assistant cannot:  
  - Filter conversations by bootcamp project  
  - Display bootcamp-specific previews in the sidebar  
  - Resume context-aware chats (e.g., "Continue editing my pyramid class for lower body")  

**Recommendation**:  
- **Add bootcamp context to conversation metadata** via a new `metadata: JSONB` column in the `ai_chat_conversations` table.  
- Update `GET /api/ai-chat/conversations` to return:  
  ```json  
  {  
    "id": "uuid",  
    "title": "string",  
    "context": "string", // Legacy free-form context (optional)  
    "metadata": {        // NEW: Structured bootcamp context  
      "bootcampTemplateId": "uuid",  
      "classStyle": "pyramid|superset|standard",  
      "equipmentProfileId": "uuid",  
      "lastEditedAt": "timestamp"  
    },  
    "messageCount": "integer",  
    "lastMessageAt": "timestamp"  
  }  
  ```  
- **Phase 1 impact**: Requires backend migration (add `metadata` column) and API update. **Zero changes is not feasible**.  

---  

### 2. Search Endpoint Adequacy  
**Finding**: Client-side filtering of 20 conversations is **inadequate** for trainers with extensive bootcamp history (e.g., 50+ saved classes). Latency and UX degrade as conversation count grows.  

**Recommendation**:  
- **Implement server-side search immediately** for `GET /api/ai-chat/conversations?search=:query`:  
  - Match `title` (ILIKE) and `metadata->>'bootcampTemplateId'` (if searching by template)  
  - **Optional**: Search JSONB `message` content via `WHERE messages @> '[{"content": {"ilike": "%query%"}}]'` (requires GIN index on `messages` JSONB column)  
- **Threshold**: Add server-side search if >30 conversations/user (expected within 2 weeks of launch for active trainers).  
- **Indexing**: Create index:  
  ```sql  
  CREATE INDEX idx_ai_chat_conversations_metadata ON ai_chat_conversations USING GIN (metadata);  
  ```  

---  

### 3. File Attachment Endpoint Design  
**Finding**: `POST /api/ai-chat/conversations/:id/attachments` is **REST-correct** for attaching resources to a conversation. However:  
- Missing validation for file types (images only for multimodal) and size limits (e.g., 10MB).  
- No mention of secure storage (e.g., S3 signed URLs) or virus scanning.  

**Recommendation**:  
- **Accept multipart/form-data** with:  
  - `file`: Image file (JPEG/PNG/WebP, <10MB)  
  - `conversationId`: Path parameter (redundant but safe to include in body)  
- **Response**:  
  ```json  
  {  
    "id": "attachment-uuid",  
    "url": "https://cdn.sswanstudios.com/attachments/...", // S3 URL  
    "type": "image",  
    "size": 1245780,  
    "uploadedAt": "timestamp"  
  }  
  ```  
- **Backend**: Stream upload to S3, store metadata in `ai_chat_attachments` table, return CDN URL.  
- **Security**: Validate MIME type, scan for malware, enforce user-specific upload quotas.  

---  

### 4. Multimodal Message API Changes  
**Finding**: Sending images to Gemini requires associating attachments with messages. Current message API likely only supports `content: string`.  

**Recommendation**: **Adopt upload-then-reference flow** (not inline base64):  
1. **Upload attachment first** via `POST /api/ai-chat/conversations/:id/attachments` (returns `attachmentId`).  
2. **Send message** via `POST /api/ai-chat/conversations/:id/messages` with:  
   ```json  
   {  
     "content": "Describe this exercise form:",  
     "attachments": [  
       {  
         "id": "attachment-uuid-from-step-1",  
         "type": "image"  
       }  
     ]  
   }  
   ```  
- **Why not inline base64?**  
  - Avoids bloating request payloads (base64 adds ~33% overhead).  
  - Enables attachment reuse (same image in multiple messages).  
  - Aligns with Gemini's multimodal API (accepts image URLs or base64; URLs preferred for caching).  
- **Backend**: Validate attachment belongs to conversation, forward URL/base64 to Gemini.  

---  

### 5. Rate Limiting Recommendations  
| Operation                | Current Risk          | Recommended Limit       | Rationale                                                                 |  
|--------------------------|-----------------------|-------------------------|---------------------------------------------------------------------------|  
| Sidebar list (GET)       | Low (cached)          | 30 req/min/user         | Generous for cached endpoint; prevents abuse during rapid navigation.     |  
| Conversation rename (PATCH) | Low                  | 5 req/min/user          | Matches typical user behavior (infrequent edits).                         |  
| File upload (POST)       | High (DoS vector)     | 3 req/min/user          | Balances UX (allowing retries) with abuse prevention (e.g., no mass uploads). |  
| Message send (POST)      | Medium                | 20 req/min/user         | Supports active chatting while preventing spam.                           |  

**Implementation**: Use `express-rate-limit` with dynamic keys (e.g., `userId:operation`). Exclude cached sidebar responses from limit counts where possible.  

---  

### 6. WebSocket Integration Necessity  
**Finding**: Polling for new messages (e.g., every 3s) is **inefficient** for a chat interface and increases server load. Socket.io exists but is underutilized.  

**Recommendation**:  
- **Push conversation updates via WebSocket** for:  
  - New messages (`message:new` event)  
  - Attachment uploads (`attachment:added` event)  
  - Conversation metadata updates (`conversation:updated` event)  
- **Client-side**:  
  - Maintain local conversation list in Redux/Zustand.  
  - Update sidebar in real-time on `conversation:updated` (e.g., new `messageCount`).  
  - Fetch full message history only on conversation open (not on every poll).  
- **Backend**:  
  - Emit events from message/attachment controllers after DB commit.  
  - Use Redis adapter for Socket.io horizontal scaling.  
- **Impact**: Eliminates polling overhead; critical for Coach Assistant UX (real-time AI responses).  

---  

### 7. Response Contract Adequacy  
**Finding**: Existing `ConversationSummary` type **likely insufficient** without bootcamp context (see Point 1). Even if fields exist:  
- `context` as a free-form string cannot be reliably parsed for UI previews.  
- No `lastEditedAt` to indicate stale conversations.  

**Recommendation**:  
- **Define explicit TypeScript contract** for Bootcamp Creator:  
  ```ts  
  interface BootcampConversationSummary {  
    id: string;  
    title: string;  
    metadata: {  
      bootcampTemplateId: string;  
      classStyle: 'pyramid' | 'superset' | 'standard';  
      equipmentProfileId: string;  
    };  
    messageCount: number;  
    lastMessageAt: string; // ISO timestamp  
    lastEditedAt: string;  // ISO timestamp (for cache invalidation)  
  }  
  ```  
- **Backend**: Ensure API response matches this shape. Add `lastEditedAt` column to `ai_chat_conversations` (auto-updated on message/attachment change).  

---  

### 8. Caching Strategy  
**Finding**: 5-minute cache on conversation list is **too stale** for active coaching sessions. Does not invalidate on new message, causing UI to show outdated `messageCount`/`lastMessageAt`.  

**Recommendation**:  
- **Cache duration**: Reduce to **60 seconds** (balance freshness vs. load).  
- **Invalidation triggers**:  
  - ✅ **On new message** in a conversation (update `messageCount`/`lastMessageAt` in cache).   

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
