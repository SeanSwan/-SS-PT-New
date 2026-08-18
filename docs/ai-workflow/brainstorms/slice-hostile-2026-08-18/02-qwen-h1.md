# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/brainstorms/slice-hostile-2026-08-18/00-PACKET-FULL.md
**Tokens (Ollama):** 6552 in / 3179 out | **Wall:** 26.7s | **done_reason:** stop

---
Here is the hostile review of the three shipped guards.

### 1. `backend/scripts/schema-drift-check.mjs`

**Finding 1: False Negative — `underscored: true` models are silently skipped or mismatched**
*   **Severity:** High (False Negative)
*   **File:** `backend/scripts/schema-drift-check.mjs`
*   **Defect:** The script iterates `model.rawAttributes`. In Sequelize, if a model is defined with `underscored: true`, the `rawAttributes` keys are the camelCase JS names (e.g., `userId`), but the actual database columns are snake_case (e.g., `user_id`). The script checks `const column = def.field || attr;`. If the model does not explicitly define `field` for every attribute (which is common when relying on the global `underscored` option), `def.field` is undefined. The script then compares the camelCase `attr` against the live DB columns. Since the live DB has `user_id` and the script looks for `userId`, it will report a **FALSE POSITIVE** `MISSING_COLUMN` for every single attribute in that model. Conversely, if the user manually set `field` on some but not all, the logic is inconsistent. More critically, if the model *does* rely on `underscored` and the script *doesn't* apply the underscore transformation to the expected column name, it fails.
    *   *Wait, re-reading the code:* `const column = def.field || attr;`. If `underscored: true` is set globally, Sequelize *does* usually populate `field` in `rawAttributes` during initialization if the attribute name differs. However, if a developer defines a model with `underscored: true` but explicitly sets `field: 'userId'` (mistake) or if the Sequelize version behaves differently, this breaks.
    *   *The real defect:* The script does **not** account for the `underscored` option when `def.field` is missing. If a model uses `underscored: true` and a specific attribute *doesn't* have an explicit `field` defined (relying on the default transformation), `def.field` might be undefined in some Sequelize versions or configurations, causing the script to look for `camelCase` in a `snake_case` table.
    *   *Actually, the bigger issue:* The script compares `typeFamily`. It does **not** handle **Virtual Attributes** or **Computed Attributes**. If a model has a virtual attribute (e.g., `fullName`), `rawAttributes` will contain it. The script will check if `fullName` exists in the DB. It won't. It will report `MISSING_COLUMN` (CRITICAL). This is a **False Positive** because virtual attributes are not columns. The script does not check `def.virtual` or `def.getter`/`def.setter` to skip non-persistent attributes.
*   **Concrete Input Shape:** A model with `underscored: true` and a virtual attribute `fullName`.
    ```javascript
    class User extends Model {
      static init(sequelize) {
        return super.init({
          firstName: DataTypes.STRING,
          lastName: DataTypes.STRING,
          fullName: {
            type: DataTypes.VIRTUAL,
            get() { return this.firstName + ' ' + this.lastName; }
          }
        }, { underscored: true });
      }
    }
    ```
*   **Result:** The script reports `MISSING_COLUMN` for `fullName` (CRITICAL) and potentially for `firstName`/`lastName` if `def.field` is not populated as expected.
*   **Minimal Fix:**
    1.  Skip virtual attributes: `if (def.virtual || def.type?.key === 'VIRTUAL') continue;`
    2.  Ensure column name resolution respects `underscored`: If `def.field` is undefined, check `model.options.underscored`. If true, convert `attr` to snake_case before comparison.

**Finding 2: False Positive — `ENUM` types are misclassified**
*   **Severity:** Medium (False Positive)
*   **File:** `backend/scripts/schema-drift-check.mjs`
*   **Defect:** The `typeFamily` function maps `ENUM` to `'ENUM'`. However, Sequelize `DataTypes.ENUM` is often backed by a Postgres `varchar` or `text` column with a `CHECK` constraint, or a native `enum` type. If the DB uses `varchar` (common for portability) and the model uses `ENUM`, the script will report `TYPE_DRIFT` (`ENUM` vs `TEXT`). This is a valid configuration, not drift.
*   **Concrete Input Shape:** Model defines `status: DataTypes.ENUM('active', 'inactive')`. DB column is `varchar(20)`.
*   **Result:** `TYPE_DRIFT` warning.
*   **Minimal Fix:** In `typeFamily`, if the input is `ENUM`, return `'TEXT'` (or `'STRING'`) to match the common Postgres backing type, or add a specific check to allow `ENUM` vs `TEXT`/`VARCHAR` as compatible.

**Finding 3: Operational Hazard — `information_schema` query is slow on large schemas**
*   **Severity:** Low (Operational)
*   **File:** `backend/scripts/schema-drift-check.mjs`
*   **Defect:** The query `SELECT ... FROM information_schema.columns WHERE table_schema = 'public'` scans the entire `public` schema. On a large production DB with thousands of tables, this can take several seconds and may acquire shared locks or consume significant memory in the Postgres backend. While read-only, it is not "cheap".
*   **Minimal Fix:** Add a timeout to the query or limit it to only the tables referenced by the models being checked (requires a second pass or a more complex join). Given it's a CI check, this is acceptable but should be documented.

**Verdict on Tool 1:** **NOT DRY** (due to False Positives on Virtual Attributes and ENUMs).

---

### 2. `scripts/hooks/frontend-guards.mjs` (G5/G6)

**Finding 4: False Negative — Imported Primitives defeat G5**
*   **Severity:** High (False Negative)
*   **File:** `scripts/hooks/frontend-guards.mjs`
*   **Defect:** The G5 check builds a `PRIMITIVES` set by scanning the *current file* for `const/let/var ... = keyframes/css/styled`. It then checks if the exported fragment interpolates any identifier in that set.
    *   **The Break:** If a file imports a primitive from another file (e.g., `import { fadeIn } from './animations'`), and then uses `export const myStyle = \`... ${fadeIn} ...\``, the `PRIMITIVES` set for *this* file will be empty (or not contain `fadeIn`). The check `exprs.some(... PRIMITIVES.has(id[0]))` will return `false`. The guard will **miss** the violation.
    *   **Why it matters:** This is the exact crash scenario described (error #12). The primitive is a styled-components object, but because it's imported, the local heuristic fails.
*   **Concrete Input Shape:**
    ```javascript
    // fileA.js
    import { fadeIn } from './animations'; // fadeIn is a keyframes object
    export const brokenStyle = `
      opacity: 0;
      animation: ${fadeIn} 1s;
    `;
    ```
*   **Result:** G5 passes. The code crashes at mount.
*   **Minimal Fix:** This is hard to fix with a simple regex. The "cheapest" fix is to **expand the heuristic**: Flag *any* exported template string that interpolates an identifier that is *not* a known safe type (number, string, boolean) and is *not* defined locally as a primitive. This increases false positives.
    *   *Better Minimal Fix:* Add a comment-based opt-out for imported primitives, or require that if a primitive is imported, it must be wrapped in `css()` or `keyframes()` at the usage site.
    *   *Realistic Fix:* The guard should flag **all** exported template strings that interpolate identifiers, unless the identifier is explicitly whitelisted (e.g., numbers, strings) or the file has a `swan-guard-allow-template` comment. This shifts the burden to the developer to opt out, reducing false negatives.

**Finding 5: False Positive — G6 line count includes comments/blank lines**
*   **Severity:** Low (False Positive)
*   **File:** `scripts/hooks/frontend-guards.mjs`
*   **Defect:** G6 checks `lines.length > 300`. This includes blank lines and comments. A file with 300 lines of code but 50 lines of comments will be flagged. This is a minor false positive, but it encourages developers to remove comments to pass the gate, which is bad practice.
*   **Minimal Fix:** Strip blank lines and single-line comments before counting. Or, accept this as a "code smell" metric rather than a strict line limit.

**Verdict on Tool 2:** **NOT DRY** (due to False Negative on imported primitives).

---

### 3. `scripts/hooks/token-registry-check.mjs`

**Finding 6: False Negative — `var()` nested inside another `var()` fallback is missed**
*   **Severity:** Medium (False Negative)
*   **File:** `scripts/hooks/token-registry-check.mjs`
*   **Defect:** The `USE_RE` regex is `/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g`.
    *   **The Break:** Consider `var(--color-primary, var(--color-secondary, #000))`.
    *   The regex matches the outer `var(--color-primary, var(--color-secondary, #000))`.
    *   `name` = `--color-primary`.
    *   `fallbackRaw` = `var(--color-secondary, #000)`.
    *   The script checks if `--color-primary` exists. If it does, it proceeds to check fallback drift.
    *   `normalizeColor('var(--color-secondary, #000)')` returns the string `'var(--color-secondary, #000)'` (since it doesn't match `^#...`).
    *   The drift check `if (/^#[0-9a-f]{6,8}$/.test(fb) ...)` fails because `fb` is not a hex color. So it skips the drift check.
    *   **However**, the inner `var(--color-secondary, #000)` is **never checked** for existence or drift. If `--color-secondary` is undefined, the script misses it. If `--color-secondary` is defined but drifts from `#000`, the script misses it.
*   **Concrete Input Shape:**
    ```css
    .box {
      color: var(--primary, var(--secondary, #123456));
    }
    ```
    If `--secondary` is undefined, the script reports `--primary` as defined (assuming it is) and does not report `--secondary` as undefined.
*   **Minimal Fix:** The regex needs to be recursive or the script needs to recursively parse the fallback string. A simpler fix is to change `USE_RE` to match the *innermost* `var()` calls first, or to post-process the `fallbackRaw` to extract any nested `var()` tokens and check them against the registry.

**Finding 7: False Positive — Tokens defined in `@media` or `:root` are missed if the regex is too strict**
*   **Severity:** Low (False Positive)
*   **File:** `scripts/hooks/token-registry-check.mjs`
*   **Defect:** `DEFINE_RE = /(^|[;{\s])(--[\w-]+)\s*:\s*([^;}]+)/g`.
    *   This regex requires the token definition to be preceded by `^`, `;`, `{`, or whitespace.
    *   If a token is defined inside a `@media` block, it is preceded by `{` or `;` or whitespace, so it should be caught.
    *   However, if a token is defined in a way that the regex doesn't expect (e.g., minified CSS where there is no whitespace before `:`), it might be missed. But the regex allows `\s*` after `:`, so `--token:value` is caught.
    *   **The real issue:** The regex `([^;}]+)` for the value stops at `;` or `}`. If the value contains a `;` (e.g., in a `url()` or complex string), it will be truncated. This is rare for tokens.
    *   **Better Finding:** The script scans `frontend/src`. If tokens are defined in a **separate CSS file** that is imported but not in `frontend/src` (e.g., in `node_modules` or a CDN), they will be missed. But the script explicitly excludes `node_modules`. This is correct behavior.
    *   **Actual Defect:** The script uses `text.matchAll(DEFINE_RE)`. If a file has a token defined in a **comment**, it will be added to the registry.
    *   **Concrete Input Shape:**
        ```css
        /* --fake-token: #000; */
        .box { color: var(--fake-token, #111); }
        ```
    *   **Result:** The script thinks `--fake-token` is defined, so it does not report it as undefined. This is a **False Negative** for the "undefined token" check.
*   **Minimal Fix:** Strip CSS comments before running `DEFINE_RE`.

**Verdict on Tool 3:** **NOT DRY** (due to False Negatives on nested vars and False Negatives on commented-out definitions).

---

### Overall Verdict

**NOT DRY**

All three tools have significant defects:
1.  **Schema Drift:** False Positives on Virtual Attributes and ENUMs.
2.  **Frontend Guards:** False Negatives on imported styled-components primitives (G5).
3.  **Token Registry:** False Negatives on nested `var()` fallbacks and commented-out definitions.

The tools are not safe to rely on as-is. They will either block valid code (False Positives) or let broken code through (False Negatives).
