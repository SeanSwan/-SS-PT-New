| ID | Decision | Rejected alternative / reason |
|---|---|---|
| D-001 | Repair the first-mounted workout controller; keep route ordering. | Reordering exposes different validation/response behavior and the dormant owner-transfer defect. |
| D-002 | Private measurement media uses authenticated streaming. | Signed redirects retain transferable access after authorization changes. |
| D-003 | New-client identity intake is local; provider payloads require an explicit allowlist. | Regex-only de-identification cannot establish zero PII. |
| D-004 | Anonymous waivers stay unlinked until verified through an authenticated or staff-reviewed process. | Matching attributes are not ownership proof. |
| D-005 | Deduplicate provider events and purchase effects separately. | Distinct provider events can refer to one purchase. |
| D-006 | Snapshot full entitlement and price before provider creation. | Amount-only comparisons do not identify purchased credits or products. |
| D-007 | Accounting, balance, grant, inventory, and allocation claim are atomic. | Post-commit best effort loses required financial records. |
| D-008 | Historical orders are classified as verified granted, verified ungranted, or ambiguous. | Completed status and timestamps are insufficient evidence. |
| D-009 | Refund only credits attributable to that purchase; partial/ambiguous history goes to review. | Account-level `min(granted,balance)` can revoke another purchase. |
| D-010 | Current active assignment governs cross-client access; self/admin remain permitted. | Implicit historical-author access differs across endpoints. |
| D-011 | Onboarding notes use `general` and tag `onboarding`. | Adding a new enum solely to preserve an accidental literal adds avoidable migration risk. |
| D-012 | Startup verifies schema; approved jobs migrate it. | Runtime repair sync hides drift and mutates production implicitly. |
| D-013 | Receipt UI distinguishes paid, fulfilled, pending, review, and refunded. | `paid=true` does not establish delivered entitlement. |
| D-014 | Rollback preserves security containment and new durable claims. | Old code can double-grant or reopen unauthorized routes. |
| D-015 | Test historical baseline failures individually; never waive by count. | “The same 14” can hide changed failure identities. |
| D-016 | New modules ≤300 lines; existing oversized changes require a bounded extraction manifest. | No blanket file-size exemption. |
| D-017 | USD-only initial evidence contract; reject unknown amount/currency data. | Guessing defaults silently changes financial meaning. |
| D-018 | One grant may fund multiple sessions; one session may consume multiple grants. | A single nullable order ID on a session cannot describe split credit consumption. |
| D-019 | No production changes in the review phase. | Read-only review is not deployment authorization. |
