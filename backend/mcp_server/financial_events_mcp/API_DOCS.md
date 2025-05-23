# Financial Events MCP Server API Documentation

## Overview

The Financial Events MCP (Master Control Program) Server handles all purchase-related events and analytics for the SwanStudios Platform. It processes financial transactions, generates real-time analytics, and integrates with other MCP servers to provide a seamless purchase experience.

## Key Features

- Real-time purchase processing and analytics
- Integration with Gamification MCP for rewards and badges
- Client insights generation for personalized training recommendations
- Trainer matching based on client preferences and purchase behavior
- Automated session scheduling recommendations
- WebSocket-based real-time dashboard updates for administrators

## API Endpoints

### Core Operations

#### `POST /api/process-sale`

Process a new purchase event from the Stripe webhook handler.

**Request Body:**
```json
{
  "userId": "string",
  "cartId": "string",
  "userName": "string",
  "email": "string",
  "totalSessionsAdded": 10,
  "packages": ["Premium Training Package"],
  "totalAmount": 499.99,
  "timestamp": "2025-05-20T12:34:56Z",
  "clientType": "standard",
  "purchaseSource": "web",
  "isFirstPurchase": true,
  "packageDetails": [
    {
      "id": "pkg-123",
      "name": "Premium Training Package",
      "type": "TRAINING_PACKAGE_FIXED",
      "sessions": 10,
      "price": 499.99,
      "quantity": 1
    }
  ],
  "userDemographics": {
    "joinDate": "2025-04-15T10:30:00Z",
    "region": "North America"
  },
  "orientationData": {
    "fitnessGoals": ["Weight Loss", "Muscle Gain"],
    "availabilityPreferences": ["Mornings", "Weekends"],
    "experienceLevel": "Beginner"
  },
  "assignedTrainerId": "trainer-001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Purchase processed successfully",
  "purchaseId": "cart-123"
}
```

**Actions Performed:**
1. Updates financial analytics
2. Broadcasts real-time update to admin dashboards
3. Triggers gamification rewards via Gamification MCP
4. Generates client insights via Client Insights MCP (or locally)
5. Recommends trainer matches if no trainer is assigned
6. Suggests initial session slots for scheduling

#### `GET /api/recent-purchases`

Get a list of recent purchases for the admin dashboard.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "userId": "user-123",
      "userName": "John Doe",
      "totalSessionsAdded": 10,
      "packages": ["Premium Training Package"],
      "totalAmount": 499.99,
      "timestamp": "2025-05-20T12:34:56Z"
    }
  ]
}
```

#### `GET /api/purchase-stats`

Get aggregate purchase statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_revenue": 1499.97,
    "total_sessions": 30,
    "client_count": 5,
    "package_counts": {
      "Premium Training Package": 2,
      "Starter Training Package": 1
    },
    "daily_revenue": {
      "2025-05-20": 499.99,
      "2025-05-19": 999.98
    },
    "daily_growth_rate": 20.5,
    "projected_monthly_revenue": 15000.00
  }
}
```

### Analytics Endpoints

#### `GET /api/revenue-insights`

Get summarized insights and trends for the admin dashboard.

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_revenue": 1499.97,
      "total_clients": 5,
      "total_sessions": 30,
      "average_order_value": 499.99,
      "revenue_per_session": 49.99
    },
    "trends": {
      "new_vs_returning": {
        "new": 3,
        "returning": 2
      },
      "popular_packages": [
        {"name": "Premium Training Package", "revenue": 999.98},
        {"name": "Starter Training Package", "revenue": 499.99}
      ]
    },
    "regional": {
      "revenue_by_region": {
        "North America": 999.98,
        "Europe": 499.99
      }
    }
  }
}
```

#### `GET /api/revenue-forecast`

Generate revenue forecast based on historical data.

**Response:**
```json
{
  "success": true,
  "data": {
    "forecast": [
      {
        "date": "2025-05-21",
        "revenue": 523.45,
        "lower_bound": 444.93,
        "upper_bound": 601.97
      },
      {
        "date": "2025-05-22",
        "revenue": 534.56,
        "lower_bound": 454.38,
        "upper_bound": 614.74
      }
    ],
    "confidence": 0.7,
    "method": "moving_average"
  }
}
```

### WebSocket API

#### `WebSocket /ws/admin-dashboard`

Real-time dashboard updates for admin clients.

**Initial Message (Server to Client):**
```json
{
  "type": "initial_stats",
  "data": {
    "stats": {
      "total_revenue": 1499.97,
      "total_sessions": 30,
      "client_count": 5
    },
    "recent_purchases": []
  }
}
```

**Real-time Update (Server to Client):**
```json
{
  "type": "purchase",
  "data": {
    "userId": "user-123",
    "userName": "John Doe",
    "sessionsPurchased": 10,
    "packageNames": ["Premium Training Package"],
    "amount": 499.99,
    "timestamp": "2025-05-20T12:34:56Z"
  }
}
```

**Gamification Update (Server to Client):**
```json
{
  "type": "gamification_update",
  "data": {
    "userId": "user-123",
    "userName": "John Doe",
    "badgesAwarded": ["First Purchase"],
    "pointsAwarded": 500,
    "timestamp": "2025-05-20T12:35:00Z"
  }
}
```

**Client Insights (Server to Client):**
```json
{
  "type": "client_insights",
  "data": {
    "userId": "user-123",
    "userName": "John Doe",
    "insights": [
      {
        "category": "Purchase Behavior",
        "insight": "Client invested in 10 sessions, showing initial commitment to fitness journey"
      }
    ],
    "motivationFactors": ["Initial commitment to fitness journey"],
    "communicationStyle": "Direct and detailed",
    "timestamp": "2025-05-20T12:35:05Z"
  }
}
```

**Trainer Recommendations (Server to Client):**
```json
{
  "type": "trainer_recommendations",
  "data": {
    "userId": "user-123",
    "userName": "John Doe",
    "recommendations": [
      {
        "trainerId": "trainer-001",
        "trainerName": "Alex Johnson",
        "matchScore": 0.92,
        "reasons": ["Specialized in Strength Training", "Experienced with premium clients"],
        "specialties": ["Strength Training", "HIIT", "Weight Loss"]
      }
    ],
    "timestamp": "2025-05-20T12:35:10Z"
  }
}
```

**Session Recommendations (Server to Client):**
```json
{
  "type": "session_recommendations",
  "data": {
    "userId": "user-123",
    "userName": "John Doe",
    "sessionRecommendations": {
      "recommendedSlots": [
        {
          "dateTime": "2025-05-22T18:00:00Z",
          "formattedDate": "Thursday, May 22, 2025",
          "formattedTime": "18:00 PM",
          "trainerAvailable": true,
          "recommendationReason": "Popular evening time slot"
        }
      ],
      "recommendationRationale": "Based on typical availability patterns"
    },
    "timestamp": "2025-05-20T12:35:15Z"
  }
}
```

## Integration with Other MCP Servers

The Financial Events MCP Server integrates with the following MCP services:

### Gamification MCP
- **URL**: `http://localhost:8011` (configurable via environment variable)
- **API Endpoint**: `/api/award_purchase_points`
- **Description**: Awards points and badges for purchases
- **Fallback**: Local implementation available if the Gamification MCP is not configured

### Client Insights MCP
- **URL**: `http://localhost:8012` (configurable via environment variable)
- **API Endpoint**: `/api/enrich-client-profile`
- **Description**: Generates AI-powered insights about clients based on purchase behavior
- **Fallback**: Basic insights generation available locally

### Trainer Matching MCP
- **URL**: `http://localhost:8013` (configurable via environment variable)
- **API Endpoint**: `/api/recommend-trainer-match`
- **Description**: Recommends suitable trainers based on client profile and needs
- **Fallback**: Basic trainer recommendations available locally

### Scheduling Assist MCP
- **URL**: `http://localhost:8014` (configurable via environment variable)
- **API Endpoint**: `/api/suggest-session-slots`
- **Description**: Suggests optimal session slots based on client and trainer availability
- **Fallback**: Basic session slot recommendations available locally

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Port number for the server | 8010 |
| FINANCIAL_EVENTS_MCP_URL | URL for this MCP server | http://localhost:8010 |
| CORS_ORIGINS | Allowed CORS origins | http://localhost:5173,... |
| LOG_LEVEL | Logging level | INFO |
| MAX_RECENT_PURCHASES | Number of recent purchases to store | 50 |
| GAMIFICATION_MCP_URL | URL for Gamification MCP | http://localhost:8011 |
| CLIENT_INSIGHTS_MCP_URL | URL for Client Insights MCP | http://localhost:8012 |
| TRAINER_MATCHING_MCP_URL | URL for Trainer Matching MCP | http://localhost:8013 |
| SCHEDULING_ASSIST_MCP_URL | URL for Scheduling Assist MCP | http://localhost:8014 |

## Testing

Use the provided `test-stripe-mcp.mjs` utility in the root directory to test the Financial Events MCP:

```bash
node test-stripe-mcp.mjs
```

This utility allows you to:
1. Send test purchase events to the MCP
2. Test the WebSocket connection
3. Send multiple test purchases
4. Fetch and display MCP statistics
