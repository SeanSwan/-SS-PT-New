# Security Planning Debate (Phase 2A) — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free ↔ nvidia/nemotron-3-super-120b-a12b:free | **Duration:** 83.6s
> **Files:** docs/ai-workflow/blueprints/TEACH-ME-COMPREHENSIVE-UPGRADE-PLAN.md
> **Generated:** 4/4/2026, 2:43:41 AM

---

CONSENSUS REACHED

## Merged Security Findings for Teach Me Comprehensive Upgrade Plan

After thorough review, both security planners agree that the current plan contains **critical security gaps** that must be addressed before implementation. The plan requires a complete security redesign with explicit controls for all new features. Below are the merged, non-redundant security requirements:

### **I. PII Handling & AI Processing (Non-Negotiable)**
- Implement client-side PII redaction **before** any network request using deterministic patterns for names, health conditions, and dates
- Store only sanitized conversation content in primary database; retain raw PII exclusively in encrypted, access-controlled audit logs (AES-256-GCM) with 90-day automatic purge
- Require AI service DPAs that prohibit PII retention/training; implement tokenization system for prompt context
- **Deliverable:** `SECURITY_PII_HANDLING.md` with tested regex patterns (validated against 1000+ real conversations) and key rotation procedures

### **II. Voice Data Privacy Framework**
- Mandate separate, granular consent UI (not bundled with ToS) specifying 24h max retention and automatic deletion post-transcription
- Implement browser-to-Gemini transmission via WebRTC with DTLS-SRTP; never route raw audio through application servers
- Enforce geographic data residency via Gemini `locationHints` based on user IP; maintain deletion verification logs
- **Deliverable:** `VOICE_PRIVACY_FRAMEWORK.md` with consent mockups (legal-reviewed), encryption flow diagrams, and 24h deletion cron implementation

### **III. Markdown/XSS Defense-in-Depth**
- Use DOMPurify with strict configuration (ALLOWED_TAGS limited to semantic elements; ALLOWED_ATTR restricted to `class` only) for **all** Teach Me content rendering
- Implement CSP headers blocking `'unsafe-eval'` while allowing `'unsafe-inline'` for styled-components; apply to all markdown-rendered endpoints
- Sanitize content **at point of entry** if CMS is used; enforce MFA and audit logging for content editors
- **Deliverable:** `MARKDOWN_SECURITY.md` with DOMPurify config validated against OWASP XSS vectors and environment-specific CSP policies

### **IV. RBAC Enforcement (Full-Stack)**
- Define explicit permission matrix in `types.ts` mapping all 27 sections to roles (e.g., 'pain-modifications' restricted to SENIOR_TRAINER+/ADMIN)
- Implement dual enforcement: frontend guards (TeachMeLayout.tsx) **and** backend middleware authorization; supplement with PostgreSQL RLS where applicable
- Log all permission changes and access denials to immutable audit trail
- **Deliverable:** `RBAC_POLICY.md` with complete matrix, enforcement code snippets, and RLS policy definitions

### **V. File Upload Security (R2 + AI Analysis)**
- Enforce frontend validation (MIME type + magic bytes) + 10MB limit; backend ClamAV scanning of file buffers
- Strip EXIF/metadata via sharp pre-upload; use private R2 bucket with 15-minute pre-signed URLs and strict CORS
- Prohibit SSRF by disabling metadata URL fetching; if required, implement domain-allowlisted proxy
- **Deliverable:** `FILE_UPLOAD_SECURITY.md` with validation flow, ClamAV Docker setup, R2 bucket policy JSON, and metadata stripping implementation

### **VI. API Contract Hardening**
- Validate all new `/teach-me/*` endpoints with RBAC checks; implement role-aware caching to prevent poisoning
- Apply rate limiting (100 req/hour/user) to prevent scraping; validate all inputs via Zod schemas
- Require API contract documentation specifying required roles, error codes, and cache TTLs per endpoint
- **Deliverable:** Updated API spec with security schemas, rate limit configs, and cache poisoning mitigations

### **VII. Cross-Cutting Requirements**
- **Encryption:** AES-256-GCM for data-at-rest; TLS 1.3+ for data-in-transit; separate keys for PII vs. non-PII data
- **Audit Logging:** Immutable logs for all PHI access, consent changes, and security events (retention: 7 years)
- **Dependency Security:** Monthly vulnerability scanning; SBOM generation for all builds
- **Testing:** Mandatory penetration testing before each release; automated XSS/SSRF scans in CI/CD

**Final Determination:** Development must halt immediately. A Security Design Review incorporating all above controls is required before any code is written. The plan document must be rewritten to include these six security addenda as mandatory implementation requirements.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
