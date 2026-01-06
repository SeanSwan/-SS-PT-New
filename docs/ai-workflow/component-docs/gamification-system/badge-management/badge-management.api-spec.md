# Badge Management System - API Specifications

## Overview
The Badge Management API provides comprehensive endpoints for creating, managing, and awarding achievement badges in the gamification system.

## Authentication & Authorization
- **Authentication**: JWT Bearer Token required in `Authorization` header
- **Authorization**:
  - Admin endpoints: `admin` role required
  - User endpoints: `client`, `trainer`, or `admin` roles
- **Rate Limiting**: 100 requests per 15 minutes per IP

## Base URL
```
/api/badges
```

## Endpoints

### 1. GET /api/badges
**Purpose**: Retrieve paginated list of badges for admin management

**Authorization**: Admin only

**Query Parameters**:
```typescript
{
  page?: number = 1,           // Page number (1-based)
  limit?: number = 20,         // Items per page (max 100)
  status?: 'active' | 'inactive' | 'archived',
  category?: string,           // Badge category filter
  search?: string              // Search in name/description
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "badges": [
      {
        "id": 1,
        "name": "Squat Master",
        "description": "Complete 50 perfect squats",
        "category": "strength",
        "difficulty": "intermediate",
        "imageUrl": "https://cdn.example.com/badges/squat-master.png",
        "isActive": true,
        "createdAt": "2025-01-01T00:00:00Z",
        "earnedCount": 247,
        "criteria": [
          {
            "type": "exercise_completion",
            "exerciseId": 123,
            "count": 50,
            "timeframe": "lifetime"
          }
        ],
        "rewards": {
          "points": 500,
          "title": "Squat Master",
          "customizations": ["special_frame"]
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 89,
      "pages": 5
    }
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing/invalid JWT
- `403 Forbidden`: Insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded

### 2. POST /api/badges
**Purpose**: Create a new badge

**Authorization**: Admin only

**Request Body**:
```json
{
  "name": "Squat Master",
  "description": "Complete 50 perfect squats to earn this prestigious badge",
  "category": "strength",
  "difficulty": "intermediate",
  "image": "base64-encoded-image-data-or-file-upload",
  "criteria": [
    {
      "type": "exercise_completion",
      "exerciseId": 123,
      "count": 50,
      "timeframe": "lifetime",
      "difficulty": "any"
    }
  ],
  "rewards": {
    "points": 500,
    "title": "Squat Master",
    "customizations": ["special_frame", "animated_icon"]
  }
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Badge created successfully",
  "data": {
    "badgeId": 1,
    "name": "Squat Master",
    "imageUrl": "https://cdn.example.com/badges/squat-master.png",
    "isActive": true
  }
}
```

**Validation Errors (400 Bad Request)**:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "Badge name must be 3-50 characters"
    },
    {
      "field": "criteria",
      "message": "At least one earning criteria required"
    }
  ]
}
```

### 3. GET /api/badges/:badgeId
**Purpose**: Get detailed badge information

**Authorization**: Admin or any authenticated user

**Path Parameters**:
- `badgeId`: integer - Badge ID

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Squat Master",
    "description": "Complete 50 perfect squats to earn this prestigious badge",
    "category": "strength",
    "difficulty": "intermediate",
    "imageUrl": "https://cdn.example.com/badges/squat-master.png",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "earnedCount": 247,
    "criteria": [...],
    "rewards": {...},
    "collection": {
      "id": 1,
      "name": "Strength Mastery",
      "description": "Master fundamental strength movements"
    }
  }
}
```

### 4. PUT /api/badges/:badgeId
**Purpose**: Update an existing badge

**Authorization**: Admin only

**Path Parameters**:
- `badgeId`: integer - Badge ID

**Request Body**: Same as POST, all fields optional

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Badge updated successfully",
  "data": {
    "badgeId": 1,
    "changes": ["description", "rewards.points"]
  }
}
```

### 5. DELETE /api/badges/:badgeId
**Purpose**: Soft delete a badge

**Authorization**: Admin only

**Query Parameters**:
- `force?`: boolean - Hard delete (removes from all users)

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Badge deleted successfully",
  "data": {
    "badgeId": 1,
    "deletedAt": "2025-01-04T22:00:00Z",
    "usersAffected": 247
  }
}
```

### 6. POST /api/badges/:badgeId/upload-image
**Purpose**: Upload/update badge image

**Authorization**: Admin only

**Content-Type**: `multipart/form-data`

**Form Data**:
- `image`: File - Image file (PNG, JPG, SVG, max 2MB)

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Badge image updated successfully",
  "data": {
    "badgeId": 1,
    "imageUrl": "https://cdn.example.com/badges/squat-master-v2.png"
  }
}
```

### 7. GET /api/badges/user/:userId
**Purpose**: Get badges earned by a specific user

**Authorization**: User themselves, trainer, or admin

**Path Parameters**:
- `userId`: integer - User ID

**Query Parameters**:
- `category?`: string - Filter by category
- `recent?`: boolean - Show only recently earned

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "userId": 123,
    "totalEarned": 15,
    "recentBadges": [
      {
        "badgeId": 1,
        "name": "Squat Master",
        "earnedAt": "2025-01-04T20:00:00Z",
        "imageUrl": "https://cdn.example.com/badges/squat-master.png"
      }
    ],
    "badgesByCategory": {
      "strength": 8,
      "cardio": 4,
      "skill": 3
    }
  }
}
```

### 8. POST /api/badges/check-earning
**Purpose**: Check if user has earned any badges based on recent activity

**Authorization**: Any authenticated user

**Request Body**:
```json
{
  "userId": 123,
  "activityType": "exercise_completion",
  "activityData": {
    "exerciseId": 456,
    "count": 1,
    "timestamp": "2025-01-04T22:00:00Z"
  }
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "badgesEarned": [
      {
        "badgeId": 1,
        "name": "Squat Master",
        "imageUrl": "https://cdn.example.com/badges/squat-master.png",
        "rewards": {
          "points": 500,
          "title": "Squat Master"
        }
      }
    ],
    "progressUpdates": [
      {
        "badgeId": 2,
        "name": "Push-up Pro",
        "currentProgress": 8,
        "targetProgress": 10,
        "progressPercent": 80
      }
    ]
  }
}
```

### 9. GET /api/badges/collections
**Purpose**: Get all badge collections

**Authorization**: Any authenticated user

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "collections": [
      {
        "id": 1,
        "name": "Strength Mastery",
        "description": "Master fundamental strength movements",
        "badgeCount": 10,
        "userProgress": {
          "earned": 4,
          "total": 10,
          "percent": 40
        },
        "badges": [...]
      }
    ]
  }
}
```

### 10. POST /api/badges/collections
**Purpose**: Create a new badge collection

**Authorization**: Admin only

**Request Body**:
```json
{
  "name": "Strength Mastery",
  "description": "Master fundamental strength movements",
  "theme": "strength",
  "badgeIds": [1, 2, 3, 4, 5]
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Collection created successfully",
  "data": {
    "collectionId": 1,
    "name": "Strength Mastery",
    "badgeCount": 5
  }
}
```

## Error Response Format
All errors follow this format:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",  // Optional machine-readable code
  "details": [...]       // Optional validation details
}
```

## Common Error Codes
- `VALIDATION_ERROR`: Input validation failed
- `PERMISSION_DENIED`: Insufficient permissions
- `RESOURCE_NOT_FOUND`: Badge/collection not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `UPLOAD_FAILED`: Image upload error
- `DUPLICATE_NAME`: Badge name already exists

## Rate Limiting
- **Standard endpoints**: 100 requests/15min per IP
- **Upload endpoints**: 10 requests/hour per user
- **Admin endpoints**: 500 requests/15min per admin user

## Caching Strategy
- Badge lists: 5-minute cache
- Individual badges: 10-minute cache
- User badge data: 1-minute cache
- CDN images: 1-hour cache with cache-busting

## Database Transactions
All badge operations use database transactions to ensure data consistency:
- Badge creation: Atomic creation of badge + criteria + rewards
- Badge awarding: Atomic user_badge insert + points update
- Badge deletion: Safe soft delete with user impact assessment

## Security Measures
- Input sanitization on all text fields
- SQL injection prevention via parameterized queries
- XSS protection on badge names/descriptions
- File upload validation (type, size, malware scanning)
- Audit logging for all badge modifications
- CDN access controls with signed URLs