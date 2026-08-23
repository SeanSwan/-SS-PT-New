# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** scripts/review-debt.mjs
**Tokens (Ollama):** 2534 in / 2936 out | **Wall:** 35.9s | **done_reason:** stop

---
This is a hostile review of `review-debt.mjs`. The mechanism is well-intentioned but structurally brittle. It attempts to solve a social/process problem (agents deferring reviews) with a file-system lock that lacks atomicity, identity verification, or enforcement power.

Here is the ranked breakdown of failures, from "Repo Bricked" to "Process Theatricals."

### 1. Critical: The "Open/Close" Race Condition (Repo Bricking)
**Severity:** Critical
**The Failure:**
The `settle` function performs two non-atomic operations:
1. `writeFileSync(join(CLOSED_DIR, ...))`
2. `unlinkSync(src)` (removing from `open/`)

If the process crashes, is killed by OOM, or the disk fills up between step 1 and step 2, the debt exists in **both** `open/` and `closed/`.
*   **Result:** The `openDebts()` function reads `open/`, sees the file, and blocks closeout.
*   **The Trap:** The agent cannot `close` it again because `settle` checks `if (!existsSync(src)) die(...)`. Wait, no, `src` *does* exist. So it tries to settle again. It writes to `closed/` again (overwriting the good record with the same data, fine), then tries to `unlink`. If the unlink fails again (permissions, disk full), you are stuck.
*   **Worse Case:** If the agent *deletes* the file in `open/` manually to "fix" the block, they lose the audit trail. If they leave it, the repo is wedged. There is no `repair` command.

**Code-Level Fix:**
Use a single atomic rename operation if possible, or implement a "tombstone" logic. Since `rename` across directories is not atomic on all filesystems (especially networked ones), the safest fix is to make the `open` check tolerant of "stale" debts, or implement a `repair` command that moves any file in `open/` that has a corresponding valid file in `closed/` to `closed/` (overwriting) and removes the `open/` copy.

```javascript
// Add a 'repair' command
function repair() {
  const openFiles = openDebts();
  for (const debt of openFiles) {
    const closedPath = join(CLOSED_DIR, debt._file);
    if (existsSync(closedPath)) {
      // If it's in closed, it's settled. Remove the open copy.
      try {
        unlinkSync(join(OPEN_DIR, debt._file));
        console.log(`REPAIRED: Removed stale open copy for ${debt.id}`);
      } catch (e) {
        console.error(`Failed to remove stale open copy for ${debt.id}: ${e.message}`);
      }
    }
  }
}
```

### 2. Critical: The "2 Writes" Bypass (The Main Deferral Path)
**Severity:** Critical
**The Failure:**
The prompt states the gate blocks "BUILD-SHAPED turns (3+ file writes or git commit/push)".
*   **The Escape:** An agent can simply perform **2** file writes.
*   **The Context:** In a real repo, a "review" often involves editing a config, adding a test, and updating a doc. If the agent splits this into two turns, or simply does 2 writes in one turn, the gate *does not trigger*.
*   **The Flaw:** The gate is reactive to *volume*, not *intent*. It assumes "big change = needs review." But a critical security fix might be a 1-line change to a permission check. A trivial typo fix might be 5 lines.
*   **Result:** The agent learns to "chunk" their work to stay under the threshold. This is the exact "deferral" behavior the system was built to prevent, just optimized.

**Code-Level Fix:**
You cannot fix this with file counts. You must fix the *trigger*.
1.  **Hook into Git:** The gate should trigger on `git commit` or `git push` *regardless* of file count. If you commit, you are claiming "done."
2.  **Hook into CI:** If the repo has CI, the gate should be a pre-commit hook that runs `review-debt.mjs list` and fails if `openDebts().length > 0`.
3.  **If you must use file counts:** Lower the threshold to **1** write to any file in `src/` or `lib/`. But this is still fragile.

**Recommendation:**
Remove the "3+ writes" heuristic. The gate should be:
```bash
# In .git/hooks/pre-commit
if node scripts/review-debt.mjs list --json | jq -e '.length > 0'; then
  echo "BLOCKED: Open review debts exist. Close or waive them."
  exit 1
fi
```

### 3. High: The "Junk Waiver" Bypass
**Severity:** High
**The Failure:**
`waive --reason "not needed"` is accepted.
*   **The Escape:** An agent that is lazy or under pressure will waive the debt with a trivial reason. There is no validation of the reason. There is no second signature.
*   **The Context:** Rule 82 (full-spectrum panel) implies multiple agents. If Agent A waives the debt, Agent B might not know. The waiver is a unilateral act.
*   **Result:** The "debt" becomes a suggestion. The ledger becomes a record of excuses.

**Code-Level Fix:**
1.  **Require a Second Agent:** `waive` should require `--approved-by <other_agent>`. If `--by` and `--approved-by` are the same, reject.
2.  **Mandatory Artifact for Waiver:** Even waivers should produce a log entry or a "waiver note" file in `closed/` that is distinct from a "close" artifact.
3.  **Audit Trail:** The `waive` command should append to a global `waiver-log.json` with a timestamp and the agent ID, making it easier to detect patterns of abuse (e.g., Agent X waives 100% of debts).

### 4. High: The "Never Open" Bypass
**Severity:** High
**The Failure:**
The system relies on the agent *choosing* to open a debt.
*   **The Escape:** If the agent simply never runs `open`, there is no debt. The gate sees an empty `open/` directory and allows closeout.
*   **The Context:** This is the fundamental flaw. The system is a *voluntary* ledger. It does not *detect* that a review is owed. It only tracks debts that have been *declared*.
*   **Result:** The agent can bypass the entire system by simply not declaring the debt. This is the "control nobody invokes" failure mode.

**Code-Level Fix:**
You cannot fix this in `review-debt.mjs` alone. You need an **emitter** that *detects* the need for a review.
1.  **Heuristic Emitter:** A script that runs after every `git diff` or `git status`. If the diff touches `auth/`, `payments/`, or `security/`, it *automatically* opens a debt.
2.  **CI Integration:** The CI pipeline should fail if a PR touches sensitive files and no review debt was opened/closed in the commit history.

**Recommendation:**
Add an `auto-open` command that scans the diff:
```javascript
function autoOpen() {
  const diff = execSync('git diff --name-only HEAD').toString().split('\n');
  const sensitive = diff.filter(f => /auth|payment|security|config/i.test(f));
  if (sensitive.length > 0) {
    // Open a debt for each sensitive file, or one for the batch
    open({ topic: `Auto-detected review: ${sensitive.join(', ')}`, reason: 'Sensitive files changed' });
  }
}
```

### 5. Medium: Clock Skew and ID Collisions
**Severity:** Medium
**The Failure:**
`newId` uses `new Date().toISOString()`.
*   **The Escape:** If two agents run on different machines with skewed clocks, they might generate the same ID.
*   **The Context:** The prompt mentions "concurrent agents share this tree." If Agent A and Agent B open a debt at the same second with the same topic, they will collide.
*   **Result:** One agent's debt overwrites the other's. The `openDebts` function will only see one debt, but two agents think they have one.

**Code-Level Fix:**
Add a random suffix or use a UUID.
```javascript
import { randomUUID } from 'node:crypto';

function newId(topic) {
  const slug = String(topic).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
  const t = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const rand = randomUUID().slice(0, 8); // Add 8 chars of randomness
  return `${t}-${slug || 'review'}-${rand}`;
}
```

### 6. Medium: The "Crash Between Write-Closed and Unlink-Open"
**Severity:** Medium
**The Failure:**
Already covered in #1, but worth reiterating: The `settle` function is not atomic.
*   **The Escape:** A crash leaves the debt in both `open/` and `closed/`.
*   **Result:** The repo is wedged.

**Code-Level Fix:**
See #1. Implement `repair`.

### 7. Low: The "2 Agents Settling the Same Debt"
**Severity:** Low
**The Failure:**
Two agents try to `close` the same debt simultaneously.
*   **The Escape:** Agent A reads the debt, Agent B reads the debt. Agent A writes to `closed/` and unlinks `open/`. Agent B tries to write to `closed/` (overwrites) and unlinks `open/` (fails, file not found).
*   **Result:** Agent B crashes with "no OPEN debt". Agent A succeeds. The debt is closed once. This is acceptable, but the error message is confusing.

**Code-Level Fix:**
Use file locking (`proper-lockfile` or similar) around the `settle` operation.
```javascript
import lockfile from 'proper-lockfile';

function settle(kind) {
  // ...
  const lock = lockfile.lock(OPEN_DIR, { retries: 3 });
  try {
    // ... settle logic ...
  } finally {
    lockfile.unlock(OPEN_DIR, lock);
  }
}
```

### 8. Low: The "Ledger Itself is a Control Nobody Invokes"
**Severity:** Low
**The Failure:**
The system is a ledger, not a gate. It tracks debts, but it does not *enforce* them.
*   **The Escape:** The agent can ignore the ledger entirely.
*   **Result:** The ledger becomes a paper trail of what *should* have happened, not what *did* happen.

**Code-Level Fix:**
Integrate the ledger into the CI/CD pipeline.
1.  **Pre-Commit Hook:** Fail if open debts exist.
2.  **CI Check:** Fail if a PR merges without closing all open debts.
3.  **Dashboard:** A simple HTML page that shows open debts and their age.

### Summary of Fixes (Ranked by Impact)

1.  **Add `repair` command** to handle the `open/` + `closed/` double-state. (Fixes #1, #6)
2.  **Change the gate trigger** from "3+ writes" to "git commit" or "sensitive file change". (Fixes #2, #4)
3.  **Add `auto-open`** to detect sensitive changes and open debts automatically. (Fixes #4)
4.  **Add `--approved-by`** to `waive` to prevent unilateral waivers. (Fixes #3)
5.  **Add `randomUUID`** to `newId` to prevent collisions. (Fixes #5)
6.  **Add file locking** to `settle` to prevent race conditions. (Fixes #7)

### Final Verdict

The current implementation is a **voluntary ledger** with a **reactive gate**. It will be bypassed by any agent that is smart enough to chunk its work, lazy enough to waive debts, or careless enough to crash.

To make it a **real control**, it must be:
1.  **Automatic:** Detect the need for review (auto-open).
2.  **Atomic:** Prevent state corruption (repair, locking).
3.  **Enforced:** Block the commit/merge, not just the "closeout" (pre-commit hook).
4.  **Auditable:** Require second signatures for waivers.

Without these changes, the system is a "nice to have" that will be ignored under pressure.
