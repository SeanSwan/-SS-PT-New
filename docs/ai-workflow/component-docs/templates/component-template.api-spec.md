# [Component Name] - API Specification

**Component:** [Component Name]
**Created:** [Date]
**Last Updated:** [Date]
**Assigned To:** Roo Code (Backend Specialist)

---

## 📋 OVERVIEW

This file documents ALL API endpoints used by [Component Name].

**Purpose:** Define exact API contract before implementation begins.

---

## 🔌 API ENDPOINTS

### **Endpoint 1: [GET/POST/PUT/DELETE] /api/[resource]**

**Purpose:** [What this endpoint does]

**Method:** `GET` / `POST` / `PUT` / `DELETE`

**URL:** `/api/[resource]/:id`

**Authentication:** Required / Not Required

**Authorization:** [Who can access - user must own resource, admin only, public, etc.]

---

#### **Request:**

**Headers:**
```http
Authorization: Bearer [JWT_TOKEN]
Content-Type: application/json
```

**URL Parameters:**
```
:id - Resource ID (UUID format)
```

**Query Parameters:**
```
?filter=[value] - Filter results by field
?sort=[field] - Sort by field (default: createdAt)
?order=[asc|desc] - Sort order (default: desc)
?page=[number] - Page number (default: 1)
&limit=[number] - Items per page (default: 10, max: 100)
```

**Request Body (for POST/PUT):**
```json
{
  "field1": "value1",
  "field2": 123,
  "field3": {
    "nestedField": "nestedValue"
  },
  "field4": ["array", "of", "values"]
}
```

**Validation Rules:**
- `field1`: Required, string, max 255 chars, no special chars
- `field2`: Required, integer, between 0-100
- `field3`: Optional, object
- `field4`: Optional, array of strings

---

#### **Response:**

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "field1": "value1",
    "field2": 123,
    "createdAt": "2025-10-29T12:00:00Z",
    "updatedAt": "2025-10-29T12:00:00Z"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-10-29T12:00:00Z"
  }
}
```

**Success (201 Created) - for POST:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "field1": "value1",
    "field2": 123,
    "createdAt": "2025-10-29T12:00:00Z"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-10-29T12:00:00Z"
  }
}
```

**Paginated Response (for GET with pagination):**
```json
{
  "success": true,
  "data": [
    {"id": "1", "field1": "value1"},
    {"id": "2", "field1": "value2"}
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "pages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-10-29T12:00:00Z"
  }
}
```

---

#### **Error Responses:**

**400 Bad Request (Validation Error):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "field1",
        "message": "field1 is required"
      },
      {
        "field": "field2",
        "message": "field2 must be between 0 and 100"
      }
    ]
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-10-29T12:00:00Z"
  }
}
```

**401 Unauthorized (Not Authenticated):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required. Please log in."
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-10-29T12:00:00Z"
  }
}
```

**403 Forbidden (Not Authorized):**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You don't have permission to access this resource"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-10-29T12:00:00Z"
  }
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-10-29T12:00:00Z"
  }
}
```

**409 Conflict (Duplicate):**
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Resource already exists with this identifier"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-10-29T12:00:00Z"
  }
}
```

**429 Too Many Requests (Rate Limit):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 60 seconds.",
    "retryAfter": 60
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-10-29T12:00:00Z"
  }
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred. Our team has been notified."
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-10-29T12:00:00Z"
  }
}
```

---

#### **Database Query:**

**Table:** `[table_name]`

**SQL (for GET):**
```sql
SELECT
  id,
  field1,
  field2,
  created_at,
  updated_at
FROM [table_name]
WHERE user_id = $1  -- Row-Level Security
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

**SQL (for POST):**
```sql
INSERT INTO [table_name] (
  id,
  user_id,
  field1,
  field2,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  $1,  -- user_id from JWT
  $2,  -- field1
  $3,  -- field2
  NOW(),
  NOW()
)
RETURNING *;
```

**SQL (for PUT):**
```sql
UPDATE [table_name]
SET
  field1 = $2,
  field2 = $3,
  updated_at = NOW()
WHERE id = $1
  AND user_id = $4  -- Row-Level Security
  AND deleted_at IS NULL
RETURNING *;
```

**SQL (for DELETE - soft delete):**
```sql
UPDATE [table_name]
SET
  deleted_at = NOW(),
  updated_at = NOW()
WHERE id = $1
  AND user_id = $2  -- Row-Level Security
  AND deleted_at IS NULL
RETURNING *;
```

---

#### **Performance:**

**Target Response Time:** <500ms (p95)
**Database Query Time:** <100ms (p95)
**Rate Limit:** 10 requests/minute per user

**Caching:**
- **Cache Key:** `[component]:[userId]:[params]`
- **TTL:** 5 minutes
- **Invalidation:** On POST/PUT/DELETE to same resource
- **Storage:** Redis

**Example:**
```javascript
const cacheKey = `progress_chart:${userId}:last_30_days`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const data = await db.query(/* ... */);
await redis.setex(cacheKey, 300, JSON.stringify(data)); // 5 min TTL

return data;
```

---

## 🔐 SECURITY

### **Authentication:**
- **Method:** JWT (JSON Web Token)
- **Header:** `Authorization: Bearer [token]`
- **Token Expiry:** 24 hours
- **Refresh:** Use refresh token endpoint

**JWT Payload:**
```json
{
  "userId": "uuid-here",
  "role": "client" | "trainer" | "admin",
  "iat": 1234567890,
  "exp": 1234654290
}
```

---

### **Authorization (Row-Level Security):**

**Ensure user can only access their own data:**
```sql
-- RLS Policy
CREATE POLICY user_access ON [table_name]
FOR ALL
USING (user_id = current_setting('app.user_id')::uuid);
```

**Backend middleware:**
```javascript
// Set user_id in PostgreSQL session
await db.query(
  `SET LOCAL app.user_id = $1`,
  [userIdFromJWT]
);

// Now all queries automatically filter by user_id
const data = await db.query(`SELECT * FROM [table_name]`);
```

---

### **Input Validation:**

**Sanitize all user input:**
```javascript
import DOMPurify from 'dompurify';
import validator from 'validator';

// Sanitize strings
const sanitizedField1 = DOMPurify.sanitize(req.body.field1);

// Validate email
if (!validator.isEmail(req.body.email)) {
  return res.status(400).json({ error: 'Invalid email format' });
}

// Validate UUID
if (!validator.isUUID(req.params.id)) {
  return res.status(400).json({ error: 'Invalid ID format' });
}

// Validate integer range
if (req.body.field2 < 0 || req.body.field2 > 100) {
  return res.status(400).json({ error: 'field2 must be between 0 and 100' });
}
```

---

### **Rate Limiting:**

**Implementation (Express middleware):**
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again in 60 seconds.',
      retryAfter: 60
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/[resource]', limiter);
```

---

## 🧪 TESTING

### **Unit Tests (Backend):**

```javascript
describe('GET /api/[resource]/:id', () => {
  it('returns 200 with data when resource exists', async () => {
    const response = await request(app)
      .get('/api/[resource]/uuid-here')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');
  });

  it('returns 404 when resource not found', async () => {
    const response = await request(app)
      .get('/api/[resource]/nonexistent-id')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/[resource]/uuid-here');
      // No Authorization header

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 when user tries to access another user\'s resource', async () => {
    const response = await request(app)
      .get('/api/[resource]/uuid-belonging-to-other-user')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
```

---

### **Integration Tests (with Database):**

```javascript
describe('POST /api/[resource] Integration', () => {
  beforeEach(async () => {
    // Clean database before each test
    await db.query('DELETE FROM [table_name]');
  });

  it('creates resource and stores in database', async () => {
    const response = await request(app)
      .post('/api/[resource]')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        field1: 'test value',
        field2: 50
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('id');

    // Verify in database
    const rows = await db.query(
      'SELECT * FROM [table_name] WHERE id = $1',
      [response.body.data.id]
    );

    expect(rows.length).toBe(1);
    expect(rows[0].field1).toBe('test value');
    expect(rows[0].field2).toBe(50);
  });
});
```

---

## 📊 EXAMPLE CURL COMMANDS

**GET Request:**
```bash
curl -X GET \
  'https://swanstudios.com/api/[resource]/:id' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json'
```

**POST Request:**
```bash
curl -X POST \
  'https://swanstudios.com/api/[resource]' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -d '{
    "field1": "value1",
    "field2": 123
  }'
```

**PUT Request:**
```bash
curl -X PUT \
  'https://swanstudios.com/api/[resource]/:id' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -d '{
    "field1": "updated value",
    "field2": 456
  }'
```

**DELETE Request:**
```bash
curl -X DELETE \
  'https://swanstudios.com/api/[resource]/:id' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

---

## ✅ IMPLEMENTATION CHECKLIST

**Before marking this file as complete, verify:**

- [ ] All endpoints documented (GET, POST, PUT, DELETE)
- [ ] All request parameters specified (headers, URL params, query params, body)
- [ ] All response formats defined (success 200/201, errors 400/401/403/404/500)
- [ ] All validation rules specified (required fields, types, ranges)
- [ ] All database queries written (SELECT, INSERT, UPDATE, soft DELETE)
- [ ] All security checks documented (auth, authorization, RLS, input sanitization)
- [ ] All rate limits specified (requests per minute)
- [ ] All caching strategies defined (keys, TTL, invalidation)
- [ ] All performance targets specified (<500ms response time)
- [ ] All test scenarios written (unit tests, integration tests)
- [ ] All CURL examples provided (for manual testing)

**Assigned AI:** Roo Code
**Review Status:** [ ] In Progress [ ] Complete [ ] Needs Revision
**Completion Date:** [Date]

---

## 📝 NOTES

**Database Considerations:**
- [Indexes needed for performance]
- [Foreign key constraints]
- [Triggers or stored procedures]

**Migration Strategy:**
- [How to migrate existing data]
- [Rollback plan if migration fails]

**Future Enhancements:**
- [GraphQL endpoint?]
- [Websocket support for real-time updates?]
- [Batch operations?]