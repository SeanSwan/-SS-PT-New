# Universal Master Schedule - API Specification

**Component:** UniversalMasterSchedule
**Created:** 2026-01-26
**Last Updated:** 2026-01-26
**Backend:** Express.js + Sequelize

---

## ENDPOINTS

### 1. Fetch Sessions

**GET** `/api/sessions`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | ISO8601 | No | Filter sessions from this date |
| endDate | ISO8601 | No | Filter sessions until this date |
| trainerId | number | No | Filter by trainer |
| userId | number | No | Filter by client |
| status | string | No | Filter by status |

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "sessionDate": "2026-01-26T09:00:00.000Z",
      "start": "2026-01-26T09:00:00.000Z",
      "end": "2026-01-26T10:00:00.000Z",
      "duration": 60,
      "location": "In-Person",
      "status": "available",
      "trainerId": 2,
      "userId": null,
      "clientName": null,
      "notes": "",
      "isBlocked": false,
      "isRecurring": false,
      "recurringGroupId": null,
      "trainer": {
        "id": 2,
        "firstName": "John",
        "lastName": "Trainer"
      },
      "client": null
    }
  ]
}
```

**Alternative Response Formats (Frontend handles all):**
```json
// Format 1: Direct array
[{ "id": 1, ... }]

// Format 2: Wrapped in success/data
{ "success": true, "data": [...] }

// Format 3: Wrapped in sessions
{ "sessions": [...] }
```

---

### 2. Create Session

**POST** `/api/sessions`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "sessions": [
    {
      "sessionDate": "2026-01-26T09:00:00.000Z",
      "startTime": "2026-01-26T09:00:00.000Z",
      "start": "2026-01-26T09:00:00.000Z",
      "endTime": "2026-01-26T10:00:00.000Z",
      "end": "2026-01-26T10:00:00.000Z",
      "duration": 60,
      "location": "In-Person",
      "trainerId": 2,
      "userId": null,
      "clientName": null,
      "notifyClient": false,
      "status": "available",
      "notes": ""
    }
  ]
}
```

**Field Requirements:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| sessionDate | ISO8601 | Yes | Primary date field |
| startTime | ISO8601 | Yes | Backend validation requires this |
| start | ISO8601 | Yes | Fallback date field |
| endTime | ISO8601 | Yes | Calculated from duration |
| end | ISO8601 | Yes | Fallback end field |
| duration | number | Yes | 30, 60, 90, or 120 minutes |
| location | string | Yes | "In-Person" or "Online" |
| trainerId | number | No | Trainer assignment |
| userId | number | No | Client assignment |
| clientName | string | No | Manual client name |
| status | string | Yes | "available" default |

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Session created successfully",
  "data": {
    "id": 5,
    "sessionDate": "2026-01-26T09:00:00.000Z",
    "status": "available"
  }
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Sessions array is required in request body"
}
```

```json
{
  "success": false,
  "error": "Each session must include a start time"
}
```

---

### 3. Fetch Trainers

**GET** `/api/auth/trainers`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
[
  {
    "id": 2,
    "userId": 2,
    "firstName": "John",
    "lastName": "Trainer",
    "email": "trainer@example.com",
    "role": "trainer"
  }
]
```

**Frontend Defensive Mapping:**
```javascript
// Handle various field names
value: (t.id || t.userId || t._id)?.toString(),
label: t.name || `${t.firstName || t.first_name || 'Unknown'} ${t.lastName || t.last_name || 'Trainer'}`.trim()
```

---

### 4. Fetch Clients

**GET** `/api/auth/clients`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
[
  {
    "id": 5,
    "userId": 5,
    "firstName": "Jane",
    "lastName": "Client",
    "email": "client@example.com",
    "role": "client"
  }
]
```

**Frontend Defensive Mapping:**
```javascript
// Handle various field names and empty values
value: (c.id || c.userId || c._id)?.toString(),
label: c.name || `${c.firstName || c.first_name || ''} ${c.lastName || c.last_name || ''}`.trim() || c.email || 'Unknown Client'
```

---

## BACKEND ROUTE HANDLER

**File:** `backend/routes/sessionRoutes.mjs`

**Session Creation Handler:**
```javascript
// Handle both single object and { sessions: [...] } wrapper
let data = req.body;
if (req.body.sessions && Array.isArray(req.body.sessions) && req.body.sessions.length > 0) {
  data = req.body.sessions[0];
}

const { sessionDate, duration, location, trainerId, userId, ... } = data;
```

---

## ERROR HANDLING

### Frontend Error Flow
1. API call fails → Catch error
2. Display user-friendly message
3. Log detailed error to console
4. Provide retry option

### Common Errors

| Status | Error | User Message |
|--------|-------|--------------|
| 400 | Validation failed | "Please fill all required fields" |
| 401 | Unauthorized | "Session expired. Please log in again" |
| 403 | Forbidden | "You don't have permission" |
| 500 | Server error | "Server error. Please try again" |

---

## FRONTEND DATA NORMALIZATION

**Location:** `UniversalMasterSchedule.tsx:230-257`

```javascript
// Normalize various API response formats
let normalized = [];
if (Array.isArray(result)) {
  normalized = result;
} else if (result.success && result.data) {
  normalized = Array.isArray(result.data) ? result.data : [];
} else {
  normalized = result.sessions || [];
}

// Map sessions with computed fields
setSessions(normalized.map((session: any) => {
  const clientName = session.clientName ||
    (session.client ? `${session.client.firstName} ${session.client.lastName}` : undefined);
  const trainerName = session.trainerName ||
    (session.trainer ? `${session.trainer.firstName} ${session.trainer.lastName}` : undefined);

  // Compute display title
  let title = 'Available';
  if (session.status === 'blocked') title = 'Blocked';
  else if (clientName) title = clientName;
  else if (session.status !== 'available') title = 'Booked';

  return {
    ...session,
    title,
    isBlocked: Boolean(session.isBlocked) || session.status === 'blocked',
    isRecurring: Boolean(session.isRecurring) || Boolean(session.recurringGroupId),
    clientName,
    trainerName
  };
}));
```

---

## TESTING CHECKLIST

- [ ] Create session with all required fields
- [ ] Create session with trainer assignment
- [ ] Create session with client assignment
- [ ] Create session with manual client name
- [ ] Fetch sessions by date range
- [ ] Fetch trainers for dropdown
- [ ] Fetch clients for dropdown
- [ ] Handle 400 validation errors
- [ ] Handle 401 authentication errors
- [ ] Handle 500 server errors
- [ ] Verify session appears on calendar after creation
