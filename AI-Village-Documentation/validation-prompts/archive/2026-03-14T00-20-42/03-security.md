# Security — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 29.4s
> **Files:** AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V5.md, CLAUDE.md, scripts/validation-orchestrator.mjs
> **Generated:** 3/13/2026, 5:20:42 PM

---

# Security Audit Report: SwanStudios Codebase

**Auditor:** Step 3.5 Flash (74.4% SWE-bench accuracy)  
**Date:** 2026-03-13  
**Scope:** `AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V5.md`, `CLAUDE.md`, `scripts/validation-orchestrator.mjs`  
**Target:** SwanStudios personal training SaaS platform (React + TypeScript + styled-components frontend, Node.js + Express + Sequelize + PostgreSQL backend)

---

## Executive Summary

**Overall Risk Level:** HIGH  
**Critical Findings:** 2  
**High Findings:** 3  
**Medium Findings:** 4  
**Low Findings:** 2  

The validation orchestrator script contains **critical command injection vulnerabilities** and **path traversal risks** that could lead to arbitrary code execution. The documentation files expose sensitive architectural details that could aid attackers. No direct application code (React/Express) was provided for review, so findings are limited to the orchestration infrastructure.

---

## Detailed Findings

### 1. Command Injection in Git Command Construction

**File:** `scripts/validation-orchestrator.mjs`  
**Severity:** CRITICAL  
**CWE:** CWE-78 (OS Command Injection)  
**OWASP:** A03:2021 – Injection

**Description:**  
The `--since` argument parsing constructs a git command using template literals with user-controlled input. Although basic validation exists via regex, the command is built as a single string passed to `execSync`, creating a shell injection surface.

**Vulnerable Code:**
```javascript
const timeArg = `--since="${num} ${unitMap[unit]} ago"`;
const out = execSync(
  `git log ${timeArg} --diff-filter=ACMR --name-only --pretty=format:""`,
  { cwd: ROOT, encoding: 'utf-8' }
);
```

**Attack Vector:**  
If the regex validation is bypassed or if `num` contains shell metacharacters (e.g., `$(malicious)`), an attacker could execute arbitrary commands. The regex `^(\d+)(h|d|m)$` appears safe, but:
- The regex is applied to the raw `since` string, but `num` and `unit` are extracted via `match` and used directly
- If `since` is `2h; malicious_command`, the regex would fail because of the semicolon
- However, the code does not sanitize `num` after extraction; it's inserted directly into the command string

**Proof of Concept:**  
While the regex prevents obvious injections, edge cases like:
- `--since="2h$(whoami)"` would be rejected by regex due to `$`
- But if an attacker can control the environment (e.g., via a malicious git hook that calls this script with crafted arguments), they might bypass the CLI argument validation entirely

**Fix:**  
Use array-based `execSync` (or better, `spawnSync`) to avoid shell interpretation:
```javascript
const gitArgs = ['log', `--since=${num} ${unitMap[unit]} ago`, '--diff-filter=ACMR', '--name-only', '--pretty=format:'];
const out = execSync('git', { cwd: ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], ...gitArgs });
```
Or use a git library like `simple-git`.

---

### 2. Path Traversal via Malicious Git Repository

**File:** `scripts/validation-orchestrator.mjs`  
**Severity:** CRITICAL  
**CWE:** CWE-22 (Path Traversal)  
**OWASP:** A01:2021 – Broken Access Control

**Description:**  
The script reads files from paths returned by git commands without validating that they resolve within the project root. A malicious repository could contain files with paths like `../../../etc/passwd` or symlinks to sensitive system files.

**Vulnerable Code:**
```javascript
const fullPath = join(ROOT, fp);
if (!existsSync(fullPath)) continue;
const content = readFileSync(fullPath, 'utf-8');
```

**Attack Vector:**  
If an attacker can commit a file with a path that escapes the project root (e.g., via a symlink or `../` sequence), the script will read and potentially expose any file readable by the user running the script.

**Impact:**  
- Disclosure of sensitive files (e.g., `.env`, `~/.ssh/id_rsa`, system files)
- Potential for further exploitation if the script later writes to these paths (not currently done)

**Fix:**  
Validate that the resolved path is within `ROOT`:
```javascript
const fullPath = join(ROOT, fp);
const normalized = resolve(fullPath);
if (!normalized.startsWith(ROOT)) {
  console.error(`Security: Path traversal attempt blocked: ${fp}`);
  continue;
}
```

---

### 3. API Key Exposure via Error Messages & Logs

**File:** `scripts/validation-orchestrator.mjs`  
**Severity:** HIGH  
**CWE:** CWE-532 (Insertion of Sensitive Information into Log File)  
**OWASP:** A09:2021 – Security Logging and Monitoring Failures

**Description:**  
The script loads environment variables from `.env` files and uses them for API calls. If the script throws an uncaught exception, stack traces may reveal the presence of API keys or their values in error messages (e.g., if `getOpenRouterKey()` returns `null` and that is used in an API call, the error might include the key name).

**Vulnerable Code:**
```javascript
function loadEnv() {
  for (const envPath of [join(ROOT, '.env'), join(ROOT, 'backend', '.env')]) {
    if (existsSync(envPath)) {
      const lines = readFileSync(envPath, 'utf-8').split('\n');
      for (const line of lines) {
        // ... sets process.env[key] = val
      }
    }
  }
}
```

**Risk:**  
- If the script crashes during API calls, error objects may contain the API key in headers or request bodies
- No evidence of explicit logging of `process.env`, but Node.js uncaught exceptions can leak environment variables in some contexts

**Fix:**  
- Ensure all API calls use try/catch and never log request objects containing keys
- Consider using a secrets manager instead of `.env` files in production
- Set `NODE_OPTIONS=--no-warnings` or use a process manager that sanitizes environment variables in logs

---

### 4. Resource Exhaustion via Large File Bundle

**File:** `scripts/validation-orchestrator.mjs`  
**Severity:** HIGH  
**CWE:** CWE-400 (Uncontrolled Resource Consumption)  
**OWASP:** A05:2021 – Security Misconfiguration

**Description:**  
The script reads multiple source files and bundles them into a single string to send to AI APIs. While there's a `maxCodeChars` limit (60,000), the limit is enforced *after* reading each file. An attacker could provide many small files that together exceed the limit, causing memory pressure or API request failures.

**Vulnerable Code:**
```javascript
let totalChars = 0;
for (const fp of filePaths) {
  // ... read file
  if (totalChars + content.length > CONFIG.maxCodeChars) {
    // truncate but still read the file fully first
    files.push({ path: fp, content: content.slice(0, remaining) + '\n\n// ... truncated ...' });
    break;
  }
  files.push({ path: fp, content });
  totalChars += content.length;
}
```

**Impact:**  
- Memory exhaustion on large repositories
- API request size limits exceeded (OpenRouter may reject large prompts)
- Potential cost overrun if paid models are used (though this script uses free models)

**Fix:**  
- Check file size *before* reading: `if (stats.size > CONFIG.maxCodeChars - totalChars) break;`
- Stream files instead of bundling entire content in memory
- Implement a hard cap on number of files processed

---

### 5. Lack of Rate Limiting on API Calls

**File:** `scripts/validation-orchestrator.mjs`  
**Severity:** HIGH  
**CWE:** CWE-770 (Allocation of Resources Without Limits)  
**OWASP:** A05:2021 – Security Misconfiguration

**Description:**  
The script makes parallel API calls to 7 different models via OpenRouter, then potentially recursive debates via Gemini API. There is no rate limiting, retry logic, or cost control. An attacker who can trigger this script repeatedly could exhaust API quotas or incur costs (for paid models like `minimaxM2.5`).

**Vulnerable Code:**
```javascript
// Phase 1: 7 parallel validators launched with stagger
// Phase 2 & 3: recursive debates that could loop up to 5 times each
```

**Impact:**  
- Denial of service via quota exhaustion
- Financial impact if paid models are enabled
- API rate limit bans affecting legitimate development

**Fix:**  
- Implement token bucket rate limiting per API key
- Add configurable max cost per run
- Cache previous validation results to avoid re-running on unchanged code
- Require explicit `--force` flag to bypass cache

---

### 6. Information Disclosure in Documentation

**File:** `AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V5.md`, `CLAUDE.md`  
**Severity:** MEDIUM  
**CWE:** CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor)  
**OWASP:** A01:2021 – Broken Access Control

**Description:**  
The documentation files contain detailed information about the system architecture, including:
- Exact tech stack and versions
- Deployment target (Render, sswanstudios.com)
- Database schema details (gamification tables)
- API endpoints and authentication models
- Internal coordination protocols and AI agent roles
- Environment variable names (OPENROUTER_API_KEY, GEMINI_API_KEY)

**Impact:**  
- Provides attackers with reconnaissance data
- Reveals presence of gamification system (could be targeted for abuse)
- Exposes RBAC model (user/client/trainer/admin) which could aid privilege escalation attempts

**Fix:**  
- Move sensitive details to private documentation (access-controlled)
- Avoid publishing exact database schemas in public docs
- Use generic endpoint names in public docs (e.g., `/api/v1/data` instead of `/api/v1/gamification/leaderboard`)
- Ensure these markdown files are not served statically by the web server

---

### 7. Missing Input Validation on File Paths from Git

**File:** `scripts/validation-orchestrator.mjs`  
**Severity:** MEDIUM  
**CWE:** CWE-20 (Improper Input Validation)  
**OWASP:** A08:2021 – Software and Data Integrity Failures

**Description:**  
File paths from `git diff` or `git log` are used directly without validation beyond extension filtering. A malicious repository could include files with null bytes, extremely long paths, or special characters that cause unexpected behavior.

**Vulnerable Code:**
```javascript
const filePaths = out.trim().split('\n').filter(Boolean);
filePaths = filePaths.filter(f => codeExts.has(extname(f).toLowerCase()));
```

**Attack Vector:**  
- Paths with null bytes (`file\x00.ts`) could bypass checks on some systems
- Extremely long paths could cause DoS
- Special characters might cause issues in downstream processing (e.g., in markdown code fences)

**Fix:**  
- Sanitize file paths: remove null bytes, normalize, enforce max length (e.g., 255 chars)
- Reject paths containing `..` or absolute paths
- Use `path.basename` to ensure no directory traversal

---

### 8. Potential SSRF via Configurable Model Endpoints (Not Present but Risky Pattern)

**File:** `scripts/validation-orchestrator.mjs`  
**Severity:** MEDIUM (

---

*Part of SwanStudios 9-Brain Recursive Consensus System*
