# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 9.6s
> **Files:** backend/controllers/authController.mjs, frontend/e2e/admin-focused-flow.spec.ts
> **Generated:** 3/6/2026, 11:57:12 PM

---

This performance and scalability review covers the `authController.mjs` (Backend) and `admin-focused-flow.spec.ts` (E2E Testing).

---

### **1. Database & Scalability (Backend)**

#### **Finding 1: In-Memory Rate Limiting (Non-Scalable)**
**Rating: CRITICAL**
*   **Issue:** The `loginAttempts` is a `Map()` stored in the Node.js process memory.
*   **Impact:** In a multi-instance production environment (Kubernetes/PM2), rate limits are not shared. An attacker can rotate through instances to bypass limits. Furthermore, this causes a **memory leak** as the map is never cleared of old entries, eventually leading to an OOM (Out of Memory) crash.
*   **Recommendation:** Migrate to **Redis** using `rate-limiter-flexible`.

#### **Finding 2: N+1 and Unbounded Queries in `register`**
**Rating: HIGH**
*   **Issue:** The "Auto-follow" logic performs a `User.findOne` for an admin and then a `Friendship.findOrCreate` inside the registration flow.
*   **Impact:** As the user base grows, performing these extra queries synchronously during registration increases latency. Additionally, `User.findOne({ where: { role: 'admin' } })` might return a random admin if multiple exist, and it isn't indexed for `role`.
*   **Recommendation:** Move auto-follow logic to an asynchronous worker/queue or a `setImmediate` block to prevent blocking the registration response.

#### **Finding 3: Missing Database Indexes**
**Rating: HIGH**
*   **Issue:** The `forgotPassword` and `resetPassword` functions query by `resetPasswordToken` and `email` (using `LOWER`).
*   **Impact:** Without a functional index on `LOWER(email)` and a standard index on `resetPasswordToken`, PostgreSQL will perform a **Full Table Scan**. This scales poorly (O(N)).
*   **Recommendation:** Add a B-Tree index to `resetPasswordToken` and a functional index: `CREATE INDEX users_email_lower_idx ON users (LOWER(email));`.

---

### **2. Network & API Efficiency**

#### **Finding 4: Heavy Payload in `login` and `register`**
**Rating: MEDIUM**
*   **Issue:** `sanitizeUser` returns a large object including `createdAt`, `updatedAt`, and potentially large strings like `fitnessGoal`.
*   **Impact:** Increased TTFB (Time to First Byte) and payload size. Most auth flows only need the `id`, `role`, and `token`.
*   **Recommendation:** Implement a "Minified User" response for auth and let the frontend fetch full profile details only when the Profile page is mounted.

#### **Finding 5: Synchronous Bcrypt on Main Thread**
**Rating: MEDIUM**
*   **Issue:** `bcrypt.hash` and `compare` are CPU-intensive.
*   **Impact:** While the code uses `await`, bcrypt still blocks the Node.js Event Loop for the duration of the hashing (~100ms). Under high login load, the server will stop responding to other requests (e.g., health checks).
*   **Recommendation:** Ensure the worker pool is sized correctly or offload auth to a dedicated microservice if SwanStudios scales to thousands of concurrent users.

---

### **3. E2E Test Performance (Frontend/QA)**

#### **Finding 6: Massive Over-fetching in Tests**
**Rating: HIGH**
*   **Issue:** `fetchJson(page, token, '/api/admin/clients?limit=200')` is called to find a single client.
*   **Impact:** The test suite downloads 200 full client records just to verify one ID. This slows down CI/CD pipelines and puts unnecessary load on the dev/staging database.
*   **Recommendation:** Update the API to support filtering (e.g., `/api/admin/clients?id=${clientId}`) or reduce the limit in test environments.

#### **Finding 7: Redundant Navigation (Render Performance)**
**Rating: MEDIUM**
*   **Issue:** The test `client/trainer photo updates persist` calls `page.goto` multiple times to refresh the state.
*   **Impact:** Each `goto` triggers a full React mount, CSS parsing, and JS execution.
*   **Recommendation:** Use `page.reload()` or, better yet, verify the UI updates via React state changes/API interception rather than full page reloads.

---

### **4. Security & Memory**

#### **Finding 8: JWT Secret Fallback**
**Rating: HIGH**
*   **Issue:** `process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET`.
*   **Impact:** If the refresh secret isn't set, it reuses the access secret. If an access token is compromised, the attacker has the key to forge refresh tokens.
*   **Recommendation:** Enforce strict environment variable checks at startup. Throw an error if `JWT_REFRESH_SECRET` is missing.

#### **Finding 9: Password Reset Timing Attack**
**Rating: LOW (Optimized but risky)**
*   **Issue:** The `forgotPassword` uses `setImmediate` to respond early.
*   **Impact:** While good for UX, if the background task fails (e.g., DB down), the user is told "Email sent" but it never happens.
*   **Recommendation:** Use a reliable message queue (BullMQ/RabbitMQ) for background emails to ensure "At Least Once" delivery.

---

### **Summary Table**

| Finding | Category | Rating |
| :--- | :--- | :--- |
| In-memory Rate Limiting | Scalability / Memory | **CRITICAL** |
| Missing DB Indexes | DB Efficiency | **HIGH** |
| N+1 Registration Logic | Scalability | **HIGH** |
| E2E Over-fetching | Network Efficiency | **HIGH** |
| JWT Secret Fallback | Security | **HIGH** |
| SanitizeUser Payload | Network Efficiency | **MEDIUM** |
| Redundant E2E Nav | Render Performance | **MEDIUM** |

---

*Part of SwanStudios 7-Brain Validation System*
