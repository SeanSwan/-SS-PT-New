# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 68.8s
> **Files:** docs/ai-workflow/blueprints/SOCIAL-RPG-COMMUNITY-UPGRADE-PLAN.md
> **Generated:** 3/31/2026, 9:10:35 PM

---

# SwanStudios Social + RPG Community Platform — Architectural Review

**Reviewer:** Senior React/TypeScript Architect
**Plan:** `docs/ai-workflow/blueprints/SOCIAL-RPG-COMMUNITY-UPGRADE-PLAN.md`
**Review Date:** 2026-03-31
**Verdict:** ⚠️ **CONDITIONALLY APPROVED** — Significant architectural gaps require resolution before implementation begins

---

## Executive Summary

The plan is **strategically sound and visually coherent** but contains **critical architectural omissions** that will cause production incidents if unaddressed. The component tree is well-scoped but missing the hook layer entirely. State management for real-time features (party HP, faction scores, live ticker) is unspecified. Several proposed files will exceed 300 lines by 2-3x. Error boundaries are absent from the plan entirely.

---

## Finding Index

| # | Severity | Category | File/Component |
|---|----------|----------|----------------|
| 1 | 🔴 CRITICAL | State Management | Hook composition missing entirely |
| 2 | 🔴 CRITICAL | Data Flow | Race condition in conversation/party loading |
| 3 | 🔴 CRITICAL | Real-Time Architecture | Socket.IO event management unscoped |
| 4 | 🟠 HIGH | File Budget | 7 files will exceed 300 lines |
| 5 | 🟠 HIGH | Component Decomposition | `CommunityDetail.tsx` doing too much |
| 6 | 🟠 HIGH | Component Decomposition | `EventDetail.tsx` scope creep |
| 7 | 🟠 HIGH | Error Boundaries | Completely absent from plan |
| 8 | 🟡 MEDIUM | React Patterns | Missing memoization strategy for feed |
| 9 | 🟡 MEDIUM | Hook Design | Data fetching vs UI state not separated |
| 10 | 🟡 MEDIUM | Component Decomposition | `RPGProfileHeader.tsx` violates SRP |
| 11 | 🟡 MEDIUM | State Management | Party HP shared state — no single source of truth |
| 12 | 🟡 MEDIUM | Data Flow | Live activity ticker stale closure risk |
| 13 | 🟢 LOW | React Patterns | `BadgeShowcase.tsx` drag-and-drop needs isolation |
| 14 | 🟢 LOW | File Budget | `FactionLeaderboard.tsx` will bloat |
| 15 | 🟢 LOW | Hook Design | Location hook missing from plan |

---

## 🔴 CRITICAL Findings

---

### Finding 1 — State Management: Hook Composition Layer Missing Entirely

**Severity:** 🔴 CRITICAL
**Files Affected:** All new components under `frontend/src/components/Social/`

**Issue:**

The plan specifies 26 new components but **zero custom hooks**. This is the most dangerous omission. Without a defined hook layer, every developer will make different decisions about where state lives, leading to:

- Business logic embedded directly in components (untestable)
- Prop drilling 4-5 levels deep (Party → PartyWidget → PartyChat → member avatar)
- Duplicate API calls (EventCard and EventDetail both fetching the same event)
- No clear ownership of Socket.IO subscriptions (who subscribes? who cleans up?)

The plan references a `useCoachAssistant → useAIChat → useConversationSidebar` pattern in the existing codebase but does not extend this pattern to any new feature.

**Recommended Fix:**

Define a parallel hook architecture before writing any component:

```typescript
// frontend/src/hooks/social/
├── data/
│   ├── useEvents.ts              — CRUD + pagination for events
│   ├── useCommunity.ts           — Community data + membership state
│   ├── useParty.ts               — Party data + HP calculations
│   ├── useFaction.ts             — Faction data + leaderboard
│   └── useNearbyDiscovery.ts     — Location-based queries
├── realtime/
│   ├── useLiveActivityFeed.ts    — SSE/Socket subscription + buffer
│   ├── usePartySocket.ts         — Party HP + chat socket events
│   └── useFactionSocket.ts       — Faction score socket events
└── ui/
    ├── useEventRSVP.ts           — RSVP optimistic update + rollback
    ├── usePartyInvite.ts         — Invite flow UI state
    └── useFactionSelector.ts     — Faction choice modal state

// Composition rule: components import from ui/ hooks only
// ui/ hooks compose data/ and realtime/ hooks
// No component imports directly from data/ or realtime/
```

**Composition contract:**

```typescript
// ✅ CORRECT — EventDetail.tsx
const EventDetail: React.FC<{ eventId: string }> = ({ eventId }) => {
  const { event, isLoading, error } = useEventRSVP(eventId); // ui/ hook
  // useEventRSVP internally composes useEvents (data) + usePartySocket (realtime)
};

// ❌ WRONG — what will happen without this plan
const EventDetail: React.FC<{ eventId: string }> = ({ eventId }) => {
  const [event, setEvent] = useState(null);
  const [rsvpStatus, setRsvpStatus] = useState(null);
  const socket = useContext(SocketContext); // direct socket access in component
  useEffect(() => { /* 80 lines of fetch + socket logic */ }, [eventId]);
};
```

---

### Finding 2 — Data Flow: Race Condition in Party/Community Loading

**Severity:** 🔴 CRITICAL
**Files Affected:** `Party/PartyWidget.tsx`, `Communities/CommunityDetail.tsx`, `Events/EventDetail.tsx`

**Issue:**

The plan describes a flow where clicking a party/community/event loads detail data, but does not address the **stale state + concurrent request** problem. This pattern will appear in all three features:

```
User clicks Party A → request fires → user clicks Party B → 
Party B response arrives first → Party A response arrives second → 
UI shows Party A data with Party B's ID in the URL
```

This is a classic race condition. At SwanStudios' current scale it's survivable, but the plan calls for Socket.IO real-time updates layered on top — which makes this **catastrophically worse**. If Party A's socket subscription is still active when Party B loads, HP updates for Party A will mutate Party B's displayed state.

**Recommended Fix:**

Implement request cancellation and subscription cleanup as a first-class concern in `useParty.ts`:

```typescript
// frontend/src/hooks/social/data/useParty.ts
export function useParty(partyId: string | null) {
  const [state, dispatch] = useReducer(partyReducer, initialState);
  const abortRef = useRef<AbortController | null>(null);
  const socketRef = useRef<SocketSubscription | null>(null);

  useEffect(() => {
    if (!partyId) return;

    // Cancel previous request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Unsubscribe previous socket
    socketRef.current?.unsubscribe();

    dispatch({ type: 'LOADING' });

    fetchParty(partyId, { signal: abortRef.current.signal })
      .then(party => dispatch({ type: 'LOADED', payload: party }))
      .catch(err => {
        if (err.name !== 'AbortError') {
          dispatch({ type: 'ERROR', payload: err });
        }
        // AbortError is expected — swallow silently
      });

    // Subscribe to real-time updates ONLY after load
    socketRef.current = subscribeToPartyHP(partyId, (update) => {
      dispatch({ type: 'HP_UPDATE', payload: update });
    });

    return () => {
      abortRef.current?.abort();
      socketRef.current?.unsubscribe();
    };
  }, [partyId]); // partyId change triggers full cleanup + reload

  return state;
}
```

**Apply this pattern to:** `useEvents`, `useCommunity`, `useFaction` — all detail-loading hooks.

---

### Finding 3 — Real-Time Architecture: Socket.IO Event Management Unscoped

**Severity:** 🔴 CRITICAL
**Files Affected:** `Activity/LiveActivityTicker.tsx`, `Party/PartyWidget.tsx`, `Party/PartyChat.tsx`, `Factions/FactionLeaderboard.tsx`

**Issue:**

The plan lists 5 Socket.IO events:
```
'social:activity'
'party:hp_update'
'party:message'
'faction:score_update'
'event:rsvp_update'
```

But does not specify:

1. **Who creates the socket connection?** If each component creates its own, a user viewing their profile with PartyWidget + FactionLeaderboard + LiveActivityTicker will open 3 separate socket connections.
2. **Who owns the subscription lifecycle?** If `PartyWidget` subscribes to `party:hp_update` and the user navigates away without unmounting (React Router keeps it in the tree), the subscription leaks.
3. **What is the reconnection strategy?** The plan mentions Socket.IO but not exponential backoff, missed-event recovery, or offline queuing.
4. **Battery impact on mobile** — the plan itself asks this question (Q11) but provides no answer. Continuous socket connection on mobile is a known battery drain.

**Recommended Fix:**

Define a singleton socket manager with a pub/sub multiplexer:

```typescript
// frontend/src/services/socket/SocialSocketManager.ts
class SocialSocketManager {
  private socket: Socket | null = null;
  private subscribers = new Map<string, Set<(data: unknown) => void>>();
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_DELAY = 30_000;

  connect(authToken: string): void {
    if (this.socket?.connected) return; // Singleton — never double-connect

    this.socket = io('/social', {
      auth: { token: authToken },
      reconnectionDelay: 1000,
      reconnectionDelayMax: this.MAX_RECONNECT_DELAY,
      reconnectionAttempts: 10,
    });

    // Route all events through internal pub/sub
    SOCIAL_EVENTS.forEach(event => {
      this.socket!.on(event, (data) => this.emit(event, data));
    });
  }

  subscribe<T>(event: SocialSocketEvent, handler: (data: T) => void): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)!.add(handler as (data: unknown) => void);

    // Return unsubscribe function — caller MUST call this in useEffect cleanup
    return () => {
      this.subscribers.get(event)?.delete(handler as (data: unknown) => void);
    };
  }

  // Visibility API integration — pause on tab hidden (mobile battery)
  handleVisibilityChange(): void {
    if (document.hidden) {
      this.socket?.disconnect();
    } else {
      this.socket?.connect();
    }
  }
}

export const socialSocket = new SocialSocketManager();
```

```typescript
// frontend/src/hooks/social/realtime/usePartySocket.ts
export function usePartySocket(partyId: string | null) {
  const [hpUpdate, setHpUpdate] = useState<PartyHPUpdate | null>(null);

  useEffect(() => {
    if (!partyId) return;

    // Single subscription through manager — no direct socket access
    const unsubscribe = socialSocket.subscribe<PartyHPUpdate>(
      'party:hp_update',
      (update) => {
        if (update.partyId === partyId) { // Filter by ID — critical
          setHpUpdate(update);
        }
      }
    );

    return unsubscribe; // Guaranteed cleanup
  }, [partyId]);

  return hpUpdate;
}
```

**The Visibility API integration** directly answers the plan's own Q11 about mobile battery impact.

---

## 🟠 HIGH Findings

---

### Finding 4 — File Budget: 7 Files Will Exceed 300 Lines

**Severity:** 🟠 HIGH
**Files Affected:** Multiple

| File | Estimated Lines | Reason for Bloat | Split Strategy |
|------|----------------|------------------|----------------|
| `CommunityDetail.tsx` | ~600 | Feed + members + challenges + moderation in one component | See Finding 5 |
| `EventDetail.tsx` | ~500 | Map + RSVP + discussion + photos + recurring logic | See Finding 6 |
| `RPGProfileHeader.tsx` | ~450 | Job class + faction + pet + fortress + moodlet + achievements | See Finding 10 |
| `CreateEventModal.tsx` | ~400 | Multi-step form with map, recurrence, validation | Split into `CreateEventForm` + `EventLocationPicker` + `EventRecurrenceSelector` |
| `WeeklyRecap.tsx` | ~380 | Stories-format animation + 7-day data aggregation + share logic | Split into `WeeklyRecapCard` (display) + `useWeeklyRecap` (data) |
| `FactionLeaderboard.tsx` | ~320 | Three factions + historical charts + challenge display | Split into `FactionLeaderboard` (container) + `FactionStandingRow` + `FactionChallengeCard` |
| `PartyWidget.tsx` | ~310 | HP bar + member list + damage animation + party chat trigger | Split HP display from member management |

**Recommended Fix — enforce at PR review:**

```typescript
// Add to .eslintrc or create a custom rule
// Soft limit: warn at 250 lines
// Hard limit: block merge at 300 lines
// Exception process: requires architect sign-off with documented reason
```

---

### Finding 5 — Component Decomposition: `CommunityDetail.tsx` Violates SRP

**Severity:** 🟠 HIGH
**File:** `Communities/CommunityDetail.tsx`

**Issue:**

As specified, `CommunityDetail.tsx` must render: community feed (paginated posts), member list (with roles), community challenges, community-specific leaderboard, moderation controls (for owners/mods), and join/leave actions. This is **5 distinct concerns** in one file.

**Recommended Fix:**

```
Communities/
├── CommunityDetail.tsx          — Layout shell + tab routing only (~80 lines)
├── CommunityFeed.tsx            — Filtered post feed for this community (~120 lines)
├── CommunityMembers.tsx         — Member list + role management (~100 lines)
├── CommunityChallenges.tsx      — Community-specific challenges (~100 lines)
├── CommunityHeader.tsx          — Banner, description, join/leave CTA (~80 lines)
└── CommunityModerationPanel.tsx — Owner/mod tools (lazy loaded) (~150 lines)
```

```typescript
// CommunityDetail.tsx — shell only
const CommunityDetail: React.FC<{ communityId: string }> = ({ communityId }) => {
  const { community, membership } = useCommunity(communityId);

  return (
    <CommunityLayout>
      <CommunityHeader community={community} membership={membership} />
      <Tabs>
        <Tab label="Feed"><CommunityFeed communityId={communityId} /></Tab>
        <Tab label="Members"><CommunityMembers communityId={communityId} /></Tab>
        <Tab label="Challenges"><CommunityChallenges communityId={communityId} /></Tab>
        {membership?.role === 'moderator' && (
          <Tab label="Moderate">
            <Suspense fallback={<Spinner />}>
              <CommunityModerationPanel communityId={communityId} />
            </Suspense>
          </Tab>
        )}
      </Tabs>
    </CommunityLayout>
  );
};
```

**Note:** `CommunityModerationPanel` is lazy-loaded — most users never see it, no reason to bundle it eagerly.

---

### Finding 6 — Component

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
