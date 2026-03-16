# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 47.7s
> **Files:** CLAUDE.md, scripts/validation-orchestrator.mjs
> **Generated:** 3/15/2026, 7:06:59 PM

---

# Code Review: SwanStudios Validation Orchestrator

## CRITICAL Issues

### 1. Command Injection Vulnerability (Security)
**Severity:** CRITICAL  
**File:** `scripts/validation-orchestrator.mjs`  
**Lines:** 328-341

**Issue:**
```javascript
const match = since.match(/^(\d+)(h|d|m)$/);
if (match) {
  const [, num, unit] = match;
  const unitMap = { h: 'hours', d: 'days', m: 'minutes' };
  timeArg = `--since="${num} ${unitMap[unit]} ago"`;
} else {
  throw new Error(`Invalid --since format: "${since}". Use format like 2h, 1d, 30m.`);
}
const out = execSync(
  `git log ${timeArg} --diff-filter=ACMR --name-only --pretty=format:""`,
  { cwd: ROOT, encoding: 'utf-8' }
);
```

While there's validation, the error message includes user input that could be logged/displayed unsafely. More critically, the `execSync` call uses string interpolation which is inherently risky.

**Fix:**
```typescript
// Use array syntax for execSync to prevent injection
const args = [
  'log',
  `--since=${num} ${unitMap[unit]} ago`,
  '--diff-filter=ACMR',
  '--name-only',
  '--pretty=format:'
];
const out = execSync(`git ${args.join(' ')}`, { 
  cwd: ROOT, 
  encoding: 'utf-8',
  shell: false // Prevent shell interpretation
});
```

---

### 2. Missing TypeScript Types Throughout
**Severity:** CRITICAL  
**File:** `scripts/validation-orchestrator.mjs`  
**Lines:** Entire file

**Issue:**
The file uses `.mjs` extension but the review prompt asks for TypeScript best practices. This is JavaScript, not TypeScript. No type safety whatsoever.

**Problems:**
- No interface definitions for `Track`, `Result`, `ValidationOptions`
- Function parameters lack types
- Return types not specified
- API response shapes not typed

**Fix:**
Convert to `.mts` (TypeScript ESM) or add JSDoc types:

```typescript
/**
 * @typedef {Object} ValidationTrack
 * @property {string} name
 * @property {string} model
 * @property {string} prompt
 * @property {'openrouter' | 'gemini-direct'} [provider]
 */

/**
 * @typedef {Object} ValidationResult
 * @property {string} name
 * @property {string} model
 * @property {'SUCCESS' | 'ERROR'} status
 * @property {string} text
 * @property {number} inputTokens
 * @property {number} outputTokens
 * @property {number} costUSD
 * @property {number} durationMs
 */

/**
 * @param {string} apiKey
 * @param {ValidationTrack} track
 * @param {number} index
 * @returns {Promise<ValidationResult>}
 */
async function runValidator(apiKey, track, index) {
  // ...
}
```

---

### 3. Unhandled Promise Rejections in Parallel Execution
**Severity:** HIGH  
**File:** `scripts/validation-orchestrator.mjs`  
**Lines:** 758-766

**Issue:**
```javascript
const phase1Results = await Promise.all(phase1Tracks.map(async (track, index) => {
  const tag = track.name.padEnd(35);
  const modelShort = track.model.split('/').pop();
  console.log(`    [P1 ${index + 1}/${phase1Tracks.length}] ${tag} -> ${modelShort}`);
  const result = await runValidator(apiKey, track, index);
  const badge = result.status === 'SUCCESS' ? 'OK  ' : 'FAIL';
  console.log(`    [${badge}] ${tag} ${(result.durationMs / 1000).toFixed(1)}s`);
  return result;
}));
```

If one validator throws an exception that isn't caught by `runValidator`, the entire `Promise.all` fails and subsequent validators never complete. The try/catch in `runValidator` helps, but errors in the map function itself aren't caught.

**Fix:**
```javascript
const phase1Results = await Promise.allSettled(
  phase1Tracks.map(async (track, index) => {
    try {
      const tag = track.name.padEnd(35);
      const modelShort = track.model.split('/').pop();
      console.log(`    [P1 ${index + 1}/${phase1Tracks.length}] ${tag} -> ${modelShort}`);
      const result = await runValidator(apiKey, track, index);
      const badge = result.status === 'SUCCESS' ? 'OK  ' : 'FAIL';
      console.log(`    [${badge}] ${tag} ${(result.durationMs / 1000).toFixed(1)}s`);
      return result;
    } catch (err) {
      return {
        name: track.name,
        model: track.model,
        status: 'ERROR',
        text: `Unexpected error: ${err.message}`,
        inputTokens: 0,
        outputTokens: 0,
        costUSD: 0,
        durationMs: 0,
      };
    }
  })
).then(results => 
  results.map(r => r.status === 'fulfilled' ? r.value : r.reason)
);
```

---

## HIGH Priority Issues

### 4. Hardcoded Configuration Values
**Severity:** HIGH  
**File:** `scripts/validation-orchestrator.mjs`  
**Lines:** 66-75

**Issue:**
```javascript
const CONFIG = {
  maxCodeChars: 60_000,
  promptDir: join(ROOT, 'AI-Village-Documentation', 'validation-prompts'),
  legacyReportDir: join(ROOT, 'docs', 'ai-workflow', 'validation-reports'),
  timeout: 180_000,  // 3 min
  staggerMs: 2000,
  maxArchiveRuns: 20,
};
```

These should be environment variables or a config file for flexibility across environments.

**Fix:**
```javascript
const CONFIG = {
  maxCodeChars: parseInt(process.env.MAX_CODE_CHARS || '60000', 10),
  promptDir: process.env.PROMPT_DIR || join(ROOT, 'AI-Village-Documentation', 'validation-prompts'),
  legacyReportDir: process.env.LEGACY_REPORT_DIR || join(ROOT, 'docs', 'ai-workflow', 'validation-reports'),
  timeout: parseInt(process.env.VALIDATION_TIMEOUT || '180000', 10),
  staggerMs: parseInt(process.env.STAGGER_MS || '2000', 10),
  maxArchiveRuns: parseInt(process.env.MAX_ARCHIVE_RUNS || '20', 10),
};
```

---

### 5. Massive Prompt Duplication (DRY Violation)
**Severity:** HIGH  
**File:** `scripts/validation-orchestrator.mjs`  
**Lines:** 245-584

**Issue:**
The context string is duplicated in every single validator prompt:

```javascript
const ctx = `SwanStudios is a personal training SaaS platform (React + TypeScript + styled-components frontend, Node.js + Express + Sequelize + PostgreSQL backend). Enchanted Apex: Crystalline Swan theme (frozen enchanted forest + deep-ocean luxury vault + competitive arena). Active palette: Midnight Sapphire #002060 (Primary), Royal Depth #003080 (Surface), Ice Wing #60C0F0 (Gaming Accent), Arctic Cyan #50A0F0 (Glow Accent — buttons, hovers, animations), Gilded Fern #C6A84B (Luxury Accent), Frost White #E0ECF4 (Background), Swan Lavender #4070C0 (Tertiary), Wing Purple #8B5CF6 (Secondary Accent). Typography: Plus Jakarta Sans (headings), Cormorant Garamond Italic (drama), Fira Code (data), Sora (UI/gaming). RETIRED Galaxy-Swan theme (#0a0a1a, #00FFFF, #7851A9) — do NOT use. Production: sswanstudios.com. Files: ${fileNames}`;
```

This appears 11+ times across different prompt builders.

**Fix:**
```javascript
const SYSTEM_CONTEXT = {
  platform: 'SwanStudios is a personal training SaaS platform',
  stack: 'React + TypeScript + styled-components frontend, Node.js + Express + Sequelize + PostgreSQL backend',
  theme: 'Enchanted Apex: Crystalline Swan (frozen enchanted forest + deep-ocean luxury vault + competitive arena)',
  palette: {
    primary: 'Midnight Sapphire #002060',
    surface: 'Royal Depth #003080',
    gamingAccent: 'Ice Wing #60C0F0',
    glowAccent: 'Arctic Cyan #50A0F0',
    luxuryAccent: 'Gilded Fern #C6A84B',
    background: 'Frost White #E0ECF4',
    tertiary: 'Swan Lavender #4070C0',
    secondaryAccent: 'Wing Purple #8B5CF6',
  },
  typography: 'Plus Jakarta Sans (headings), Cormorant Garamond Italic (drama), Fira Code (data), Sora (UI/gaming)',
  retired: 'Galaxy-Swan theme (#0a0a1a, #00FFFF, #7851A9) — do NOT use',
  production: 'sswanstudios.com',
};

function buildContextString(fileNames: string): string {
  return `${SYSTEM_CONTEXT.platform} (${SYSTEM_CONTEXT.stack}). ${SYSTEM_CONTEXT.theme}. Active palette: ${Object.entries(SYSTEM_CONTEXT.palette).map(([k, v]) => v).join(', ')}. Typography: ${SYSTEM_CONTEXT.typography}. RETIRED ${SYSTEM_CONTEXT.retired}. Production: ${SYSTEM_CONTEXT.production}. Files: ${fileNames}`;
}
```

---

### 6. Missing Error Boundaries for File Operations
**Severity:** HIGH  
**File:** `scripts/validation-orchestrator.mjs`  
**Lines:** 346-365

**Issue:**
```javascript
for (const fp of filePaths) {
  const fullPath = resolve(ROOT, fp);
  if (!fullPath.startsWith(resolve(ROOT))) continue;
  if (!existsSync(fullPath)) continue;
  try {
    const stats = statSync(fullPath);
    if (stats.size > 1024 * 1024) continue;
    const content = readFileSync(fullPath, 'utf-8');
    // ...
  } catch { /* skip */ }
}
```

Silent failures hide important errors. If a file can't be read due to permissions or encoding issues, the user should know.

**Fix:**
```javascript
const errors: string[] = [];
for (const fp of filePaths) {
  const fullPath = resolve(ROOT, fp);
  if (!fullPath.startsWith(resolve(ROOT))) {
    errors.push(`Path traversal attempt blocked: ${fp}`);
    continue;
  }
  if (!existsSync(fullPath)) {
    errors.push(`File not found: ${fp}`);
    continue;
  }
  try {
    const stats = statSync(fullPath);
    if (stats.size > 1024 * 1024) {
      errors.push(`File too large (>1MB): ${fp}`);
      continue;
    }
    const content = readFileSync(fullPath, 'utf-8');
    // ...
  } catch (err) {
    errors.push(`Failed to read ${fp}: ${err.message}`);
  }
}

if (errors.length > 0) {
  console.warn('  ⚠️  File reading warnings:');
  errors.forEach(e => console.warn(`    ${e}`));
}
```

---

### 7. Unsafe JSON Parsing Without Validation
**Severity:** HIGH  
**File:** `scripts/validation-orchestrator.mjs`  
**Lines:** 443-456, 493-506

**Issue:**
```javascript
const data = await res.json();

if (data.error) {
  throw new Error(`OpenRouter error: ${data.error.message || JSON.stringify(data.error)}`);
}

return {
  text: data.choices?.[0]?.message?.content || '(no response)',
  inputTokens: data.usage?.prompt_tokens || estimateTokens(prompt),
  outputTokens: data.usage?.completion_tokens || estimateTokens(data.choices?.[0]?.message?.content || ''),
  model: data.model || model,
};
```

No validation that `data` has the expected shape. If the API changes or returns unexpected data, this could crash.

**Fix:**
```typescript
interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  model?: string;
  error?: {
    message?: string;
  };
}

function validateOpenRouterResponse(data: unknown): OpenRouterResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid API response: not an object');
  }
  return data as OpenRouterResponse; // Add runtime validation with Zod in production
}

const data = validateOpenRouterResponse(await res.json());
```

---

## MEDIUM Priority Issues

### 8. Magic Numbers Without Constants
**Severity:** MEDIUM  
**File:** `scripts/validation-orchestrator.mjs`  
**Lines:** Multiple locations

**Issue:**
```javascript
if (stats.size > 1024 * 1024) continue; // Line 358
max_tokens: 4096, // Line 438
temperature: 0.3, // Line 439
maxOutputTokens: 8192, // Line 490
```

These should be named constants for clarity and maintainability.

**Fix:**
```javascript
const FILE_SIZE_LIMITS = {
  MAX_FILE_SIZE_BYTES: 1024 * 1024, // 1MB
  MAX_TOKENS_OPENROUTER: 4096,
  MAX_TOKENS_GEMINI: 8192,
};

const MODEL_PARAMS = {
  TEMPERATURE: 0.3,
  TIMEOUT_MS: 180_000,
};
```

---

### 9. Inconsistent Error Handling Patterns
**Severity:** MEDIUM  
**File:** `scripts/validation-orchestrator.mjs`  
**Lines:** 328-345, 520-530

**Issue:**
Some try/catch blocks return empty arrays, others throw, others log and continue:

```javascript
try {
  const out = execSync(/* ... */);
  filePaths = [...new Set(out.trim().split('\n').filter(Boolean))];
} catch {
  try {
    const out = execSync('git diff --name-only HEAD', { cwd: ROOT, encoding: 'utf-8' });
    filePaths = out.trim().split('\n').filter(Boolean);
  } catch { filePaths = []; }
}
```

**Fix:**
Establish a consistent error handling strategy:

```javascript
function getGitFiles(since: string): string[] {
  try {
    return execGitLog(since);
  } catch (err) {
    console.warn(`Git log failed: ${err.message}, falling back to git diff`);
    try {
      return execGitDiff();
    } catch (diffErr) {
      console.warn(`Git diff failed: ${diffErr.message}, returning empty list`);
      return [];
    }
  }
}
```

---

### 10. Missing Input Validation on API Keys
**Severity:** MEDIUM  
**File:** `scripts/validation-orchestrator.mjs`  
**Lines:** 105-107, 109-111

**Issue:**
```javascript
function getOpenRouterKey() {
  return

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
