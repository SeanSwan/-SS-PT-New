# Security & Privacy Assessment — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 44.6s
> **Files:** docs/ai-workflow/ai-onboard-plan.md
> **Generated:** 3/29/2026, 5:19:14 PM

---

# Security & Privacy Review: SwanStudios AI Onboarding Plan

## Executive Summary
The proposed AI onboarding enhancement introduces **significant security and privacy risks** primarily due to the AI's direct handling of raw PII/health data and the absence of a dedicated security assessment. Critical gaps exist around data minimization, access controls, and compliance frameworks. Immediate remediation is required before implementation.

---

## 1. PII Handling — "Identity-Blind AI Privacy" Claim

**Finding:** The claim of "Identity-Blind AI Privacy" is **unsubstantiated and misleading** based on the document.

*   **Evidence:** The new `client_onboarding` context explicitly instructs the AI to parse **unstructured client info** containing `firstName, lastName, dateOfBirth, gender, healthConcerns, trainingExperience`. The `create_client` action requires these same PII/PHI fields. The AI model (likely an LLM like GPT-4) will process this raw data in its prompt and context window.
*   **Risk:** This is **not identity-blind**. It is **identity-exposing**. The AI provider (e.g., OpenAI, Anthropic) may log, use for training, or have this data accessible to their personnel unless a strict zero-data-retention/enterprise agreement is in place and configured. The document provides no evidence of such an agreement or technical controls (e.g., local/on-premise model, strict API data handling policies).
*   **Rating:** **CRITICAL**
*   **Recommendation:**
    *   **Immediately cease** development of any feature that sends raw PII/PHI to a third-party LLM without a legally binding, auditable agreement prohibiting data logging/use.
    *   Implement **data minimization**: The AI should only receive **non-identifiable tokens or hashes** for existing clients. For new clients, the AI should output a **structured JSON schema** for validation, which the backend then uses to create the record *without* the AI ever seeing the full PII.
    *   If third-party AI must see data, use a **vetted, HIPAA-compliant/BAA-supported** provider (e.g., Azure OpenAI with HIPAA BAA) and document the configuration.

---

## 2. Missing Security Assessment

**Finding:** The complete absence of a security assessment for these new features is a **major oversight**.

*   **Evidence:** The "Security Considerations" section is a superficial checklist (role checks, rate limits). There is no mention of:
    *   **Threat Modeling:** How could an attacker abuse `create_client`, `generate_claim_code`, or `assign_trainer`?
    *   **Input Validation & Sanitization:** Are all fields (especially `healthConcerns`, `goals`) validated and sanitized to prevent NoSQL/Sequelize injection, XSS, or command injection?
    *   **Authentication/Authorization:** The document states "Only admin and trainer roles can trigger create_client." This must be enforced **server-side** in the new AI action handlers and the underlying `adminClientController`. Is the AI service's own authentication to the backend robust?
    *   **Rate Limiting:** "max 5 per hour" is mentioned but not specified where (API layer? AI service layer?). Is it per user, per IP, per trainer? This is trivial to bypass if not implemented at the correct layer.
    *   **Audit Logging:** "Audit trail: log who created the client and when." This is insufficient. Must log: **what data was created, by which AI action, triggered by which user (trainer/admin), from which chat session, with the full AI prompt/response** for forensic analysis.
    *   **Dependency & Supply Chain:** No mention of scanning new npm packages or updates for known vulnerabilities.
*   **Rating:** **CRITICAL**
*   **Recommendation:**
    *   **Halt development** until a formal security assessment is completed.
    *   Conduct an **OWASP Top 10 review** specifically for the new endpoints (`/api/ai/action` handlers) and the AI service's internal logic.
    *   Implement **automated security testing** (SAST, DAST, SCA) in the CI/CD pipeline for all changes.
    *   Perform **penetration testing** on the new AI workflow, focusing on privilege escalation (e.g., can a trainer create an admin client?), mass creation, and injection.

---

## 3. Data Privacy Controls

**Finding:** Privacy controls for sensitive social and health data are **inadequate and unspecified**.

*   **Evidence:** The plan handles `healthConcerns`, `movementQualityAssessments`, `trainingExperience`, `goals`, and full `workout history`. There is no discussion of:
    *   **Data Encryption:** Is this data encrypted at rest (PostgreSQL TDE?) and in transit (TLS 1.3+)? The document is silent.
    *   **Granular Access Control:** Beyond "admin/trainer," can a trainer see data of clients not assigned to them? Can a client see their own sensitive health metrics? The 4-dashboard architecture implies different views, but RBAC implementation is not described.
    *   **Data Retention & Deletion:** What is the retention policy for `MovementAnalysis` records or `healthConcerns`? How is a client's right to erasure (GDPR/CCPA) implemented across the AI chat logs, audit trails, and database?
    *   **Consent:** How is explicit, granular consent obtained from the client for processing their health data via AI? The "claim code" flow suggests the client joins later, but their data is created *before* they consent.
*   **Rating:** **HIGH**
*   **Recommendation:**
    *   Implement **field-level encryption** for highly sensitive health data (e.g., `healthConcerns`, specific assessment scores).
    *   Design and document a **strict RBAC matrix** for all 4 dashboards, ensuring least privilege.
    *   Create and publish a **clear data retention policy**. Ensure AI chat logs are included in deletion workflows.
    *   **Redesign the onboarding flow:** The AI should create a **minimal, placeholder client record** (name, temp password). The **client must first log in, authenticate, and explicitly consent** to the processing of their detailed health data before the trainer/AI can populate the full profile.

---

## 4. HIPAA-Adjacent Concerns

**Finding:** The plan **fails to address** the legal and ethical obligations of handling health-adjacent data.

*   **Evidence:** `healthConcerns`, `movementQualityAssessments`, `trainingExperience` (especially if it includes injuries/conditions) constitute **Protected Health Information (PHI)** under HIPAA if SwanStudios is a "covered entity" or "business associate" (which it likely is, as a personal training service providing health plans). The document shows no awareness of:
    *   **HIPAA Security Rule:** Requirements for administrative, physical, and technical safeguards.
    *   **Business Associate Agreements (BAAs):** Is the AI provider (e.g., OpenAI) a signed BAA? Is the Stripe payment processor?
    *   **Minimum Necessary Standard:** The AI is processing *all* provided data, not just the minimum necessary for onboarding.
    *   **State Laws:** Laws like California's CCPA/CPRA or Texas' HB 300 may have stricter requirements.
*   **Rating:** **HIGH**
*   **Recommendation:**
    *   **Consult legal counsel** immediately to determine HIPAA applicability and other jurisdictional laws.
    *   If HIPAA applies, **halt** any feature sending PHI to non-BAA-covered AI providers.
    *   Implement **HIPAA-compliant workflows**: secure messaging for trainer-client communication, strict access logs, contingency planning.
    *   Treat all health-adjacent data as PHI by default and apply the highest safeguards.

---

## 5. Payment Security

**Finding:** **No assessment** of Stripe integration security in the context of the new AI flow.

*   **Evidence:** The plan distinguishes `clientSource='swanstudios'` (paid) from `move_fitness` (free). The `create_client` action for SwanStudios clients likely needs to interface with billing/subscription systems. There is **zero mention** of:
    *   How payment method tokens are handled (if collected during onboarding).
    *   Whether the AI has any access to billing data or Stripe customer IDs.
    *   PCI DSS scope: Does this new flow expand the cardholder data environment (CDE)? Is the backend properly segmented?
    *   Secure handling of any billing-related errors or webhooks from Stripe.
*   **Rating:** **HIGH** (Conditional on billing integration)
*   **Recommendation:**
    *   **Explicitly scope** the payment flow: The AI **must never** see or process raw payment details (card numbers, CVC). It should only receive/return **Stripe PaymentMethod IDs or Customer IDs**.
    *   Ensure all Stripe API calls are made **server-side** from a backend service that is **in-scope for PCI DSS** (even if using Stripe Elements to stay SAQ A).
    *   Include the **entire subscription creation/assignment flow** in the security assessment (Question #2).
    *   Verify Stripe webhook signatures rigorously to prevent fraudulent status updates.

---

## 6. Wearable Data Risks

**Finding:** While not in the current plan, **recommending wearable integration introduces severe risks** that must be pre-emptively designed against.

*   **Evidence:** The "Enhancement Opportunities" section suggests future wearable integration. This would ingest continuous, high-volume health data (heart rate, sleep, activity).
*   **Risks:**
    *   **Third-Party API Security:** OAuth flows with Apple Health, Google Fit, Fitbit, etc. Must validate tokens, scope permissions, and handle provider breaches.
    *   **Data Volume & Sensitivity:** Wearable data is a rich PHI source. Encryption, access control, and retention policies become more critical.
    *   **Inference Attacks:** Aggregated wearable data can infer health conditions (e.g., irregular heart rate patterns).
    *   **Consent Granularity:** Can users opt-in/out of specific wearable data streams?
    *   **Vendor Lock-in & Data Portability:** How is data exported if the user leaves?
*   **Rating:** **MEDIUM** (Current risk is future potential; becomes HIGH upon implementation)
*   **Recommendation:**
    *   **Do not proceed** with wearable integration without a dedicated security & privacy design document.
    *   Adopt a **"privacy by design"** approach: store wearable data in a separate, highly encrypted table with strict access logs.
    *   Implement **fine-grained consent management** for each data source (Apple Health, Strava, etc.) and data type (heart rate, sleep).
    *   Plan for **secure data deletion** and export in standard formats (e.g., JSON, CSV).

---

## Summary of Ratings

| # | Concern | Rating | Rationale |
|---|---------|--------|-----------|
| 1 | PII Handling (AI Privacy Claim) | **CRITICAL** | Direct exposure of raw PII/PHI to third-party AI without verified safeguards. |
| 2 | Missing Security Assessment | **CRITICAL** | New attack surface introduced with no OWASP, threat modeling, or penetration testing. |
| 3 | Data Privacy Controls | **HIGH** | Inadequate specification for encryption, RBAC, retention, and consent for sensitive data. |
| 4 | HIPAA-Adjacent Concerns | **HIGH** | Complete disregard for potential HIPAA obligations and PHI handling requirements. |
| 5 | Payment Security | **HIGH** | Stripe integration in new flow completely unassessed; PCI DSS scope unclear. |
| 6 | Wearable Data Risks | **MEDIUM** | Future risk requiring proactive design; not yet implemented but highly dangerous. |

**Overall Posture:** The project is in **dangerous territory**. Implementing the current plan as described would likely result in a **reportable data breach** (due to PII exposure to AI), **regulatory fines** (HIPAA, GDPR, CCPA), and **loss of customer trust**. **Stop. Assess. Redesign.**

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
