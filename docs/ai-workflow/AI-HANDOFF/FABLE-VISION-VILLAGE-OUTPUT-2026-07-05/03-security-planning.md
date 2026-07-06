# Security & Privacy Planning — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 22.9s
> **Files:** FABLE-BRIEF-TO-REVIEW.md
> **Generated:** 7/5/2026, 8:28:03 PM

---

# Security Review Findings (derived **only** from the supplied PLAN)

---

## 1. PII / Sensitive‑Data Exposure  
**What the plan adds**  
- Several new surfaces now handle health‑related data:  
  - `PainEntry` / `workoutConstraints` (Workstream D)  
  - `NutritionLog`, `GardenPlant`, `SessionCredit` (Workstream E & L)  
  - “Next‑Best‑Action” engine that consumes logged history, pain constraints, and phase data (Workstream H)  
- The plan mentions **external AI services** (e.g., Gemini image analysis, AI‑Village 15‑brain synthesis) that may receive user‑generated content (photos, workout logs) for model inference.  

**Rating**: **MEDIUM**  
*Why*: The platform already enforces a “ZERO PII TO LLMs” rule, but the plan does **not** explicitly state that every outbound request to external AI services strips or hashes identifiers before sending. If raw identifiers (user‑ID, session‑ID, credit counts) are forwarded, they could violate the policy.

**Mitigations**  
- **De‑identify** all payloads before any external LLM call: strip `userId`, `clientName`, `email`, `sessionId`, and any direct PHI.  
- **Whitelist** safe fields only (e.g., `workoutDuration`, `exerciseType`).  
- **Log** every outbound request and audit that no PII leaves the service.  
- **Add a unit‑test** that injects a mock PII field and asserts it is removed from the request body.

---

## 2. Upload / File / Media Risks  
**What the plan adds**  
- **Camera‑based barcode scanner** (Workstream E) that captures an image and sends it to an external AI service (Gemini).  
- Potential **file uploads** for nutrition logs or garden photos.  
- **SSRF exposure** via external URL fetches used in the farm‑finder / restaurant‑finder logic.  

**Rating**: **HIGH**  
*Why*: Uploading arbitrary images opens the door to malicious payloads (e.g., executable scripts, polyglot files) and the SSRF calls could be abused to reach internal services if not properly whitelisted.

**Mitigations**  
1. **Strict MIME‑type & size validation** – allow only `image/jpeg` / `image/png` ≤ 5 MB.  
2. **Virus / malware scanning** on the server before storage.  
3. **Store uploads outside the web‑root** with randomly generated filenames; never expose the original name.  
4. **SSRF hardening** – maintain a **whitelist of allowed domains** (e.g., `usda.gov`, `openfoodfacts.org`); enforce a short timeout (≤ 5 s).  
5. **Content‑Security‑Policy** – disallow `unsafe-inline` and `blob:` for any rendered upload content.  
6. **Unit / integration tests** that attempt to upload a malicious file and verify a 403/415 response.

---

## 3. Audio/Video/Biometric Privacy  
**What the plan adds**  
- No new audio or video capture is described. The only media‑related feature is the **image‑only barcode scanner**.  

**Rating**: **LOW**

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
