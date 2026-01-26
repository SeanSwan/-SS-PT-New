# Universal Master Schedule Component

**Component:** UniversalMasterSchedule
**Location:** `frontend/src/components/UniversalMasterSchedule/`
**Created:** 2026-01-26
**Last Updated:** 2026-01-26
**Status:** Active Development

---

## Overview

The Universal Master Schedule is a multi-view calendar component for managing training sessions across admin, trainer, and client dashboards. It provides session creation, editing, and visualization with role-based access controls.

## Component Structure

```
UniversalMasterSchedule/
├── UniversalMasterSchedule.tsx    # Main component (1700+ lines)
├── ui/
│   ├── CustomModal.tsx            # MUI-free modal
│   ├── CustomSelect.tsx           # MUI-free dropdown
│   └── CustomTabs.tsx             # MUI-free tab navigation
└── types/
    └── index.ts                   # TypeScript interfaces
```

## Features Implemented

### Session Management
- [x] Create sessions with trainer/client assignment
- [x] Duration options: 30/60/90/120 minutes (CustomSelect)
- [x] Location selection (In-Person/Online)
- [x] Manual client name entry toggle
- [x] Session status tracking (available/booked/blocked)

### Calendar Views
- [x] Month view (grid layout)
- [x] Week view (7-day horizontal)
- [x] Day view (hourly slots)
- [x] Session titles displayed (Available/Blocked/ClientName/Booked)

### Role-Based Access
- **Admin Mode:** Full CRUD, trainer assignment, client management
- **Trainer Mode:** View/manage own sessions
- **Client Mode:** View available sessions, book appointments

### UI/UX
- [x] MUI-free components (styled-components)
- [x] Galaxy-Swan theme compliance
- [x] Solid dropdown backgrounds (z-index: 9999)
- [x] Enhanced shadows for visual separation
- [x] Responsive design (mobile/tablet/desktop)

## API Integration

### Endpoints Used
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sessions` | GET | Fetch sessions by date range |
| `/api/sessions` | POST | Create new session |
| `/api/auth/trainers` | GET | Fetch trainer list for dropdowns |
| `/api/auth/clients` | GET | Fetch client list for dropdowns |

### Session Payload Structure
```javascript
{
  sessions: [{
    sessionDate: "ISO8601",
    startTime: "ISO8601",
    start: "ISO8601",
    endTime: "ISO8601",
    end: "ISO8601",
    duration: 30|60|90|120,
    location: "In-Person"|"Online",
    trainerId: number|null,
    userId: number|null,
    clientName: string|undefined,
    status: "available"
  }]
}
```

## Recent Changes

### 2026-01-26
- Added `title` property mapping for calendar views
- Enhanced dropdown box-shadow for better visual separation
- Increased dropdown border opacity
- Fixed defensive field mapping for API responses
- Duration changed from number input to CustomSelect

### Previous Updates
- Fixed session creation payload (sessionDate, userId fields)
- Fixed API endpoints (/api/auth/trainers vs /api/auth/users/trainers)
- Added sessions array wrapper for backend compatibility
- Fixed dropdown z-index and solid backgrounds

## Known Issues

- [ ] Sessions may not appear on calendar until page refresh
- [ ] Recurring session creation not yet implemented

## Related Documentation

- [Wireframe Specification](./universal-master-schedule.wireframe.md)
- [API Specification](./universal-master-schedule.api-spec.md)
- [UX/UI Design Protocol](/docs/ai-workflow/blueprints/UX-UI-DESIGN-PROTOCOL.md)

---

**Assigned AI:** Gemini (Builder), Claude (Architect)
**Review Status:** In Progress
