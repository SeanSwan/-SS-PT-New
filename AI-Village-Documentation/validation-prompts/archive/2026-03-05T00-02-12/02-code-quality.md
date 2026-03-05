# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 68.4s
> **Files:** scripts/validation-orchestrator.mjs
> **Generated:** 3/4/2026, 4:02:12 PM

---

# Code Review: `scripts/validation-orchestrator.mjs`

## Executive Summary
This is a **Node.js script** (not TypeScript/React), so most of the review criteria don't apply. However, I'll review it for general code quality, error handling, and architectural patterns.

---

## 1. TypeScript Best Practices
**Status:** ❌ N/A — This is a `.mjs` file (plain JavaScript)

**Recommendation:** Consider migrating to TypeScript for better type safety:
```typescript
// validation-orchestrator.ts
interface ValidatorTrack {
  name: string;
  model: string;
  prompt: string;
}

interface ValidatorResult {
  name: string;
  model: string;
  status: 'SUCCESS' | 'ERROR';
  text: string;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  durationMs: number;
}
```

**Severity:** LOW — Script works fine as-is, but types would prevent runtime errors.

---

## 2. Error Handling Issues

### CRITICAL: Silent Failures in File Reading
**Location:** Lines 157-167
```javascript
for (const fp of filePaths) {
  const fullPath = join(ROOT, fp);
  if (!existsSync(fullPath)) continue;
  try {
    const content = readFileSync(fullPath, 'utf-8');
    // ...
  } catch { /* skip */ }  // ❌ Silent failure
}
```

**Issue:** Files that fail to read are silently skipped with no user feedback.

**Fix:**
```javascript
const skippedFiles = [];
for (const fp of filePaths) {
  const fullPath = join(ROOT, fp);
  if (!existsSync(fullPath)) {
    skippedFiles.push({ path: fp, reason: 'File not found' });
    continue;
  }
  try {
    const content = readFileSync(fullPath, 'utf-8');
    // ...
  } catch (err) {
    skippedFiles.push({ path: fp, reason: err.message });
  }
}

if (skippedFiles.length > 0) {
  console.warn(`  ⚠️  Skipped ${skippedFiles.length} file(s):`);
  skippedFiles.forEach(f => console.warn(`    ${f.path}: ${f.reason}`));
}
```

**Severity:** HIGH — Users don't know if files failed to load.

---

### HIGH: Unhandled Git Command Failures
**Location:** Lines 120-137
```javascript
try {
  const out = execSync(
    `git log ${timeArg} --diff-filter=ACMR --name-only --pretty=format:""`,
    { cwd: ROOT, encoding: 'utf-8' }
  );
  filePaths = [...new Set(out.trim().split('\n').filter(Boolean))];
} catch {
  try {
    const out = execSync('git diff --name-only HEAD', { cwd: ROOT, encoding: 'utf-8' });
    filePaths = out.trim().split('\n').filter(Boolean);
  } catch { filePaths = []; }  // ❌ Silent fallback
}
```

**Issue:** If both git commands fail, the script continues with an empty array, giving no indication why.

**Fix:**
```javascript
} catch (gitErr) {
  console.warn(`  ⚠️  Git command failed: ${gitErr.message}`);
  console.warn(`  Falling back to git diff...`);
  try {
    const out = execSync('git diff --name-only HEAD', { cwd: ROOT, encoding: 'utf-8' });
    filePaths = out.trim().split('\n').filter(Boolean);
  } catch (diffErr) {
    console.error(`  ERROR: Could not retrieve files from git.`);
    console.error(`  Are you in a git repository?`);
    process.exit(1);
  }
}
```

**Severity:** HIGH — Users don't know why no files were found.

---

### MEDIUM: Archive Rotation Failure is Silent
**Location:** Lines 593-604
```javascript
function rotateArchive() {
  // ...
  try {
    // rotation logic
  } catch {
    // Archive rotation is non-critical — don't fail the whole run
  }
}
```

**Issue:** While the comment justifies the silence, users should still be informed if rotation fails (disk full, permissions, etc.).

**Fix:**
```javascript
} catch (err) {
  console.warn(`  ⚠️  Archive rotation failed: ${err.message}`);
  console.warn(`  Old validation runs may accumulate in ${archiveRoot}`);
}
```

**Severity:** MEDIUM — Non-critical but users should know about disk issues.

---

## 3. DRY Violations

### HIGH: Duplicated File Writing Logic
**Location:** Lines 502-520
```javascript
// ── Write individual track files to latest/ ──
for (const r of results) {
  const slug = TRACK_SLUGS[r.name] || r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const badge = r.status === 'SUCCESS' ? 'PASS' : 'FAIL';
  const content = `# ${r.name} — Validation Report
// ... template ...
`;
  writeFileSync(join(latestDir, `${slug}.md`), content, 'utf-8');
  writeFileSync(join(archiveDir, `${slug}.md`), content, 'utf-8');  // ❌ Duplicate write
}

// ── Write summary.md (quick aggregate) to latest/ ──
const summary = buildSummaryPrompt(results, files);
writeFileSync(join(latestDir, 'summary.md'), summary, 'utf-8');
writeFileSync(join(archiveDir, 'summary.md'), summary, 'utf-8');  // ❌ Duplicate write
```

**Issue:** Every file is written twice (latest + archive). Extract to helper.

**Fix:**
```javascript
function writeToLatestAndArchive(filename, content, latestDir, archiveDir) {
  writeFileSync(join(latestDir, filename), content, 'utf-8');
  writeFileSync(join(archiveDir, filename), content, 'utf-8');
}

// Usage:
for (const r of results) {
  const slug = TRACK_SLUGS[r.name] || r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const content = buildTrackReport(r, fileNames, now);
  writeToLatestAndArchive(`${slug}.md`, content, latestDir, archiveDir);
}

const summary = buildSummaryPrompt(results, files);
writeToLatestAndArchive('summary.md', summary, latestDir, archiveDir);
```

**Severity:** HIGH — Reduces code duplication and makes changes easier.

---

### MEDIUM: Repeated Status Badge Logic
**Location:** Lines 313, 335, 507
```javascript
const badge = r.status === 'SUCCESS' ? 'PASS' : 'FAIL';  // Repeated 3+ times
```

**Fix:**
```javascript
function getStatusBadge(status) {
  return status === 'SUCCESS' ? 'PASS' : 'FAIL';
}
```

**Severity:** MEDIUM — Minor duplication but easy to fix.

---

## 4. Performance & Scalability

### MEDIUM: Synchronous File Operations Block Event Loop
**Location:** Lines 157-167, 502-520
```javascript
const content = readFileSync(fullPath, 'utf-8');  // ❌ Blocks event loop
writeFileSync(join(latestDir, `${slug}.md`), content, 'utf-8');  // ❌ Blocks
```

**Issue:** For large files or slow disks, this blocks the entire script. Since this is a CLI tool (not a server), it's acceptable, but async would be better.

**Fix:**
```javascript
import { readFile, writeFile, mkdir } from 'fs/promises';

// In getRecentFiles:
for (const fp of filePaths) {
  const fullPath = join(ROOT, fp);
  if (!existsSync(fullPath)) continue;
  try {
    const content = await readFile(fullPath, 'utf-8');
    // ...
  } catch (err) {
    skippedFiles.push({ path: fp, reason: err.message });
  }
}

// In writeSplitOutput:
await mkdir(latestDir, { recursive: true });
await writeFile(join(latestDir, `${slug}.md`), content, 'utf-8');
```

**Severity:** MEDIUM — Not critical for a CLI tool, but async is best practice.

---

### LOW: Inefficient String Concatenation in Large Reports
**Location:** Lines 313-350
```javascript
let md = `# SwanStudios Validation Report
// ...
`;

for (const r of results) {
  md += `## [${badge}] ${r.name}
// ...
`;  // ❌ String concatenation in loop
}
```

**Issue:** For very large reports, repeated `+=` creates intermediate strings.

**Fix:**
```javascript
const sections = [
  `# SwanStudios Validation Report\n...`,
  ...results.map(r => `## [${getStatusBadge(r.status)}] ${r.name}\n${r.text}\n---\n`),
  `## Aggregate Summary\n...`,
];

const md = sections.join('\n');
```

**Severity:** LOW — Only matters for huge reports (unlikely).

---

## 5. Security Issues

### MEDIUM: Command Injection Risk in Git Commands
**Location:** Lines 120-137
```javascript
const timeArg = `--since="${since}"`;  // ❌ User input in shell command
const out = execSync(
  `git log ${timeArg} --diff-filter=ACMR --name-only --pretty=format:""`,
  { cwd: ROOT, encoding: 'utf-8' }
);
```

**Issue:** If `since` comes from user input (CLI args), it could contain shell metacharacters.

**Fix:**
```javascript
// Validate input before using in shell command
function sanitizeGitTimeArg(since) {
  const match = since.match(/^(\d+)(h|d|m)$/);
  if (!match) {
    throw new Error(`Invalid --since format: ${since}. Use format: 24h, 7d, 30m`);
  }
  return match[0];  // Return validated input
}

const since = sanitizeGitTimeArg(opts.since || '2h');
```

**Severity:** MEDIUM — Low risk since this is a dev tool, but still a vulnerability.

---

### LOW: API Key Logged in Error Messages
**Location:** Lines 226-236
```javascript
async function callOpenRouter(apiKey, model, prompt) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,  // ❌ Could leak in error logs
    },
    // ...
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${errBody.slice(0, 300)}`);  // ❌ Could include auth errors with key
  }
}
```

**Issue:** If OpenRouter returns an auth error, the API key might be in the error message.

**Fix:**
```javascript
if (!res.ok) {
  const errBody = await res.text().catch(() => '');
  // Redact potential key leaks
  const safeError = errBody.replace(/sk-or-v1-[a-zA-Z0-9]+/g, 'sk-or-v1-***');
  throw new Error(`OpenRouter ${res.status}: ${safeError.slice(0, 300)}`);
}
```

**Severity:** LOW — Unlikely to leak, but good practice.

---

## 6. Code Quality Issues

### MEDIUM: Magic Numbers Without Constants
**Location:** Lines 41-50
```javascript
const CONFIG = {
  maxCodeChars: 60_000,  // ✅ Good
  timeout: 180_000,      // ✅ Good
  staggerMs: 2000,       // ✅ Good
  maxArchiveRuns: 20,    // ✅ Good
};

// But elsewhere:
if (remaining > 500) {  // ❌ Magic number
  files.push({ path: fp, content: content.slice(0, remaining) + '\n\n// ... truncated ...' });
}
```

**Fix:**
```javascript
const CONFIG = {
  // ...
  minFileChunkSize: 500,  // Don't include files smaller than this when truncating
};

if (remaining > CONFIG.minFileChunkSize) {
  // ...
}
```

**Severity:** MEDIUM — Improves maintainability.

---

### LOW: Inconsistent Error Message Formatting
**Location:** Throughout
```javascript
console.error('  ERROR: No OpenRouter API key found!');  // ✅ Prefixed
console.error('Fatal error:', err);  // ❌ No prefix
console.warn(`    ⚠️  WARNING: "${track.name}" cost...`);  // ✅ Emoji + prefix
```

**Fix:** Standardize on a format:
```javascript
function logError(msg) {
  console.error(`  ❌ ERROR: ${msg}`);
}

function logWarn(msg) {
  console.warn(`  ⚠️  WARNING: ${msg}`);
}

function logInfo(msg) {
  console.log(`  ℹ️  ${msg}`);
}
```

**Severity:** LOW — Cosmetic, but improves UX.

---

## 7. Architectural Issues

### MEDIUM: Tight Coupling Between Report Generation and File Writing
**Location:** Lines 313-350 (generateReport) and 502-520 (writeSplitOutput)

**Issue:** `generateReport` builds the full markdown, then `writeSplitOutput` re-parses results to build individual files. These should share logic.

**Fix:**
```javascript
// Extract shared report building logic
function buildTrackReport(result, fileNames, timestamp) {
  const badge = getStatusBadge(result.status);
  return `# ${result.name} — Validation Report

> **Status:** ${badge} | **Model:** ${result.model} | **Duration:** ${(result.durationMs / 1000).toFixed(1)}s
> **Files:** ${fileNames}
> **Generated:** ${timestamp}

---

${result.text}

---

*Part of SwanStudios 7-Brain Validation System*
`;
}

// Use in both functions
function generateReport(results, files, startTime) {
  // ...
  for (const r of results) {
    md += buildTrackReport(r, fileNames, now.toLocaleString());
  }
  // ...
}

function writeSplitOutput(results, files, fullReport, timestamp) {
  // ...
  for (const r of results) {
    const content = buildTrackReport(r, fileNames, new Date().toLocaleString());
    writeToLatestAndArchive(`${slug}.md`, content, latestDir, archiveDir);
  }
  // ...
}
```

**Severity:** MEDIUM — Reduces duplication and keeps reports consistent.

---

## 8. Missing Features

### HIGH: No Progress Indicator for Long-Running Validators
**Location:** Lines 413-424

**Issue:** Users see validators launch, then nothing for 30-180 seconds. Add a progress indicator.

**Fix:**
```javascript
async function runValidator(apiKey, track, index) {
  if (index > 0) {
    await sleep(CONFIG.staggerMs * index);
  }

  const start = Date.now();
  const tag = track.name.padEnd(35);
  
  // Show "in progress" indicator
  process.stdout.write(`    [RUN] ${tag} `);
  
  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼

---

*Part of SwanStudios 7-Brain Validation System*
