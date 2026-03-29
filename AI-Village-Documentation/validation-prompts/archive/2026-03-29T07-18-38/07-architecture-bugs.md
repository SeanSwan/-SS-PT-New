# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 108.5s
> **Files:** frontend/src/hooks/useSocket.ts, frontend/src/components/Social/Messaging/useMessaging.ts, frontend/src/components/Social/Messaging/MessageThread.tsx, frontend/src/components/Social/Messaging/MessagingView.tsx, frontend/src/components/Social/Messaging/MessagingStyles.ts, frontend/src/components/Social/Messaging/MessagingTypes.ts, frontend/src/components/Social/Messaging/ConversationListPanel.tsx, frontend/src/components/Social/Messaging/NewConversationModal.tsx
> **Generated:** 3/29/2026, 12:18:38 AM

---

# Deep Architecture Review & Bug Hunt
## SwanStudios Messaging System — Production Readiness Audit

---

## EXECUTIVE SUMMARY

This review identifies **4 CRITICAL bugs**, **8 HIGH severity issues**, **6 MEDIUM issues**, and **4 LOW issues** across the messaging subsystem. The codebase has fundamental architectural problems that will cause production failures under load. Immediate action required before ship.

---

## 1. BUG DETECTION

### 1.1 CRITICAL: Token Change Not Handled — Socket Never Reconnects

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | `useSocket.ts:45-90` | `useEffect` has empty dependency array `[]`, but reads token from localStorage once on mount. If user logs out/in, token changes, but socket keeps using stale token. | Add token to dependency array and implement proper reconnection: `useEffect(() => { ... }, [token])` with cleanup and re-init logic. |
| **CRITICAL** | `useSocket.ts:84-95` | The `emit`, `on`, `off` callbacks have empty dependency arrays but capture `globalSocket`. These become stale after initial render and won't reflect socket changes. | Add `connected` or `socket` to dependency arrays, or use refs for socket access. |
| **CRITICAL** | `useMessaging.ts:165-175` | Race condition: `activeConvRef.current` is read inside socket event handler, but the effect has stale closure over the ref. When conversation switches rapidly, messages may append to wrong conversation. | Use functional update pattern or add conversationId to effect dependencies. |
| **CRITICAL** | `useMessaging.ts:113-130` | `sendMessage` emits via socket but provides **no confirmation** that message was actually sent. If emit fails silently (network drop), user sees no error and message is lost. | Add callback/ Promise pattern with error handling: `emit('send_message', { ... }, (ack) => { if (!ack) setError(...) })` |

### 1.2 HIGH: Race Conditions & Stale State

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `useMessaging.ts:77-85` | `fetchMessages` called without cancellation. Rapid conversation clicks trigger multiple overlapping fetches. Last response wins regardless of order, showing wrong messages. | Add `AbortController` or conversation ID check: `if (currentConvIdRef.current !== convId) return`. |
| **HIGH** | `useMessaging.ts:255-270` | Polling interval not cleared when socket reconnects. If user was offline, polling starts, then socket connects — both continue running, causing duplicate work. | Add `connected` state change handler to clear poll interval immediately. |
| **HIGH** | `useMessaging.ts:222-240` | Typing indicator timer cleanup race: `setTimeout` callback modifies state AFTER component may have unmounted or conversation changed. | Check mountedRef in timeout callback before calling setTypingUsers. |
| **HIGH** | `useMessaging.ts:277-285` | Auto-mark-as-read has wrong dependency array. Fires on every `messages` change but only should fire when new message arrives from OTHER user, not on initial load or own messages. | Add check: `if (lastMsg.sender_id === currentUserId) return;` |

### 1.3 MEDIUM: Null/Undefined Access & Logic Errors

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | `MessageThread.tsx:118` | `handleSubmit` useCallback includes `inputValue` in deps — creates new function on every keystroke, defeating useCallback purpose. | Remove `inputValue` from deps; use ref for value or trust React's event pooling. |
| **MEDIUM** | `MessagingView.tsx:42` | `currentUserId || 0` default is dangerous. User ID 0 may be interpreted as valid "guest" user, potentially leaking data or causing incorrect permission checks. | Use `null` and add guard: `if (!currentUserId) return <Loading />`. |
| **MEDIUM** | `useMessaging.ts:92-108` | `markAsRead` emits even when viewing own messages. Should only mark when viewing other user's messages. | Add sender check before emitting. |
| **MEDIUM** | `ConversationListPanel.tsx:58-67` | Skeleton uses inline styles instead of styled-components — inconsistent, harder to maintain. | Convert to styled-components or use existing SkeletonLine. |

---

## 2. ARCHITECTURE FLAWS

### 2.1 God Hook Anti-Pattern

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | `useMessaging.ts` (entire file, ~285 lines) | Single hook manages: conversations, messages, typing, online presence, read receipts, polling, REST fallback, socket events. Violates Single Responsibility Principle. | Split into: `useConversations`, `useMessages`, `usePresence`, `useTypingIndicator`. |
| **HIGH** | `useSocket.ts:23-30` | Singleton `globalSocket` with refCount is fragile. Hard to test, hidden global state, potential memory leaks if any cleanup fails. | Use React Context with proper provider pattern instead of module-level singleton. |

### 2.2 Prop Drilling & Missing Context

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `MessagingView.tsx` → `MessageThread.tsx` | `connected`, `typingUsers`, `onlineUserIds` passed through multiple layers. Should use Socket Context. | Create `SocketProvider` context for socket state access. |
| **MEDIUM** | `MessagingTypes.ts` | `ConversationListProps` defined but not used in component (component has additional `mobileHidden` prop). | Update type to include all props or create extended interface. |

### 2.3 Type Safety Gaps

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `useSocket.ts:67,73` | Event handlers typed as `any`: `handler: (...args: any[]) => void`. Loses all type safety for socket events. | Create event type maps: `interface ServerEvents { new_message: MessageData; ... }`. |
| **HIGH** | `MessagingView.tsx:31` | Redux selector uses `any`: `useSelector((state: any) => ...)`. Completely defeats TypeScript purpose. | Define proper RootState interface and type the selector. |

---

## 3. INTEGRATION ISSUES

### 3.1 Frontend-Backend Contract Mismatches

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `useMessaging.ts:49,65` | Assumes API returns `{ conversations: [] }` and `{ messages: [] }`. Backend could return different shape. No runtime validation. | Add runtime type guards or use Zod schema validation. |
| **MEDIUM** | `useMessaging.ts:175` | Socket event `new_message` payload structure assumed: `message.conversation_id`, `message.sender_id`. If backend uses different field names, silently fails. | Document expected payload shape; add logging for unknown events. |
| **MEDIUM** | `useMessaging.ts:220` | `user_typing` event expects specific structure. No validation that data matches expected shape. | Add type guard: `if (!data.conversationId || !data.userId) return`. |

### 3.2 Missing Loading/Error States

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `useMessaging.ts` | No per-operation loading states. `createConversation`, `searchUsers` have no loading feedback to UI. | Add `creatingConversation: boolean`, `searchingUsers: boolean` to state. |
| **MEDIUM** | `MessageThread.tsx:136-148` | Skeleton shows 3 items always, regardless of actual load. Misleading to users. | Pass actual message count or loading duration from parent. |

### 3.3 WebSocket Reconnection Gaps

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | `useSocket.ts:52-58` | Socket configured with reconnection but no handling for "reconnecting" vs "connected" vs "disconnected" UI states. Single boolean `connected` insufficient. | Add `connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting'`. |
| **MEDIUM** | `useMessaging.ts:188-195` | When socket reconnects, doesn't re-join conversation rooms. User misses messages until they manually switch conversations. | Emit `join_conversations` on reconnection event, not just initial connect. |

---

## 4. DEAD CODE & TECH DEBT

### 4.1 Unused Code & Commented Blocks

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | `MessagingStyles.ts:282` | `MessageCircle` imported but used in ConversationListPanel. Icon should be imported where used, not in styles file. | Remove unused import. |
| **LOW** | `useMessaging.ts:42` | `pollRef` declared but polling logic only activates in specific conditions. Could be initialized lazily. | Initialize in effect where first used. |
| **LOW** | `MessageThread.tsx:55-57` | `formatMessageTime`, `formatDateLabel` recreated every render. Should be outside component or memoized. | Move outside component definition. |

### 4.2 TODO/FIXME Indicators

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | `useMessaging.ts:29` | "UPGRADE" comment documents old implementation but doesn't indicate what's incomplete. | Add TODO for missing features or remove comment. |

### 4.3 DRY Violations

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | `MessageThread.tsx:37-42`, `ConversationListPanel.tsx:25-30` | Duplicate `getInitials` functions in two components. | Extract to shared utility: `utils/string.ts`. |
| **MEDIUM** | `MessageThread.tsx:44-62`, `ConversationListPanel.tsx:13-22` | Duplicate `formatTime` logic (relative time formatting). | Extract to shared `utils/date.ts`. |

---

## 5. PRODUCTION READINESS

### 5.1 Console Statements & Debug Code

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `useSocket.ts:73` | `console.warn('[Socket] Connection error:', err.message)` — leaks to production. | Replace with proper error tracking: `analytics.track('socket_error', { ... })` or use logger. |
| **MEDIUM** | `useMessaging.ts:81,95` | `catch (err: any)` — silently sets error but doesn't log for debugging. | Add logging for uncaught errors with stack trace. |

### 5.2 Hardcoded Values & Missing Validation

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `useSocket.ts:30-35` | Hardcoded fallback URL `'http://localhost:10000'` for development. Will ship to production if env vars missing. | Add build-time validation that throws if required env vars missing in production. |
| **HIGH** | `useMessaging.ts:49` | `API_BASE = '/api/messaging'` assumes backend route structure. No validation that endpoint exists. | Add API health check on app init. |
| **MEDIUM** | `useMessaging.ts:113` | No input validation on `sendMessage` content. Empty/whitespace-only messages handled, but very long messages not truncated or validated. | Add max length validation (e.g., 4000 chars). |
| **MEDIUM** | `MessageThread.tsx:123`

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
