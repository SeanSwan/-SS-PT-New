**N/A — this is a headless migration and schema-reconciliation task. It introduces no screens, desktop layouts, 375px mobile layouts, UI controls, palette tokens, or HTTP interfaces.**

Operator-visible output is specified instead:

| State | Required copy |
|---|---|
| Invalid configuration | `BLOCKED: migration configuration is invalid.` |
| Missing owner decision | `BLOCKED: schema authority decision is incomplete.` |
| Other runner holds lock | `BLOCKED: another migration runner holds the database lock.` |
| Unapproved catalog state | `BLOCKED: observed schema does not match an approved migration path.` |
| Historical inert files reported | `LEGACY INVENTORY: files outside the approved execution path remain recorded debt.` |
| Child failure | `FAILED: migration execution did not complete successfully.` |
| Uncertain completion | `INDETERMINATE: inspect catalog and migration metadata before retrying.` |
| Verified completion | `PASS: required migration postconditions and metadata were verified.` |
| Startup schema mismatch | `BLOCKED: required application schema contract is not satisfied.` |

Messages may include migration filenames, contract identifiers, and SQLSTATE values. They must not print connection URLs, credentials, row values, or unrestricted child output.
