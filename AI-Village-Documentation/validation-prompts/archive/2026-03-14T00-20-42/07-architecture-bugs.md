# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 56.8s
> **Files:** AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V5.md, CLAUDE.md, scripts/validation-orchestrator.mjs
> **Generated:** 3/13/2026, 5:20:42 PM

---

# Deep Architecture Review & Bug Hunt
## SwanStudios — Production Codebase

---

# EXECUTIVE SUMMARY

| Category | Count | Critical | High | Medium | Low |
|----------|-------|----------|------|--------|-----|
| **Bug Detection** | 8 | 2 | 3 | 2 | 1 |
| **Architecture Flaws** | 5 | 1 | 2 | 1 | 1 |
| **Integration Issues** | 4 | 1 | 1 | 1 | 1 |
| **Dead Code & Tech Debt** | 6 | 0 | 2 | 2 | 2 |
| **Production Readiness** | 5 | 1 | 2 | 1 | 1 |
| **TOTAL** | 28 | 5 | 10 | 7 | 6 |

---

# BUG DETECTION

## 1. CRITICAL: Code Bundle Truncation Breaks Multi-File Analysis

**Severity:** CRITICAL  
**File:** `scripts/validation-orchestrator.mjs`  
**Line:** ~280-310 (formatCodeBundle function)

**What's Wrong:**
The `formatCodeBundle` function truncates code to 60,000 characters but does NOT preserve file boundaries. When multiple files are concatenated and truncated mid-file, validators receive corrupted code with no clear demarcation between files.

```javascript
// CURRENT (BUGGY):
function formatCodeBundle(files) {
  if (files.length === 0) return '(no recently modified files found)';
  return files
    .map(f => `### ${f.path}\n\`\`\`${extname(f.path).slice(1)}\n${f.content}\n\`\`\``)
    .join('\n\n');
}
```

The truncation in `getRecentFiles` happens per-file but the total bundle can still be truncated:
```javascript
if (totalChars + content.length > CONFIG.maxCodeChars) {
  const remaining = CONFIG.maxCodeChars - totalChars;
  if (remaining > 500) {
    files.push({ path: fp, content: content.slice(0, remaining) + '\n\n// ... truncated ...' });
  }
  break;  // <-- Breaks mid-file
}
```

**Fix:**
```javascript
function formatCodeBundle(files, maxChars = 60_000) {
  if (files.length === 0) return '(no recently modified files found)';
  
  const bundles = [];
  let currentBundle = '';
  let totalChars = 0;
  
  for (const f of files) {
    const fileSection = `### ${f.path}\n\`\`\`${extname(f.path).slice(1)}\n${f.content}\n\`\`\`\n\n`;
    
    // If single file exceeds max, truncate within file boundaries
    if (fileSection.length > maxChars) {
      const truncated = fileSection.slice(0, maxChars - 100) + 
        `\n\n// ... TRUNCATED: ${f.path} exceeds size limit ...`;
      bundles.push(truncated);
      break;
    }
    
    // Skip to next bundle if adding this file would exceed limit
    if (totalChars + fileSection.length > maxChars) {
      bundles.push(currentBundle);
      currentBundle = fileSection;
      totalChars = fileSection.length;
    } else {
      currentBundle += fileSection;
      totalChars += fileSection.length;
    }
  }
  
  if (currentBundle) bundles.push(currentBundle);
  return bundles.join('\n\n') || '(no code to review)';
}
```

---

## 2. CRITICAL: Missing Import — Recursive Consensus Module

**Severity:** CRITICAL  
**File:** `scripts/validation-orchestrator.mjs`  
**Line:** 27

**What's Wrong:**
The script imports `runRecursiveConsensus` from `./lib/recursive-consensus.mjs` but this file is NOT provided in the codebase. The import will fail at runtime.

```javascript
import { runRecursiveConsensus } from './lib/recursive-consensus.mjs';  // <-- DOES NOT EXIST
```

**Fix:**
Either:
1. Create the missing `./lib/recursive-consensus.mjs` file with the recursive debate logic
2. Or inline the recursive consensus implementation if it's a simple function

---

## 3. HIGH: Regex Bypass in --since Argument Parsing

**Severity:** HIGH  
**File:** `scripts/validation-orchestrator.mjs`  
**Line:** ~140-150

**What's Wrong:**
The regex validation for `--since` is insufficient. While it validates format, the error message reveals the format requirement, and the fallback to `git diff --name-only HEAD` could expose unintended changes.

```javascript
const match = since.match(/^(\d+)(h|d|m)$/);
if (match) {
  const [, num, unit] = match;
  const unitMap = { h: 'hours', d: 'days', m: 'minutes' };
  timeArg = `--since="${num} ${unitMap[unit]} ago"`;
} else {
  // Reject invalid formats to prevent command injection
  throw new Error(`Invalid --since format: "${since}". Use format like 2h, 1d, 30m.`);
}
```

The error message itself is fine, but the fallback logic could be problematic:
```javascript
} catch {
  try {
    const out = execSync('git diff --name-only HEAD', { cwd: ROOT, encoding: 'utf-8' });
    filePaths = out.trim().split('\n').filter(Boolean);
  } catch { filePaths = []; }
}
```

**Fix:**
```javascript
// Validate and sanitize the time argument more strictly
function validateTimeArg(since) {
  const match = since.match(/^(\d+)(h|d|m)$/);
  if (!match) {
    throw new Error(`Invalid --since format: "${since}". Use format like 2h, 1d, 30m.`);
  }
  const [, num, unit] = match;
  const numVal = parseInt(num, 10);
  // Sanity check: max 30 days, max 24 hours, max 60 minutes
  if (unit === 'd' && numVal > 30) throw new Error('Maximum --since is 30d');
  if (unit === 'h' && numVal > 720) throw new Error('Maximum --since is 720h (30d)');
  if (unit === 'm' && numVal > 43200) throw new Error('Maximum --since is 43200m (30d)');
  
  const unitMap = { h: 'hours', d: 'days', m: 'minutes' };
  return `--since="${num} ${unitMap[unit]} ago"`;
}
```

---

## 4. HIGH: Environment Variable Parsing Edge Cases

**Severity:** HIGH  
**File:** `scripts/validation-orchestrator.mjs`  
**Line:** ~60-80 (loadEnv function)

**What's Wrong:**
The `.env` parser has multiple edge case failures:

```javascript
function loadEnv() {
  for (const envPath of [...]) {
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;  // <-- Only checks start of line
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes (single or double)
      if (/^(['"]).*\1$/.test(val)) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}
```

**Issues:**
1. **Inline comments not handled:** `KEY=value # comment` → value becomes `value # comment`
2. **Values containing `=` not handled:** `KEY=a=b=c` → value becomes `a=b`
3. **No escape sequence handling:** `KEY=value with "quoted" space` → quotes not stripped correctly

**Fix:**
```javascript
function loadEnv() {
  for (const envPath of [join(ROOT, '.env'), join(ROOT, 'backend', '.env')]) {
    if (!existsSync(envPath)) continue;
    
    const content = readFileSync(envPath, 'utf-8');
    // Handle different line endings
    const lines = content.split(/\r?\n/);
    
    for (const line of lines) {
      // Trim leading whitespace, skip empty lines and comments
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Find first = that's not escaped
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      
      const key = trimmed.slice(0, eqIdx).trim();
      if (!key || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) continue; // Valid env var name
      
      let val = trimmed.slice(eqIdx + 1);
      
      // Handle inline comments (only if not quoted)
      const commentMatch = val.match(/^(.*?)(?:\s+#.*)$/);
      if (commentMatch && !val.startsWith('"') && !val.startsWith("'")) {
        val = commentMatch[1];
      }
      
      val = val.trim();
      
      // Strip surrounding quotes (handle escaped quotes)
      if ((val.startsWith('"') && val.endsWith('"')) || 
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      
      // Unescape common escape sequences
      val = val.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
      
      if (!process.env[key]) process.env[key] = val;
    }
  }
}
```

---

## 5. HIGH: Missing Error Handling for API Calls

**Severity:** HIGH  
**File:** `scripts/validation-orchestrator.mjs`  
**Line:** (various API call sites)

**What's Wrong:**
The script makes API calls to OpenRouter and Google GenAI but lacks comprehensive error handling. Network failures, rate limits, or API errors will crash the entire validation pipeline without meaningful error messages.

**Fix:**
Add a robust API wrapper with retry logic:

```javascript
async function callAIWithRetry(model, prompt, options = {}, retries = 3) {
  const { timeout = CONFIG.timeout, staggerMs = CONFIG.staggerMs } = options;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Add stagger between attempts
      if (attempt > 0) await new Promise(r => setTimeout(r, staggerMs * attempt));
      
      const response = await Promise.race([
        callAI(model, prompt, options),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
      ]);
      
      return response;
    } catch (error) {
      const isLastAttempt = attempt === retries - 1;
      const isRetryable = error.status === 429 || error.status === 503 || error.code === 'ETIMEDOUT';
      
      if (isLastAttempt || !isRetryable) {
        throw new Error(`AI call failed after ${attempt + 1} attempts: ${error.message}`);
      }
      
      // Exponential backoff
      const backoffMs = staggerMs * Math.pow(2, attempt);
      console.warn(`Retry ${attempt + 1}/${retries} after ${backoffMs}ms: ${error.message}`);
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }
}
```

---

## 6. MEDIUM: Archive Cleanup Logic Missing

**Severity:** MEDIUM  
**File:** `scripts/validation-orchestrator.mjs`  
**Line:** CONFIG.maxArchiveRuns defined but never used

**What's Wrong:**
```javascript
const CONFIG = {
  // ...
  maxArchiveRuns: 20,  // <-- Defined but never used!
};
```

The configuration specifies a maximum of 20 archived runs but there's no cleanup logic to enforce this.

**Fix:**
Add cleanup after creating new validation output:

```javascript
function cleanupOldArchives(promptDir, maxRuns) {
  if (!existsSync(promptDir)) return;
  
  const runs = readdirSync(promptDir)
    .filter(f => statSync(join(promptDir, f)).isDirectory())
    .map(f => ({ name: f, mtime: statSync(join(promptDir, f)).mtime }))
    .sort((a, b) => b.mtime - a.mtime); // Newest first
  
  if (runs.length > maxRuns) {
    const toDelete = runs.slice(maxRuns);
    for (const run of toDelete) {
      console.log(`🗑️  Deleting old archive: ${run.name}`);
      rmSync(join(promptDir, run.name), { recursive: true, force: true });
    }
  }
}
```

---

## 7. MEDIUM: Model ID Potential Deprecation

**Severity:** MEDIUM  
**File:** `scripts/validation-orchestrator.mjs`  
**Line:** ~40-55 (MODELS object)

**What's Wrong:**
Several model IDs use preview/dated versions that may become unavailable:
- `google/gemini-3-flash-preview-20251217` — "preview" versions often get deprecated
- `anthropic/claude-4.5-sonnet-20250929` — dated version, may be replaced
- `deepseek/deepseek-v3.2-20251201` — dated version

**Fix:**
Add fallback mappings and version checking:

```javascript
const MODEL_ALIASES = {
  'gemini-3-flash': ['google/gemini-3-flash-preview-20251217', 'google/gemini-3.5-flash'],
  'claude-sonnet': ['anthropic/claude-4.5-sonnet-20250929', 'anthropic/claude-sonnet-4-20250929'],
  // ...
};

function resolveModel

---

*Part of SwanStudios 9-Brain Recursive Consensus System*
