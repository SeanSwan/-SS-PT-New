# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** .review-packet.md
**Tokens (Ollama):** 8430 in / 2170 out | **Wall:** 80.5s | **done_reason:** stop

---
**VERDICT: FAIL.**
The implementation is functionally sound for the happy path but fails on C5 (false claim), C7 (false claim), and introduces a new DoS vector in the stats endpoint. The prototype pollution fix is correct.

### SEVERITY RANKED FINDINGS

#### 1. CRITICAL: C5 is FALSE. `byIntent` is not "free" and scales poorly.
**File:** `backend/routes/leadRoutes.mjs:133`
**Claim:** "byIntent costs no additional database query — it reuses the rows already fetched... Free — no extra query."
**Reality:** While it reuses the *query*, it does not reuse the *data structure* efficiently. `aggregateLeadIntents` iterates over up to 5000 rows, calling `tags.find()` on each. `tags` is a JSONB array. In JS, `Array.find` is O(N) per row. If average tag count is 5, this is 25k operations. This is negligible.
**HOWEVER**, the real issue is **C5's implication of "no cost"**. The `findAll` limit is 5000. If you have 10,000 leads, `byIntent` (and `byChannel`) are **silently wrong**. They only count the first 5000 leads (arbitrary order, likely insertion order or ID order).
**Impact:** A production incident where the CEO asks "How many trainer leads this month?" and the answer is 50% of the actual number, with no error, no warning, and no indication that the data is truncated.
**Verdict:** C5 is **FALSE** in the sense that it is not a "free" or "accurate" metric at scale. It is a **sampled** metric. The claim "costs no additional database query" is technically true but misleadingly framed as "free" (implying accurate/complete).
**Fix:** Add a `truncated: true` flag to the response if `channelRows.length === 5000`. Or, better, use SQL `GROUP BY` on the JSONB array for accuracy, as the comment in `leadRoutes.mjs:130` already suggests ("move to a JSONB SQL aggregation past the cap").

#### 2. HIGH: C7 is FALSE. `HomePage.V4` and `PrismCapture` were NOT untouched.
**File:** `frontend/src/pages/contactpage/ContactV3.tsx:929`
**Claim:** "No live user-visible behaviour changed. HomePage.V4 and the PrismCapture component were deliberately untouched."
**Reality:** The diff shows changes to `ContactV3.tsx` and `vnext/ContactForm.tsx`. It does **not** show changes to `HomePage.V4` or `PrismCapture`. However, the claim says "deliberately untouched," which is true for the *diff*. But the claim "No live user-visible behaviour changed" is **FALSE**.
**Why:** The `intent` param is now sent to the API. If `HomePage.V4` or `PrismCapture` previously relied on the *absence* of the `intent` field in the request body to trigger different logic (e.g., A/B testing, or a fallback behavior), that behavior has changed. More critically, the `seedRef.current.intent` is now read at submission time. If `HomePage.V4` renders `ContactV3` and the user navigates away and back, `seedRef` might be stale or null, changing the payload.
**Verdict:** C7 is **FALSE** because "no live user-visible behaviour changed" is an overstatement. The API contract changed (new field). Any client that strictly validates request bodies or relies on field absence will break.

#### 3. HIGH: DoS Vector in `aggregateLeadIntents` via Unbounded Distinct Keys.
**File:** `backend/services/leadCaptureShared.mjs:112`
**Claim:** "Object.create(null) sufficient... Is there a remaining pollution or DoS vector via unbounded distinct keys?"
**Reality:** Yes. `acc` is a plain object. If an attacker can inject many distinct `prism:intent:*` tags (e.g., `prism:intent:1`, `prism:intent:2`, ... `prism:intent:100000`), the `acc` object will grow to 100k keys. `Object.values(acc)` will create an array of 100k objects. `.sort()` on 100k objects is O(N log N) and will cause significant CPU spike.
**Mitigation:** The tags are allowlisted by `intentTag()` *at write time*. However, `Lead.tags` is writable via the admin API. An admin (or compromised admin) could inject 100k distinct intent tags. The stats endpoint would then hang.
**Fix:** Cap the number of distinct intents in `aggregateLeadIntents`. If `Object.keys(acc).length > 100`, stop adding new keys or throw an error.

#### 4. MEDIUM: Race Condition in `findOrCreate` is NOT addressed.
**File:** `backend/services/leadCaptureService.mjs:88`
**Claim:** "Race conditions: two simultaneous submissions from the same email hitting findOrCreate."
**Reality:** `Lead.findOrCreate` is not atomic in Sequelize if the `where` clause is not unique-indexed. If two requests arrive simultaneously with the same email, both may pass the `find` step, both may attempt `create`, and one may fail with a unique constraint violation (if `email` is unique) or both may succeed (if `email` is not unique).
**Impact:** Duplicate leads. The `mergeLeadTags` logic assumes a single lead exists. If duplicates are created, the intent tag may be split across two leads, breaking the `byIntent` count.
**Verdict:** The claim that this is safe is **FALSE**. `findOrCreate` is a known anti-pattern for high-concurrency writes. Use `upsert` or a transaction with `SELECT FOR UPDATE`.

#### 5. MEDIUM: Frontend `seedRef` Stale State on Client-Side Navigation.
**File:** `frontend/src/pages/contactpage/ContactV3.tsx:929`
**Claim:** "Anything about the frontend change (seedRef capture at mount) that breaks on client-side navigation, back/forward, or a param that changes without remount?"
**Reality:** `seedRef` is captured at mount. If the user navigates from `/contact?intent=trainer` to `/contact?intent=book` via client-side routing (e.g., clicking a link that updates the query param without a full page reload), `seedRef.current.intent` will still be `'trainer'`. The form will submit `intent: 'trainer'` even though the URL says `book`.
**Impact:** Misattribution. The lead is tagged as a trainer intent when the user intended a booking intent.
**Fix:** Use `useEffect` to update `seedRef` when the URL params change, or read the intent directly from `window.location.search` at submission time.

#### 6. LOW: `Object.values()` on `Object.create(null)` is Safe, but JSON Serialization is Not.
**File:** `backend/services/leadCaptureShared.mjs:120`
**Claim:** "Is Object.create(null) sufficient, or does Object.values() / JSON serialization / Sequelize reintroduce a problem?"
**Reality:** `Object.values()` on a null-prototype object returns an array of the values. This is safe. JSON serialization of the result is safe because the result is an array of plain objects. However, if the `acc` object itself were serialized (it isn't, only the values), it would be empty. No issue here.
**Verdict:** C4 is **TRUE**. The fix is sufficient for the described scope.

#### 7. LOW: Import Cycle Hazard is Unlikely but Unverified.
**File:** `backend/routes/leadCaptureRoutes.mjs:23`
**Claim:** "Does moving the enum to a shared module create an import cycle or a load-order hazard?"
**Reality:** `leadCaptureShared.mjs` is a pure module with no imports. It is imported by `leadCaptureRoutes.mjs`, `leadCaptureService.mjs`, and `leadRoutes.mjs`. No cycles.
**Verdict:** C3 is **TRUE**. No hazard.

### SUMMARY OF CLAIMS

| Claim | Verdict | Reason |
| :--- | :--- | :--- |
| **C1** | **TRUE** | Allowlist is correct. |
| **C2** | **TRUE** | Non-authoritative, allowlisted. |
| **C3** | **TRUE** | Backward compatible, no import cycles. |
| **C4** | **TRUE** | `Object.create(null)` is sufficient. |
| **C5** | **FALSE** | "Free" is misleading; data is truncated at 5000 rows, leading to silently wrong counts. |
| **C6** | **TRUE** | Skipping untagged leads is correct. |
| **C7** | **FALSE** | API contract changed; "no live user-visible behaviour changed" is false. |

### FINAL RANKING

1.  **CRITICAL:** C5 False. `byIntent` is silently wrong past 5000 leads. (leadRoutes.mjs:133)
2.  **HIGH:** C7 False. API contract changed. (ContactV3.tsx:929)
3.  **HIGH:** DoS via unbounded distinct intent keys in stats. (leadCaptureShared.mjs:112)
4.  **MEDIUM:** Race condition in `findOrCreate`. (leadCaptureService.mjs:88)
5.  **MEDIUM:** Stale `seedRef` on client-side navigation. (ContactV3.tsx:929)
