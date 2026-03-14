# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 54.3s
> **Files:** scripts/validation-orchestrator.mjs, scripts/lib/recursive-consensus.mjs
> **Generated:** 3/13/2026, 5:11:01 PM

---

# Code Review: SwanStudios Validation Orchestrator

## CRITICAL Issues

### 1. **Hardcoded API Keys in Environment Variables**
**Severity:** CRITICAL  
**Files:** `scripts/validation-orchestrator.mjs` (lines 91-103)  
**Issue:** API keys are loaded from `.env` files without validation or encryption. Keys are stored in plain text and could be exposed in version control or logs.

```javascript
function loadEnv() {
  for (const envPath of [join(ROOT, '.env'), join(ROOT, 'backend', '.env')]) {
    if (existsSync(envPath)) {
      const lines = readFileSync(envPath, 'utf-8').split('\n');
      // ... parsing logic
    }
  }
}
```

**Fix:** 
- Add `.env` to `.gitignore` (verify it's there)
- Validate API keys are present before use
- Consider using a secrets manager for production
- Add warning if `.env` file permissions are too open (chmod 600)

---

### 2. **Unhandled Promise Rejections in Parallel Execution**
**Severity:** CRITICAL  
**Files:** `scripts/validation-orchestrator.mjs` (line 683)  
**Issue:** `Promise.all()` will fail entirely if ANY validator throws. This means one API timeout kills all 7 validators.

```javascript
const phase1Results = await Promise.all(phase1Tracks.map(async (track, index) => {
  // ... if one throws, all fail
}));
```

**Fix:**
```typescript
const phase1Results = await Promise.allSettled(phase1Tracks.map(async (track, index) => {
  try {
    return await runValidator(apiKey, track, index);
  } catch (err) {
    return {
      name: track.name,
      model: track.model,
      status: 'ERROR',
      text: `Error: ${err.message}`,
      inputTokens: 0,
      outputTokens: 0,
      costUSD: 0,
      durationMs: 0,
    };
  }
})).then(results => results.map(r => r.status === 'fulfilled' ? r.value : r.reason));
```

---

### 3. **Missing Type Safety (JavaScript instead of TypeScript)**
**Severity:** CRITICAL  
**Files:** Both `.mjs` files  
**Issue:** These are `.mjs` (JavaScript) files with NO TypeScript checking. The codebase is TypeScript, but critical orchestration scripts have zero type safety.

**Problems:**
- No compile-time checks for API response shapes
- No validation that `callModel` returns expected structure
- No type guards for discriminated unions (provider types)
- Runtime errors that TypeScript would catch

**Fix:** Rename to `.mts` and add proper types:
```typescript
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

interface APIResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

type Provider = 'openrouter' | 'gemini-direct';
```

---

### 4. **Incomplete Debate Log in `recursive-consensus.mjs`**
**Severity:** CRITICAL  
**Files:** `scripts/lib/recursive-consensus.mjs` (line 178, truncated)  
**Issue:** The file is TRUNCATED mid-function. The `buildResult` function is incomplete:

```javascript
function buildResult(topic, consensusReached, rounds, finalVerdict, totalInput, totalOutput) {
  let debateLog = `# ${topic} — Recursive Consensus Debate Log\n\n`;
  // ...
  for (const r of rounds) {
    debateLog += `## ${r.role} — ${typeof r.round =
// ... truncated ...
```

**Fix:** Complete the function (likely missing closing logic):
```typescript
for (const r of rounds) {
  debateLog += `## ${r.role} — Round ${r.round}\n\n${r.text}\n\n---\n\n`;
}

return {
  consensusReached,
  rounds,
  finalVerdict,
  debateLog,
  totalTokens: { input: totalInput, output: totalOutput },
};
```

---

## HIGH Priority Issues

### 5. **No Rate Limiting Between API Calls**
**Severity:** HIGH  
**Files:** `scripts/validation-orchestrator.mjs` (lines 549-560)  
**Issue:** Stagger delay (2s) is only applied BEFORE each call, not between retries. If OpenRouter rate-limits, there's no exponential backoff.

```javascript
if (index > 0) {
  await sleep(CONFIG.staggerMs * index);
}
// ... immediate API call, no retry logic
```

**Fix:** Add exponential backoff:
```typescript
async function callWithRetry(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      if (err.message.includes('429') || err.message.includes('rate limit')) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await sleep(delay);
      } else {
        throw err; // Don't retry non-rate-limit errors
      }
    }
  }
}
```

---

### 6. **Unbounded Token Estimation**
**Severity:** HIGH  
**Files:** `scripts/validation-orchestrator.mjs` (line 482)  
**Issue:** Token estimation is naive (length / 4) and doesn't account for special tokens, Unicode, or model-specific tokenization.

```javascript
function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}
```

**Impact:** Cost tracking is inaccurate. Could underestimate by 2-3x for code with lots of symbols.

**Fix:** Use `tiktoken` library or model-specific tokenizers:
```typescript
import { encoding_for_model } from 'tiktoken';

function estimateTokens(text: string, model: string): number {
  try {
    const encoding = encoding_for_model(model);
    const tokens = encoding.encode(text);
    encoding.free();
    return tokens.length;
  } catch {
    // Fallback to naive estimation
    return Math.ceil(text.length / 4);
  }
}
```

---

### 7. **Missing Input Validation on CLI Arguments**
**Severity:** HIGH  
**Files:** `scripts/validation-orchestrator.mjs` (lines 119-136)  
**Issue:** No validation that `--files` paths exist or are within project root. Could read arbitrary files on system.

```javascript
function parseArgs() {
  // ... no validation that files exist or are safe
  while (i < args.length && !args[i].startsWith('--')) {
    opts.files.push(args[i]); // Could be ../../../../etc/passwd
    i++;
  }
}
```

**Fix:**
```typescript
import { resolve, relative } from 'path';

function validateFilePath(filePath: string): string | null {
  const resolved = resolve(ROOT, filePath);
  const rel = relative(ROOT, resolved);
  
  // Prevent directory traversal
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    console.error(`  ERROR: File outside project root: ${filePath}`);
    return null;
  }
  
  if (!existsSync(resolved)) {
    console.error(`  ERROR: File not found: ${filePath}`);
    return null;
  }
  
  return resolved;
}
```

---

### 8. **Synchronous File Operations Block Event Loop**
**Severity:** HIGH  
**Files:** `scripts/validation-orchestrator.mjs` (multiple locations)  
**Issue:** Uses `readFileSync`, `writeFileSync`, `execSync` extensively. Blocks event loop during file I/O.

```javascript
const content = readFileSync(fullPath, 'utf-8'); // Blocks
writeFileSync(join(latestDir, `${slug}.md`), content, 'utf-8'); // Blocks
```

**Fix:** Use async versions:
```typescript
import { readFile, writeFile, mkdir } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Replace all sync calls:
const content = await readFile(fullPath, 'utf-8');
await writeFile(join(latestDir, `${slug}.md`), content, 'utf-8');
const { stdout } = await execAsync('git diff --name-only HEAD', { cwd: ROOT });
```

---

### 9. **No Timeout on Individual Validator Runs**
**Severity:** HIGH  
**Files:** `scripts/validation-orchestrator.mjs` (line 549)  
**Issue:** Global timeout (3 min) applies to fetch, but if a validator hangs before fetch (e.g., in prompt building), no timeout.

**Fix:**
```typescript
async function runValidator(apiKey, track, index) {
  return Promise.race([
    runValidatorImpl(apiKey, track, index),
    sleep(CONFIG.timeout).then(() => {
      throw new Error('Validator timeout exceeded');
    }),
  ]);
}
```

---

### 10. **Hardcoded Color Values in Prompt Templates**
**Severity:** HIGH  
**Files:** `scripts/validation-orchestrator.mjs` (lines 202, 311, 402)  
**Issue:** Theme colors are hardcoded in prompt strings. If theme changes, must update in 3+ places.

```javascript
const ctx = `Active palette: Midnight Sapphire #002060 (Primary), Royal Depth #003080...`;
```

**Fix:** Extract to shared config:
```typescript
const THEME = {
  colors: {
    primary: { name: 'Midnight Sapphire', hex: '#002060' },
    surface: { name: 'Royal Depth', hex: '#003080' },
    // ... rest
  },
  retired: {
    galaxySwan: ['#0a0a1a', '#00FFFF', '#7851A9'],
  },
};

function buildThemeContext(): string {
  const active = Object.entries(THEME.colors)
    .map(([key, { name, hex }]) => `${name} ${hex} (${key})`)
    .join(', ');
  const retired = `RETIRED: Galaxy-Swan (${THEME.retired.galaxySwan.join(', ')})`;
  return `Active palette: ${active}. ${retired}`;
}
```

---

## MEDIUM Priority Issues

### 11. **Missing Error Boundary for Debate Loops**
**Severity:** MEDIUM  
**Files:** `scripts/validation-orchestrator.mjs` (lines 700-750)  
**Issue:** If Phase 2 or 3 debate throws, it's caught but doesn't prevent Phase 3 from running. Could waste API calls.

**Fix:**
```typescript
let shouldRunPhase3 = true;

try {
  // Phase 2 code...
} catch (err) {
  console.error(`    [FAIL] Phase 2 debate error: ${err.message}`);
  shouldRunPhase3 = false; // Don't run Phase 3 if Phase 2 failed critically
}

if (hasGemini31 && shouldRunPhase3) {
  // Phase 3 code...
}
```

---

### 12. **Magic Numbers Throughout**
**Severity:** MEDIUM  
**Files:** Both files  
**Issue:** Magic numbers like `60_000`, `4096`, `2000`, `300` scattered without explanation.

```javascript
maxCodeChars: 60_000,  // Why 60K?
max_tokens: 4096,      // Why 4096?
staggerMs: 2000,       // Why 2s?
```

**Fix:**
```typescript
const LIMITS = {
  MAX_CODE_CHARS: 60_000,        // ~15K tokens at 4 chars/token
  MAX_OUTPUT_TOKENS: 4096,       // Model context limit
  STAGGER_DELAY_MS: 2000,        // Rate limit: 30 req/min = 2s spacing
  HEAVY_OPERATION_MS: 300,       // UX threshold for loading indicator
  MAX_ARCHIVE_RUNS: 20,          // Disk space management
} as const;
```

---

### 13. **Inconsistent Error Messages**
**Severity:** MEDIUM  
**Files:** `scripts/validation-orchestrator.mjs` (multiple locations)  
**Issue:** Some errors log to console, some throw, some return error objects. No consistent error handling strategy.

```javascript
// Mix of approaches:
console.error('  ERROR: No OpenRouter API key found!'); // logs + exits
throw new Error(`OpenRouter ${res.status}: ${errBody}`); // throws
return { status: 'ERROR', text: `Error: ${err.message}` }; // returns error object
```

**Fix:** Use consistent error handling:
```typescript
class ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = false
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Usage:
throw new ValidationError('No API key found', 'MISSING_API_KEY', false);
```

---

### 14. **No Progress Indicator for Long Operations**
**Severity:** MEDIUM  
**Files:** `scripts/validation-orchestrator.mjs` (lines 683-695)  
**Issue:** Phase 1 runs 7 validators in parallel (up to 3 min). User sees nothing until first completes.

**Fix:**
```typescript
import ora from 'ora';

const spinner = ora('Running Phase 1 validators...').start();
let completed = 0;

const phase1Results = await Promise.all(phase1Tracks.map(async (track, index) => {
  const result = await runValidator(apiKey, track, index);
  completed++;
  spinner.text = `Running Phase 1 validators... (${completed}/${phase1Tracks.length})`;
  return result;
}));

spinner.succeed(`Phase 1 complete — ${completed}/${phase1Tracks.length} passed`);
```

---

### 15. **Potential Memory Leak in Debate History**
**Severity:** MEDIUM  
**Files:** `scripts/lib/recursive-consensus.mjs` (line 66)  
**Issue:** `conversationHistory` string grows unbounded. With 5 rounds × 4K tokens each = 20K tokens = ~80KB string in memory.

```javascript
conversationHistory += `\n\n## ${currentModel.role}...\n${result.text}`;
```

**Impact:** Not critical for 5 rounds, but if MAX_ROUNDS increases, could cause issues.

**Fix:**
```typescript
const conversationHistory: Array<{ round: number; speaker: string; text: string }> = [];

// Later, build string only when needed:
function buildHistoryString(history: typeof conversationHistory): string {
  return history.map(h => `## ${h.speaker} — Round ${h.round}\n${h.text}`).join('\n\n');
}
```

---

### 16. **No Validation of Model Response Structure**
**Severity:** MEDIUM  
**Files:** `scripts/validation-orchestrator.mjs` (lines 451-475)  
**Issue:** Assumes API responses have expected shape. If OpenRouter changes response format, crashes.

```javascript
return {
  text: data.choices?.[0]?.message?.content || '(no response)', // Optional chaining helps, but...
  inputTokens: data.usage?.prompt_tokens || estimateTokens(prompt), // Fallback is good
  // ... but no validation that data.choices is an array
};
```

**Fix:** Use Zod for runtime validation:
```typescript
import { z } from 'zod';

const OpenRouterResponseSchema = z.object({
  

---

*Part of SwanStudios 9-Brain Recursive Consensus System*
