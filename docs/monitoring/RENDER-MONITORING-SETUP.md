# Render Monitoring Setup — Phase 10

## Overview

The AI monitoring dashboard provides persistent metrics, threshold-based alerts, and integration with the eval/drift/AB pipeline. This guide covers Render deployment configuration and optional Grafana integration.

## API Endpoints

All endpoints are mounted at `/api/ai-monitoring/`. Authentication required for all.

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /metrics` | Any authenticated user | Overview + per-feature metrics |
| `GET /trends/:feature` | Any authenticated user | Historical trends from DB |
| `GET /health` | Any authenticated user | System health (200/206/503) |
| `POST /reset` | Admin only | Reset in-memory metrics |
| `GET /alerts` | Admin only | Active threshold alerts |
| `POST /alerts/:id/acknowledge` | Admin only | Acknowledge an alert |
| `POST /alerts/:id/resolve` | Admin only | Resolve an alert |
| `GET /eval-status` | Admin only | Latest eval baseline |
| `GET /drift-status` | Admin only | Drift comparison |
| `GET /ab-status` | Admin only | A/B test report |
| `GET /providers` | Admin only | Provider breakdown (24h) |
| `GET /digest` | Admin only | 24h summary digest |

## Render Health Check

Configure Render to use the existing health endpoint:

```
Health Check Path: /api/ai-monitoring/health
```

Response codes:
- `200` — Healthy (success rate >= 95%)
- `206` — Degraded (success rate 85-94%)
- `503` — Unhealthy (success rate < 85%)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_MONITOR_HIGH_ERROR_RATE` | `0.25` | Critical error rate threshold (fraction) |
| `AI_MONITOR_ELEVATED_ERROR_RATE` | `0.10` | Warning error rate threshold |
| `AI_MONITOR_HIGH_LATENCY_MS` | `5000` | Warning latency threshold (ms) |
| `AI_MONITOR_CRITICAL_LATENCY_MS` | `10000` | Critical latency threshold (ms) |
| `AI_MONITOR_TOKEN_BUDGET` | `1000000` | Warning token budget per feature |

## Database Tables

Phase 10 adds two tables (created via Sequelize migrations):

- `ai_metrics_buckets` — Pre-aggregated hourly/daily metrics per feature
- `ai_metrics_bucket_users` — Unique user tracking per bucket (deduplication via UNIQUE constraint)
- `ai_monitoring_alerts` — Threshold-crossing events with active/resolved/acknowledged lifecycle

Run migrations:
```bash
cd backend && npm run migrate
npm run migrate:status:dev  # verify tables exist
```

## Grafana Integration (Optional)

### Dashboard JSON

Import the following data source queries for a Grafana dashboard:

**Requests per Hour:**
```sql
SELECT "bucketStart" AS time, feature, "totalRequests"
FROM ai_metrics_buckets
WHERE granularity = 'hourly' AND "bucketStart" > NOW() - INTERVAL '24 hours'
ORDER BY "bucketStart"
```

**Error Rate per Feature:**
```sql
SELECT "bucketStart" AS time, feature,
       CASE WHEN "totalRequests" > 0 THEN "failCount"::float / "totalRequests" ELSE 0 END AS error_rate
FROM ai_metrics_buckets
WHERE granularity = 'hourly' AND "bucketStart" > NOW() - INTERVAL '24 hours'
ORDER BY "bucketStart"
```

**Active Alerts:**
```sql
SELECT id, "alertType", severity, feature, message, "createdAt"
FROM ai_monitoring_alerts
WHERE status = 'active'
ORDER BY "createdAt" DESC
```

### Alert Webhook

Configure Grafana alerting to POST to:
```
https://sswanstudios.com/api/ai-monitoring/alerts
```
with a valid admin Bearer token in the Authorization header.

## Eval / Drift / AB Integration

The monitoring dashboard reads these files from disk (read-only, no subprocess execution):

| File | Written by | Read by |
|------|-----------|---------|
| `docs/qa/AI-PLANNING-VALIDATION-BASELINE.json` | `npm run eval:baseline` | `GET /eval-status`, `GET /drift-status` |
| `docs/qa/PROVIDER-AB-RESULTS.json` | `npm run provider:ab:json` | `GET /ab-status` |

To populate these files:
```bash
cd backend
npm run eval:baseline    # writes eval baseline
npm run provider:ab:json # writes AB report JSON
```

## Architecture

```
┌─────────────────────────┐     ┌──────────────────────────┐
│  aiMonitoringRoutes.mjs │────▶│  monitoringService.mjs   │
│  (thin wrapper, ~150 ln)│     │  (in-memory + DB UPSERT) │
└─────────────────────────┘     └──────────────────────────┘
         │                               │
         ▼                               ▼
┌─────────────────────────┐     ┌──────────────────────────┐
│   alertEngine.mjs       │     │  ai_metrics_buckets      │
│   (threshold evaluation)│     │  ai_metrics_bucket_users  │
└─────────────────────────┘     │  ai_monitoring_alerts     │
                                └──────────────────────────┘
```

The `updateMetrics` function is re-exported from the routes file for backward compatibility with existing callers (aiWorkoutController, longHorizonController, mcpRoutes).
