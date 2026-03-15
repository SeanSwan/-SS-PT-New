# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 53.7s
> **Files:** scripts/generate-achievement-badges.mjs, scripts/achievement-badge-manifest.json
> **Generated:** 3/15/2026, 9:49:10 AM

---

# Code Review: SwanStudios Achievement Badge Generator

## CRITICAL Issues

### C1. Missing Error Handling for File Operations
**Location:** Multiple locations (writeFileSync, readFileSync, mkdirSync)  
**Issue:** File system operations lack try/catch blocks. A write failure (permissions, disk full) will crash the entire script with no recovery or meaningful error message.

```mjs
// Current (line ~380)
writeFileSync(job.outputPath, result.data);

// Should be:
try {
  writeFileSync(job.outputPath, result.data);
} catch (err) {
  throw new Error(`Failed to write ${job.fileName}: ${err.message}`);
}
```

**Impact:** Script crashes mid-generation, losing progress and leaving partial state.

---

### C2. API Key Exposure Risk
**Location:** Lines 66-72 (getGeminiKey)  
**Issue:** No validation that the key is properly formatted. Invalid keys will only fail after rate-limiting delays, wasting time and potentially exposing key format in error messages.

```mjs
function getGeminiKey() {
  const key = process.env.GEMINI_API_KEY || 
              process.env.GOOGLE_AI_API_KEY || 
              process.env.GOOGLE_API_KEY || 
              null;
  
  // Add validation
  if (key && !/^[A-Za-z0-9_-]{20,}$/.test(key)) {
    console.error('  Warning: API key format looks invalid');
  }
  
  return key;
}
```

---

### C3. Unhandled Fetch Timeout
**Location:** Line 284 (AbortSignal.timeout)  
**Issue:** Timeout errors are not explicitly caught and will show as generic network errors, making debugging difficult.

```mjs
// Current
signal: AbortSignal.timeout(120_000),

// Should wrap in try/catch with specific timeout handling:
try {
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
} catch (err) {
  if (err.name === 'TimeoutError' || err.name === 'AbortError') {
    throw new Error(`Request timed out after 120s`);
  }
  throw err;
}
```

---

## HIGH Issues

### H1. Race Condition in File Existence Check
**Location:** Line 238 (buildWorkPlan)  
**Issue:** `existsSync(outputPath)` check happens during planning, but file could be created/deleted before generation. Multiple parallel runs could overwrite each other.

```mjs
// Current
skip: existsSync(outputPath),

// Should check again before write:
if (!job.skip && existsSync(job.outputPath)) {
  console.log(` SKIP (created by another process)`);
  continue;
}
```

---

### H2. No Progress Persistence
**Location:** Main generation loop (lines 380-400)  
**Issue:** If script crashes after generating 200/750 images, there's no way to resume. Must regenerate all or manually track failures.

**Recommendation:** Write a progress file after each successful generation:
```mjs
const progressFile = join(OUTPUT_DIR, '.generation-progress.json');
// After each success:
const progress = JSON.parse(readFileSync(progressFile, 'utf-8') || '{}');
progress[job.fileName] = { generated: new Date().toISOString() };
writeFileSync(progressFile, JSON.stringify(progress, null, 2));
```

---

### H3. Memory Leak Risk with Large Batches
**Location:** Line 312 (Buffer.from base64)  
**Issue:** Generating 750 images keeps all job objects in memory. Each base64 decode creates a large buffer. For 750 × ~500KB images, this could consume 375MB+ RAM.

**Recommendation:** Process in batches or clear completed jobs:
```mjs
// After successful write:
job.template = null; // Release reference
job.prompt = null;
```

---

### H4. Insufficient Retry Logic
**Location:** Lines 321-336 (generateWithRetry)  
**Issue:** Only retries on 429 errors. Network failures (ECONNRESET, ETIMEDOUT) are not retried, causing unnecessary failures.

```mjs
async function generateWithRetry(apiKey, prompt, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await generateImage(apiKey, prompt);
    } catch (err) {
      const isRetryable = err.status === 429 || 
                          err.code === 'ECONNRESET' ||
                          err.code === 'ETIMEDOUT' ||
                          err.name === 'TimeoutError';
      
      if (isRetryable && attempt < retries) {
        const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt);
        console.log(`    Retrying (${err.message.slice(0, 50)})...`);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
}
```

---

### H5. Hardcoded Model Name
**Location:** Line 31 (MODEL constant)  
**Issue:** Model name is hardcoded. If Gemini updates the model ID or user wants to test different models, requires code change.

**Recommendation:** Make it configurable:
```mjs
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-image-generation';
```

---

## MEDIUM Issues

### M1. No TypeScript Types (Script is .mjs)
**Location:** Entire file  
**Issue:** This is a JavaScript file, not TypeScript. No type safety for API responses, manifest structure, or function parameters.

**Recommendation:** Convert to `.ts` with proper types:
```typescript
interface AchievementTemplate {
  name: string;
  title: string;
  description: string;
  visual: string;
  emoji: string;
  skillTree: string;
  category: string;
}

interface StyleConfig {
  id: string;
  name: string;
  promptPrefix: string;
  promptSuffix: string;
}

interface GenerationJob {
  template: AchievementTemplate;
  style: StyleConfig;
  fileName: string;
  outputPath: string;
  prompt: string;
  skip: boolean;
  skipReason?: string;
}
```

---

### M2. Magic Numbers Without Constants
**Location:** Multiple locations  
**Issue:** Hardcoded values like `120_000` (timeout), `0.04` (cost estimate), `200` (error slice length) scattered throughout.

```mjs
// Should be:
const REQUEST_TIMEOUT_MS = 120_000;
const ESTIMATED_COST_PER_IMAGE = 0.04;
const ERROR_MESSAGE_MAX_LENGTH = 200;
```

---

### M3. Inconsistent Error Message Formatting
**Location:** Lines 287, 295, 303, 314  
**Issue:** Some errors slice to 200 chars, others to 300, others to 100. Inconsistent user experience.

```mjs
// Standardize:
function formatError(err: unknown, maxLength = 150): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.length > maxLength ? msg.slice(0, maxLength) + '...' : msg;
}
```

---

### M4. No Validation of Manifest Structure
**Location:** Lines 161-168 (loadAchievementManifest)  
**Issue:** Assumes manifest has correct structure. If `templates` is missing or malformed, script crashes with cryptic error.

```mjs
function loadAchievementManifest() {
  if (!existsSync(ACHIEVEMENT_MANIFEST_PATH)) {
    console.error(`  Error: Achievement manifest not found`);
    process.exit(1);
  }
  
  const data = JSON.parse(readFileSync(ACHIEVEMENT_MANIFEST_PATH, 'utf-8'));
  
  // Validate structure
  if (!Array.isArray(data.templates)) {
    console.error('  Error: Manifest missing "templates" array');
    process.exit(1);
  }
  
  if (data.templates.length === 0) {
    console.error('  Error: Manifest has no templates');
    process.exit(1);
  }
  
  return data;
}
```

---

### M5. Prompt Construction Lacks Escaping
**Location:** Line 251 (buildPrompt)  
**Issue:** Template visual strings are directly interpolated. If a visual contains special characters or is maliciously crafted, could cause issues.

```mjs
function buildPrompt(template: AchievementTemplate, style: StyleConfig): string {
  // Sanitize visual description
  const sanitized = template.visual
    .replace(/[^\w\s,.-]/g, '') // Remove special chars
    .slice(0, 500); // Limit length
  
  return `${style.promptPrefix} a ${sanitized}, badge icon, collectible, beautiful, ${style.promptSuffix}`;
}
```

---

### M6. No Dry-Run Validation of API Key
**Location:** Lines 354-361 (dry-run mode)  
**Issue:** Dry-run mode doesn't validate API key. User might preview 750 prompts, then discover key is missing when running for real.

```mjs
if (opts.dryRun) {
  // Validate key exists even in dry-run
  const apiKey = getGeminiKey();
  if (!apiKey) {
    console.warn('  Warning: No API key found (dry-run will work, but real run will fail)');
  }
  // ... rest of dry-run logic
}
```

---

### M7. Cost Estimate Ignores Failures
**Location:** Line 413  
**Issue:** Cost estimate uses `successCount`, but user might want to know total attempted cost (including failed requests that still consumed quota).

```mjs
console.log(`  Cost:    ~$${(successCount * 0.04).toFixed(2)} (successful)`);
console.log(`  Attempted: ~$${((successCount + failCount) * 0.04).toFixed(2)} (total)`);
```

---

## LOW Issues

### L1. Console.log Instead of Structured Logging
**Location:** Throughout  
**Issue:** All output uses `console.log`. No log levels, no timestamps, difficult to parse programmatically.

**Recommendation:** Use a simple logger:
```mjs
const log = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} ${msg}`),
};
```

---

### L2. No Version Check for Node.js
**Location:** Top of file  
**Issue:** Uses modern features (AbortSignal.timeout requires Node 17.3+, top-level await requires 14.8+). No check for compatible version.

```mjs
// Add at top:
const MIN_NODE_VERSION = 17.3;
const currentVersion = parseFloat(process.version.slice(1));
if (currentVersion < MIN_NODE_VERSION) {
  console.error(`Error: Node.js ${MIN_NODE_VERSION}+ required (current: ${process.version})`);
  process.exit(1);
}
```

---

### L3. Unused Variable in Help Text
**Location:** Line 120 (printHelp)  
**Issue:** Help text mentions `--help` and `-h` but doesn't show that both work in the examples section.

---

### L4. Inconsistent Spacing in Output
**Location:** Lines 343-350  
**Issue:** Some log lines have 2-space indent, others have 4. Inconsistent visual hierarchy.

```mjs
// Standardize:
console.log('  ── Section Header ──');
console.log('    Detail line');
console.log('      Sub-detail');
```

---

### L5. No Emoji Validation
**Location:** Manifest templates  
**Issue:** Emoji field is not validated. If missing or invalid, could cause display issues in frontend.

```mjs
function validateTemplate(tpl: AchievementTemplate): boolean {
  if (!tpl.emoji || tpl.emoji.length === 0) {
    console.warn(`  Warning: Template "${tpl.name}" missing emoji`);
    return false;
  }
  return true;
}
```

---

### L6. formatDuration Doesn't Handle Hours
**Location:** Lines 344-350  
**Issue:** If generation takes >60 minutes, displays as "65m 30s" instead of "1h 5m 30s".

```mjs
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) {
    const min = Math.floor(ms / 60_000);
    const sec = Math.round((ms % 60_000) / 1000);
    return `${min}m ${sec}s`;
  }
  const hrs = Math.floor(ms / 3_600_000);
  const min = Math.floor((ms % 3_600_000) / 60_000);
  return `${hrs}h ${min}m`;
}
```

---

### L7. No Output Directory Cleanup Option
**Location:** Main function  
**Issue:** No way to clean/regenerate existing badges. Must manually delete files.

**Recommendation:** Add `--clean` flag:
```mjs
case '--clean':
  opts.clean = true;
  break;

// In main:
if (opts.clean) {
  console.log('  Cleaning existing badges...');
  const files = readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png'));
  for (const file of files) {
    unlinkSync(join(OUTPUT_DIR, file));
  }
  console.log(`  Removed ${files.length} files`);
}
```

---

### L8. Manifest JSON Truncated in Review
**Location:** achievement-badge-manifest.json line ~250  
**Issue:** JSON is incomplete (ends mid-object). Cannot validate full structure.

---

## Summary Statistics

| Severity | Count | Must Fix Before Production |
|----------|-------|---------------------------|
| CRITICAL | 3 | ✅ Yes |
| HIGH | 5 | ✅ Yes |
| MEDIUM | 7 | ⚠️ Recommended |
| LOW | 8 | ❌ Optional |

---

## Recommended Fix Priority

1. **C1, C3** - Add error handling for file ops and fetch timeouts
2. **H2** - Add progress persistence (prevents re-work on crashes)
3. **H4** - Improve retry logic for network errors
4. **M1** - Convert to TypeScript for type safety
5. **M4** - Add manifest validation
6. **H1** - Fix race condition in file checks
7. **M5** - Sanitize prompt inputs
8. **All others** - Address as time permits

---

## Positive Observations

✅ **Good CLI argument parsing** with validation  
✅ **Comprehensive help text** with examples  
✅ **Rate limiting** properly implemented  
✅ **Exponential backoff** on 429 errors  
✅ **Idempotent** - skips existing files  
✅ **Dry-run mode** for testing  
✅ **Clear progress output** during generation  
✅ **Cost estimation** helps users plan  

---

## Architecture Concerns

**Not a TypeScript/React review** - This is a Node.js script, not part of the React frontend. The review criteria (React hooks, styled-components, etc.) don't apply here. However, the generated images will be consumed by the React app, so ensure:

1. **Naming convention** matches frontend expectations (`{name}_{style}.png`)
2. **Output directory** is correctly mapped to public assets
3. **Manifest structure** matches what the frontend achievement system expects
4. **Error states** are communicated (missing images should have fallbacks in UI)

---

*Part of SwanStudios 9-Brain Recursive Consensus System*
