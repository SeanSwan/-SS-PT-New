# Security — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 19.9s
> **Files:** AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/01-ux-research.md, AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/02-architecture-design.md, AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/03-security-planning.md, AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/04-performance-planning.md, AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/05-competitive-intel.md, AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/06-persona-alignment.md
> **Generated:** 4/6/2026, 7:48:02 PM

---

# Security AuditFindings – SwanStudios Refactor Brief  

---  

## 1. OWASP Top 10  

| Finding | Rating | Details |
|---|---|---|
| **Unsafe rendering of raw HTML in AI responses** | **CRITICAL** | AI terminals sometimes return raw HTML tags (`<strong>`, `<header>`, `<u>`) instead of rendered markup. If these strings are injected into the DOM (e.g., via `innerHTML`), they can be exploited for **XSS**. The brief explicitly notes this as a “P0 Blocker” and recommends sanitising/ escaping all AI‑generated markup before insertion. |
| **SSRF via image‑metadata processing** | **HIGH** | Equipment‑scan workflow uploads images to Cloudflare R2, then the backend may fetch URLs from image metadata for AI analysis. An attacker can embed a `file://` or internal‑network URL in EXIF data, causing the server to make outbound requests to arbitrary internal services. No validation or URL‑allow‑list is described. |
| **Potential injection in conversation‑data parsing** | **MEDIUM** | Conversation payloads are stored as JSONB and later parsed server‑side. If unsanitised fields are concatenated into SQL or used directly in template engines, injection could occur. The brief does not specify parameterised queries or ORM‑level protection. |

---  

## 2. Client‑Side Security  

| Finding | Rating | Details |
|---|---|---|
| **No evidence of secrets in `localStorage` or exposed API keys** | **NONE** | The submitted documents contain no references to client‑side storage of credentials, keys, or configuration values. |
| **`eval` or unsafe dynamic code execution** | **NONE** | No usage of `eval`, `new Function`, or similar constructs is mentioned in the brief. |

---  

## 3. Input Validation  

| Finding | Rating | Details |
|---|---|---|
| **Absence of formal input‑sanitisation schemas (Zod/Yup)** | **MEDIUM** | While the brief discusses PII redaction and file‑type validation, it does **not** specify any type‑safe validation layer (e.g., Zod, Yup) for user‑entered data such as workout names, client emails, or voice‑input transcripts. This increases the risk of malformed or malicious payloads reaching backend services. |
| **Insufficient sanitisation of free‑text AI prompts** | **HIGH** | AI terminals accept unconstrained free‑text from trainers/clients. Without explicit sanitisation (e.g., length limits, prohibited‑keyword filters) malicious prompts could trigger injection‑style behaviour or cause denial‑of‑service via extremely large payloads. |

---  

## 4. CORS & CSP  

| Finding | Rating | Details |
|---|---|---|
| **CORS and CSP configuration not described** | **NONE** | The brief does not mention any CORS policies, allowed origins, or Content‑Security‑Policy headers. No mis‑configuration is evident, but the lack of documentation means the final implementation could unintentionally expose overly permissive endpoints. |

---  

## 5. Authentication  

| Finding | Rating | Details |
|---|---|---|
| **JWT handling and token storage not specified** | **MEDIUM** | The architecture discussion mentions RBAC and session context but does **not** detail how JWTs are created, signed, rotated, or stored (e.g., HttpOnly cookies vs. `localStorage`). Improper token handling could lead to token leakage or replay attacks. |
| **Session management gaps** | **MEDIUM** | No mention of session timeout, refresh‑token strategy, or revocation on logout. This could allow stale sessions to remain active after a user logs out or a device is lost. |

---  

## 6. Authorization  

| Finding | Rating | Details |
|---|---|---|
| **RBAC enforcement gaps & missing row‑level security** | **CRITICAL** | The brief outlines an intended RBAC model (admin → all, trainer → assigned clients, client → own data) but **does not** prescribe concrete enforcement mechanisms. Critical gaps identified: <br>• No Row‑Level Security (RLS) policy defined for the `conversations` JSONB table. <br>• No middleware decorator or guard to verify `trainer_id` matches `client_id` on every request. <br>• Admin privileges are treated as monolithic, creating a **privilege‑escalation** vector. <br>These omissions are rated **CRITICAL** because they directly enable unauthorized data access. |
| **Context‑switching without proper isolation** | **HIGH** | The plan mentions “context switching between trainer and client views” but does not enforce a strict security boundary (e.g., separate JWT claims or server‑side impersonation checks). This could allow a trainer to inadvertently act on another trainer’s client data. |

---  

## 7. Data Exposure  

| Finding | Rating | Details |
|---|---|---|
| **PII leakage in AI conversation storage** | **CRITICAL** | Conversations are stored as plain JSONB in PostgreSQL. The brief highlights a **ZERO PII TO LLMs** policy but does not describe any on‑device redaction or server‑side sanitisation before persisting. Raw client names, health details, or location data could be retained, violating privacy regulations (HIPAA/GDPR). |
| **Voice‑recording privacy and retention issues** | **HIGH** | Audio captured via `MediaRecorder` is sent to Gemini for transcription with **no retention policy** defined. Storing raw voice recordings (biometric data) without encryption or automatic deletion contravenes the “no PII to LLMs” rule and creates a compliance risk. |
| **Potential PII exposure via console / network logs** | **HIGH** | The brief notes that some AI responses contain raw HTML tags and that “some responses show raw HTML tags … instead of rendering them properly.” If such responses are logged (e.g., to console or log aggregation services) they could leak client‑specific identifiers or health information. No log‑scrubbing strategy is mentioned. |
| **File‑upload exposure (R2) without malware scanning** | **HIGH** | Images uploaded for AI analysis are stored in Cloudflare R2 but are not validated for malicious payloads (e.g., SVG with script, polyglot files). This could lead to **data exfiltration** or **server‑side code execution** if processed by vulnerable libraries. |

---  

### Summary of Ratings  

| Severity | Number of Findings |
|---|---|
| **CRITICAL** | 4 |
| **HIGH** | 4 |
| **MEDIUM** | 3 |
| **LOW / NONE** | 3 |

---  

**Recommendations (high‑level)**  

1. **Sanitise/escape all AI‑generated markup** before inserting into the DOM.  2. **Implement strict URL allow‑list and metadata stripping** for image uploads to eliminate SSRF vectors.  
3. **Introduce server‑side input validation schemas** (Zod/Yup) for all user‑submitted data, including voice transcripts.  
4. **Define CSP and restrictive CORS policies** for all backend endpoints.  
5. **Specify JWT lifecycle (signing, rotation, storage)** and enforce HttpOnly, Secure cookies.  
6. **Enforce Row‑Level Security** on the `conversations` table and add middleware guards for RBAC checks.  7. **Redact or tokenise PII before any external AI call** and enforce encryption‑at‑rest for conversation JSONB fields.  
8. **Establish a voice‑recording retention policy** (e.g., delete after processing) and encrypt data in transit/at rest.  
9. **Audit logs for PII leakage** and implement automated scrubbing of console/network logs.  
10. **Add malware scanning** (e.g., `sharp` re‑encoding) for all uploaded images before AI processing.  

These actions should be documented in the architecture design **before any implementation begins** to prevent the recurring “naïve copy‑paste” anti‑pattern highlighted in the brief.  

---  

*Part of SwanStudios 14‑Brain Recursive Consensus System*

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
