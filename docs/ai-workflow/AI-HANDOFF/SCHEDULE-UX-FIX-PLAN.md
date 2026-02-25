# Universal Master Schedule — Session Creation & Display Fix Plan

## Context

Admin schedule has UX and data-binding issues. Client/trainer/location/session-balance not showing on cards. Client dropdown missing photos. Manual client entry broken. Templates cluttered. Locations hardcoded.

**User requirement:** Client dropdown must show photo/avatar next to each name for easy recognition.

---

## Root-Cause Analysis

### Problem 1: Client name not on card after creation

**Data flow gap identified:**

```
Frontend sends: { userId: 10, trainerId: 5 }
    |
session.service.mjs:770 — bulkCreate() stores userId FK correctly
    |
session.service.mjs:805 — response uses session.get({plain:true})
    |                       Returns: { userId: 10, trainerId: 5 }
    |                       MISSING: client/trainer nested objects
    |
useCalendarData.ts:551 — tries session.client.firstName → UNDEFINED
    |
SessionCard.tsx:92 — renders "Available Slot" instead of client name
    |
refreshData() fires — full GET /api/sessions DOES include joins
    |
Card eventually shows name — but with visible flash/delay
```

**Root cause:** `createAvailableSessions()` returns raw `bulkCreate` output without re-fetching with Sequelize includes. The `useCalendarData` transformer expects `session.client.firstName` but gets nothing.

**Manual client name path is separately broken:** When `useManualClient=true`, frontend sends `clientName` string but no `userId`. Backend stuffs it into `notes` at line 778: `notes = "Client: {name}"`. Card renders `session.clientName` which is undefined — it's buried in notes, only visible in detail modal.

### Problem 2: No photo in dropdown

`SearchableSelectOption` interface (`SearchableSelect.tsx:24-28`) only has `{value, label, subLabel}`. No `image` field. Backend `GET /api/sessions/users/clients` returns `photo` per client, but frontend discards it when mapping to options at `ScheduleModals.tsx:521-525`.

### Problem 3: No sessions-remaining badge on card

`SessionCard.tsx:96-103` renders `packageInfo.sessionsRemaining` — but this requires explicit package binding (package name + total). The simpler `clientAvailableSessions` is extracted at `useCalendarData.ts:571` from `session.client.availableSessions` but is never passed to the card interface. `SessionCardData` doesn't have a top-level `sessionsRemaining` field.

### Problem 4: Hardcoded locations

`ScheduleModals.tsx:179-184` — static array: Main Studio, Gym Floor, Private Room, Online Session. No "Custom" option or free-text input. The Session model's `location` field is already a freeform `STRING` — it accepts anything, but the UI restricts to 4 choices.

### Problem 5: Template controls clutter

Templates are localStorage-only (via `useSessionTemplates` hook, 90 lines). Don't sync across devices. Default templates are trivial (60/30/90 min at Main Studio). The dropdown and "Save as Template" button occupy prime visual space in the create form without proportional value.

---

## Phase Plan

### Phase 0: Backend — Enrich session creation response

**Goal:** `POST /api/sessions` returns sessions with full client/trainer join data including `availableSessions`.

#### File to edit

`backend/services/sessions/session.service.mjs` — lines ~802-815

#### Change

After `transaction.commit()` (line 802), replace the plain-get formatting with a re-fetch:

```javascript
// Current (broken):
const formattedSessions = createdSessions.map(session => {
  const sessionData = session.get({ plain: true });
  return { ...sessionData, id: sessionData.id.toString(), ... };
});

// Fixed:
const createdIds = createdSessions.map(s => s.id);
const enrichedSessions = await this.Session.findAll({
  where: { id: { [Op.in]: createdIds } },
  include: [
    { model: this.User, as: 'client',
      attributes: ['id','firstName','lastName','email','phone','photo','availableSessions'] },
    { model: this.User, as: 'trainer',
      attributes: ['id','firstName','lastName','email','photo'] }
  ]
});
const formattedSessions = enrichedSessions.map(session => {
  const data = session.get({ plain: true });
  return { ...data, id: data.id.toString(), start: data.sessionDate,
           end: data.endDate, title: this.createSessionTitle(data) };
});
```

Re-fetch happens AFTER commit — data is persisted. Single `findAll` with `IN` on small ID set — milliseconds overhead.

#### Acceptance Gate 0

- `POST /api/sessions` with `userId` returns response containing `client: { id, firstName, lastName, photo, availableSessions }` and `trainer: { id, firstName, lastName, photo }`
- `POST /api/sessions` without `userId` returns `client: null`
- `GET /api/sessions/users/clients` returns `photo` and `availableSessions` per client (verify, likely already works)
- **`cd backend && npm test`** passes

---

### Phase 1: Frontend — Client dropdown with photo avatars

**Goal:** Upgrade SearchableSelect with avatar support. Remove manual client entry. Always send `clientId`.

#### Files to edit

| File | Change |
|------|--------|
| `frontend/src/components/UniversalMasterSchedule/ui/SearchableSelect.tsx` | Add `image?: string` to `SearchableSelectOption`. Render 32px circular avatar in each option row. Initials fallback when no photo. |
| `frontend/src/components/UniversalMasterSchedule/components/ScheduleModals.tsx` | Map `c.photo` into `SearchableSelectOption.image`. Remove manual client name checkbox + text input (lines 498-513). |
| `frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx` | Remove `manualClientName` from `formData` (line 238). Remove `useManualClient` state. Remove `clientName` from `sessionData` (lines 407, 417). |

#### SearchableSelect avatar spec

```
Option row layout:
[32px avatar] [label text        ] [sub-label right-aligned]
[  photo   ] [John Doe           ] [5 sessions            ]

Avatar circle:
- Size: 32px x 32px
- border-radius: 50%
- object-fit: cover
- border: 1px solid rgba(0, 206, 209, 0.3)
- Margin-right: 10px

Initials fallback (when no photo or img error):
- Same 32px circle
- Background: rgba(0, 206, 209, 0.15)
- Text: #00CED1, 12px, bold
- Content: First letter of firstName + firstName of lastName

Row: 44px min-height (touch target compliance)
```

#### Manual client entry decision: REMOVE

- Manual names bypass FK — breaks session tracking, conflict detection, notifications, badge
- If client not in DB, admin creates them first via user management
- Notes field remains for freeform annotations about walk-ins
- "Quick-add client" inline flow can be a follow-up feature

#### Acceptance Gate 1

- Client dropdown shows circular photo avatar (or initials) next to each name
- Sub-label shows "N sessions" per client
- No manual client name checkbox or text input in create form
- Creating a session with a selected client sends `userId` to backend
- Created session card shows client name immediately (no flash)
- **`cd frontend && npm run build`** passes
- **`cd frontend && npx vitest run --reporter verbose`** passes

---

### Phase 2: Frontend — Sessions-remaining badge on schedule card

**Goal:** Top-right badge on each scheduled session card showing client's remaining sessions.

#### Files to edit

| File | Change |
|------|--------|
| `frontend/.../Cards/SessionCard.tsx` | Add `sessionsRemaining?: number` to `SessionCardData` interface. Render color-coded badge in `CardHeader`. Update memo comparator. |
| `frontend/.../hooks/useCalendarData.ts` | In `transformedSessions` useMemo (line 548), map `clientAvailableSessions` to `sessionsRemaining` on the returned object. |
| `frontend/.../types.ts` | Add `sessionsRemaining?: number` to Session interface if needed for type safety. |

#### Badge spec

```
Card layout:
+------------------------------------------+
|  ● 10:00 AM   60 min          [5 left]   |  <-- badge top-right
|  John Doe                                 |
|  Trainer Jane Smith                       |
|  Main Studio                              |
+------------------------------------------+

Badge styling:
- border-radius: 8px
- padding: 2px 6px
- font-size: 0.7rem
- font-weight: 600
- position: in CardHeader flex, pushed right

Color thresholds:
  >= 5: bg rgba(16,185,129,0.2), text #10b981 (green)
  1-4:  bg rgba(245,158,11,0.2), text #f59e0b (yellow)
  0:    bg rgba(239,68,68,0.2),  text #ef4444 (red)

Visibility rules:
- Hidden when sessionsRemaining is null/undefined
- Hidden when status is 'available' or 'blocked'
- Hidden in compact density mode (schedulePerf.DISABLE_SESSION_BADGES)
```

#### Data flow

```
Backend: session.client.availableSessions = 5
  → useCalendarData.ts:571 extracts clientAvailableSessions = 5
  → Map to sessionsRemaining = 5
  → SessionCard renders [5 left] green badge
```

#### Acceptance Gate 2

- Cards with assigned clients show `[N left]` badge
- Badge color-coded: green/yellow/red per thresholds
- Badge hidden on available, blocked, compact mode
- Memo comparator includes `sessionsRemaining`

---

### Phase 3: Frontend — Custom location entry

**Goal:** Allow admin to enter freeform location alongside preset choices.

#### File to edit

`frontend/.../components/ScheduleModals.tsx` (lines 179-184, 567-575)

#### Change

```javascript
// Add to locationOptions:
const locationOptions = [
  { value: 'Main Studio', label: 'Main Studio' },
  { value: 'Gym Floor', label: 'Gym Floor' },
  { value: 'Private Room', label: 'Private Room' },
  { value: 'Online', label: 'Online Session' },
  { value: '__custom__', label: 'Custom...' }  // NEW
];
```

When `formData.location === '__custom__'`, render a text input below the dropdown. The typed value replaces `__custom__` in `formData.location` via a `customLocation` state.

No backend change — `location` is already a freeform `STRING` column.

#### Acceptance Gate 3

- "Custom..." appears as last option in location dropdown
- Selecting it reveals a text input
- Custom value sent to backend and persisted
- Custom location displays on session card
- Switching back to preset hides the text input

---

### Phase 4: Frontend — Collapse template controls

**Goal:** Reduce create form clutter by hiding templates behind expandable section.

#### File to edit

`frontend/.../components/ScheduleModals.tsx` (lines ~359-420)

#### Change

Wrap the template dropdown and "Save as template" UI in a collapsible section:

```jsx
<AdvancedSection>
  <AdvancedToggle onClick={() => setShowAdvanced(!showAdvanced)}>
    {showAdvanced ? '▼' : '▶'} Templates (Advanced)
  </AdvancedToggle>
  {showAdvanced && (
    <>
      {/* existing template dropdown + save button */}
    </>
  )}
</AdvancedSection>
```

Default: `showAdvanced = false`.

#### Acceptance Gate 4

- Template section collapsed by default when create modal opens
- Expanding shows template dropdown and save button
- Creating a session without expanding works normally
- Selecting a template still auto-fills form fields

---

### Phase 5: Backend — Audit all session fetch paths for consistent includes

**Goal:** Every session endpoint returns client/trainer data with `availableSessions`.

#### Files to audit

| File | Method/Endpoint | Check |
|------|----------------|-------|
| `session.service.mjs` | `getSessions()` | Client include has `'availableSessions'` in attributes |
| `session.service.mjs` | `getSessionById()` | Same |
| `session.service.mjs` | `bookSession()` response | Includes full client after booking |
| `session.service.mjs` | `confirmSession()` response | Same |
| `session.service.mjs` | `assignTrainer()` response | Same |
| `scheduleController.mjs` | `GET /api/schedule` | SQL join includes `availableSessions` in resource JSON |

If any include is missing `availableSessions`, add it to the attributes array.

#### Acceptance Gate 5

- `GET /api/sessions` returns `session.client.availableSessions` for all sessions with clients
- `GET /api/sessions/:id` returns same
- `POST /api/sessions/:id/book` response includes `client.availableSessions`
- **`cd backend && npm test`** passes

---

## Delivery Order and Dependencies

```
Phase 0 (Backend enrich) ──────── MUST BE FIRST
    │
    ├── Phase 1 (Dropdown + photos) ── depends on Phase 0
    │       │
    │       ├── Phase 2 (Badge) ── depends on Phase 1 data flow
    │       │
    │       └── Phase 3 (Custom location) ── parallel with Phase 2
    │
    ├── Phase 4 (Collapse templates) ── independent of all
    │
    └── Phase 5 (Audit fetch paths) ── independent, parallel with Phase 1+
```

---

## Complete File Map

### Files to EDIT (changes required)

| File | Phase(s) | Summary |
|------|----------|---------|
| `backend/services/sessions/session.service.mjs` | 0, 5 | Re-fetch created sessions with includes; audit all fetch paths for `availableSessions` |
| `frontend/src/components/UniversalMasterSchedule/ui/SearchableSelect.tsx` | 1 | Add `image` to option type; render 32px avatar with initials fallback |
| `frontend/src/components/UniversalMasterSchedule/components/ScheduleModals.tsx` | 1, 3, 4 | Wire `c.photo` to dropdown; remove manual client entry; add Custom location; collapse templates |
| `frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx` | 1 | Remove `manualClientName`, `useManualClient` state; simplify `handleCreateSession` |
| `frontend/src/components/UniversalMasterSchedule/Cards/SessionCard.tsx` | 2 | Add `sessionsRemaining` to interface; render badge; update memo comparator |
| `frontend/src/components/UniversalMasterSchedule/hooks/useCalendarData.ts` | 2 | Map `clientAvailableSessions` to `sessionsRemaining` in transformation |
| `frontend/src/components/UniversalMasterSchedule/types.ts` | 2 | Add `sessionsRemaining?: number` to Session interface |

### Files to AUDIT (read-only unless gaps found)

| File | Phase | Check |
|------|-------|-------|
| `backend/controllers/scheduleController.mjs` | 5 | SQL join includes `availableSessions` |
| `backend/routes/sessions.mjs` | 5 | Mutation response endpoints include joins |
| `frontend/src/redux/slices/scheduleSlice.ts` | 1 | Client data shape preserved through Redux |
| `frontend/src/services/universal-master-schedule-service.ts` | 1 | Service passes response data through correctly |

---

## API/Data Contract Updates

### POST /api/sessions — Response enrichment (additive, backward-compatible)

**Before:**
```json
{
  "success": true,
  "sessions": [
    { "id": "123", "sessionDate": "2026-02-25T10:00:00Z", "userId": 10, "trainerId": 5, "location": "Main Studio", "status": "scheduled" }
  ]
}
```

**After:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "123", "sessionDate": "2026-02-25T10:00:00Z", "userId": 10, "trainerId": 5,
      "location": "Main Studio", "status": "scheduled",
      "client": {
        "id": 10, "firstName": "John", "lastName": "Doe",
        "email": "john@example.com", "photo": "https://...",
        "availableSessions": 5
      },
      "trainer": {
        "id": 5, "firstName": "Jane", "lastName": "Smith",
        "email": "jane@example.com", "photo": "https://..."
      }
    }
  ]
}
```

**Backward compatible:** Additive fields only.

### GET /api/sessions — Verify `availableSessions` in client include

May need to add `'availableSessions'` to the attributes array in the client include.

### No new endpoints needed. No database schema changes needed.

---

## Template Decision

**Collapse, don't remove.**

- Templates are localStorage-only — zero backend cost
- Code is isolated in `useSessionTemplates` hook (90 lines)
- Some power users may value quick-fill for repetitive patterns
- Removing creates dead code + test churn for no clear gain
- Wrapped in collapsible section, default closed = zero impact on common flow

---

## Acceptance Criteria (Measurable)

| # | Criterion | Pass/Fail Check |
|---|-----------|-----------------|
| AC-1 | Search clients by name | Type "Joh" → see "John Doe" in filtered results |
| AC-2 | Dropdown shows photo avatar | Circular photo visible next to name; initials when no photo |
| AC-3 | Dropdown shows remaining sessions | Sub-label "N sessions" under each name |
| AC-4 | Card shows client name immediately | No "Available Slot" flash after creation |
| AC-5 | Card shows client name prominently | `NameText` renders full name |
| AC-6 | Card shows trainer name | `MetaText` renders trainer name |
| AC-7 | Card shows location | `MetaText` renders location string |
| AC-8 | Card shows sessions-remaining badge | `[N left]` badge, color-coded |
| AC-9 | Custom location works | "Custom..." → text input → persists → shows on card |
| AC-10 | Templates collapsed by default | Create modal opens without template dropdown visible |
| AC-11 | No manual client name entry | No checkbox/text input for manual names |
| AC-12 | Badge updates after booking | Count decrements on refresh |
| AC-13 | Badge hidden on available/blocked | No badge on empty/blocked slots |

---

## Verification Commands (STRICT gates)

```bash
# Frontend build
cd frontend && npm run build

# Frontend tests
cd frontend && npx vitest run --reporter verbose

# Backend tests
cd backend && npm test

# Type check (informational — ~3304 pre-existing errors)
cd frontend && npx tsc --noEmit
```

### Manual QA Scenarios

| Scenario | Steps | Expected |
|----------|-------|----------|
| Create with client | Schedule → Create → Search "John" → Select → Create | Card: "John Doe", trainer, location, [N left] badge |
| Create without client | Leave client empty → Create | Card: "Available Slot", no badge |
| Custom location | Location → Custom... → "Central Park" → Create | Card shows "Central Park" |
| Photo avatars | Open client dropdown | Photos visible; initials fallback for no-photo clients |
| Badge colors | Create for clients with 0, 3, 10 remaining | Red, yellow, green badges |
| Template collapse | Open create modal | No template section visible; click to expand |
| Mobile (375px) | Create modal → search clients | 44px touch targets, scrollable dropdown, avatars visible |
| Tablet (768px) | Same flow | Adapts, no overflow |

### Edge Cases

| Edge Case | Expected |
|-----------|----------|
| Client with no photo | Initials circle (first letter of first+last name) |
| Client with 0 sessions | Red `[0 left]` badge — session still creatable (admin override) |
| Deleted client (soft-deleted) | Not shown in dropdown |
| `availableSessions` is null | No badge shown |
| Very long client name | Truncated with ellipsis |
| No clients in DB | "No clients found" helper text |
| Double-booking attempt | Existing conflict detection fires — no change needed |
| Timezone mismatch | Rendered in browser local timezone (existing behavior) |
| Stale session count | Badge shows count at fetch time; server validates on booking |

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Re-fetch after bulkCreate adds latency | LOW | Single `findAll` with `IN` on small ID set — milliseconds |
| Removing manual client entry breaks a workflow | LOW | Notes field for freeform text; "Quick-add client" as follow-up if needed |
| `availableSessions` stale between fetches | MEDIUM | Badge is informational, not a gate. Server validates on booking. Refreshes on 30s interval. |
| Photo URLs broken/expired | LOW | `img onerror` → initials fallback. App already has `imageErrorHandler` utility. |
| SearchableSelect with 500+ clients | LOW | Client-side filter with `useMemo`. 500 items well within DOM perf budget. |

---

## Rollback Plan

All changes are additive and backward-compatible. One commit per phase. Each independently revertable.

| Phase | Rollback |
|-------|----------|
| 0 | Revert re-fetch in service. Response returns flat. Frontend falls back to `refreshData()` for name resolution (slower but works). |
| 1 | Revert SearchableSelect. Dropdown text-only. Re-add manual client if needed. |
| 2 | Remove badge from SessionCard. Cards return to current display. |
| 3 | Remove "Custom..." from location array. 4 fixed choices. |
| 4 | Unwrap template section. Visible by default again. |
| 5 | Audit-only — no rollback needed unless includes were changed. |

---

## Open Questions (Need Owner Input)

1. **"Quick-add client" button?** If removing manual entry, should dropdown have inline "Create new client" (minimal form: first name, last name, email)? **Recommendation: defer — Notes field handles walk-ins for now.**

2. **Real-time badge updates via WebSocket?** Currently refreshes with session list (30s or manual). **Recommendation: defer — badge is informational, server validates on booking.**

3. **Location history/recents?** Remember custom locations for reuse? **Recommendation: defer — nice follow-up, adds scope.**

4. **Compact density badge: hide or shrink?** **Recommendation: hide — consistent with existing `DISABLE_SESSION_BADGES` flag.**
