# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 63.2s
> **Files:** docs/ai-workflow/blueprints/AI-FORM-ANALYSIS-BLUEPRINT.md
> **Generated:** 3/6/2026, 10:46:46 AM

---

# Deep Architecture Review: AI-FORM-ANALYSIS-BLUEPRINT

**Review Target:** `docs/ai-workflow/blueprints/AI-FORM-ANALYSIS-BLUEPRINT.md`
**Context:** This is a **specification/blueprint document**, not production code. My review will identify design flaws, architectural gaps, missing production considerations, and potential implementation issues that would cause bugs.

---

## Executive Summary

This blueprint is a well-structured technical specification, but it has **significant gaps** that would cause production issues. The document describes *what* to build but lacks critical details on *how* to handle failures, scale, and edge cases.

---

## 1. Architecture Flaws — Structural Problems

### 1.1 Missing Error Handling in Real-Time Pipeline

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **CRITICAL** | Part 3 - Real-Time Analysis | No mention of MediaPipe model loading failures, camera permission denials, or WebGL context loss. The client-side pipeline will crash silently. | Add error boundaries and fallback UI: `<FormAnalyzerErrorBoundary>` with retry logic, camera fallback to upload-only mode if permissions denied |
| **HIGH** | Part 3 - Upload Analysis | No mention of what happens if Python service is down or video processing fails mid-stream. The queue job could hang indefinitely. | Add BullMQ job TTL, dead letter queue, max retry limits, and health check endpoint on Python service |
| **MEDIUM** | Part 3 - System Overview | WebSocket connection for notifications has no reconnection logic specified. Users would stop receiving updates after network blip. | Implement exponential backoff reconnection with max attempts, queue messages during disconnection |

### 1.2 Database Schema Issues

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Part 3 - FormAnalyses table | `landmarkData` JSONB column has no size limit. A 60fps 30-second video = 5400 frames × 33 landmarks = ~1MB+ per analysis. This will bloat storage and slow queries. | Add column constraint, compress with pglz, or store in separate object storage with reference URL |
| **HIGH** | Part 3 - FormAnalyses table | No indexes on `userId`, `createdAt`, or `analysisStatus`. Queries for user history will do full table scans. | Add composite index: `CREATE INDEX idx_form_analyses_user_status ON "FormAnalyses"("userId", "analysisStatus")` |
| **MEDIUM** | Part 3 - MovementProfiles table | Single row per user but updated frequently. Concurrent updates from multiple analysis jobs could cause race conditions. | Add optimistic locking (version column) or use `INSERT ON CONFLICT UPDATE` with proper transaction isolation |
| **MEDIUM** | Part 3 - Findings JSONB | No JSON schema validation defined. Invalid data could corrupt reports. | Add PostgreSQL CHECK constraint or validate in application layer before insert |

### 1.3 Missing Infrastructure Components

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **CRITICAL** | Part 3 - Architecture | BullMQ requires Redis, but no mention of Redis infrastructure, connection pooling, or cluster setup. | Document Redis requirements, add connection health checks, configure Sentinel for HA |
| **HIGH** | Part 3 - Python Service | No health check endpoint specified. Kubernetes/load balancers can't detect if service is healthy. | Add `/health` and `/ready` endpoints returning service status, dependency checks (MediaPipe loaded, GPU available) |
| **MEDIUM** | Part 3 - R2 Storage | No mention of file validation (malicious uploads), size limits, or retention policies. | Add file type validation (whitelist), max file size (500MB), lifecycle rules for cleanup |

---

## 2. Integration Issues — How Pieces Connect

### 2.1 Frontend-Backend Contract Mismatches

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **CRITICAL** | Part 3 - API Routes | No OpenAPI/Swagger spec defined. Frontend and Python service teams will have mismatched expectations on request/response shapes. | Generate TypeScript types from OpenAPI spec, add request/response validation middleware |
| **HIGH** | Part 3 - Upload Endpoint | `POST /api/form-analysis/upload` doesn't specify what happens during upload failure (network中断). No resumable upload support. | Implement chunked upload with progress tracking, or usetus.io protocol for large files |
| **HIGH** | Part 3 - Results Endpoint | `GET /api/form-analysis/:id` returns full `landmarkData` which could be 1MB+. This will cause UI lag on history page. | Add query param for fields: `?fields=score,findings` or create separate lightweight summary endpoint |
| **MEDIUM** | Part 3 - WebSocket | No mention of message format/contract. Frontend won't know how to parse analysis progress updates. | Define WebSocket message schema: `{ type: 'progress' | 'complete' | 'error', payload: {...} }` |

### 2.2 Missing Loading/Error/Empty States

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Part 6 - UX Flow | No specification for error states: camera denied, upload fails, analysis times out, server error. Users see nothing. | Define error UI states for each failure mode with retry actions |
| **MEDIUM** | Part 6 - UX Flow | No empty state for "no analyses yet". First-time users have no guidance. | Add onboarding empty state with sample analysis or tutorial |
| **MEDIUM** | Part 3 - Real-Time | No loading state while MediaPipe model loads (can take 2-5 seconds). UI appears broken. | Add model loading spinner with progress, lazy-load model on component mount |

### 2.3 Route Guards & Security

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Part 4 - Features | No mention of authorization: can User A view User B's form analyses? Can clients see trainer-only features? | Add middleware: `requireOwnership` for user data, `requireTrainerRole` for trainer features |
| **MEDIUM** | Part 4 - Features | Session recording with AI analysis baked in — no consent mechanism specified. GDPR/privacy issue. | Add explicit consent UI before recording, store consent record in database |

---

## 3. Production Readiness — Ship Blockers

### 3.1 Logging & Observability

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **CRITICAL** | Entire Document | No logging strategy specified. `console.log` in Python, no structured logging in Node. Debugging production issues will be impossible. | Use `pino` (Node) and `structlog` (Python), include request IDs, log levels, structured JSON |
| **HIGH** | Part 3 - Python Service | No metrics/observability. Can't answer: how many analyses/day? Average processing time? Error rate? | Add Prometheus metrics: `analysis_total`, `analysis_duration_seconds`, `analysis_errors_total` |
| **MEDIUM** | Part 3 - Client | No mention of error reporting service (Sentry). Client-side errors in MediaPipe will be invisible. | Integrate Sentry with custom context (device, exercise, form score) |

### 3.2 Performance & Scale

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Part 3 - Python Service | No concurrency limit. Multiple large videos could exhaust GPU memory. | Add job concurrency limits, queue prioritization (real-time < upload), resource monitoring |
| **MEDIUM** | Part 3 - Real-Time | MediaPipe runs on main thread by default, causing UI jank. No mention of Web Worker offloading. | Use `WasmWebWorker` or dedicated Web Worker for pose estimation |
| **MEDIUM** | Part 3 - Database | No pagination on `GET /api/form-analysis/history`. Users with 100+ analyses will get massive payloads. | Add `?page=1&limit=20` with cursor-based pagination |

### 3.3 Input Validation & Security

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **CRITICAL** | Part 3 - Upload | No file type validation. Users could upload executables, ZIP bombs, or malicious files. | Validate MIME type + magic bytes, scan with ClamAV, reject >500MB |
| **HIGH** | Part 3 - API | No rate limiting on upload endpoint. A malicious user could flood storage/costs. | Add rate limit: 10 uploads/minute per user, 100/day |
| **HIGH** | Part 3 - Python Service | No input sanitization on video frame processing. Could cause memory exhaustion. | Validate frame dimensions, max frames (10,000), timeout per job (120s) |
| **MEDIUM** | Part 3 - API | No request body validation. Malformed requests could crash services. | Add Zod (Node) + Pydantic (Python) validation with 400 responses |

---

## 4. Missing Critical Features

### 4.1 Testing Strategy

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Part 5 - Build Plan | No testing strategy mentioned. How do you verify angle calculations? Rep detection? | Add unit tests for angle math, integration tests for API, E2E tests for critical flows |
| **MEDIUM** | Part 5 - Build Plan | No mention of golden dataset for pose estimation accuracy testing. | Create benchmark dataset with ground truth angles, track accuracy metrics |

### 4.2 Data & Privacy

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Part 3 - Schema | Video URLs stored in database. No mention of signed URLs or expiration. | Use pre-signed URLs with 15-minute expiry, never expose direct R2 URLs |
| **MEDIUM** | Part 3 - Landmark Data | Raw landmark data stored indefinitely. GDPR right to deletion would require complex cleanup. | Add data retention policy, implement soft delete with cascade |

### 4.3 Deployment & Operations

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Part 7 - File Structure | No Docker Compose for local development. Can't run full stack. | Add `docker-compose.yml` with PostgreSQL, Redis, Python service, Node app |
| **MEDIUM** | Part 7 - File Structure | No environment configuration. Hardcoded values will ship. | Add `.env.example`, use config package (Node: `convict`, Python: `pydantic-settings`) |
| **MEDIUM** | Part 3 - Python Service | No graceful shutdown. In-flight analysis jobs will be lost on deploy. | Handle SIGTERM, finish current frame, save checkpoint, drain queue |

---

## 5. Technical Inconsistencies & Gaps

### 5.1 One Euro Filter Missing

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **MEDIUM** | Part 8 - Technical Decisions | One Euro Filter mentioned for landmark smoothing but not in file structure or implementation details. | Add `filters/one_euro_filter.py` and `hooks/useOneEuroFilter.ts` |

### 5.2 Exercise Rules Engine Gap

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Part 5 - Phase 1 | "Build exercise rule engine" is vague. How are rules evaluated? What's the DSL? | Define rule schema: `{ condition: (angles) => boolean, weight: number, message: string }` |

### 5.3 Movement Profile Update Race Condition

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Part 5 - Phase 2 | MovementProfile updated "after each analysis" but multiple analyses could run concurrently, causing lost updates. | Use database transaction with `FOR UPDATE` or event-driven: queue profile update job, process serially |

---

## Summary: Critical Path to Ship

| Priority | Action Item |
|----------|-------------|
| **P0** | Add error handling + retry logic for MediaPipe, camera, upload |
| **P0** | Implement input validation (file types, sizes, request bodies) |
| **P0** | Add rate limiting on expensive operations |
| **P1** | Add database indexes, fix schema for large data |
| **P1** | Define API contracts (OpenAPI), add pagination |
| **P1** | Add health checks, logging, metrics |
| **P2** | Add Docker Compose, environment config |
| **P2** | Define testing strategy with golden dataset |

---

**Verdict:** This blueprint provides excellent feature coverage but **cannot ship** without addressing the P0 items. The architecture is sound but lacks the operational resilience required for production. The document needs a companion "Operational Readiness" section before implementation begins.

---

*Part of SwanStudios 7-Brain Validation System*
