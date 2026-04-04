# API Design & Backend Contracts — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 102.7s
> **Files:** docs/ai-workflow/blueprints/TEACH-ME-COMPREHENSIVE-UPGRADE-PLAN.md
> **Generated:** 4/4/2026, 2:43:41 AM

---

# API Surface Review – Teach Me Content Upgrade Plan  
*(Focus: AI‑Chat endpoints that the plan implicitly relies on)*  

---  

## 1. Existing API Sufficiency – `GET /api/ai-chat/conversations`  
**Claim:** Phase 1 needs **zero** backend changes.  

**Finding:**  
The sidebar requires a **ConversationSummary** shape with:  

| Field | Required? | Typical source |
|-------|-----------|----------------|
| `id` | ✅ | PK |
| `title` | ✅ | `conversations.title` |
| `context` | ✅ (optional) | JSONB `context` or derived from first message |
| `messageCount` | ✅ | Count of `messages` linked to conversation |
| `lastMessageAt` | ✅ | `MAX(created_at)` from `messages` or a denormalized column |

If the current endpoint already returns **all five** fields (or can derive `context`/`messageCount`/`lastMessageAt` without extra joins), then Phase 1 truly needs no change.  

**Recommendation:**  
- Verify the SELECT list includes `title`, `context`, a computed `message_count` (e.g., `COUNT(messages.id) AS messageCount`), and `max(messages.created_at) AS lastMessageAt`.  
- If any field is missing, add it **now** – it is a backward‑compatible addition and will prevent future client‑side work‑arounds.  
- **Verdict:** Zero‑change claim holds **only if** the API already satisfies the above; otherwise add the missing columns (no breaking change).  

---  

## 2. Search Endpoint – Client‑Side Filtering of 20 Conversations  
**Current approach:** Fetch the first 20 conversations (or all) and filter client‑side with JavaScript.  

**Adequacy:**  
- ✅ **Fine** for ≤ ~50 conversations per user (typical for a personal trainer’s active chats).  
- ❌ **Breaks** when a user accumulates hundreds of conversations (e.g., long‑term clients, group chats) – client‑side filtering becomes O(n) on every keystroke and wastes bandwidth.  

**When to add server‑side search:**  
| Trigger | Action |
|---------|--------|
| Average conversation count per user > 100 **or** 95th‑percentile > 200 | Implement `GET /api/ai-chat/conversations?search=<term>` |
| Search latency > 150 ms on client (measured in prod) | Move to server‑side |
| Need for **fuzzy** or **JSONB** content search (e.g., searching inside message bodies) | Add ILIKE on `title` **+** `to_tsvector`/`jsonb_path_query` on `messages` |

**Implementation sketch:**  

```http
GET /api/ai-chat/conversations?search=emom&limit=20&offset=0
```

- SQL:  
  ```sql
  SELECT c.id, c.title, c.context,
         COUNT(m.id) AS messageCount,
         MAX(m.created_at) AS lastMessageAt
  FROM conversations c
  LEFT JOIN messages m ON m.conversation_id = c.id
  WHERE (c.title ILIKE '%' || $1 || '%'
         OR EXISTS (SELECT 1 FROM jsonb_array_elements(c.context) AS ctx WHERE ctx::text ILIKE '%' || $1 || '%'))
  GROUP BY c.id
  ORDER BY lastMessageAt DESC
  LIMIT $2 OFFSET $3;
  ```  
- Add a **GIN** index on `(title)` and optionally on a **tsvector** column built from `title || ' ' || context::text`.  

---  

## 3. File Attachment Endpoint – `POST /api/ai-chat/conversations/:id/attachments`  
**REST correctness:**  
- **Verb:** `POST` – correct for creating a sub‑resource.  
- **Path:** `conversations/:id/attachments` – correctly nests attachments under a conversation.  
- **Payload:** Must be `multipart/form-data` (file + optional metadata).  

**Recommendations:**  

| Aspect | Detail |
|--------|--------|
| **Content-Type** | `multipart/form-data`; accept `file` (required) and optional `description` (string). |
| **Response** | Return the created attachment object: `{ id, filename, mimeType, size, url, createdAt }`. |
| **Storage** | Stream directly to object storage (S3/GCS) → return a **signed URL** (short‑lived) or a permanent CDN URL. |
| **Validation** | Enforce server‑side limits: max 10 MB per file, allowed MIME types (`image/*`, `application/pdf`, `video/mp4`). |
| **Security** | Verify the authenticated user owns `:id` before allowing upload. |
| **Idempotency** | Accept an `Idempotency-Key` header to prevent duplicate uploads on retry. |

---  

## 4. Multimodal Message API – Sending Images with Messages to Gemini  
**Current message send (presumed):**  

```http
POST /api/ai-chat/conversations/:id/messages
{ "content": "Describe this exercise" }
```

**Needed change:** Allow one or more attachments to travel **with** the message.  

### Option A – Inline attachments (simplest)  
Add an `attachments` array containing **pre‑uploaded** attachment IDs:  

```json
{
  "content": "What muscles are working here?",
  "attachments": [ "att_1f2e3d", "att_9a8b7c" ]
}
```

- **Pros:** Single request, atomic, easy to reason about.  
- **Cons:** Requires the client to upload files first (see below) – adds a round‑trip if not already done.  

### Option B – Upload‑then‑reference (recommended)  
1. **Upload** file(s) via the attachment endpoint → get `attachment.id`.  
2. **Send message** referencing those IDs (as in Option A).  

**Why this is preferred:**  
- Decouples large binary upload from the chat request (avoids timeout, allows progress UI).  
- Enables reuse of the same attachment across multiple messages (e.g., sending the same diagram in follow‑up questions).  
- Aligns with RESTful design: attachments are first‑class resources.  

**API change:** No new endpoint needed; just document that `messages.create` accepts an optional `attachments: string[]` field.  

---  

## 5. Rate Limiting for New Operations  
| Operation | Frequency | Suggested Limit | Rationale |
|-----------|-----------|----------------|-----------|
| **Sidebar list** (`GET /api/ai-chat/conversations`) | Every page load / navigation | **60 req/min** per user (burst 10) | Lightweight read; protects against abusive polling. |
| **Conversation rename** (`PATCH /api/ai-chat/conversations/:id`) | Infrequent (user‑initiated) | **10 req/min** | Low volume; prevents spam renames. |
| **File upload** (`POST /api/ai-chat/conversations/:id/attachments`) | User‑driven, possibly bursty (multiple images) | **5 req/min** **plus** **max 20 MB/min** bandwidth | Guard against DoS via large files; still allows a reasonable workout‑demo upload. |
| **Message send** (`POST /api/ai-chat/conversations/:id/messages`) | High during active chat | **30 req/min** | Matches typical conversational pacing; burst allowed for quick Q&A. |
| **Attachment list** (`GET /api/ai-chat/conversations/:id/attachments`) | Rare (when viewing attachment gallery) | **20 req/min** | Low‑traffic endpoint. |

*Implementation:* Use a middleware (e.g., `express-rate-limit` with Redis store) keyed by `userId` + route. Return `429` with `Retry-After` header.  

---  

## 6. WebSocket Integration – Push vs. Poll  
**Existing:** Socket.io server is already connected.  

**Recommendation:**  
- **Push** all mutation events (new message, attachment upload, conversation rename, title change) via Socket.io to the relevant `conversationId` room.  
- Keep the **REST GET list** for initial load and occasional refresh, but **eliminate polling** for updates.  

**Events to emit:**  

| Event | Payload | When |
|-------|---------|------|
| `conversation:updated` | `{ conversationId, title?, lastMessageAt?, messageCount? }` | Rename, new message, attachment added/deleted |
| `message:created` | `{ id, conversationId, content, attachments[], createdAt }` | New message (text or multimodal) |
| `attachment:created` | `{ id, conversationId, filename, mimeType, size, url }` | File upload completed |
| `conversation:deleted` | `{ conversationId }` | User deletes chat |

**Client side:**  
- On initial load, fetch conversation list via REST.  
- Join Socket.io rooms for each conversation ID the user is subscribed to (or a single `user:<id>` room that fans out to all convos).  
- Update local state optimistically, then reconcile with server acknowledgment.  

**Benefit:** Near‑real‑time UI without extra HTTP requests; reduces server load from polling.  

---  

## 7. Response Contract – Are Existing Shapes Adequate?  
**Current (hypothetical) `ConversationSummary`:**  

```ts
interface ConversationSummary {
  id: string;
  title: string;
  // missing: context?, messageCount?, lastMessageAt?
}
```

**Gap:** The sidebar expects `context`, `messageCount`, and `lastMessageAt`.  

**Action:**  
- Extend the serializer (Sequelize `toJSON` or a DTO) to include the three fields.  
- Ensure they are **nullable** (`context?: string | null`) to avoid breaking older clients that don’t expect them.  
- Add JSDoc / TypeScript definitions so frontend can rely on them.  

**Resulting type:**  

```ts
export interface ConversationSummary {
  id: string;
  title: string;
  context?: string | null;   // e.g., short summary or first‑message preview
  messageCount: number;      // total messages in conversation
  lastMessageAt: string;     // ISO timestamp
}
```  

---  

## 8. Caching Strategy – 5‑Minute Cache on Conversation List  
**Current:** Probably using an in‑memory or Redis cache with a static TTL of 300 s.  

**Evaluation:**  
- ✅ **Good** for reducing DB load on repeat visits.  
- ❌ **Stale‑data risk:** A new message arriving within the 5‑minute window will not appear until cache expiry, causing confusion (e.g., badge counts, last‑message timestamp).  

**Recommendation:**  
1. **Cache‑aside with invalidation:**  
   - On **any mutation** that affects the list (new message, rename, attachment add/delete), **delete** the cached key for that user (`conversations:user:<id>`).  
   - Use a Redis `PUB/SUB` channel or directly call `del` in the mutation handler after the transaction commits.  
2. **Short TTL as safety net:** Keep a **60‑second** TTL to guard against missed invalidation (e.g., server crash).  
3. **Optional:** Cache individual conversation objects (`conversation:<id>`) with the same invalidation pattern; the list cache can then be built from those objects (reducing stale‑state windows).  

**Result:** Near‑real‑time freshness with dramatically fewer DB hits.  

---  

# Summary of API Design Recommendations  

| # | Area | Recommendation |
|---|------|----------------|
| 1 | `GET /api/ai-chat/conversations` | Verify/extend response to include `context`, `messageCount`, `lastMessageAt`. Zero‑change claim holds only if already present. |
| 2 | Search | Keep client‑side filter for ≤ ~50 convos; add server‑side `ILIKE`/`full‑text` search when average per‑user count > 100 or latency > 150 ms. |
| 3 | Attachments | `POST /api/ai-chat/conversations/:id/attachments` – `multipart/form-data`, validate size/type, return attachment metadata, enforce ownership. |
| 4 | Multimodal messages | Add optional `attachments: string[]` (attachment IDs) to message create endpoint; recommend upload‑then‑reference flow. |
| 5 | Rate limiting | Sidebar: 60 req/min; Rename: 10 req/min; Upload: 5 req/min + 20 MB/min; Message: 30 req/min. |
| 6 | WebSocket | Push `conversation:updated`, `message:created`, `attachment:created`, `conversation:deleted` via Socket.io; drop polling for updates. |
| 7 | Response contract | Ensure `ConversationSummary` includes `context?`, `messageCount`, `lastMessageAt`. |
| 8 | Caching | Cache list per user with **60 s TTL** + **invalidate on any mutation** (new message, rename, attachment). |

Implementing the above will give the frontend a solid, performant, and real‑time‑ready foundation for the upcoming Teach Me content upgrades **and** for any future AI‑chat enhancements (multimodal, file sharing, etc.) without requiring breaking changes.  

---  

*Prepared for SwanStudios backend review – Enchanted Apex (Crystalline Swan) theme.*

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
