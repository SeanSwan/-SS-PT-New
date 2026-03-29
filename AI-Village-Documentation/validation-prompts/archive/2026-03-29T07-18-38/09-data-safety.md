# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 55.1s
> **Files:** frontend/src/hooks/useSocket.ts, frontend/src/components/Social/Messaging/useMessaging.ts, frontend/src/components/Social/Messaging/MessageThread.tsx, frontend/src/components/Social/Messaging/MessagingView.tsx, frontend/src/components/Social/Messaging/MessagingStyles.ts, frontend/src/components/Social/Messaging/MessagingTypes.ts, frontend/src/components/Social/Messaging/ConversationListPanel.tsx, frontend/src/components/Social/Messaging/NewConversationModal.tsx
> **Generated:** 3/29/2026, 12:18:38 AM

---

# 🚨 DATA SAFETY AUDIT REPORT — SwanStudios Messaging System

## ⚠️ EXECUTIVE SUMMARY

**OVERALL RISK LEVEL:** ✅ **LOW** (Frontend-only code reviewed)

This is **frontend code only** — no database operations, migrations, or destructive backend logic present. The primary risks are **data exposure** and **session management**, not data loss.

---

## 🔍 FINDINGS

### 1. ⚠️ **Token Exposure in Socket.IO Connection**

**Severity:** 🟡 **MEDIUM**  
**Data at Risk:** JWT authentication tokens  
**Blast Radius:** All users connecting via WebSocket  
**File & Line:** `frontend/src/hooks/useSocket.ts:42-43`

**What's Wrong:**
```ts
const token = localStorage.getItem('token');
globalSocket = io(getSocketUrl(), {
  auth: { token },  // ⚠️ Token sent in auth handshake
```

The JWT token is sent in the Socket.IO auth handshake. If the WebSocket connection is not over **WSS (secure WebSocket)** in production, tokens could be intercepted. Additionally, if the backend logs Socket.IO connection attempts, tokens may appear in server logs.

**Fix:**
```ts
// ✅ Ensure production uses WSS
function getSocketUrl(): string {
  if (import.meta.env.VITE_API_BASE_URL) {
    const url = import.meta.env.VITE_API_BASE_URL.replace('/api', '');
    // Force WSS in production
    return url.replace(/^http:/, 'https:').replace(/^ws:/, 'wss:');
  }
  return import.meta.env.VITE_SOCKET_URL || 'http://localhost:10000';
}

// ✅ Backend: Never log auth tokens
io.on('connection', (socket) => {
  // DON'T: console.log('Auth:', socket.handshake.auth);
  // DO: console.log('User connected:', socket.user.id);
});
```

---

### 2. ⚠️ **No Token Refresh Logic — Session Expiry Could Lock Users Out**

**Severity:** 🟡 **MEDIUM**  
**Data at Risk:** User sessions (temporary lockout, not data loss)  
**Blast Radius:** All users when JWT expires  
**File & Line:** `frontend/src/hooks/useSocket.ts:35-50`

**What's Wrong:**
The socket connects once with the token from `localStorage`. If the JWT expires while the user is active, the socket will disconnect and **not reconnect** with a fresh token. The user must manually refresh the page.

**Fix:**
```ts
// ✅ Add token refresh listener
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'token' && globalSocket) {
      // Token changed (e.g., refreshed) — reconnect socket
      globalSocket.disconnect();
      globalSocket = null;
      refCount = 0;
      // Re-run effect to reconnect with new token
    }
  };
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);

// ✅ Backend: Emit 'token_expired' event when JWT is invalid
socket.on('error', (err) => {
  if (err.message === 'jwt expired') {
    // Trigger token refresh flow in frontend
    window.dispatchEvent(new Event('auth:token_expired'));
  }
});
```

---

### 3. ⚠️ **Race Condition: Multiple Components Could Create Duplicate Conversations**

**Severity:** 🟡 **MEDIUM**  
**Data at Risk:** Duplicate conversation records (data clutter, not loss)  
**Blast Radius:** Users who rapidly click "New Conversation" multiple times  
**File & Line:** `frontend/src/components/Social/Messaging/useMessaging.ts:119-131`

**What's Wrong:**
```ts
const createConversation = useCallback(async (participantId: number) => {
  try {
    const data = await apiFetch<{ conversation: ConversationData }>(
      '/conversations',
      { method: 'POST', body: JSON.stringify({ participantIds: [participantId] }) }
    );
    await fetchConversations(); // ⚠️ No check if conversation already exists
    setActiveConversationId(data.conversation.id);
    return data.conversation;
  } catch (err: any) {
    setError(err.message);
    return null;
  }
}, [fetchConversations]);
```

If a user clicks "Start Conversation" twice quickly, two POST requests fire before the first completes, creating **duplicate conversations** with the same participant.

**Fix:**
```ts
// ✅ Add debounce + check for existing conversation
const createConversation = useCallback(async (participantId: number) => {
  // Check if conversation already exists
  const existing = conversations.find(c =>
    c.participants.some(p => p.id === participantId)
  );
  if (existing) {
    setActiveConversationId(existing.id);
    return existing;
  }

  try {
    const data = await apiFetch<{ conversation: ConversationData }>(
      '/conversations',
      { method: 'POST', body: JSON.stringify({ participantIds: [participantId] }) }
    );
    await fetchConversations();
    setActiveConversationId(data.conversation.id);
    return data.conversation;
  } catch (err: any) {
    setError(err.message);
    return null;
  }
}, [conversations, fetchConversations]);

// ✅ Backend: Add UNIQUE constraint on (user1_id, user2_id) pairs
// migrations/YYYYMMDD_add_conversation_uniqueness.js
await queryInterface.addConstraint('conversations', {
  fields: ['participant_ids'], // Assuming JSONB or array column
  type: 'unique',
  name: 'unique_conversation_participants'
});
```

---

### 4. 🟢 **Minor: Error Messages Could Expose Internal API Structure**

**Severity:** 🟢 **LOW**  
**Data at Risk:** API endpoint paths (information disclosure, not data loss)  
**Blast Radius:** Attackers could map API structure  
**File & Line:** `frontend/src/components/Social/Messaging/useMessaging.ts:23-30`

**What's Wrong:**
```ts
async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ... });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `API error ${res.status}`); // ⚠️ Exposes status codes
  }
  return res.json();
}
```

If the backend returns detailed error messages (e.g., "User with ID 123 not found in table `users`"), they're displayed to the user, potentially revealing database schema.

**Fix:**
```ts
// ✅ Sanitize error messages
async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ... });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    // Only show user-friendly messages
    const safeMessage = res.status === 404
      ? 'Resource not found'
      : res.status === 403
      ? 'Access denied'
      : 'Something went wrong';
    throw new Error(safeMessage);
  }
  return res.json();
}

// ✅ Backend: Never return raw SQL errors
catch (err) {
  console.error('[DB Error]', err); // Log internally
  res.status(500).json({ message: 'Internal server error' }); // Generic to client
}
```

---

### 5. 🟢 **Minor: No Rate Limiting on Message Sending (Frontend)**

**Severity:** 🟢 **LOW**  
**Data at Risk:** None (spam/abuse, not data loss)  
**Blast Radius:** Users could spam messages  
**File & Line:** `frontend/src/components/Social/Messaging/useMessaging.ts:80-96`

**What's Wrong:**
A user could programmatically send hundreds of messages per second via the `sendMessage` function. While this doesn't **delete data**, it could:
- Flood the database with spam
- Trigger rate limits on the backend (if implemented)
- Degrade performance for other users

**Fix:**
```ts
// ✅ Add client-side rate limiting (1 message per second)
const lastSentRef = useRef<number>(0);

const sendMessage = useCallback(async (content: string) => {
  if (!activeConversationId || !content.trim()) return;

  const now = Date.now();
  if (now - lastSentRef.current < 1000) {
    setError('Please wait before sending another message');
    return;
  }
  lastSentRef.current = now;

  // ... rest of send logic
}, [activeConversationId, connected, emit, fetchConversations]);

// ✅ Backend: Add rate limiting middleware (e.g., express-rate-limit)
const messageRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: 'Too many messages, please slow down'
});
app.post('/api/messaging/conversations/:id/messages', messageRateLimit, ...);
```

---

## ✅ POSITIVE FINDINGS (Good Practices Observed)

1. **No Direct Database Mutations** — All data changes go through REST API or Socket.IO backend
2. **Read-Only Message Display** — No client-side deletion or editing of messages
3. **Proper React Memoization** — `React.memo()` and `useMemo()` prevent unnecessary re-renders
4. **Graceful Fallback** — REST polling when WebSocket disconnects (no data loss)
5. **Typing Indicators Auto-Clear** — Prevents stale "is typing..." states

---

## 🛡️ BACKEND SAFETY CHECKLIST (NOT IN THIS CODE, BUT CRITICAL)

Since this is frontend code, the **real data safety risks** are in the backend. Ensure:

### ❌ **NEVER DO THIS (Backend)**
```ts
// 🚨 CRITICAL: Would delete ALL messages
await Message.destroy({ where: {} });

// 🚨 CRITICAL: Would wipe all conversations
await Conversation.sync({ force: true });

// 🚨 CRITICAL: Cascade delete without safeguards
await User.destroy({ where: { id: userId }, cascade: true });
```

### ✅ **ALWAYS DO THIS (Backend)**
```ts
// ✅ Soft delete messages (add `deleted_at` column)
await Message.update(
  { deleted_at: new Date() },
  { where: { id: messageId, sender_id: userId } }
);

// ✅ Require explicit WHERE clause
if (!conversationId) throw new Error('conversationId required');
await Message.destroy({ where: { conversation_id: conversationId } });

// ✅ Transaction wrapper for multi-table operations
await sequelize.transaction(async (t) => {
  await Conversation.create({ ... }, { transaction: t });
  await ConversationParticipant.bulkCreate([...], { transaction: t });
});

// ✅ Backup before destructive migrations
// migrations/backup_before_alter.js
await queryInterface.sequelize.query('CREATE TABLE messages_backup AS SELECT * FROM messages');
await queryInterface.changeColumn('messages', 'content', { type: DataTypes.TEXT });
```

---

## 📋 FINAL RECOMMENDATIONS

| Priority | Action | Owner | Deadline |
|----------|--------|-------|----------|
| 🔴 **HIGH** | Audit backend Socket.IO auth — ensure tokens never logged | Backend Dev | Before deploy |
| 🟡 **MEDIUM** | Add token refresh listener to `useSocket.ts` | Frontend Dev | Sprint 2 |
| 🟡 **MEDIUM** | Add UNIQUE constraint on conversation participants (backend) | Backend Dev | Sprint 2 |
| 🟢 **LOW** | Sanitize API error messages | Backend Dev | Sprint 3 |
| 🟢 **LOW** | Add client-side message rate limiting | Frontend Dev | Sprint 3 |

---

## 🎯 CONCLUSION

**This frontend code is SAFE for production** with the medium-priority fixes applied. The real data safety risks are in the **backend** (database operations, migrations, CASCADE deletes). 

**Next Steps:**
1. ✅ **Approve this frontend code** for deployment
2. 🔍 **Request backend audit** of:
   - `backend/routes/messaging.js`
   - `backend/sockets/messaging.js`
   - `backend/migrations/*_messaging_*.js`
3. 🧪 **Test token expiry flow** in staging (let JWT expire, verify reconnect)

---

**Auditor:** Claude Opus 4.6 (Data Safety Specialist)  
**Date:** 2026-03-29  
**Confidence:** 95% (frontend-only scope; backend not reviewed)

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
