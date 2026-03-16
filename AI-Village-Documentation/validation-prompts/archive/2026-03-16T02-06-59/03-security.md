# Security — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 34.8s
> **Files:** CLAUDE.md, scripts/validation-orchestrator.mjs
> **Generated:** 3/15/2026, 7:06:59 PM

---

# Security Audit Report: SwanStudios Validation Orchestrator

**Auditor:** Step 3.5 Flash (74.4% SWE-bench accuracy)  
**Date:** 2026-02-15  
**Scope:** `CLAUDE.md` + `scripts/validation-orchestrator.mjs`  
**Target:** SwanStudios SaaS platform (sswanstudios.com)  

---

## Executive Summary

| Severity | Count | Status |
|----------|-------|--------|
| **CRITICAL** | 1 | 🚨 Immediate action required |
| **HIGH** | 2 | ⚠️ Patch within 24-48 hours |
| **MEDIUM** | 2 | 📅 Schedule for next sprint |
| **LOW** | 2 | 💡 Consider when refactoring |

**Primary Concern:** The validation orchestrator sends **unfiltered source code** to third-party AI APIs, creating a massive data exposure risk. This could leak API keys, database credentials, and proprietary business logic.

---

## Critical Findings

### 🔴 CRITICAL: Unrestricted Source Code Exfiltration to Third-Party AI APIs

**Category:** Data Exposure (A01:2021 – Broken Access Control)  
**File:** `scripts/validation-orchestrator.mjs`  
**Lines:** 240-242, 259-262, 318-321, 344-347, 370-373, 396-399 (all `callOpenRouter`/`callGeminiDirect` invocations)

**What's Wrong:**
The orchestrator reads **entire source files** from the project and sends them to external AI services (OpenRouter, Google GenAI) **without any sanitization**. This includes:

- Hardcoded API keys and secrets (`.env` patterns, `process.env.*` usage)
- Database connection strings and credentials
- JWT secrets and session management code
- Internal infrastructure details (PostgreSQL config, Redis URLs, S3 buckets)
- Proprietary business logic and algorithms
- Potentially user PII if present in code (test fixtures, mock data)

**Code Evidence:**
```javascript
// Line 240-242: Files are bundled and sent as-is
const codeBundle = formatCodeBundle(files);
// ...
const result = await callOpenRouter(apiKey, track.model, track.prompt);
// The prompt contains: `CODE TO REVIEW:\n${codeBundle}`
```

**Blast Radius:**
- **All developers** using this tool expose the entire codebase to third parties
- **Production secrets** may be embedded in code (even if `.env` is used, fallback values or config examples might exist)
- **Compliance violation** – GDPR, HIPAA, PCI-DSS if PII/health/payment data is in code
- **Intellectual property theft** – Proprietary training algorithms, business logic
- **Supply chain risk** – AI providers could retain, analyze, or leak code

**Fix:**
Implement a **code sanitization layer** before sending to external AI:

```javascript
// Add before line 240 in formatCodeBundle() or create new sanitizeCodeBundle()
function sanitizeCodeBundle(files) {
  const sensitivePatterns = [
    /(?:api[_-]?key|secret|password|token|credential|connectionString|databaseUrl|jwt[_-]?secret)\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /(?:sk-|ghp_|glpat-|AKIA[0-9A-Z]{16})[0-9a-zA-Z]{20,}/g, // Common API key formats
    /(?:mongodb|postgres|mysql|redis):\/\/[^\s]+/gi,
    /(?:BEGIN|END)\s+(?:RSA|DSA|EC)\s+PRIVATE\s+KEY/gi,
    /<privateKey>[^<]+<\/privateKey>/gi,
  ];

  return files.map(f => {
    let content = f.content;
    for (const pattern of sensitivePatterns) {
      content = content.replace(pattern, '[REDACTED]');
    }
    return { ...f, content };
  });
}

// Then use: const codeBundle = formatCodeBundle(sanitizeCodeBundle(files));
```

**Additional Controls:**
1. Add a **warning banner** when the script starts: "⚠️  This script sends code to external AI APIs. Ensure no secrets are in the codebase."
2. Implement a **pre-send audit log** that hashes and records what was sent (for compliance).
3. Consider **on-premise AI alternatives** (e.g., local Llama 3.1) for sensitive codebases.
4. Add a `--no-external-ai` flag that only runs local static analysis (ESLint, TypeScript compiler).

**Severity Justification:** CRITICAL – This is an **active data exfiltration channel** that bypasses all secret scanning and access controls. Every developer who runs this script leaks the entire codebase.

---

## High Findings

### 🟠 HIGH: Command Injection Risk in Git Operations

**Category:** A03:2021 – Injection  
**File:** `scripts/validation-orchestrator.mjs`  
**Lines:** 176-180, 189-194

**What's Wrong:**
The script uses `execSync` with string interpolation to run git commands. While there is regex validation on `--since` format, the commands are still constructed as shell strings:

```javascript
// Line 176-180
const out = execSync(
  `git log ${timeArg} --diff-filter=ACMR --name-only --pretty=format:""`,
  { cwd: ROOT, encoding: 'utf-8' }
);
```

If the validation regex has edge cases or if

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
