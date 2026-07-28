# Security & Privacy Planning — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 24.4s
> **Files:** docs\ai-workflow\AI-HANDOFF\NUTRITION-DECISION-LOGGER-AI-VILLAGE-INPUT-2026-07-09.md
> **Generated:** 7/8/2026, 8:30:00 PM

---

## Security Review of the Nutrition Decision Logger Plan  
*Derived **only** from the supplied plan (`docs\ai-workflow\AI-HANDOFF\NUTRITION-DECISION-LOGGER-AI-VILLAGE-INPUT-2026-07-09.md`).*  

---  

### 1. PII / Sensitive‑Data Exposure  
| Finding | Rating | Why it matters (plan evidence) | Specific Mitigations |
|---|---|---|---|
| **Nutrition logs may contain health‑adjacent PII** (e.g., user‑entered food descriptions, allergens, medical‑condition notes) that could be considered protected health information (PHI) under many jurisdictions. The plan does **not** describe any explicit de‑identification step before sending data to an external LLM. | **CRITICAL** | The platform has a *ZERO PII TO LLMS* policy. The `NutritionEntryDraft` will be posted to `/api/macros` and may be processed by AI‑driven “Truth” validation that could be forwarded to an external model. If any field (e.g., `description`, `brandName`, `healthConcerns`) contains personally identifying text, it would violate the policy. | • **Sanitise before outbound calls** – strip or hash any free‑form text that could contain PII before the request reaches an external LLM. <br>• **Server‑side only AI processing** – keep any LLM interaction inside the backend; never forward raw user‑entered strings to a third‑party endpoint. <br>• **Audit logs** – tag any field that may contain PHI and ensure they are never logged in clear text. <br>• **Data‑retention policy** – purge or anonymise logs older than the required retention window. |

---  

### 2. Upload / File / Media Risks  
| Finding | Rating | Why it matters (plan evidence) | Specific Mitigations |
|---|---|---|---|
| **Barcode / label‑photo scanner accepts image uploads** (`FoodScannerPage.tsx` → `POST /api/food-scanner/log-scan`). No mention of MIME‑type validation, size limits, or anti‑virus scanning. | **HIGH** | Image files are a known vector for malicious payloads (e.g., embedded scripts, SVG‑based exploits) and could be used for SSRF if URLs are redirected. | • **Validate MIME type** – accept only `image/jpeg`, `image/png`, `image/webp`. <br>• **Enforce size limits** – e.g., ≤ 5 MB. <br>• **Server‑side virus / malware scanning** before storage. <br>• **Store uploads outside the web‑root** and serve via signed URLs. <br>• **Reject URLs** – do not allow the client to supply external image URLs; only accept locally‑selected files. |
| **Food‑search uses external USDA / OpenFoodFacts APIs from the browser** (`FoodSearchPanel.logic.ts:55`). The plan notes that USDA keys must not be exposed, implying a proxy is required. | **HIGH** | Direct browser calls could leak API keys or enable SSRF if an attacker manipulates the request URL. | • **Proxy all external food‑API calls through the backend** (as the plan already intends). <br>• **Sanitize and whitelist URLs** on the server before forwarding. <br>• **Rate‑limit** external API calls to prevent abuse. |

---  

### 3. Audio / Video / Biometric Privacy  
| Finding | Rating | Why it matters (plan evidence) | Specific Mitigations |
|---|---|---|---|
| **Voice macro logging captures audio** (`frontend/src/components/FoodTracker/FoodIntakeForm.tsx` builds a voice payload). No discussion of consent, retention, or biometric‑data handling. | **MEDIUM** | Voice recordings can be considered biometric data under GDPR/CCPA; storing them without explicit consent creates legal risk. | • **Obtain explicit opt‑in consent** before starting a recording. <br>• **Do not store raw audio on the server** – process it on‑device for speech‑to‑text and discard the file immediately. <br>• **If storage is required for debugging, encrypt and set a short TTL (e.g., 24 h)**. <br>• **Document the processing purpose** in the privacy policy and provide a clear “delete recording” button for the user. |
| **Potential for continuous background streaming** if the voice‑capture stream is not explicitly closed. | **MEDIUM** | Browser APIs can leave streams alive, leading to unwanted background recording. | • **Call `stream.getTracks().forEach(t => t.stop())`** after the voice session ends. <br>• **Use a `Promise`‑based wrapper** that resolves only after the user confirms submission. |

---  

### 4. Data‑at‑Rest Security  
| Finding | Rating | Why it matters (plan evidence) | Specific Mitigations |
|---|---|---|---|
| **`DailyMacroLog` stores nutrition entries that may include sensitive health metrics** (calories, allergens, Nova group, verified flag). The plan does not describe encryption at rest. | **MEDIUM** | Production SaaS handling health data must protect it from unauthorized reading. | • **Enable Transparent Data Encryption (TDE)** or column‑level encryption for fields like `allergens`, `healthConcerns`, `verified` flags. <br>• **Restrict DB access** to service accounts with least‑privilege rights. <br>• **Audit DB access logs** for any read of nutrition tables. |
| **`items` JSON field can hold arbitrary provenance data** (plan mentions “raw source payload hash/ref”). No mention of encryption for this nested structure. | **MEDIUM** | Arbitrary JSON could contain personally identifying metadata. | • **Encrypt the `items` column** or store only hashed references. <br>• **Apply column‑level access controls** so only the owner/trainer can decrypt. |

---  

### 5. Authorization / RBAC Enforcement  
| Finding | Rating | Why it matters (plan evidence) | Specific Mitigations |
|---|---|---|---|
| **Shared routes for admin/trainer/client** (`UniversalDashboardLayout.routes.tsx` maps `/nutrition/:clientId?`, `/meal-planner` to different components). The plan does **not** show explicit checks that `clientId` matches the authenticated user’s ID when a trainer logs for a client. | **HIGH** | Without proper scoping, a trainer could read or modify another client’s diary entries (IDOR). | • **Enforce foreign‑key constraints** (`DailyMacroLog.userId` must equal the authenticated user’s `id` unless the caller is an admin with explicit permission). <br>• **Add server‑side authorization middleware** that checks `req.user.role` and validates `clientId` ownership before allowing reads/writes. <br>• **Log all cross‑tenant actions** for audit. |
| **Admin review queue (`/api/macros/review-queue`) is claimed by a triage router before generic macro routes** – no explicit permission check shown. | **HIGH** | If any authenticated user could hit the queue endpoint, they could view or manipulate other users’ unverified entries. | • **Require `role === 'admin' || role === 'trainer'`** and verify that the requested `entryId` belongs to a client the caller is allowed to review. <br>• **Return 403** for unauthorized attempts. |
| **`verified` flag is set by trainer/admin actions** (`ClientNutritionEstimateReviewPanel.tsx` patches `/api/macros/client-timeline/:entryId/verify`). No mention of rate‑limiting or audit trails. | **MEDIUM** | Unchecked mass‑verification could be abused. | • **Rate‑limit verification calls per user/IP**. <br>• **Record the actor and timestamp** in an audit table. |

---  

### 6. Browser‑API / Permission Risks  
| Finding | Rating | Why it matters (plan evidence) | Specific Mitigations |
|---|---|---|---|
| **Use of `getUserMedia` for voice and label‑photo OCR** (implicit in `FoodScannerPage` and voice macro). No cleanup logic shown. | **MEDIUM** | Leaving media streams open can expose the user’s camera/microphone to other tabs or cause background recording. | • **Always stop tracks** after the request finishes (`stream.getTracks().forEach(t => t.stop())`). <br>• **Wrap the stream in a `try/finally` block** to guarantee cleanup. |
| **Permission prompts may persist** if the user denies access but the UI does not handle the denial gracefully. | **LOW** | Could lead to a broken UI but not a security breach. | • **Handle permission denied** by disabling the related capture mode and showing a clear message. <br>• **Do not fallback to silent data loss** – abort the logging flow if a required permission is missing. |

---  

### 7. Injection / XSS Risks  
| Finding | Rating | Why it matters (plan evidence) | Specific Mitigations |
|---|---|---|---|
| **User‑generated food names, descriptions, and custom macro payloads are rendered directly in the UI** (e.g., `description` field displayed in the diary timeline). No sanitisation mentioned. | **HIGH** | Unsani­tized strings can contain HTML/JS, leading to XSS when rendered in the React component. | • **Escape all user‑generated content** before inserting into JSX (use `{dangerouslySetInnerHTML}` only after sanitising with a library like `dompurify`). <br>• **Server‑side validation** of incoming payloads (`/api/macros`) to reject disallowed characters. |
| **Potential injection in API payloads** (`POST /api/macros` builds a macro payload from user input). The plan does not mention parameterised queries for the backend. | **HIGH** | If the backend builds SQL/NoSQL queries using raw user input, it could be vulnerable to injection. | • **Use Sequelize query‑builders with parameterisation** – never concatenate strings. <br>• **Whitelist allowed fields** and reject unexpected keys. <br>• **Run a static analysis** (e.g., ESLint security plugin) on all new route handlers. |

---  

## Summary of Ratings  

| Category | Rating |
|---|---|
| PII / Sensitive‑Data Exposure | **CRITICAL** |
| Upload / File / Media Risks | **HIGH** |
| Audio / Video / Biometric Privacy | **MEDIUM** |
| Data‑at‑Rest Security | **MEDIUM** |
| Authorization / RBAC Enforcement | **HIGH** |
| Browser‑API / Permission Risks | **MEDIUM** |
| Injection / XSS Risks | **HIGH** |

---  

### Overall Recommendation  

All **CRITICAL** and **HIGH** findings must be addressed **before any code is merged to production**. The plan already contains many of the required architectural pieces (backend‑proxied food APIs, `DailyMacroLog` with rich fields, role‑based routing), but the security‑specific gaps listed above need explicit implementation, testing, and audit.  

---  

*Prepared by the security engineering team for internal review only.*

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
