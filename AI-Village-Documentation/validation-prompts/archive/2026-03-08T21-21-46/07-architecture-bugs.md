# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 66.6s
> **Files:** AI-Village-Documentation/PHOTO-GALLERY-LEAD-GEN-PLAN.md
> **Generated:** 3/8/2026, 2:21:46 PM

---

# Deep Architecture Review: Photo Gallery & Lead Generation Plan

**Reviewer:** Principal Software Engineer  
**Target:** `AI-Village-Documentation/PHOTO-GALLERY-LEAD-GEN-PLAN.md`  
**Context:** This is a **specification/planning document**, not implementation code. I will review the architectural plan, schema design, API contracts, and security model for flaws that would become bugs in implementation.

---

## Executive Summary

This document outlines a comprehensive lead generation system, but contains several **architectural flaws, security concerns, and missing considerations** that would cause production issues. The plan is ambitious but lacks critical details for implementation.

---

## 1. Bug Detection — Design-Level Issues

### 1.1 Security Model Inconsistency

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **CRITICAL** | Database Schema → `GalleryEvent.password` | Plaintext password storage. Even if "low security," storing plaintext passwords is a data breach liability. If the DB is compromised, attackers get every event password. | Use bcrypt with a work factor of 10. Verify password on access attempt via `bcrypt.compare()`. |
| **HIGH** | Security Considerations | "Gallery access tokens — Short-lived JWTs (24h)" — No mention of token refresh, revocation, or storage. If a token is compromised, attacker has 24h access to all galleries the user can access. | Implement token rotation, server-side token blacklist/revocation, and shorter TTL (1h). Add refresh token flow. |
| **HIGH** | API Routes | `/api/gallery/photos/:id/download` — No mention of ownership verification. A user with access to Event A could potentially guess IDs for Event B photos. | Add explicit `eventId` check against user's access token. Use UUIDs instead of sequential integers. |

### 1.2 Data Integrity Issues

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **MEDIUM** | `GalleryVisitor` model | No unique constraint on `(email, eventId)`. Same parent visiting multiple events creates duplicate records, breaking lead tracking. | Add UNIQUE constraint: `email + eventId`. Update existing logic to upsert or handle duplicates. |
| **MEDIUM** | `EnhancementRequest` model | `visitorId` + `photoId` has no unique constraint. User could submit multiple enhancement requests for the same photo (accidental double-clicks, retry logic). | Add UNIQUE constraint on `(visitorId, photoId)` or implement idempotency keys. |
| **MEDIUM** | `GalleryPhoto.enhancementRequestCount` | Denormalized counter without transaction safety. Concurrent requests could cause race conditions, losing counts. | Remove denormalized count. Use `COUNT(*)` queries or implement optimistic locking with version field. |

### 1.3 Business Logic Gaps

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Flow 3: Enhancement Request | "On completion: enhancement request submitted" — No verification that payment/referral actually completed. What if Stripe fails after request submission? | Use Stripe webhooks to confirm payment before creating `EnhancementRequest`. Use database transactions. |
| **MEDIUM** | Enhancement Request Flow | No expiration on enhancement requests. If Sean never fulfills them, requests hang forever. | Add `expiresAt` field. Auto-expire after 30 days. Notify admin of stale requests. |
| **MEDIUM** | Newsletter | "Captured emails receive SwanStudios updates" — No double opt-in. This violates CAN-SPAM (US) and GDPR (EU) requirements. | Implement confirmed opt-in: send verification email, require click to activate subscription. |

---

## 2. Architecture Flaws

### 2.1 God Components & Missing Boundaries

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Frontend Routes | Single `/gallery/:slug` route handles: password gate, photo grid, lightbox, enhancement cart, checkout. This will become a 2000+ line component. | Split into: `/gallery/:slug/enter` (gate), `/gallery/:slug` (grid), `/gallery/:slug/photo/:id` (lightbox), `/gallery/:slug/checkout` (enhancement flow). |
| **MEDIUM** | Admin Routes | All admin gallery management under one path: `/dashboard/content/gallery/*`. Should be separate resources. | Use RESTful sub-resources: `/dashboard/content/gallery-events`, `/dashboard/content/gallery-photos`, `/dashboard/content/gallery-requests`, `/dashboard/content/gallery-leads`. |

### 2.2 Missing Context & State Management

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **MEDIUM** | Global State | No mention of global gallery access token storage. Each API call needs the token. | Create `GalleryAuthContext` to store token, handle refresh, provide to all gallery components. |
| **MEDIUM** | Enhancement Cart | "Enhancement cart builds up" — No persistence. Refresh loses cart. | Persist cart to localStorage or server-side (user not logged in, use email as key). |

### 2.3 Circular Dependencies Risk

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **LOW** | Service Layer | `photoStorageService.mjs` extends to gallery, but `r2StorageService.mjs` is also used directly. Potential bidirectional imports. | Create `galleryStorageService.mjs` that wraps both. Export clean interface. |

---

## 3. Integration Issues

### 3.1 Frontend-Backend Contract Mismatches

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **CRITICAL** | API Response Shape | Plan lists routes but not JSON response shapes. Frontend can't implement without contract. | Add OpenAPI/Swagger spec or detailed response schemas: `{ event: {...}, photos: [...], pagination: {...} }`. |
| **HIGH** | Token Format | "return token" — No specification: JWT? Opaque? Signed with what? | Specify JWT with claims: `{ sub: email, eventId, exp, iat }`. Document secret key management. |
| **HIGH** | Download Endpoint | "Download full-res (requires access)" — How is access verified? Cookie? Header? | Specify `Authorization: Bearer <token>` header requirement. Document 401/403 responses. |

### 3.2 Missing States

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | All API Calls | No mention of loading, error, or empty states in API design. | Each route should document: 200 OK, 400 validation error, 401 unauthorized, 404 not found, 500 server error responses. |
| **MEDIUM** | Photo List | No pagination specified. What happens with 500-photo event? | Add `?page=1&limit=50` to photo list endpoint. Return `total`, `page`, `hasMore`. |

### 3.3 Stripe Integration Gaps

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Donation Flow | "Create Stripe donation session" — No mention of success/cancel URLs, webhook handling, or linking payment to enhancement request. | Add webhook endpoint: `POST /api/webhooks/stripe`. On `checkout.session.completed`, create `EnhancementRequest` with `stripePaymentId`. |

---

## 4. Dead Code & Tech Debt

*Note: This is a planning document, so traditional "dead code" doesn't apply. These are gaps that will become tech debt.*

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **MEDIUM** | EXIF Metadata | "EXIF metadata extracted & stored" — No mention of extraction implementation. | Use `exif-reader` or `sharp` to extract on upload. Document storage in `metadata` JSONB field. |
| **MEDIUM** | Thumbnail Generation | "thumbnailKey" in schema — No mention of thumbnail generation pipeline. | Add image processing step: use `sharp` to generate 300px width thumbnails on upload. Store in R2. |
| **LOW** | Photo Numbering | "Photos auto-numbered (EVENT-001, EVENT-002)" — No conflict resolution if uploads fail mid-way. | Implement idempotent upload with client-side UUID. Server-side: find max `photoNumber` for event + 1. |

---

## 5. Production Readiness

### 5.1 Missing Production Safeguards

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **CRITICAL** | Rate Limiting | "Download endpoints rate-limited" — Mentioned but no implementation. | Implement `express-rate-limit`: 10 downloads/minute per IP. Add to nginx/Cloudflare as well. |
| **CRITICAL** | Input Validation | No mention of input sanitization. Email field vulnerable to injection. | Use `zod` or `joi` for all inputs. Validate email format, password length, photo number ranges. |
| **HIGH** | Logging | No mention of logging gallery access attempts (security audit trail). | Log all `/access` attempts: email, success/failure, IP, timestamp. |
| **HIGH** | Error Boundaries | "Missing error boundaries around async operations" — Will crash on network failures. | Add React error boundaries. Implement retry logic with exponential backoff for API calls. |

### 5.2 Performance Concerns

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **MEDIUM** | Photo Loading | "Thumbnail view (lazy loaded)" — No implementation detail. | Use Intersection Observer or `loading="lazy"`. Consider blurhash for placeholder. |
| **MEDIUM** | Large Events | No mention of CDN caching. Every photo request hits R2. | Configure Cloudflare cache rules: cache thumbnails for 1 day, full-res for 1 hour. |
| **LOW** | Database Indexes | Only "email (indexed)" mentioned. Missing indexes on common queries. | Add indexes: `GalleryPhoto(eventId)`, `EnhancementRequest(status)`, `GalleryVisitor(eventId)`. |

### 5.3 Operational Gaps

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Monitoring | No mention of metrics: email capture rate, enhancement conversion, etc. | Add analytics events. Create admin dashboard charts. |
| **MEDIUM** | Backup | No mention of R2 backup or DB backup strategy. | Document R2 lifecycle policies. Add daily DB backups. |
| **LOW** | SEO | Gallery pages are gated. No public preview for social sharing. | Add Open Graph meta tags for event cards. Consider public preview thumbnails. |

---

## Summary of Critical Issues

| # | Severity | Issue | Impact |
|---|----------|-------|--------|
| 1 | **CRITICAL** | Plaintext password storage in `GalleryEvent` | Data breach liability |
| 2 | **CRITICAL** | No input validation framework specified | SQL injection, XSS vulnerabilities |
| 3 | **CRITICAL** | No rate limiting implementation | Scraping, abuse |
| 4 | **CRITICAL** | Missing API response schemas | Frontend-backend integration failure |
| 5 | **HIGH** | No Stripe webhook implementation | Lost payments, phantom requests |
| 6 | **HIGH** | No token revocation mechanism | Compromised tokens give 24h access |
| 7 | **HIGH** | No double opt-in for newsletter | GDPR/CAN-SPAM violations |
| 8 | **HIGH** | No pagination for photo lists | Performance failure on large events |

---

## Recommended Next Steps

1. **Before implementation:** Create OpenAPI spec for all gallery endpoints
2. **Security audit:** Reconsider plaintext password approach — even "low security" passwords shouldn't be stored in plaintext
3. **Add to plan:** Stripe webhook handler, email verification flow, rate limiting configuration
4. **Schema update:** Add unique constraints, indexes, and remove denormalized counters
5. **Component split:** Design separate pages for gallery gate, grid, lightbox, and checkout

---

*This plan is ambitious and well-structured, but these gaps would cause significant production issues. Address the CRITICAL items before any code is written.*

---

*Part of SwanStudios 7-Brain Validation System*
