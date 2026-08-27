#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║         SwanStudios 15-Brain Recursive Consensus System         ║
 * ║           OpenRouter + Google GenAI + Recursive Debates          ║
 * ║                                                                  ║
 * ║  Phase 1 — 9 parallel analysts (OpenRouter):                      ║
 * ║  1. Gemini 2.5 Flash     → UX / Accessibility        (FREE)    ║
 * ║  2. Claude Sonnet 4.6   → Code Quality               (FREE)    ║
 * ║  3. Nemotron 3 Nano       → Security scan              (FREE)    ║
 * ║  4. Gemini 3 Flash       → Performance review         (FREE)    ║
 * ║  5. Gemini 2.5 Flash         → Competitive intelligence   (FREE)    ║
 * ║  6. Nemotron 3 Nano        → User research / personas   (FREE)    ║
 * ║  7. Gemini 2.5 Flash         → Architecture & Bug Hunter  (~$0.01)  ║
 * ║  8. Gemini 3.1 Flash     → Frontend UX & Code Patterns (FREE)  ║
 * ║  9. Claude Sonnet 4.6   → Data Safety & Integrity     (FREE)  ║
 * ║                                                                  ║
 * ║  Phase 2 — RECURSIVE CODE QUALITY DEBATE:                       ║
 * ║  10. Gemini 3.1 Pro (CTO) ↔ Claude Sonnet 4.6 (CEO)            ║
 * ║     Loop until CONSENSUS REACHED or MAX_ROUNDS (5)              ║
 * ║     Claude = final authority on code decisions                  ║
 * ║                                                                  ║
 * ║  Phase 3 — RECURSIVE UX/UI DESIGN DEBATE:                      ║
 * ║  11. Gemini 3.1 Pro (Creative Dir) ↔ Claude (Collaborator)     ║
 * ║     Loop until CONSENSUS REACHED or MAX_ROUNDS (5)              ║
 * ║     Gemini = final authority on design decisions                ║
 * ║                                                                  ║
 * ║  Architecture: Gemini + Claude = recursive co-orchestrators     ║
 * ║  They DEBATE until consensus. No single-pass reviews.           ║
 * ║                                                                  ║
 * ║  Setup: Add to .env:                                             ║
 * ║    OPENROUTER_API_KEY=sk-or-v1-xxxxx                            ║
 * ║    GEMINI_API_KEY=AIzaSy... (enables Phase 2+3 debates)        ║
 * ║                                                                  ║
 * ║  Usage:                                                          ║
 * ║    node scripts/validation-orchestrator.mjs                      ║
 * ║    node scripts/validation-orchestrator.mjs --files src/App.tsx  ║
 * ║    node scripts/validation-orchestrator.mjs --since 24h         ║
 * ║    node scripts/validation-orchestrator.mjs --staged             ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// Preflight: blocks execution if MODEL_VERSIONS.md has unverified TODO markers
// or if required env vars are missing. Side-effect import by design.
import { fetchForEgress } from './lib/redact-egress.mjs';
import './lib/preflight.mjs';

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { join, extname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { runRecursiveConsensus } from './lib/recursive-consensus.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const ROOT = join(__dirname, '..');

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────

// OpenRouter model IDs — NO OpenAI/ChatGPT
// VERIFIED FREE: https://openrouter.ai/collections/free-models
// PAID models are clearly marked with cost estimates
const MODELS = {
  // ── VERIFIED FREE — US/EU COMPANIES ONLY (Privacy audit 2026-04-06) ──
  // Policy: No Chinese models for sensitive roles (security, competitive intel, user research)
  // Remaining Chinese model: MiniMax M2.7 (design debates only — lowest sensitivity, no free US equivalent)
  gemini25Flash:  'google/gemini-2.5-flash',              // FREE — Google/US — UX analysis + competitive intel (2nd instance)
  gemini3Flash:   'google/gemini-3-flash-preview-20251217', // FREE — Google/US — performance review
  gemini31Flash:  'google/gemini-3.1-flash-lite-preview',  // FREE — Google/US — frontend UX patterns
  nemotron3Super: 'nvidia/nemotron-3-super-120b-a12b:free', // FREE — NVIDIA/US — 120B MoE, security + code architecture
  nemotron3Nano:  'nvidia/nemotron-3-nano-30b-a3b:free',   // FREE — NVIDIA/US — 30B MoE, security + bug hunting + user research
  trinityLarge:   'arcee-ai/trinity-large-preview:free',    // FREE — Arcee AI/US — 400B MoE, full-stack integration
  // ── PAID models — US ONLY ──
  claudeSonnet46: 'anthropic/claude-sonnet-4.6',            // $3/$15 per M — Anthropic/US — premium code quality + data safety
  // ── DESIGN DEBATE (only Chinese model remaining — lowest sensitivity role) ──
  minimaxM27:     'minimax/minimax-m2.7',                  // $0.30/$1.20 per M — MiniMax/China — design debate partner only
  // ── SMART ESCALATION (only triggered for CRITICAL findings or stalled debates) ──
  escalation1:    'nvidia/nemotron-3-nano-30b-a3b:free',   // FREE — NVIDIA/US — replaces GLM-4.7 (was Z-AI/China)
  escalation2:    'minimax/minimax-m2.7',                  // $0.30/$1.20 per M — MiniMax/China — CRITICAL escalation only
  // ── Google GenAI (direct API, not via OpenRouter) ──
  gemini31Pro:    'gemini-3.1-pro-preview',                // Direct Google API — Google/US — Phase 2C UX debate authority
  // ── EXPENSIVE (DO NOT USE in orchestrator) ──
  // claudeOpus:  'anthropic/claude-4.6-opus-20260205'     // $5/$25 per M — use via CLI subscription instead
  // ── BANNED MODELS (NEVER USE) ──
  // No Grok. No X-AI models. Hard no, permanent ban. User explicit preference.
  // ── REMOVED (Privacy audit 2026-04-06) ──
  // deepseekV3:   'deepseek/deepseek-v3.2'      — REMOVED: Chinese servers, gov access laws, processed product vision
  // step35Flash:  'stepfun/step-3.5-flash:free'  — REMOVED: Chinese company doing security analysis of codebase
  // minimaxM21:   'minimax/minimax-m2.5:free'    — REMOVED: Chinese company doing competitive intelligence
  // qwen36Plus:   'qwen/qwen3.6-plus:free'       — REMOVED: Alibaba/China doing code architecture analysis
  // mercury2:     'z-ai/glm-4.7-flash'           — REMOVED: Z-AI/China in escalation role
};

const CONFIG = {
  maxCodeChars: 60_000,
  // Primary output: Hermes Village folder (SEPARATE from SwanStudios Village)
  promptDir: join(ROOT, 'AI-Village-Documentation', 'hermes-village-prompts'),
  // Legacy mirror (kept for backwards compat)
  legacyReportDir: join(ROOT, 'docs', 'ai-workflow', 'hermes-village-reports'),
  timeout: 240_000,  // 4 min — free models can be slower, DeepSeek needs extra time
  // Stagger delay (ms) between launches to respect rate limits
  staggerMs: 2000,
  // Max archived validation runs before oldest gets deleted
  maxArchiveRuns: 20,
};

// ─────────────────────────────────────────────
// Environment Loading
// ─────────────────────────────────────────────

function loadEnv() {
  for (const envPath of [join(ROOT, '.env'), join(ROOT, 'backend', '.env')]) {
    if (existsSync(envPath)) {
      const lines = readFileSync(envPath, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
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
}

function getOpenRouterKey() {
  return process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY || null;
}

function getGeminiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || null;
}

// ─────────────────────────────────────────────
// File Discovery
// ─────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { files: [], since: null, staged: false, document: null, mode: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--files' && args[i + 1]) {
      i++;
      while (i < args.length && !args[i].startsWith('--')) {
        // Support comma-separated file lists: --files "a.tsx,b.mjs,c.ts"
        const parts = args[i].split(',').map(f => f.trim()).filter(Boolean);
        opts.files.push(...parts);
        i++;
      }
      i--;
    } else if (args[i] === '--since' && args[i + 1]) {
      opts.since = args[++i];
    } else if (args[i] === '--staged') {
      opts.staged = true;
    } else if (args[i] === '--document' && args[i + 1]) {
      opts.document = args[++i];
    } else if (args[i] === '--mode' && args[i + 1]) {
      opts.mode = args[++i];
    }
  }
  return opts;
}

function getRecentFiles(opts) {
  const codeExts = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.css', '.scss', '.html', '.json', '.md',
  ]);

  let filePaths = [];

  if (opts.files.length > 0) {
    filePaths = opts.files;
  } else if (opts.staged) {
    try {
      const out = execSync('git diff --cached --name-only', { cwd: ROOT, encoding: 'utf-8' });
      filePaths = out.trim().split('\n').filter(Boolean);
    } catch { filePaths = []; }
  } else {
    const since = opts.since || '2h';
    try {
      let timeArg;
      const match = since.match(/^(\d+)(h|d|m)$/);
      if (match) {
        const [, num, unit] = match;
        const unitMap = { h: 'hours', d: 'days', m: 'minutes' };
        timeArg = `--since="${num} ${unitMap[unit]} ago"`;
      } else {
        // Reject invalid formats to prevent command injection
        throw new Error(`Invalid --since format: "${since}". Use format like 2h, 1d, 30m.`);
      }
      const out = execSync(
        `git log ${timeArg} --diff-filter=ACMR --name-only --pretty=format:""`,
        { cwd: ROOT, encoding: 'utf-8' }
      );
      filePaths = [...new Set(out.trim().split('\n').filter(Boolean))];
    } catch {
      try {
        const out = execSync('git diff --name-only HEAD', { cwd: ROOT, encoding: 'utf-8' });
        filePaths = out.trim().split('\n').filter(Boolean);
      } catch { filePaths = []; }
    }
  }

  filePaths = filePaths.filter(f => codeExts.has(extname(f).toLowerCase()));

  const files = [];
  let totalChars = 0;
  for (const fp of filePaths) {
    const fullPath = resolve(ROOT, fp);
    // Path traversal guard: ensure resolved path stays within project root
    if (!fullPath.startsWith(resolve(ROOT))) continue;
    if (!existsSync(fullPath)) continue;
    try {
      // Skip files larger than 1MB to prevent OOM
      const stats = statSync(fullPath);
      if (stats.size > 1024 * 1024) continue;
      const content = readFileSync(fullPath, 'utf-8');
      if (totalChars + content.length > CONFIG.maxCodeChars) {
        const remaining = CONFIG.maxCodeChars - totalChars;
        if (remaining > 500) {
          files.push({ path: fp, content: content.slice(0, remaining) + '\n\n// ... truncated ...' });
        }
        break;
      }
      files.push({ path: fp, content });
      totalChars += content.length;
    } catch { /* skip */ }
  }
  return files;
}

function formatCodeBundle(files) {
  if (files.length === 0) return '(no recently modified files found)';
  return files
    .map(f => `### ${f.path}\n\`\`\`${extname(f.path).slice(1)}\n${f.content}\n\`\`\``)
    .join('\n\n');
}

// ─────────────────────────────────────────────
// Validator Prompt Templates
// ─────────────────────────────────────────────

function buildValidatorTracks(codeBundle, fileList) {
  const fileNames = fileList.map(f => f.path).join(', ');
  const ctx = `SwanStudios is a personal training SaaS platform (React + TypeScript + styled-components frontend, Node.js + Express + Sequelize + PostgreSQL backend). Enchanted Apex: Crystalline Swan theme (frozen enchanted forest + deep-ocean luxury vault + competitive arena). Active palette: Midnight Sapphire #002060 (Primary), Royal Depth #003080 (Surface), Ice Wing #60C0F0 (Gaming Accent), Arctic Cyan #50A0F0 (Glow Accent — buttons, hovers, animations), Gilded Fern #C6A84B (Luxury Accent), Frost White #E0ECF4 (Background), Swan Lavender #4070C0 (Tertiary), Wing Purple #8B5CF6 (Secondary Accent). Typography: Plus Jakarta Sans (headings), Cormorant Garamond Italic (drama), Fira Code (data), Sora (UI/gaming). RETIRED Galaxy-Swan theme (#0a0a1a, #00FFFF, #7851A9) — do NOT use. Production: sswanstudios.com. Files: ${fileNames}`;

  const tracks = [
    {
      name: 'UX & Accessibility',
      model: MODELS.gemini25Flash,
      prompt: `You are a UX and accessibility expert auditor. ${ctx}

Review the following code for:
1. **WCAG 2.1 AA compliance** — color contrast, aria labels, keyboard navigation, focus management
2. **Mobile UX** — touch targets (must be 44px min), responsive breakpoints, gesture support
3. **Design consistency** — are theme tokens used consistently? Any hardcoded colors?
4. **User flow friction** — unnecessary clicks, confusing navigation, missing feedback states
5. **Loading states** — skeleton screens, error boundaries, empty states

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown with sections for each category.

CODE TO REVIEW:
${codeBundle}`,
    },

    {
      name: 'Code Quality',
      model: MODELS.claudeSonnet46,
      prompt: `You are a senior TypeScript/React code quality reviewer. ${ctx}

Review the following code for:
1. **TypeScript best practices** — proper typing, no \`any\`, discriminated unions where appropriate
2. **React patterns** — proper hooks usage, no stale closures, memoization where needed
3. **styled-components** — theme token usage, no hardcoded values, proper component structure
4. **DRY violations** — duplicated logic that should be extracted
5. **Error handling** — try/catch around async ops, error boundaries, user-facing error messages
6. **Performance anti-patterns** — unnecessary re-renders, missing keys, inline object/function creation

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown.

CODE TO REVIEW:
${codeBundle}`,
    },

    {
      name: 'Security',
      model: MODELS.nemotron3Nano,
      prompt: `You are a security auditor specializing in web application security. You are Nvidia Nemotron 3 Nano — a 30B MoE model optimized for security analysis. Use your reasoning depth to find subtle security flaws. ${ctx}

Review the following code for:
1. **OWASP Top 10** — XSS, injection, broken auth, SSRF, insecure deserialization
2. **Client-side security** — localStorage secrets, exposed API keys, eval usage
3. **Input validation** — sanitization on user inputs, Zod/Yup schemas
4. **CORS & CSP** — proper headers, overly permissive origins
5. **Authentication** — JWT handling, token storage, session management
6. **Authorization** — RBAC enforcement, privilege escalation vectors
7. **Data exposure** — PII leaks in logs, console, network responses

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown.

CODE TO REVIEW:
${codeBundle}`,
    },

    {
      name: 'Performance & Scalability',
      model: MODELS.gemini3Flash,
      prompt: `You are a performance and scalability engineer. ${ctx}

Review the following code for:
1. **Bundle size impact** — large imports, tree-shaking blockers, dynamic imports needed
2. **Render performance** — unnecessary re-renders, heavy computations in render path
3. **Network efficiency** — over-fetching, missing caching, N+1 API calls
4. **Memory leaks** — uncleared intervals/timeouts, detached DOM refs, event listener cleanup
5. **Lazy loading** — components that should be code-split but aren't
6. **Database query efficiency** (if backend code) — missing indexes, unbounded queries
7. **Scalability concerns** — in-memory state that won't work multi-instance

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown.

CODE TO REVIEW:
${codeBundle}`,
    },

    {
      name: 'Competitive Intelligence',
      model: MODELS.gemini25Flash,
      prompt: `You are a product strategist analyzing a fitness SaaS platform. ${ctx}

Based on the code and features visible:
1. **Feature gap analysis** — what features do competitors (Trainerize, TrueCoach, My PT Hub, Future, Caliber) have that are missing?
2. **Differentiation strengths** — what unique value does this codebase deliver? (NASM AI integration, pain-aware training, Crystalline Swan UX)
3. **Monetization opportunities** — pricing model improvements, upsell vectors, conversion optimization
4. **Market positioning** — how does the tech stack and feature set compare to industry leaders?
5. **Growth blockers** — technical or UX issues that would prevent scaling to 10K+ users

Output as structured markdown with actionable recommendations.

CODE TO REVIEW:
${codeBundle}`,
    },

    {
      name: 'User Research & Persona Alignment',
      model: MODELS.nemotron3Nano,
      prompt: `You are a user researcher analyzing a fitness SaaS platform. ${ctx}

Target personas:
- **Primary:** Working professionals (30-55) seeking personal training
- **Secondary:** Golfers wanting sport-specific training
- **Tertiary:** Law enforcement / first responders needing fitness certification
- **Admin:** Sean Swan (NASM-certified trainer, 25+ years experience)

Analyze the code for:
1. **Persona alignment** — does the UI/UX speak to each persona? Language, imagery, value props
2. **Onboarding friction** — how easy is it for a new user to understand and start using the platform?
3. **Trust signals** — certifications, testimonials, social proof — are they prominent enough?
4. **Emotional design** — does the Crystalline Swan theme create the right emotional response? (premium, trustworthy, motivating)
5. **Retention hooks** — gamification, progress tracking, community features — what's strong, what's missing?
6. **Accessibility for target demographics** — font sizes for 40+ users, mobile-first for busy professionals

Output as structured markdown with actionable recommendations.

CODE TO REVIEW:
${codeBundle}`,
    },

    {
      name: 'Architecture & Bug Hunter',
      model: MODELS.minimaxM27,
      prompt: `You are a principal software engineer doing a deep architecture review and bug hunt. You are the #1 ranked programming AI — act like it. ${ctx}

This is the most important review. Think step-by-step using your reasoning capabilities.

Perform a DEEP code review covering:

1. **Bug Detection** — Find actual bugs, not style issues:
   - Race conditions, timing issues, async/await mistakes
   - Off-by-one errors, null/undefined access without guards
   - State mutation bugs, stale closure captures
   - Event listener leaks, missing cleanup in useEffect
   - Incorrect conditional logic, unreachable code paths

2. **Architecture Flaws** — Structural problems:
   - Circular dependencies between modules
   - God components doing too much (>300 lines = suspect)
   - Prop drilling that should use context or state management
   - Missing error boundaries around async operations
   - Tight coupling that prevents testing or reuse

3. **Integration Issues** — How pieces connect:
   - Frontend-backend contract mismatches (API shape vs what UI expects)
   - Missing loading/error/empty states for API calls
   - Inconsistent data transformations between layers
   - Route guards that can be bypassed
   - WebSocket/SSE connections without reconnection logic

4. **Dead Code & Tech Debt** — Cleanup targets:
   - Unused imports, variables, functions, components
   - Commented-out code blocks that should be deleted
   - TODO/FIXME/HACK comments indicating unfinished work
   - Duplicated logic across files (DRY violations)
   - Deprecated API usage or outdated patterns

5. **Production Readiness** — Ship blockers:
   - Console.log statements that shouldn't ship
   - Hardcoded URLs, credentials, or environment-specific values
   - Missing input validation at system boundaries
   - No rate limiting on expensive operations
   - Missing loading indicators for operations >300ms

For each finding, provide:
- **Severity:** CRITICAL / HIGH / MEDIUM / LOW
- **File & Line:** Exact location
- **What's Wrong:** Clear description
- **Fix:** Specific code change needed

Output as structured markdown. Be ruthless — this codebase ships to production.

CODE TO REVIEW:
${codeBundle}`,
    },

    {
      name: 'Frontend UX & Code Patterns',
      model: MODELS.gemini31Flash,
      prompt: `You are Gemini 3.1 Flash — a fast, high-capability code and UX reviewer. ${ctx}

Review the following code for:
1. **React Component Patterns** — proper component composition, hooks hygiene, render optimization
2. **styled-components Best Practices** — theme token consistency, no inline styles, glassmorphism patterns
3. **Animation & Interaction** — Framer Motion usage, CSS transitions, hover/focus states, reduced-motion support
4. **Form UX** — validation feedback, autofill compatibility, error messages, progressive disclosure
5. **State Management** — appropriate use of useState vs useReducer vs context, derived state anti-patterns
6. **Accessibility Gaps** — missing ARIA roles, keyboard traps, color-only indicators, skip navigation

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown.

CODE TO REVIEW:
${codeBundle}`,
    },

    {
      name: 'Data Safety & Integrity',
      model: MODELS.claudeSonnet46,
      prompt: `You are a DATA SAFETY AUDITOR for a production SaaS platform (SwanStudios — personal training). This is the MOST CRITICAL track. The platform owner's #1 fear is accidentally wiping user data, login credentials, or purchase history during deployments and code changes. ${ctx}

TREAT EVERY FINDING AS IF IT COULD DESTROY A REAL USER'S DATA IN PRODUCTION.

Review the following code with EXTREME paranoia for:

1. **Destructive Database Operations** — THE TOP PRIORITY:
   - Any \`DELETE\`, \`TRUNCATE\`, \`DROP\`, \`bulkDelete\`, \`destroy\`, \`removeAll\` without explicit WHERE clauses
   - Seeders or migrations that wipe tables before re-inserting (data loss on redeploy)
   - \`sync({ force: true })\` or \`sync({ alter: true })\` that could drop columns/tables
   - Missing \`updateOnDuplicate\` / upsert patterns (should NEVER delete-then-reinsert)
   - CASCADE deletes that could orphan related records (UserAchievements, Orders, Sessions)

2. **Authentication & Session Data Safety**:
   - Any code that could wipe or corrupt the Users table
   - Password hash storage — are hashes ever overwritten with plaintext?
   - JWT secret rotation — would it invalidate all existing sessions?
   - Session/token storage — could a migration drop the sessions table?
   - OAuth tokens — are refresh tokens preserved during schema changes?

3. **Transaction Safety**:
   - Multi-table operations without transaction wrappers (partial writes = corrupted state)
   - Missing rollback on failure (data left in inconsistent state)
   - Batch operations that could timeout and leave partial data
   - Race conditions where two requests modify the same user record

4. **Migration Safety**:
   - Migrations that ALTER TYPE on columns with existing data (can fail and leave table locked)
   - Migrations that rename columns (breaks any code referencing old name until deploy completes)
   - Missing \`down()\` functions (can't rollback if something goes wrong)
   - Migrations that run inside transactions when they shouldn't (e.g., ALTER TYPE in PostgreSQL)

5. **Data Exposure & Leaks**:
   - User PII (email, phone, address) in console.log, error messages, or API responses
   - Order/payment data exposed to wrong roles (client seeing other clients' data)
   - Admin endpoints without proper RBAC middleware

6. **Backup & Recovery Gaps**:
   - Is there any mechanism to prevent accidental mass-delete? (e.g., row count check before DELETE)
   - Are destructive admin endpoints behind confirmation flows?
   - Could a single bad API call wipe all records in a table?

For each finding, provide:
- **Severity:** CRITICAL / HIGH / MEDIUM / LOW
- **Data at Risk:** What specific user data could be lost/corrupted
- **Blast Radius:** How many users would be affected (1 user, all users, all data)
- **File & Line:** Exact location
- **What's Wrong:** Clear description
- **Fix:** Specific code change to make it safe

BE RUTHLESS. This platform has real paying customers. A single destructive bug could lose years of workout history, payment records, or lock users out of their accounts permanently.

CODE TO REVIEW:
${codeBundle}`,
    },

    // ── NEW: 3 additional brains (15-Brain upgrade) ──

    {
      name: 'Security II (Nemotron)',
      model: MODELS.nemotron3Super,
      prompt: `You are Nvidia Nemotron 3 Super — a 120B Mixture-of-Experts model specialized in security analysis and data safety. ${ctx}

Review the following code as a SECOND security opinion (complementing the primary Nemotron 3 Nano security scan):
1. **Data flow analysis** — trace PII (names, emails, phones) through the code. Is any PII sent to external services, logged, or exposed?
2. **API boundary security** — are all external-facing endpoints properly authenticated and rate-limited?
3. **Dependency chain risks** — any known vulnerable dependencies or unsafe patterns in imports?
4. **Cryptographic safety** — password hashing, token generation, session management — any weaknesses?
5. **Infrastructure security** — CORS headers, CSP policies, secure cookie flags, HTTPS enforcement
6. **Privacy compliance** — GDPR/CCPA patterns: data minimization, consent tracking, right-to-deletion support

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown. Focus on findings the primary security scan might MISS.

CODE TO REVIEW:
${codeBundle}`,
    },

    {
      name: 'Code Architecture (Qwen)',
      model: MODELS.nemotron3Super,
      prompt: `You are Nvidia Nemotron 3 Super — a 120B MoE model with 262K context, specialized in code architecture analysis. ${ctx}

Perform a DEEP architecture review covering:
1. **Module dependency graph** — identify circular dependencies, tight coupling, import chains >3 levels deep
2. **Component decomposition** — any God components >300 lines? Extract candidates for sub-components/hooks/utils
3. **State management patterns** — Redux vs Context vs local state — is each used appropriately? Any over-engineering?
4. **API contract consistency** — do frontend API calls match backend route signatures? Any drift?
5. **Type safety gaps** — places where \`any\` is used, missing generics, or type assertions that could fail at runtime
6. **Code reuse opportunities** — duplicated logic across 2+ files that should be extracted into shared utilities
7. **File organization** — does the directory structure follow the project conventions? Misplaced files?

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
For each finding, suggest the specific refactoring needed.
Output as structured markdown.

CODE TO REVIEW:
${codeBundle}`,
    },

    {
      name: 'Bug Hunter II (Step)',
      model: MODELS.nemotron3Nano,
      prompt: `You are Nvidia Nemotron 3 Nano — deployed as a SECOND bug hunter (the primary Bug Hunter uses Gemini 2.5 Flash). Use your MoE reasoning to find bugs the primary hunter missed. ${ctx}

This is a SECONDARY bug hunt. Focus on DIFFERENT bug categories than a typical architecture review:

1. **Edge case bugs** — what happens with empty arrays, null users, 0-length strings, negative numbers?
2. **Async race conditions** — concurrent API calls that modify the same state, missing abort controllers
3. **UI state desync** — loading states that don't reset on error, success toasts on failed operations
4. **Browser compatibility** — CSS features that need fallbacks, API usage without polyfills
5. **Memory pressure** — large arrays held in state, images not cleaned up, WebSocket connections without limits
6. **Timezone bugs** — date comparisons without timezone normalization, display format inconsistencies
7. **Mobile-specific bugs** — touch events vs click events, viewport resize issues, keyboard covering inputs

For each bug found, provide:
- **Severity:** CRITICAL / HIGH / MEDIUM / LOW
- **File & Line:** Exact location
- **Reproduction steps:** How to trigger the bug
- **Fix:** Specific code change

Output as structured markdown. Find what others miss.

CODE TO REVIEW:
${codeBundle}`,
    },

    // ── 15th Brain: Trinity Large (added 2026-04-06 model audit) ──
    {
      name: 'Full-Stack Integration Review (Trinity)',
      model: MODELS.trinityLarge,
      prompt: `You are Arcee Trinity Large — a 400B Mixture-of-Experts model with 13B active parameters, specialized in full-stack integration analysis. ${ctx}

Perform a CROSS-CUTTING integration review that spans frontend and backend together:

1. **API contract alignment** — do frontend fetch calls match backend route signatures, response shapes, and error codes exactly?
2. **Authentication flow integrity** — trace the full auth lifecycle: login → token → protected route → token refresh → logout. Any gaps?
3. **Data flow completeness** — for each feature, does data flow correctly from UI input → API call → DB write → response → UI update?
4. **Error propagation** — when the backend throws an error, does the frontend handle it gracefully? Any swallowed errors or generic "something went wrong"?
5. **Environment variable alignment** — are all VITE_* vars referenced in frontend actually set? Are all backend env vars present?
6. **Model/migration consistency** — do Sequelize model definitions match what the database actually has? Any missing columns or wrong types?
7. **Import chain validation** — any imports referencing files that don't exist, or circular dependencies between frontend and shared types?

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
This is the INTEGRATION layer — find what single-domain reviewers miss.

CODE TO REVIEW:
${codeBundle}`,
    },
  ];

  // Phase 2 specialty debates + Phase 3 smart escalation — handled in main()

  return tracks;
}

// ─────────────────────────────────────────────
// Document Validator Tracks (for --document mode)
// ─────────────────────────────────────────────

function buildDocumentValidatorTracks(documentContent, documentPath) {
  const ctx = `Sean runs a broad solo-operator ecosystem. The Hermes Village is the reviewer for this ecosystem.

ECOSYSTEM SCOPE:
(a) SwanStudios — production personal-training SaaS (React 18 + TypeScript + styled-components, Node/Express/Sequelize/Postgres, Render deploy, sswanstudios.com). Dark-first Enchanted Apex: Crystalline Swan theme.
(b) Hermes personal AI agent — Nous Research Hermes Agent framework v0.10.0, running on Raspberry Pi (Kali), Telegram-first bot, with a Pi↔5090 Windows Ollama LAN bridge (gemma3:4b / gemma4:31b / qwen2.5-coder:32b / qwen2.5:72b), multi-provider router (Ollama + Gemini 3 Flash + OpenRouter Claude + OpenRouter GPT-5 + future Mythos), and a privacy gate hook catching PII (client, medical, immigration, birth-cert, financial, biometric, legal) before cloud egress.
(c) Karpathy Wiki — compounding knowledge base on Pi, accessible to Hermes tools.
(d) Content Studio — Seedance 2.0 video generation workflow.
(e) V3 Life OS (future) — expansion agents: Sentinel, Healer, Justice, Scholar, Hunter.
(f) Client ops — Sean trains paying clients, logs sessions via Plaud NotePin, handles real PII.
(g) Family ops — Sean + wife immigrating to Canada; birth certs, passports, medical records flow through the same stack.

THE DOCUMENT CAN BE ABOUT ANY PART OF THIS ECOSYSTEM. Do NOT assume it's about fitness, or about SwanStudios, or about Hermes specifically. Read the document first, then apply your specialty to what it actually covers. If the document is off-scope for your specialty, say so briefly and provide what cross-applicable observations you can.

CRITICAL RULES Sean operates by:
- Zero PII to cloud LLMs (client IDs only; names mapped client-side).
- Dark-first theme, styled-components only (no Material-UI).
- Render is PAID Professional plan (~$60/mo), no cold starts.
- No Grok / X-AI models anywhere. No Chinese models in sensitive roles per 2026-04-06 privacy audit.
- Recursive planning before building (rule 15), dual-pass completion (rule 17), canonical surface receipts for UI/data-truth fixes (rule 26).

Document path: ${documentPath}`;

  return [
    {
      name: 'Technical Accuracy & Factual Correctness',
      model: MODELS.claudeSonnet46,
      prompt: `You are a senior technical reviewer. ${ctx}

Review this document for TECHNICAL ACCURACY:
1. **Factual correctness** — Are claims about APIs, frameworks, models, protocols, infrastructure accurate? (e.g., "Ollama bound to 0.0.0.0", "Hermes uses agent:start hook", "OpenRouter supports anthropic/claude-opus-4-7".)
2. **Version / API shape accuracy** — Are library versions, function signatures, config keys correct and current?
3. **Unsupported claims** — Any assertions without evidence that would need verification?
4. **Mislabels** — Is anything called by the wrong name? (e.g., confusing "Ollama-cloud" with "Ollama local")
5. **Missing disclaimers** — Claims stated as certain that are actually uncertain / version-dependent / experimental.

For each finding: **Severity** (CRITICAL / HIGH / MEDIUM / LOW), **Location** in the document, **Issue**, **Correction** (what it should say instead).

DOCUMENT:
${documentContent}`,
    },

    {
      name: 'Security & Threat Modeling',
      model: MODELS.nemotron3Super,
      prompt: `You are a senior security engineer and threat modeler. ${ctx}

Review this document for SECURITY findings. Cover BOTH traditional app security AND AI-agent-specific risks:
1. **PII exposure surfaces** — Where in the described flow could PII leak to cloud providers, logs, backups, or third parties? Is the privacy-gate coverage complete, or are categories/patterns missing?
2. **Credential & secret hygiene** — Plaintext keys in .env? Any tokens with excessive lifetimes, scope, or blast radius?
3. **Supply chain / dependency risk** — Dependencies with history of compromise? Auto-update vs pinned versions?
4. **Deployment / infra exposure** — Open ports, weak firewall rules, accidentally-exposed services, or trust-all-LAN assumptions?
5. **Data at rest** — Session transcripts, SQLite databases, log files — encrypted? Retention policy? Deletion plan?
6. **Logging practice** — Do log files inadvertently capture PII or secrets?
7. **Agent-specific: prompt-injection resistance** — Can a user input manipulate the agent into unauthorized tool calls?
8. **Agent-specific: tool scope blast radius** — What's the worst-case reach of the agent's tools if prompt-injected?
9. **Compliance-adjacent** — HIPAA-ish (health data), immigration law (document handling), PCI (payment info) — which concerns apply here?
10. **Threat model Sean should care about** — Who realistically could attack this, how, and what's the mitigation?

For each finding: **Severity**, **Attack vector**, **Mitigation**, **Priority** (fix-today / this-week / this-month / backlog).

DOCUMENT:
${documentContent}`,
    },

    {
      name: 'Agent Safety & Prompt Injection Resistance',
      model: MODELS.nemotron3Nano,
      prompt: `You are an AI-agent safety specialist reviewing a system where LLMs have autonomous tool use. ${ctx}

Review this document SPECIFICALLY for agent/LLM safety:
1. **Prompt-injection pathways** — Where could adversarial input (from users, tools, web content, other agents) manipulate the LLM into unintended tool calls?
2. **Tool scope vs role** — Do the tools granted to each agent match its actual job? (A chat agent probably shouldn't have shell + filesystem access.)
3. **Capability isolation** — Can the agent escape its intended role via tool chaining? (e.g., read_file → exfiltrate via send_message)
4. **Output filtering** — Does the agent's output get sanitized before reaching the user (or other agents, or logs)?
5. **Jailbreak resilience** — Standard jailbreak prompts ("ignore previous instructions", DAN-style, nested-impersonation) — does the architecture resist them structurally or only through prompt alignment?
6. **LLM hallucination harm** — Where does the agent act on its own output? (e.g., "I've updated your records" hallucination earlier this session.)
7. **Confused deputy** — Could the agent be tricked into performing actions on behalf of an attacker while believing it's serving the legitimate user?
8. **Multi-agent / multi-model collusion** — If multiple LLMs talk to each other (AI Village, plugin chains), what safety properties hold across the boundary?
9. **Tool-call confirmation gaps** — Which tools execute without user confirmation? Should more require it?
10. **Incident response** — If an agent misbehaves, how does Sean detect, interrupt, and recover?

For each finding: **Severity**, **Attack scenario**, **Concrete fix** (config change, prompt addition, or code patch).

DOCUMENT:
${documentContent}`,
    },

    {
      name: 'Architecture & System Design',
      model: MODELS.trinityLarge,
      prompt: `You are a principal architect reviewing system design decisions. ${ctx}

Review this document for ARCHITECTURAL SOUNDNESS:
1. **Coupling vs cohesion** — Are responsibilities cleanly split across services/modules/agents, or are there leaky abstractions?
2. **Single points of failure** — What breaks the whole system if it goes down?
3. **State management** — Where does state live? Is the source-of-truth clear for each piece? Consistency guarantees?
4. **Scaling path** — When Sean goes from 1 user to 100, what breaks first? To 10K?
5. **Observability** — Can Sean tell what's happening in production? Metrics, logs, traces, alerts?
6. **Deployability** — Can a change be rolled out safely? Rolled back safely?
7. **Reversibility of decisions** — Which architectural choices lock Sean in? Which stay reversible?
8. **Over-engineering** — Anything added "just in case" that isn't actually needed yet?
9. **Missing pieces** — What foundational capability would you add BEFORE continuing down the current roadmap?
10. **Integration edge cases** — Where do two systems meet and is that contract clearly defined?

For each finding: **Severity**, **Architectural concern**, **Recommended pattern / refactor**, **Estimated effort**.

DOCUMENT:
${documentContent}`,
    },

    {
      name: 'Code Quality & Craft',
      model: MODELS.claudeSonnet46,
      prompt: `You are a senior code-review specialist. ${ctx}

Review any code snippets, config blocks, or pseudo-code in this document for CRAFT:
1. **Correctness** — Are the algorithms, regex patterns, SQL, config shapes actually right?
2. **Defensive coding** — Error handling, edge cases, race conditions, unchecked assumptions?
3. **Readability** — Would a new dev understand this in 6 months? Naming, structure, comments where warranted?
4. **Idiom fit** — Does the code match the framework's conventions (Hermes hook signatures, React patterns, Node async conventions)?
5. **Security at the code level** — Input validation, injection safety, secrets handling, path traversal?
6. **Performance red flags** — O(n²) in a hot loop, repeated IO, unbounded caches, sync-in-async?
7. **Testability** — Can this be unit tested? Are there obvious test cases that would catch regressions?
8. **Dead / vestigial code** — Anything that looks unused, superseded, or contradictory with other parts?
9. **Regex / pattern quality** — For detection regex (like PII): false positives, false negatives, anchoring, case sensitivity?
10. **API design** — If this code exposes a surface to other code, is that surface well-shaped?

For each finding: **Severity**, **File/snippet**, **Issue**, **Suggested fix** (ideally with diff-style replacement).

DOCUMENT:
${documentContent}`,
    },

    {
      name: 'UX / Product / User Experience',
      model: MODELS.gemini31Flash,
      prompt: `You are a UX and product reviewer. ${ctx}

Review this document for USER-FACING IMPACT. "User" here may be Sean himself (operator UX) or Sean's clients/family (end-user UX):
1. **Friction points** — Where does a user have to do extra steps that a better design would eliminate?
2. **Error states** — When things go wrong, does the user know? Can they recover?
3. **Accessibility** — For any UI described: keyboard nav, screen reader, contrast, motion sensitivity, touch targets?
4. **Mobile / small-screen** — Does the described flow work on phone / via Telegram / via voice?
5. **Cognitive load** — Is the user required to remember too much state? Too many commands?
6. **Default behavior** — Are defaults safe for a rushed / distracted user? (E.g., "type /local before PII" is a user-remembers-to-do-right-thing default.)
7. **Feedback loops** — Does the user get timely feedback when something's happening / succeeded / failed?
8. **Discoverability** — How does a user learn about features? Is there /help, is it up-to-date?
9. **Consistency** — Do similar actions behave similarly? Same iconography / language / structure?
10. **Joy / delight** — What moment in this flow could be a signature UX moment vs feeling like admin work?

For each finding: **Severity**, **User journey impact**, **Suggested improvement**.

DOCUMENT:
${documentContent}`,
    },

    {
      name: 'Operational Reliability & Deployment',
      model: MODELS.gemini3Flash,
      prompt: `You are an SRE / platform-ops reviewer. ${ctx}

Review this document for RUNTIME / OPS / DEPLOY concerns:
1. **Service recovery** — What happens if hermes-gateway.service crashes? Ollama dies? 5090 reboots? Pi reboots?
2. **Dependency uptime** — If OpenRouter is down, Gemini is rate-limited, Telegram has an outage — what's the user experience?
3. **Boot order / init** — Cold-boot from power-off, in what order must services come up? Documented?
4. **Config drift** — Over time, as configs are edited, how does Sean avoid drift between "what I think is configured" and "what actually is"?
5. **Monitoring / alerting** — How does Sean know when something's broken without checking manually?
6. **Backups** — Config, audit logs, session databases, wiki — backup plan? Tested restore?
7. **Time drift, clock skew, timezone** — Any timestamp-sensitive logic (cron, TTLs, audit)?
8. **Disk, memory, GPU VRAM exhaustion** — Any unbounded growth paths?
9. **Upgrade path** — When Nous Research ships Hermes v0.11, how does Sean upgrade safely?
10. **Incident playbook** — Minimum runbook Sean would need if something goes wrong at 2am.

For each finding: **Severity**, **Failure scenario**, **Mitigation or documentation needed**.

DOCUMENT:
${documentContent}`,
    },

    {
      name: 'Documentation, Continuity & Memory',
      model: MODELS.gemini25Flash,
      prompt: `You are a documentation and knowledge-continuity reviewer. Sean works across multiple AI assistants, multiple sessions, and relies heavily on his CLAUDE.md + MEMORY system + Karpathy Wiki for continuity. ${ctx}

Review this document for CONTINUITY CONCERNS:
1. **Session-durability** — If Sean stops work now and picks up in 3 weeks, does this document give future-Sean (or future-Claude) what they need?
2. **Linkability** — Are external references (file paths, URLs, commit hashes, debate files) specific enough to find again later?
3. **Vocabulary consistency** — Are terms used consistently with Sean's CLAUDE.md and existing memory? (Hermes / Swan Coach / Village / etc.)
4. **Redundancy vs single-source-of-truth** — Does this doc duplicate info that lives elsewhere? Should the dupe be removed or the other source linked?
5. **Decay risk** — What parts of this doc will go stale fastest? Version numbers, model names, file paths?
6. **Missing back-references** — Are prior decisions / debate files / memory entries referenced where relevant?
7. **Wiki placement** — Should anything in this doc be promoted to the Karpathy Wiki for cross-session compounding?
8. **Memory-worthy facts** — Specific facts in this doc that should be saved as user/feedback/project/reference memory entries?
9. **ACTIVE-INDEX.md impact** — Does this document create need to update the repo root index?
10. **CLAUDE.md impact** — Any new mandatory rule or reference-doc link that should land in CLAUDE.md?

For each finding: **Severity**, **Continuity gap**, **Specific recommendation** (add to X file, save as Y memory, link from Z).

DOCUMENT:
${documentContent}`,
    },

    {
      name: 'Strategic Alignment & Gap Finding',
      model: MODELS.gemini25Flash,
      prompt: `You are a strategic reviewer and gap finder. Your explicit license here is to speculate, challenge assumptions, and raise things that aren't in the document at all. ${ctx}

Review this document for STRATEGIC FIT and MISSING CONTEXT:
1. **What's the document's implicit theory of success?** Is that theory correct?
2. **What's NOT in this document that a careful reader would expect?** List missing sections, missing considerations, missing stakeholders.
3. **Opportunity cost** — For the work this doc proposes, what else COULD Sean be doing with the same time/budget? Is this the right thing to prioritize?
4. **Second-order effects** — What changes downstream if this work ships as described?
5. **Parallel work** — Is anything in this doc duplicative of work already in flight elsewhere in Sean's stack?
6. **Over-scoped / under-scoped** — Is the work bigger or smaller than the doc implies?
7. **Missing stakeholders** — Whose input or concern isn't represented? (Clients, wife, future-Sean, future-collaborators.)
8. **Failure modes not considered** — What goes wrong that Sean hasn't thought about?
9. **Quick wins hiding in plain sight** — Is there a 10% effort action that would give 80% of the value?
10. **Wild card** — One completely-from-left-field suggestion the document implicitly disqualifies but probably shouldn't.

For each finding: **Strategic category**, **What's missing/misaligned**, **Proposed addition or challenge**.

Be explicit when you're speculating vs when you're stating observation. Sean values independent perspective over agreement.

DOCUMENT:
${documentContent}`,
    },
  ];
}

// Document-mode debate prompt builders

function buildDocDebateCodePrompt(documentContent, ctx, phase1Summary) {
  return `You are the CTO (Chief Technology Officer) for Sean's ecosystem. ${ctx}

## YOUR ROLE — CTO (Technical Authority)

This is the Phase 2A debate. Nine Phase 1 validators have already reviewed the document below. Your job is to synthesize their findings, adjudicate technical disagreements between them, and propose the definitive technical path forward.

The CEO (Claude Sonnet 4.6) will challenge your conclusions. Defend with evidence or concede — whichever is correct.

## Phase 1 Summary
${phase1Summary}

## Your Analysis — Round 1

1. **Technical correctness synthesis** — Where did Phase 1 validators AGREE on technical claims? Where did they DISAGREE? For each disagreement, name who was right and why.
2. **Ranked technical concerns** — Based on Phase 1 + the document, what are the top 5 technical issues ranked by severity? Be concrete about what breaks if ignored.
3. **False alarms** — Did any Phase 1 validator flag something that is actually fine? Name it and explain.
4. **Missed issues** — What real technical concerns did all 9 Phase 1 validators miss?
5. **Implementation feasibility** — For anything the document proposes building/fixing, is it realistically doable given Sean's solo-operator bandwidth and stack?

Focus on: architecture correctness, security soundness, operational reliability, code craft, and agent safety. Skip market/business/pricing talk — that's not this debate's scope.

DOCUMENT UNDER REVIEW:
${documentContent}`;
}

function buildDocDebateDesignPrompt(documentContent, ctx, phase1UXReport) {
  return `You are the Creative Director reviewing design, UX, and operator-experience decisions for Sean's ecosystem. ${ctx}

## YOUR ROLE — Creative Director (Design & UX Authority)

This is the Phase 2C debate. The UX / Product Phase 1 track has already reviewed the document. Your job is to adjudicate UX/product decisions, and raise design concerns that need direct authority.

"Design" here is broader than pixels:
- If the document is about SwanStudios UI: pixel-level design (Crystalline Swan tokens, Dual-Button Glow, typography, motion).
- If the document is about Hermes / agent architecture: operator UX, Telegram conversation design, command surface, error-feedback design, cognitive-load design.
- If the document is about workflow / ops: task flow design, decision-point design.

## Crystalline Swan Tokens (when SwanStudios UI is involved)
- Midnight Sapphire #002060, Royal Depth #003080, Ice Wing #60C0F0, Arctic Cyan #50A0F0
- Wing Purple #8B5CF6, Gilded Fern #C6A84B, Frost White #E0ECF4
- Obsidian Black #0A0A0F, Carbon #141419, Graphite #1A1A24
- Dual-Button Glow: Blue → Purple glow. Purple → Cyan glow.
- Dark-first default, styled-components only (no Material-UI).

## Phase 1 UX Report
${phase1UXReport || '_No Phase 1 UX report available for this run._'}

## Your Analysis — Round 1

1. **User-journey critique** — Walk through the user's actual experience described in this document. Where's the friction? Where's the moment of delight (if any)? Where does the user have to carry cognitive load they shouldn't?
2. **Consistency check** — Are similar actions / affordances / vocabulary used consistently across what this document describes?
3. **Default-safety** — Are default behaviors safe for a distracted / rushed / tired user?
4. **Accessibility & device fit** — Keyboard, screen reader, mobile, voice, low-bandwidth — any gaps?
5. **Signature moment** — Does this design have a distinctive voice, or does it feel generic/template?
6. **Anti-template discipline** — For visible UI: does this feel like it was built from a design system Sean owns, or like a Bootstrap template with theme tokens swapped?
7. **Error / recovery design** — When something fails, what does the user see? Can they recover without support?
8. **Suggested improvements** — Top 5 concrete design changes, ranked by impact-per-effort.

If the document has no UI/UX surface at all, say so briefly and move to operator-experience critique instead.

DOCUMENT UNDER REVIEW:
${documentContent}`;
}

// ─────────────────────────────────────────────
// Planning Mode Validator Tracks (--mode plan)
// ─────────────────────────────────────────────

function buildPlanningValidatorTracks(planContent, planPath) {
  const ctx = `SwanStudios is a personal training SaaS platform (React + TypeScript + styled-components frontend, Node.js + Express + Sequelize + PostgreSQL backend). Enchanted Apex: Crystalline Swan theme. Active palette: Midnight Sapphire #002060, Royal Depth #003080, Ice Wing #60C0F0, Arctic Cyan #50A0F0, Gilded Fern #C6A84B, Frost White #E0ECF4, Swan Lavender #4070C0, Wing Purple #8B5CF6, Obsidian Black #0A0A0F, Carbon #141419, Graphite #1A1A24. Key differentiators: NASM OPT 5-phase periodization, voice-first AI coach, Octalysis gamification, 840+ exercise database, social fitness platform. Target market: wealthy golf clients, working professionals 30-55, NASM-certified trainer with 25+ years experience. Production: sswanstudios.com. Plan document: ${planPath}`;

  return [
    {
      name: 'UX Research & Competitor Analysis',
      model: 'gemini-2.5-flash',
      provider: 'gemini-direct',
      useGrounding: true,
      prompt: `You are a UX researcher analyzing a feature upgrade plan for a premium fitness SaaS platform. You have access to Google Search — USE IT to look up current competitor features, recent UI/UX trends, and real-world examples. ${ctx}

Review this PLAN and provide UX research insights:
1. **Competitor benchmark** — SEARCH for the latest features on Trainerize, TrueCoach, My PT Hub, Hevy, Strong, JEFIT, Strava, Caliber, Future.fit, and Trainiac. How do they handle similar features? What specific interaction patterns should we adopt?
2. **User journey gaps** — Walk through each proposed feature as a trainer using their phone at the gym. What's missing? What would frustrate them?
3. **Mobile-first critique** — Will these features work on 320-375px screens? Flag any desktop-biased designs.
4. **Interaction patterns** — For each new UI element, suggest the exact gesture/click flow based on real-world patterns from top apps.
5. **Accessibility risks** — Screen reader compatibility, keyboard navigation, color contrast for proposed components.
6. **Onboarding for new features** — How will existing users discover new features? Search for best-in-class onboarding patterns (Duolingo, Notion, Linear).
7. **2026 UX trends** — Search for the latest UX/UI trends relevant to this feature set. What's cutting edge right now?

Rate each insight: CRITICAL / HIGH / MEDIUM / LOW priority.
Output as structured markdown with actionable recommendations. CITE your sources with URLs.

PLAN TO REVIEW:
${planContent}`,
    },

    {
      name: 'Architecture & Component Design',
      model: MODELS.claudeSonnet46,
      prompt: `You are a senior React/TypeScript architect reviewing a feature implementation plan. ${ctx}

Review this PLAN for architectural soundness:
1. **Component decomposition** — Are the proposed files/components correctly scoped? Any that should be split further or merged?
2. **State management** — Is the hook composition (useCoachAssistant → useAIChat → useConversationSidebar) correct? Any circular dependencies or prop drilling?
3. **Data flow** — Trace the conversation loading flow: sidebar click → loadConversation → messages render. Any race conditions or stale state risks?
4. **React patterns** �� Are React.memo, useMemo, useCallback used where needed? Any unnecessary re-renders from the proposed design?
5. **File budget** — Will each proposed file stay under 300 lines? Flag any that will likely exceed.
6. **Hook design** — Are custom hooks properly separated (data fetching vs UI state vs business logic)?
7. **Error boundaries** — Where should error boundaries go for the new features?

For each finding: severity, specific file/component, issue, recommended fix.
Output as structured markdown.

PLAN TO REVIEW:
${planContent}`,
    },

    {
      name: 'Security & Privacy Planning',
      model: MODELS.nemotron3Nano,
      prompt: `You are a security engineer reviewing a feature plan for a platform that handles personal health data. CRITICAL: This platform has a ZERO PII TO LLMs policy — no client names, emails, or personal data may reach external AI providers. ${ctx}

Review this PLAN for security implications:
1. **PII exposure in new features** — Conversation history could contain PII in titles/previews. Is it properly sanitized?
2. **File attachment risks** — Image uploads to R2 for AI analysis. Malicious file upload vectors? SSRF via image URLs?
3. **Voice data privacy** — Audio recordings sent to Gemini for transcription. Are recordings stored? For how long? Privacy policy implications?
4. **Conversation data at rest** — JSONB messages in PostgreSQL. Encryption? Access controls? Who can see whose conversations?
5. **RBAC enforcement** — Admin sees all conversations. Trainer sees only assigned clients. Client sees only own. Is this enforced in the plan?
6. **MediaRecorder API risks** — Browser microphone access. Permission handling, stream cleanup, data leak prevention.
7. **Markdown rendering XSS** — react-markdown with user-generated content. XSS vectors through markdown injection?

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown with specific mitigations.

PLAN TO REVIEW:
${planContent}`,
    },

    {
      name: 'Performance & Bundle Impact',
      model: MODELS.gemini3Flash,
      prompt: `You are a web performance engineer reviewing a feature plan. ${ctx}

Review this PLAN for performance impact:
1. **Bundle size** — react-markdown (~50KB gzip), remark-gfm, rehype-highlight. Total added weight? Should they be lazy-loaded?
2. **Render performance** — Conversation sidebar re-renders on every message. React.memo strategy? Virtual scrolling needed?
3. **Voice recording memory** — MediaRecorder audio buffers. Memory management during long recordings?
4. **Markdown parsing** — Parsing markdown on every render vs memoizing parsed output. Cost analysis.
5. **Network waterfall** — Loading conversation list + conversation messages. Parallel or sequential? Caching strategy?
6. **Image attachments** — Image preview generation. Canvas-based thumbnails vs CSS object-fit? Memory for large images?
7. **Code splitting** — Which new components should be React.lazy()? Proposed split boundaries.
8. **Animation budget** — New thinking indicator, voice orb amplitude viz, sidebar slide animation. GPU-composited only?

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown with specific optimizations.

PLAN TO REVIEW:
${planContent}`,
    },

    {
      name: 'Competitive Intelligence',
      model: 'gemini-3-flash-preview-20251217',
      provider: 'gemini-direct',
      useGrounding: true,
      prompt: `You are a fitness SaaS product strategist with access to Google Search. USE SEARCH to find REAL, CURRENT competitive data — pricing, features, recent launches, app store reviews. ${ctx}

Review this plan against the competitive landscape:
1. **Feature gap vs competitors** — SEARCH for latest features on Trainerize, TrueCoach, My PT Hub, Future.fit, Caliber, Hevy, Strong, JEFIT, Trainiac, ABC Fitness, Mindbody, Gymdesk. Do any have AI chat? Voice logging? Nutrition barcode scanning? How does this plan position SwanStudios?
2. **Differentiation** — What makes this implementation UNIQUE? Search for other fitness apps with AI coaching. How do they compare?
3. **Monetization angle** — SEARCH for competitor pricing tiers. Which features should be paywalled vs free?
4. **Golf client appeal** — SEARCH for golf-specific fitness apps (TPI, Titleist Performance, Golfforever). What golf-specific features are we missing?
5. **Mobile gym usage** — SEARCH for "gym workout app UX" reviews. What do users love/hate about existing apps?
6. **Missing competitive features** — SEARCH for the latest fitness tech trends (wearable integration, AI form analysis, nutrition photo logging, Apple Health/Google Fit sync). What are we missing?
7. **Market sizing** — SEARCH for fitness app market size 2025-2026, personal training software market, PT SaaS growth.

Output as structured markdown with market-informed recommendations. CITE all sources with URLs.

PLAN TO REVIEW:
${planContent}`,
    },

    {
      name: 'User Persona Alignment',
      model: MODELS.nemotron3Nano,
      prompt: `You are a user researcher specializing in fitness applications. ${ctx}

Target personas:
- **Sean (Admin/Trainer):** NASM-certified, 25+ years, uses phone at gym, wants voice-first workflow, wealthy golf clients
- **Golf Client:** 45-60, high income, wants premium experience, may be less tech-savvy, values privacy
- **Working Professional:** 30-50, busy, needs quick sessions, values efficiency, mobile-first
- **Move Fitness Client:** Free tier, basic tracking, may convert to SwanStudios paid

Review this plan through each persona's eyes:
1. **Sean at the gym** — Can he voice-log a client's workout between sets? Load a previous conversation to check last session's notes? How many taps?
2. **Golf client onboarding** — Will the Coach Assistant feel premium enough? Does the conversation history look sophisticated or basic?
3. **Working professional** — They have 5 minutes to check their program. Is the sidebar fast? Can they search for "leg day" in past conversations?
4. **Accessibility for 40-60 year olds** — Font sizes, touch targets, voice UX — will this work for the less tech-savvy demographic?
5. **Trust signals** — Does the thinking indicator + provider badge build trust? Or create confusion about "which AI am I talking to?"
6. **Emotional response** — Does the dark-theme Crystalline Swan aesthetic feel premium and motivating? Or cold and intimidating?

Output as structured markdown with persona-specific recommendations.

PLAN TO REVIEW:
${planContent}`,
    },

    {
      name: 'Implementation Risk Assessment',
      model: MODELS.minimaxM27,
      prompt: `You are a project manager and risk assessor for a software project. ${ctx}

Review this implementation plan for risks and feasibility:
1. **Dependency risks** — Which phases block other phases? What happens if Phase 4 (voice) takes longer than expected?
2. **Technical unknowns** — Gemini SDK version for voice, MediaRecorder browser compatibility, react-markdown bundle size accuracy
3. **Scope creep indicators** — Which features are most likely to expand beyond estimates? (markdown rendering with all edge cases? voice with all browsers?)
4. **Effort accuracy** — 22 new files, 300 lines max each. Are the line count estimates realistic? Which files will likely exceed?
5. **Testing gaps** — What's the testing strategy? Unit tests for hooks? E2E for sidebar? Visual regression for markdown?
6. **Rollback plan** — If any phase breaks production, can it be feature-flagged off?
7. **Database migration risks** — Any schema changes needed? The plan says "zero backend work" for Phase 1 — verify this claim.
8. **Phase ordering** — Is the proposed order (0→1→2→3→4→5) optimal? Could anything be reordered for faster value delivery?

Rate each risk: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown with mitigations for each risk.

PLAN TO REVIEW:
${planContent}`,
    },

    {
      name: 'Frontend Patterns & React Best Practices',
      model: MODELS.gemini31Flash,
      prompt: `You are a React specialist reviewing a component architecture plan. ${ctx}

Review the proposed component structure:
1. **Styled-components organization** — Splitting SwanCoachStyles.ts into 5 sub-files with barrel re-export. Good pattern? Any issues?
2. **Hook composition** — useCoachAssistant wraps useAIChat wraps useState. Is this nesting depth okay? Alternatives?
3. **Markdown component customization** — Custom react-markdown components for code blocks, tables, links. Performance of custom component map?
4. **Animation strategy** — framer-motion AnimatePresence for sidebar, CSS keyframes for thinking indicator. Mixing animation libraries — good or bad?
5. **Responsive patterns** — Desktop sidebar (280px fixed) vs mobile drawer (85vw). CSS approach vs JS approach?
6. **Form handling** — Rename input in ConversationItem, search input in sidebar. Controlled vs uncontrolled? Debounce strategy?
7. **Code block component** — Syntax highlighting with rehype-highlight. Should code blocks be their own lazy-loaded component?
8. **Touch gestures** — Swipe-to-reveal actions on mobile conversation items. CSS-only or need a gesture library?

Output as structured markdown with implementation-ready recommendations.

PLAN TO REVIEW:
${planContent}`,
    },

    {
      name: 'Data Safety & Schema Impact',
      model: MODELS.claudeSonnet46,
      prompt: `You are a DATA SAFETY AUDITOR for a production SaaS platform with real paying customers. ${ctx}

TREAT EVERY FINDING AS IF IT COULD AFFECT REAL USER DATA IN PRODUCTION.

Review this plan for data safety:
1. **Conversation JSONB growth** — Messages stored as JSONB array. With file attachments, how large can this get? PostgreSQL JSONB size limits?
2. **Soft delete integrity** — Plan uses existing soft-delete (status='deleted'). Are deleted conversations properly excluded from sidebar listing?
3. **R2 storage for attachments** — New file uploads to ai-chat/ bucket path. Cleanup strategy when conversations are deleted?
4. **Voice recording storage** — Audio sent to Gemini for transcription then discarded? Or stored? Privacy implications?
5. **Migration safety** — Plan claims "zero backend changes" for Phase 1. Verify: does the existing API handle all sidebar operations without schema changes?
6. **Concurrent access** — Two browser tabs sending messages to the same conversation. Race condition on JSONB messages array?
7. **Token usage tracking** — Already exists in message metadata. Any data integrity risk from the new features?
8. **Rate limiting adequacy** — Existing rate limiter for messages. New sidebar list/load calls — do they need separate rate limiting?

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown with specific database-safe recommendations.

PLAN TO REVIEW:
${planContent}`,
    },

    {
      name: 'API Design & Backend Contracts',
      model: MODELS.nemotron3Super,
      prompt: `You are a backend API architect reviewing a feature plan. ${ctx}

Review the plan's API surface:
1. **Existing API sufficiency** — Plan claims Phase 1 needs zero backend changes. Verify: GET /api/ai-chat/conversations returns enough data for sidebar (title, context, messageCount, lastMessageAt)?
2. **Search endpoint** — Plan uses client-side filtering of 20 conversations. Is this adequate? When should server-side search (ILIKE on title + JSONB content) be added?
3. **File attachment endpoint** — Plan proposes POST /api/ai-chat/conversations/:id/attachments. REST design correct? Multipart form data handling?
4. **Multimodal message API** — Sending images with messages to Gemini. How should the message API change? New field in request body? Separate upload-then-reference flow?
5. **Rate limiting for new operations** — Sidebar list (every page load), conversation rename, file upload — appropriate rate limits?
6. **WebSocket integration** — Plan mentions Socket.io exists. Should conversation updates be pushed via WebSocket instead of polling?
7. **Response contract** — Are the existing API response shapes adequate for the sidebar (ConversationSummary type)?
8. **Caching strategy** — 5-minute cache on conversation list. Appropriate? Should it invalidate on new message?

Output as structured markdown with specific API design recommendations.

PLAN TO REVIEW:
${planContent}`,
    },

    {
      name: 'Module Architecture & File Budget',
      model: MODELS.nemotron3Super,
      prompt: `You are a code architecture specialist with expertise in large-scale React applications. ${ctx}

MANDATORY CONSTRAINT: No file may exceed 300 lines of code (excluding comments and blank lines).

Review this plan's file organization:
1. **22 new files** — Is this the right decomposition? Any files that should be merged? Any that are too thin?
2. **styles/ directory** — 5 style files from the split + 4 new style files = 9 total. Too many? Consolidation opportunities?
3. **hooks/ directory** — useCoachAssistant, useConversationSidebar, useVoiceRecorder, useGeminiTranscription, useFileAttachment = 5 hooks. Proper separation of concerns?
4. **300-line budget** — Given the estimated line counts, which files are at risk of exceeding 300 lines? Specifically:
   - ConversationSidebar.tsx (est. 250) — includes search, list, actions
   - MarkdownRenderer.tsx (est. 180) — includes 8+ custom components
   - CoachInputBar.tsx (will grow to est. 295) — voice + attachments + input
5. **Import graph** — Draw the dependency tree. Any circular risks? Deep import chains?
6. **Barrel exports** — SwanCoachStyles.ts becomes a barrel. Should other directories (hooks/, styles/) also have index.ts barrels?
7. **Shared vs local** — useAIChat is in shared hooks. New hooks are local to coach-assistant. Is this the right boundary?

Output as structured markdown with a proposed file tree and line budget.

PLAN TO REVIEW:
${planContent}`,
    },

    {
      name: 'Mobile & Edge Case Analysis',
      model: MODELS.nemotron3Nano,
      prompt: `You are a mobile web specialist and edge case hunter. ${ctx}

MANDATORY: 10-breakpoint responsive matrix: 320px, 375px, 430px, 768px, 1024px, 1280px, 1440px, 1920px, 2560px, 3840px
MANDATORY: 44px min touch targets (56px on mobile <768px)

Review this plan for mobile and edge cases:
1. **Sidebar on 320px** — 85vw = 272px. Is this enough for conversation titles + timestamps + action buttons? Layout squeeze risk?
2. **Voice recording on iOS Safari** — MediaRecorder support? WebKit prefix requirements? Auto-play policy for TTS?
3. **Keyboard on mobile** — When chat input is focused, does the sidebar get pushed off screen? Virtual keyboard height management?
4. **Offline/slow network** — What happens when conversations list fails to load? Empty state UX?
5. **Long conversation titles** — Auto-generated from first message. Truncation strategy? 2 lines max with ellipsis?
6. **Large message history** — Conversation with 100+ messages. Virtual scrolling needed? Memory impact?
7. **RTL languages** — Not immediately needed but: does the sidebar flip correctly? CSS logical properties used?
8. **Reduced motion** — Voice orb pulsing, sidebar slide, thinking indicator. All respect prefers-reduced-motion?
9. **Screen reader** — Sidebar landmark, conversation list navigation, message bubble roles, voice recording status announcements?
10. **4K ultrawide** — Max-width constraints on sidebar and chat area? Or full-width stretch?

Rate each: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown with specific CSS/React solutions.

PLAN TO REVIEW:
${planContent}`,
    },

    {
      name: 'Strategic Research & Gap Analysis',
      model: 'gemini-3.1-pro-preview',
      provider: 'gemini-direct',
      useGrounding: true,
      prompt: `You are a strategic product researcher and futurist for a premium fitness SaaS platform. You have access to Google Search — you MUST use it extensively. Your job is to find GAPS, ENHANCEMENTS, and FUTURE-PROOFING opportunities that the plan authors may have missed. ${ctx}

This is NOT a review of what the plan already contains. Your job is to find what's MISSING and what could make it 10x better.

RESEARCH EACH OF THESE AREAS (use Google Search for EVERY section):

1. **Technology Gap Analysis** — SEARCH for the latest APIs, SDKs, and services relevant to this feature set:
   - New AI/ML APIs launched in 2025-2026 (OpenAI, Google, Anthropic, open-source)
   - New browser APIs (Web Speech, MediaRecorder improvements, WebGPU, Web NFC)
   - New React/Node.js patterns and libraries gaining traction
   - Any game-changing open-source tools the plan should integrate

2. **Regulatory & Compliance Gaps** — SEARCH for:
   - Health data privacy regulations (HIPAA, GDPR for fitness apps, state-level laws)
   - FDA guidance on fitness/nutrition apps (especially AI-generated advice)
   - FTC regulations on AI claims and endorsements in fitness apps
   - Accessibility compliance (WCAG 2.2, ADA for digital fitness tools)

3. **Industry Trend Gaps** — SEARCH for 2025-2026 fitness technology trends:
   - Wearable integration trends (Apple Watch, Garmin, Whoop, Oura)
   - AI coaching trends in fitness apps
   - Social fitness trends (community challenges, live workouts, gamification)
   - Nutrition technology trends (computer vision food logging, CGM integration)

4. **User Experience Innovation** — SEARCH for:
   - Best-in-class fitness app onboarding flows (2025-2026)
   - Voice UI best practices for mobile fitness apps
   - Accessibility innovations in health/fitness apps
   - Gamification patterns that drive retention (beyond points/badges)

5. **Monetization & Business Model Gaps** — SEARCH for:
   - Fitness app monetization strategies that work in 2025-2026
   - Affiliate/partnership models in fitness (supplement, equipment, apparel)
   - B2B opportunities (gym partnerships, corporate wellness)
   - Creator economy models in fitness

6. **Future-Proofing Recommendations** — SEARCH for:
   - Emerging platforms (Vision Pro, AR fitness, connected equipment APIs)
   - AI agent trends that could transform fitness coaching
   - Cross-platform framework trends (React Native, Expo, Capacitor)
   - Data portability standards (Apple Health export, FHIR for fitness)

For EVERY gap you find, provide:
- **What's missing** from the current plan
- **Why it matters** (with data/evidence from your research)
- **How to implement** (specific technical approach)
- **Priority**: CRITICAL (do now) / HIGH (next sprint) / MEDIUM (roadmap) / LOW (future)
- **Source URL** for the supporting evidence

Output as structured markdown. This is the most important brain in the planning pipeline — be thorough.

PLAN TO REVIEW:
${planContent}`,
    },

    // ── 15th Brain: Trinity Large — Full-Stack Integration (added 2026-04-06 model audit) ──
    {
      name: 'Full-Stack Integration Analysis (Trinity)',
      model: MODELS.trinityLarge,
      prompt: `You are Arcee Trinity Large — a 400B Mixture-of-Experts model, specialized in cross-domain integration analysis. ${ctx}

Review this plan for INTEGRATION GAPS that single-domain specialists miss:

1. **Frontend-Backend contract alignment** — Do the planned UI components call APIs that actually exist? Any missing endpoints?
2. **Data model completeness** — Does the plan account for all necessary database columns, associations, and migrations?
3. **Authentication & authorization gaps** — Are all new endpoints properly gated? Do role checks match the plan's access requirements?
4. **Environment variable checklist** — List every env var the plan requires (VITE_*, backend). Are any missing from deployment config?
5. **Error boundary coverage** — Does the plan specify error handling for every failure point (API errors, validation, timeout, auth expiry)?
6. **Mobile-Desktop parity** — Any features that work on desktop but are unspecified for mobile, or vice versa?
7. **Deployment sequence risks** — Must backend deploy before frontend? Any breaking changes that need coordinated deploys?
8. **Testing coverage gaps** — What integration tests are missing? What manual QA steps would catch issues the plan doesn't specify?

Rate each gap: CRITICAL / HIGH / MEDIUM / LOW
Focus on the SEAMS between systems — that's where bugs hide.

PLAN TO REVIEW:
${planContent}`,
    },
  ];
}

// ─────────────────────────────────────────────
// Planning Mode Debate Prompt Builders
// ─────────────────────────────────────────────

function buildPlanDebateSecurityPrompt(planContent, ctx, phase1Summary) {
  return `You are the PRIMARY security auditor reviewing a feature implementation plan. ${ctx}

## YOUR ROLE — Security Lead

A plan for upgrading the AI Coach Assistant has been analyzed by 12 planning specialists. Review their findings and debate security implications.

## Phase 1 Context (12 planning validators already ran)
${phase1Summary}

## Your Analysis — Round 1

Focus on:
- PII risks in conversation history, voice recordings, file attachments
- XSS vectors in markdown rendering
- RBAC enforcement gaps
- File upload attack vectors
- Voice data privacy concerns

Provide specific mitigations for each risk.

PLAN UNDER REVIEW:
${planContent}`;
}

function buildPlanDebateArchPrompt(planContent, ctx, phase1Summary) {
  return `You are a Senior Code Quality Lead reviewing a feature implementation plan. ${ctx}

## YOUR ROLE — Architecture Authority

Review the component decomposition, state management, and hook design proposed in this plan. The plan has been analyzed by 12 specialists.

## Phase 1 Context (12 planning validators already ran)
${phase1Summary}

## Your Analysis — Round 1

Focus on:
- Is the hook composition (useCoachAssistant → useAIChat → useConversationSidebar) correct?
- Are the 22 proposed files the right decomposition? Over-engineering? Under-engineering?
- State management: single source of truth vs duplicated state risks
- React performance: memoization strategy, re-render prevention
- File budget: which files will exceed 300 lines?
- Error handling: where do error boundaries go?

For each finding: severity, specific component, issue, fix.

PLAN UNDER REVIEW:
${planContent}`;
}

function buildPlanDebateDesignPrompt(planContent, ctx, phase1UXReport) {
  return `You are the Creative Director for SwanStudios — the FINAL AUTHORITY on all UX/UI design decisions. ${ctx}

## YOUR ROLE — Creative Director (Design Authority)

Design the visual specification for the Coach Assistant upgrade. Create from your OWN design vision. Be bold, opinionated, and prescriptive.

## Crystalline Swan Design Tokens (MANDATORY)
- Midnight Sapphire #002060, Royal Depth #003080, Ice Wing #60C0F0, Arctic Cyan #50A0F0
- Wing Purple #8B5CF6, Gilded Fern #C6A84B, Frost White #E0ECF4
- Obsidian Black #0A0A0F, Carbon #141419, Graphite #1A1A24
- Dual-Button Glow: Blue → Purple glow. Purple → Cyan glow.
- RETIRED: Galaxy-Swan (#0a0a1a, #00FFFF, #7851A9) — NEVER USE

## UX Research from Phase 1
${phase1UXReport || '_No Phase 1 UX report available._'}

## Your Analysis — Round 1

For EACH new component in the plan, provide EXACT design specs:
1. **Conversation Sidebar** — width, bg color, item height, hover state, active state, transition timing, mobile drawer animation
2. **Markdown Renderer** — code block bg, syntax highlighting colors, table style, blockquote border, heading sizes
3. **Thinking Indicator** — bubble shape, shimmer animation spec, timing, easing
4. **Voice Recording Overlay** — orb size, amplitude ring specs, duration label style, color transitions
5. **Provider Badge** — size, font, color, placement relative to message
6. **Attachment Preview** — thumbnail size, border radius, remove button placement

Include: exact pixel values, hex colors, animation durations, easing curves, CSS custom property names.

PLAN UNDER REVIEW:
${planContent}`;
}

// ─────────────────────────────────────────────
// Phase 2 & 3 Debate Prompt Builders
// ─────────────────────────────────────────────

function buildPhase2DebatePrompt(codeBundle, ctx, phase1Summary) {
  return `You are the CTO (Chief Technology Officer) reviewing code for the SwanStudios platform. ${ctx}

## YOUR ROLE — CTO (Code Quality Authority)

You are starting a structured debate with the CEO (Claude) about code quality. Your job is to identify every issue — bugs, architecture flaws, security gaps, performance problems, tech debt.

The CEO will challenge your findings. You must defend with evidence or concede gracefully.

## Phase 1 Context (9 validators already ran)

${phase1Summary}

## Your Analysis — Round 1

Review the code below. For each finding provide:
- **Severity:** CRITICAL / HIGH / MEDIUM / LOW
- **File & Line:** Exact location
- **What's Wrong:** Clear description with evidence
- **Proposed Fix:** Specific code change

Be thorough. The CEO will push back on anything that isn't well-evidenced.

CODE TO REVIEW:
${codeBundle}`;
}

function buildPhase2CEOPrompt(ctx) {
  return `You are the CEO (Chief Executive Officer) — the FINAL AUTHORITY on code quality decisions for SwanStudios. ${ctx}

## YOUR ROLE — CEO (Final Code Authority)

You are debating with the CTO (Gemini) about code quality findings. Your job is to:
1. Validate which findings are REAL issues worth fixing
2. Push back on false positives, nitpicks, or impractical suggestions
3. Prioritize based on business impact (revenue-critical paths first)
4. Consider implementation cost vs benefit

You have FINAL SAY on all code decisions. If consensus isn't reached, you decide.`;
}

function buildPhase3DesignPrompt(codeBundle, ctx, phase1UXReport) {
  return `You are the Creative Director for SwanStudios — the FINAL AUTHORITY on all UX/UI design decisions. ${ctx}

## YOUR ROLE — Creative Director (Design Authority)

You are starting a structured debate with a Design Collaborator (Claude) about the UI/UX quality of this code.

You create your OWN independent design vision FROM SCRATCH. You are opinionated, prescriptive, and bold.

## Crystalline Swan Design Tokens (MANDATORY — USE ONLY THESE)
- Midnight Sapphire #002060 (Primary), Royal Depth #003080 (Surface)
- Ice Wing #60C0F0 (Cyan Glow — glow on purple buttons, XP bars, gaming accents)
- Arctic Cyan #50A0F0 (Data Only — charts, data viz. NOT for buttons/glow)
- Wing Purple #8B5CF6 (Glow Accent — purple button bg, glow on blue buttons, focus rings)
- Gilded Fern #C6A84B (Luxury Accent — gold contrast), Frost White #E0ECF4 (Primary text)
- Swan Lavender #4070C0 (Tertiary)
- Obsidian Black #0A0A0F (Deep Dark — primary dark bg), Carbon #141419 (Card Dark), Graphite #1A1A24 (Surface Dark)
- Dual-Button Glow: Blue buttons (#002060) → #8B5CF6 glow. Purple buttons (#8B5CF6) → #60C0F0 glow.
- Cosmic Nebula gradient (#8B5CF6 → #60C0F0) → for premium/hero CTAs
- 🚫 RETIRED: Galaxy-Swan (#0a0a1a, #00FFFF, #7851A9, #FF2D78) — NEVER USE these tokens

## UX Accessibility Report (from Phase 1)
${phase1UXReport || '_No Phase 1 UX report available._'}

## Your Analysis — Round 1

For each finding, provide SPECIFIC implementation instructions:
- **Severity:** CRITICAL / HIGH / MEDIUM / LOW
- **File & Location:** Exact file and section
- **Design Problem:** What's wrong visually
- **Design Solution:** Exact CSS values, animation specs, pixel measurements, color codes
- **Implementation Notes:** Step-by-step for the implementing engineer

Be bold. This platform charges premium prices — the UI must justify that price.

CODE TO REVIEW:
${codeBundle}`;
}

function buildPhase3CollaboratorPrompt(ctx) {
  return `You are a Design Collaborator reviewing UX/UI findings for SwanStudios. ${ctx}

## YOUR ROLE — Design Collaborator

You are debating with the Creative Director (Gemini) about UI/UX design. Your job is to:
1. Validate which design findings are practical to implement
2. Flag any suggestions that would hurt performance or accessibility
3. Suggest implementation-aware alternatives where the Creative Director's vision is impractical
4. Ensure mobile-first (44px touch targets, 10-breakpoint responsive matrix)

The Creative Director has FINAL SAY on design decisions. You challenge but ultimately defer to their design authority.`;
}

// ─────────────────────────────────────────────
// OpenRouter API Caller (single unified caller)
// ─────────────────────────────────────────────

async function callOpenRouter(apiKey, model, prompt) {
  const res = await fetchForEgress('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://sswanstudios.com',
      'X-Title': 'SwanStudios Validation Orchestrator',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(CONFIG.timeout),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${errBody.slice(0, 300)}`);
  }

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
}

function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

// ─────────────────────────────────────────────
// Google GenAI API Caller (direct, for Gemini 3.1 Pro)
// ─────────────────────────────────────────────

/**
 * Call Google GenAI (Gemini) directly.
 * @param {string} apiKey - Gemini API key
 * @param {string} model - Model name (e.g. 'gemini-3.1-pro-preview')
 * @param {string} prompt - The prompt text
 * @param {object} [opts] - Optional config
 * @param {boolean} [opts.useGrounding=false] - Enable Google Search grounding (FREE real-time web research)
 */
async function callGeminiDirect(apiKey, model, prompt, opts = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  };

  // Enable Google Search grounding for real-time web research
  // This is FREE — no additional cost beyond base model usage
  if (opts.useGrounding) {
    body.tools = [{ googleSearch: {} }];
  }

  const res = await fetchForEgress(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(CONFIG.timeout),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Google GenAI ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(`Google GenAI error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '(no response)';
  const usage = data.usageMetadata || {};

  // Extract grounding metadata if present (search queries + sources used)
  const groundingMeta = data.candidates?.[0]?.groundingMetadata || null;
  const searchQueries = groundingMeta?.webSearchQueries || [];
  const groundingSources = groundingMeta?.groundingChunks?.map(c => c.web?.uri).filter(Boolean) || [];

  return {
    text,
    inputTokens: usage.promptTokenCount || estimateTokens(prompt),
    outputTokens: usage.candidatesTokenCount || estimateTokens(text),
    model: `google/${model}`,
    groundingMeta: opts.useGrounding ? { searchQueries, sources: groundingSources } : null,
  };
}

// ─────────────────────────────────────────────
// Validator Runner
// ─────────────────────────────────────────────

async function runValidator(apiKey, track, index) {
  // Stagger launches to respect rate limits
  if (index > 0) {
    await sleep(CONFIG.staggerMs * index);
  }

  const start = Date.now();
  try {
    // Route to correct API based on provider
    let result;
    if (track.provider === 'gemini-direct') {
      const geminiKey = getGeminiKey();
      result = await callGeminiDirect(geminiKey, track.model, track.prompt, {
        useGrounding: !!track.useGrounding,
      });
    } else {
      result = await callOpenRouter(apiKey, track.model, track.prompt);
    }

    // Cost tracking
    let costUSD = 0;
    if (track.model === MODELS.claudeSonnet46) {
      // Claude Sonnet 4.6: $3/$15 per M tokens
      costUSD = (result.inputTokens / 1_000_000 * 3.0) +
                (result.outputTokens / 1_000_000 * 15.0);
    } else if (track.model === MODELS.escalation1) {
      costUSD = (result.inputTokens / 1_000_000 * 0.25) +
                (result.outputTokens / 1_000_000 * 0.75);
    } else if (track.model === MODELS.minimaxM27) {
      costUSD = (result.inputTokens / 1_000_000 * 0.30) +
                (result.outputTokens / 1_000_000 * 1.20);
    } else if (track.model === MODELS.gemini31Pro) {
      // Gemini 3.1 Pro: $2/M input, $12/M output (estimate)
      costUSD = (result.inputTokens / 1_000_000 * 2.0) +
                (result.outputTokens / 1_000_000 * 12.0);
    }
    // Safety: warn if a "free" model somehow reports cost
    const paidModels = [MODELS.claudeSonnet46, MODELS.escalation1, MODELS.minimaxM27, MODELS.gemini31Pro];
    if (!paidModels.includes(track.model) && costUSD > 0.01) {
      console.warn(`    ⚠️  WARNING: "${track.name}" cost $${costUSD.toFixed(4)} — may not be free anymore!`);
    }

    return {
      name: track.name,
      model: result.model,
      status: 'SUCCESS',
      text: result.text,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUSD,
      durationMs: Date.now() - start,
      groundingMeta: result.groundingMeta || null,
    };
  } catch (err) {
    return {
      name: track.name,
      model: track.model,
      status: 'ERROR',
      text: `Error: ${err.message}`,
      inputTokens: 0,
      outputTokens: 0,
      costUSD: 0,
      durationMs: Date.now() - start,
    };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────
// Report Generator
// ─────────────────────────────────────────────

function generateReport(results, files, startTime) {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const totalDuration = Date.now() - startTime;

  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const errorCount = results.filter(r => r.status === 'ERROR').length;
  const totalCost = results.reduce((sum, r) => sum + (r.costUSD || 0), 0);

  let md = `# SwanStudios Validation Report

> Generated: ${now.toLocaleString()}
> Files reviewed: ${files.length}
> Validators: ${successCount} succeeded, ${errorCount} errored
> Cost: $${totalCost.toFixed(4)}
> Duration: ${(totalDuration / 1000).toFixed(1)}s
> Gateway: OpenRouter (single API key)

---

## Files Reviewed

${files.map(f => `- \`${f.path}\``).join('\n')}

---

## Validator Summary

| # | Validator | Model | Tokens (in/out) | Duration | Status |
|---|-----------|-------|-----------------|----------|--------|
${results.map((r, i) => `| ${i + 1} | ${r.name} | ${r.model} | ${r.inputTokens.toLocaleString()} / ${r.outputTokens.toLocaleString()} | ${(r.durationMs / 1000).toFixed(1)}s | ${r.status === 'SUCCESS' ? 'PASS' : 'FAIL'} |`).join('\n')}

---

`;

  // Collect all grounding sources across results
  const allGroundingSources = [];
  for (const r of results) {
    if (r.groundingMeta?.sources?.length) {
      allGroundingSources.push({ brain: r.name, queries: r.groundingMeta.searchQueries, sources: r.groundingMeta.sources });
    }
  }
  if (allGroundingSources.length > 0) {
    md += `## Web Research Sources\n\n`;
    md += `> ${allGroundingSources.length} brain(s) performed real-time web research via Google Search Grounding\n\n`;
    for (const g of allGroundingSources) {
      md += `### ${g.brain}\n`;
      if (g.queries?.length) md += `**Search queries:** ${g.queries.join(', ')}\n`;
      md += `**Sources cited:**\n${g.sources.map(s => `- ${s}`).join('\n')}\n\n`;
    }
    md += `---\n\n`;
  }

  for (const r of results) {
    const badge = r.status === 'SUCCESS' ? 'PASS' : 'FAIL';
    md += `## [${badge}] ${r.name}
**Model:** ${r.model} | **Duration:** ${(r.durationMs / 1000).toFixed(1)}s${r.groundingMeta?.sources?.length ? ` | **Web Research:** ${r.groundingMeta.sources.length} sources cited` : ''}

${r.text}

---

`;
  }

  md += `## Aggregate Summary

### Critical Findings
${extractFindings(results, 'CRITICAL')}

### High Priority Findings
${extractFindings(results, 'HIGH')}

---

*SwanStudios 15-Brain Recursive Consensus System v14.0*
*Phase 1: 13 parallel — Gemini 2.5 Flash + Claude Sonnet 4.6 + Nemotron 3 Nano + Gemini 3 Flash + Gemini 3.1 Flash + Nemotron 3 Nano + Gemini 2.5 Flash + MiniMax M2.7 + Nemotron 3 Super + Nemotron 3 Super + Step Bug Hunter II + Data Safety (Claude) + Trinity Large 400B*
*Phase 2: 3 Specialty Debates — Security (Step ↔ Nemotron) + Code Quality (Claude ↔ Qwen) + UX/UI (Gemini 3.1 Pro ↔ M2.5:free)*
*Phase 3: Smart Escalation — Nemotron Nano Escalation + MiniMax M2.7 (CRITICAL only)*
`;

  return { md, timestamp };
}

function extractFindings(results, severity) {
  const lines = [];
  for (const r of results) {
    if (r.status !== 'SUCCESS') continue;
    const matches = r.text.split('\n').filter(line =>
      line.toUpperCase().includes(severity) &&
      !line.startsWith('#') &&
      !line.startsWith('|')
    );
    if (matches.length > 0) {
      lines.push(`**${r.name}:**`);
      for (const m of matches.slice(0, 5)) {
        lines.push(`- ${m.trim()}`);
      }
    }
  }
  return lines.length > 0 ? lines.join('\n') : `_No ${severity.toLowerCase()} findings._`;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  loadEnv();

  const hasGemini31 = !!getGeminiKey();
  const brainCount = hasGemini31 ? 14 : 12;

  console.log('');
  console.log('  ╔══════════════════════════════════════════════════════════╗');
  console.log('  ║    Hermes Village — Ecosystem Recursive Consensus       ║');
  const subtitle = hasGemini31
    ? `${brainCount}-Brain — Specialty Debates + Smart Escalation`
    : `9-Brain — Phase 1 only (add GEMINI_API_KEY for debates)`;
  console.log(`  ║    ${subtitle.padEnd(54)}║`);
  console.log('  ║                                                          ║');
  console.log('  ║    Scope: Hermes agent + SwanStudios + Wiki + Life OS    ║');
  console.log('  ║                                                          ║');
  console.log('  ║    Phase 1: 9 Parallel Ecosystem Validators             ║');
  console.log('  ║    1. Technical Accuracy       — Claude Sonnet 4.6      ║');
  console.log('  ║    2. Security & Threat Model  — Nemotron 3 Super       ║');
  console.log('  ║    3. Agent Safety & Prompts   — Nemotron 3 Nano        ║');
  console.log('  ║    4. Architecture & Systems   — Trinity Large 400B     ║');
  console.log('  ║    5. Code Quality & Craft     — Claude Sonnet 4.6      ║');
  console.log('  ║    6. UX / Product / User      — Gemini 3.1 Flash       ║');
  console.log('  ║    7. Operational Reliability  — Gemini 3 Flash         ║');
  console.log('  ║    8. Docs / Continuity / Mem  — Gemini 2.5 Flash       ║');
  console.log('  ║    9. Strategic / Gap Finding  — Gemini 2.5 Flash       ║');
  if (hasGemini31) {
    console.log('  ║                                                          ║');
    console.log('  ║    Phase 2: 3 Specialty Recursive Debates              ║');
    console.log('  ║    A. Technical Accuracy: Gemini 3.1 Pro ↔ Claude 4.6  ║');
    console.log('  ║    B. Security + Agent Safety: Claude ↔ Nemotron Super ║');
    console.log('  ║    C. Architecture Gaps: Gemini 3.1 Pro ↔ Trinity Large║');
    console.log('  ║                                                          ║');
    console.log('  ║    Phase 3: Smart Escalation (CRITICAL only)           ║');
    console.log('  ║    Nemotron Nano + MiniMax M2.7 — skip if not needed    ║');
  }
  console.log('  ╚══════════════════════════════════════════════════════════╝');
  console.log('');

  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    console.error('  ERROR: No OpenRouter API key found!');
    console.error('');
    console.error('  Setup (takes 30 seconds):');
    console.error('  1. Go to https://openrouter.ai/settings/keys');
    console.error('  2. Create a free API key');
    console.error('  3. Add to your .env file:');
    console.error('     OPENROUTER_API_KEY=sk-or-v1-your-key-here');
    console.error('');
    console.error('  You already use OpenRouter with Roo Code & Kilo Code,');
    console.error('  so you can reuse the same key!');
    process.exit(1);
  }

  console.log('  [OK] OpenRouter API key found');
  console.log('');

  const opts = parseArgs();

  // ── Document Review Mode (skip if --mode plan) ──
  if (opts.document && opts.mode !== 'plan') {
    const docPath = resolve(ROOT, opts.document);
    if (!docPath.startsWith(resolve(ROOT))) {
      console.error('  ERROR: Document path must be within the project directory.');
      process.exit(1);
    }
    if (!existsSync(docPath)) {
      console.error(`  ERROR: Document not found: ${docPath}`);
      process.exit(1);
    }

    const documentContent = readFileSync(docPath, 'utf-8');
    console.log(`  [DOCUMENT MODE] Reviewing: ${opts.document} (${(documentContent.length / 1024).toFixed(1)} KB)`);
    console.log('');

    const files = [{ path: opts.document, content: documentContent }];
    const ctx = `SwanStudios is a personal training SaaS platform (React + TypeScript + styled-components frontend, Node.js + Express + Sequelize + PostgreSQL backend). Enchanted Apex: Crystalline Swan theme. Active palette: Midnight Sapphire #002060, Royal Depth #003080, Ice Wing #60C0F0, Arctic Cyan #50A0F0, Gilded Fern #C6A84B, Frost White #E0ECF4, Swan Lavender #4070C0, Wing Purple #8B5CF6, Obsidian Black #0A0A0F, Carbon #141419, Graphite #1A1A24. Production: sswanstudios.com. Document: ${opts.document}`;
    const tracks = buildDocumentValidatorTracks(documentContent, opts.document);
    const phase1Tracks = tracks;

    console.log(`  Phase 1: Launching ${phase1Tracks.length} document validators (staggered 2s apart)...`);
    if (hasGemini31) {
      console.log(`  Phase 2: Technical Accuracy recursive debate (Gemini CTO ↔ Claude CEO)...`);
      console.log(`  Phase 3: Design Gap recursive debate (Gemini Creative Dir ↔ Claude Collab)...`);
    }
    console.log('');

    // ── Phase 1: Run all document tracks in parallel ──
    const phase1Results = await Promise.all(phase1Tracks.map(async (track, index) => {
      const tag = track.name.padEnd(40);
      const modelShort = track.model.split('/').pop();
      console.log(`    [P1 ${index + 1}/${phase1Tracks.length}] ${tag} -> ${modelShort}`);
      const result = await runValidator(apiKey, track, index);
      const badge = result.status === 'SUCCESS' ? 'OK  ' : 'FAIL';
      console.log(`    [${badge}] ${tag} ${(result.durationMs / 1000).toFixed(1)}s`);
      return result;
    }));

    // ── Build Phase 1 summary for Phase 2+3 ──
    const phase1Summary = phase1Results
      .filter(r => r.status === 'SUCCESS')
      .map(r => `### ${r.name} (${r.model})\n${r.text.slice(0, 2000)}${r.text.length > 2000 ? '\n... (truncated)' : ''}`)
      .join('\n\n---\n\n');
    const uxReport = phase1Results.find(r => r.name === 'UX/Design Gap Validation' && r.status === 'SUCCESS')?.text || null;

    const debateResults = [];
    let phase2DebateLog = null;
    let phase3DebateLog = null;

    async function callModelForDebate(provider, model, prompt) {
      if (provider === 'gemini-direct') {
        return callGeminiDirect(getGeminiKey(), model, prompt);
      } else {
        return callOpenRouter(apiKey, model, prompt);
      }
    }

    if (hasGemini31) {
      // ── Phase 2: Technical Accuracy Debate ──
      console.log('');
      console.log('  ── Phase 2: Technical Accuracy Recursive Debate ──');
      console.log('  Gemini 3.1 Pro (CTO) ↔ Claude Sonnet 4.6 (CEO)');
      console.log('');

      try {
        const p2Start = Date.now();
        const p2Result = await runRecursiveConsensus({
          topic: 'Document Technical Accuracy',
          modelA: { name: 'Gemini 3.1 Pro', model: MODELS.gemini31Pro, provider: 'gemini-direct', role: 'CTO' },
          modelB: { name: 'Claude Sonnet 4.6', model: MODELS.claudeSonnet46, provider: 'openrouter', role: 'CEO' },
          finalAuthority: 'B',
          initialPrompt: buildDocDebateCodePrompt(documentContent, ctx, phase1Summary),
          callModel: callModelForDebate,
          onRound: (round, speaker, text) => {
            console.log(`    [P2 R${round}] ${speaker.padEnd(20)} ${text.slice(0, 80).replace(/\n/g, ' ')}...`);
          },
        });
        phase2DebateLog = p2Result.debateLog;
        console.log(`    [${p2Result.consensusReached ? 'CONSENSUS' : 'AUTHORITY'}] Phase 2 — ${p2Result.rounds.length} rounds, ${((Date.now() - p2Start) / 1000).toFixed(1)}s`);
        debateResults.push({
          name: 'Code Quality Debate (Phase 2)', model: `${MODELS.gemini31Pro} ↔ ${MODELS.claudeSonnet46}`,
          status: 'SUCCESS', text: p2Result.finalVerdict,
          inputTokens: p2Result.totalTokens.input, outputTokens: p2Result.totalTokens.output,
          costUSD: (p2Result.totalTokens.input / 1_000_000 * 2.0) + (p2Result.totalTokens.output / 1_000_000 * 12.0),
          durationMs: Date.now() - p2Start, debateLog: p2Result.debateLog, consensusReached: p2Result.consensusReached,
        });
      } catch (err) {
        console.error(`    [FAIL] Phase 2: ${err.message}`);
        debateResults.push({ name: 'Code Quality Debate (Phase 2)', model: `${MODELS.gemini31Pro} ↔ ${MODELS.claudeSonnet46}`, status: 'ERROR', text: `Error: ${err.message}`, inputTokens: 0, outputTokens: 0, costUSD: 0, durationMs: 0 });
      }

      // ── Phase 3: Design Gap Debate ──
      console.log('');
      console.log('  ── Phase 3: Design Gap Recursive Debate ──');
      console.log('  Gemini 3.1 Pro (Creative Director) ↔ Claude Sonnet 4.6 (Collaborator)');
      console.log('');

      try {
        const p3Start = Date.now();
        const p3Result = await runRecursiveConsensus({
          topic: 'Document Design Gap Assessment',
          modelA: { name: 'Gemini 3.1 Pro', model: MODELS.gemini31Pro, provider: 'gemini-direct', role: 'Creative Director' },
          modelB: { name: 'Claude Sonnet 4.6', model: MODELS.claudeSonnet46, provider: 'openrouter', role: 'Design Collaborator' },
          finalAuthority: 'A',
          initialPrompt: buildDocDebateDesignPrompt(documentContent, ctx, uxReport),
          callModel: callModelForDebate,
          onRound: (round, speaker, text) => {
            console.log(`    [P3 R${round}] ${speaker.padEnd(20)} ${text.slice(0, 80).replace(/\n/g, ' ')}...`);
          },
        });
        phase3DebateLog = p3Result.debateLog;
        console.log(`    [${p3Result.consensusReached ? 'CONSENSUS' : 'AUTHORITY'}] Phase 3 — ${p3Result.rounds.length} rounds, ${((Date.now() - p3Start) / 1000).toFixed(1)}s`);
        debateResults.push({
          name: 'UX/UI Design Debate (Phase 3)', model: `${MODELS.gemini31Pro} ↔ ${MODELS.claudeSonnet46}`,
          status: 'SUCCESS', text: p3Result.finalVerdict,
          inputTokens: p3Result.totalTokens.input, outputTokens: p3Result.totalTokens.output,
          costUSD: (p3Result.totalTokens.input / 1_000_000 * 2.0) + (p3Result.totalTokens.output / 1_000_000 * 12.0),
          durationMs: Date.now() - p3Start, debateLog: p3Result.debateLog, consensusReached: p3Result.consensusReached,
        });
      } catch (err) {
        console.error(`    [FAIL] Phase 3: ${err.message}`);
        debateResults.push({ name: 'UX/UI Design Debate (Phase 3)', model: `${MODELS.gemini31Pro} ↔ ${MODELS.claudeSonnet46}`, status: 'ERROR', text: `Error: ${err.message}`, inputTokens: 0, outputTokens: 0, costUSD: 0, durationMs: 0 });
      }
    }

    const results = [...phase1Results, ...debateResults];
    const { md, timestamp } = generateReport(results, files, startTime);
    const successCount = results.filter(r => r.status === 'SUCCESS').length;
    const totalCost = results.reduce((sum, r) => sum + (r.costUSD || 0), 0);
    const outputPaths = writeSplitOutput(results, files, md, timestamp);

    if (phase2DebateLog) {
      writeFileSync(join(outputPaths.latestDir, 'debate-log.md'), phase2DebateLog, 'utf-8');
      writeFileSync(join(outputPaths.archiveDir, 'debate-log.md'), phase2DebateLog, 'utf-8');
    }
    if (phase3DebateLog) {
      writeFileSync(join(outputPaths.latestDir, 'design-debate-log.md'), phase3DebateLog, 'utf-8');
      writeFileSync(join(outputPaths.archiveDir, 'design-debate-log.md'), phase3DebateLog, 'utf-8');
    }

    const phase2Verdict = debateResults.find(r => r.name.includes('Phase 2'));
    if (phase2Verdict?.status === 'SUCCESS') {
      const fixInstructions = `# Document Review — Technical Accuracy Consensus\n\n> Generated from Phase 2 recursive debate (Gemini CTO ↔ Claude CEO)\n> Consensus: ${phase2Verdict.consensusReached ? 'YES' : 'Final authority decided'}\n\n---\n\n${phase2Verdict.text}\n`;
      writeFileSync(join(outputPaths.latestDir, 'fix-instructions.md'), fixInstructions, 'utf-8');
      writeFileSync(join(outputPaths.archiveDir, 'fix-instructions.md'), fixInstructions, 'utf-8');
    }
    const phase3Verdict = debateResults.find(r => r.name.includes('Phase 3'));
    if (phase3Verdict?.status === 'SUCCESS') {
      const designRecs = `# Document Review — Design Gap Consensus\n\n> Generated from Phase 3 recursive debate (Gemini Creative Dir ↔ Claude Collab)\n> Consensus: ${phase3Verdict.consensusReached ? 'YES' : 'Final authority decided'}\n\n---\n\n${phase3Verdict.text}\n`;
      writeFileSync(join(outputPaths.latestDir, 'design-recommendations.md'), designRecs, 'utf-8');
      writeFileSync(join(outputPaths.archiveDir, 'design-recommendations.md'), designRecs, 'utf-8');
    }

    mkdirSync(CONFIG.legacyReportDir, { recursive: true });
    writeFileSync(join(CONFIG.legacyReportDir, 'LATEST.md'), md, 'utf-8');

    console.log('');
    console.log('  ════════════════════════════════════════════════════════');
    console.log(`  11-Brain Document Review System — Complete`);
    console.log(`  Document:   ${opts.document}`);
    console.log(`  Output:     ${outputPaths.latestDir}/`);
    console.log(`  Validators: ${successCount}/${results.length} passed`);
    console.log(`  Cost:       $${totalCost.toFixed(4)}`);
    console.log(`  Time:       ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log('  ════════════════════════════════════════════════════════');
    console.log('');
    return;
  }

  // ── Planning Mode (--mode plan --document plan.md) ──
  if (opts.mode === 'plan' && opts.document) {
    const docPath = resolve(ROOT, opts.document);
    if (!docPath.startsWith(resolve(ROOT))) {
      console.error('  ERROR: Document path must be within the project directory.');
      process.exit(1);
    }
    if (!existsSync(docPath)) {
      console.error(`  ERROR: Plan document not found: ${docPath}`);
      process.exit(1);
    }

    const planContent = readFileSync(docPath, 'utf-8');
    console.log('  ╔══════════════════════════════════════════════════════════╗');
    console.log('  ║         15-Brain PLANNING MODE (with Web Research)       ║');
    console.log('  ║    Feature Plan Analysis & Design Consensus              ║');
    console.log('  ║    3 brains use Google Search Grounding (FREE)           ║');
    console.log('  ╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  [PLAN MODE] Analyzing: ${opts.document} (${(planContent.length / 1024).toFixed(1)} KB)`);
    console.log('');

    const files = [{ path: opts.document, content: planContent }];
    const ctx = `SwanStudios is a personal training SaaS platform (React + TypeScript + styled-components frontend, Node.js + Express + Sequelize + PostgreSQL backend). Enchanted Apex: Crystalline Swan theme. Active palette: Midnight Sapphire #002060, Royal Depth #003080, Ice Wing #60C0F0, Arctic Cyan #50A0F0, Gilded Fern #C6A84B, Frost White #E0ECF4, Swan Lavender #4070C0, Wing Purple #8B5CF6, Obsidian Black #0A0A0F, Carbon #141419, Graphite #1A1A24. Production: sswanstudios.com. Plan: ${opts.document}`;
    const phase1Tracks = buildPlanningValidatorTracks(planContent, opts.document);

    const groundedCount = phase1Tracks.filter(t => t.useGrounding).length;
    console.log(`  Phase 1: Launching ${phase1Tracks.length} planning analysts (staggered 2s apart)...`);
    if (groundedCount > 0) {
      console.log(`           ${groundedCount} brain(s) with Google Search Grounding (real-time web research)`);
    }
    if (hasGemini31) {
      console.log(`  Phase 2: 3 Planning Specialty Debates...`);
      console.log(`    A. Security Planning: Step 3.5 ↔ Nemotron 3 Super (FREE)`);
      console.log(`    B. Architecture Planning: Claude Sonnet 4.6 ↔ Nemotron 3 Super`);
      console.log(`    C. UX/UI Design: Gemini 3.1 Pro (CTO) ↔ MiniMax M2.7`);
      console.log(`  Phase 3: Smart Escalation (only if CRITICAL gaps or stalled debates)`);
    }
    console.log('');

    // ── Phase 1: Run all planning tracks in parallel ──
    const phase1Results = await Promise.all(phase1Tracks.map(async (track, index) => {
      const tag = track.name.padEnd(45);
      const modelShort = track.model.split('/').pop();
      console.log(`    [P1 ${String(index + 1).padStart(2)}/${phase1Tracks.length}] ${tag} -> ${modelShort}`);
      const result = await runValidator(apiKey, track, index);
      const badge = result.status === 'SUCCESS' ? 'OK  ' : 'FAIL';
      console.log(`    [${badge}] ${tag} ${(result.durationMs / 1000).toFixed(1)}s`);
      return result;
    }));

    // ── Build Phase 1 summary for debates ──
    const phase1Summary = phase1Results
      .filter(r => r.status === 'SUCCESS')
      .map(r => `### ${r.name} (${r.model})\n${r.text.slice(0, 2000)}${r.text.length > 2000 ? '\n... (truncated)' : ''}`)
      .join('\n\n---\n\n');
    const uxReport = phase1Results.find(r => r.name === 'UX Research & Competitor Analysis' && r.status === 'SUCCESS')?.text || null;

    const debateResults = [];
    let securityDebateLog = null;
    let archDebateLog = null;
    let designDebateLog = null;

    async function callModelForDebate(provider, model, prompt) {
      if (provider === 'gemini-direct') {
        return callGeminiDirect(getGeminiKey(), model, prompt);
      } else {
        return callOpenRouter(apiKey, model, prompt);
      }
    }

    if (hasGemini31) {
      // ── Phase 2A: Security Planning Debate (FREE) ──
      console.log('');
      console.log('  ── Phase 2A: Security Planning Debate ──');
      console.log('  Nemotron 3 Nano ↔ Nvidia Nemotron 3 Super (both FREE)');
      console.log('');

      try {
        const p2aStart = Date.now();
        const secReport = phase1Results.find(r => r.name === 'Security & Privacy Planning' && r.status === 'SUCCESS')?.text || '';
        const p2aResult = await runRecursiveConsensus({
          topic: 'Security Planning Analysis',
          modelA: { name: 'Nemotron 3 Nano', model: MODELS.nemotron3Nano, provider: 'openrouter', role: 'Primary Security Planner' },
          modelB: { name: 'Nemotron 3 Super', model: MODELS.nemotron3Super, provider: 'openrouter', role: 'Secondary Security Planner (120B MoE)' },
          finalAuthority: 'A',
          initialPrompt: buildPlanDebateSecurityPrompt(planContent, ctx, phase1Summary),
          callModel: callModelForDebate,
          onRound: (round, speaker, text) => {
            console.log(`    [P2A R${round}] ${speaker.padEnd(20)} ${text.slice(0, 80).replace(/\n/g, ' ')}...`);
          },
        });
        securityDebateLog = p2aResult.debateLog;
        console.log(`    [${p2aResult.consensusReached ? 'CONSENSUS' : 'AUTHORITY'}] Phase 2A — ${p2aResult.rounds.length} rounds, ${((Date.now() - p2aStart) / 1000).toFixed(1)}s`);
        debateResults.push({
          name: 'Security Planning Debate (Phase 2A)', model: `${MODELS.nemotron3Nano} ↔ ${MODELS.nemotron3Super}`,
          status: 'SUCCESS', text: p2aResult.finalVerdict,
          inputTokens: p2aResult.totalTokens.input, outputTokens: p2aResult.totalTokens.output,
          costUSD: 0, durationMs: Date.now() - p2aStart,
          debateLog: p2aResult.debateLog, consensusReached: p2aResult.consensusReached,
        });
      } catch (err) {
        console.error(`    [FAIL] Phase 2A: ${err.message}`);
        debateResults.push({ name: 'Security Planning Debate (Phase 2A)', model: `${MODELS.nemotron3Nano} ↔ ${MODELS.nemotron3Super}`, status: 'ERROR', text: `Error: ${err.message}`, inputTokens: 0, outputTokens: 0, costUSD: 0, durationMs: 0 });
      }

      // ── Phase 2B: Architecture Planning Debate ──
      console.log('');
      console.log('  ── Phase 2B: Architecture Planning Debate ──');
      console.log('  Claude Sonnet 4.6 ↔ Nemotron 3 Super:free');
      console.log('');

      try {
        const p2bStart = Date.now();
        const p2bResult = await runRecursiveConsensus({
          topic: 'Architecture & Component Planning',
          modelA: { name: 'Claude Sonnet 4.6', model: MODELS.claudeSonnet46, provider: 'openrouter', role: 'Senior Architecture Lead' },
          modelB: { name: 'Nemotron 3 Super', model: MODELS.nemotron3Super, provider: 'openrouter', role: 'Code Architecture Specialist (1M context)' },
          finalAuthority: 'A',
          initialPrompt: buildPlanDebateArchPrompt(planContent, ctx, phase1Summary),
          callModel: callModelForDebate,
          onRound: (round, speaker, text) => {
            console.log(`    [P2B R${round}] ${speaker.padEnd(20)} ${text.slice(0, 80).replace(/\n/g, ' ')}...`);
          },
        });
        archDebateLog = p2bResult.debateLog;
        console.log(`    [${p2bResult.consensusReached ? 'CONSENSUS' : 'AUTHORITY'}] Phase 2B — ${p2bResult.rounds.length} rounds, ${((Date.now() - p2bStart) / 1000).toFixed(1)}s`);
        debateResults.push({
          name: 'Architecture Planning Debate (Phase 2B)', model: `${MODELS.claudeSonnet46} ↔ ${MODELS.nemotron3Super}`,
          status: 'SUCCESS', text: p2bResult.finalVerdict,
          inputTokens: p2bResult.totalTokens.input, outputTokens: p2bResult.totalTokens.output,
          costUSD: (p2bResult.totalTokens.input / 1_000_000 * 1.5) + (p2bResult.totalTokens.output / 1_000_000 * 7.5),
          durationMs: Date.now() - p2bStart,
          debateLog: p2bResult.debateLog, consensusReached: p2bResult.consensusReached,
        });
      } catch (err) {
        console.error(`    [FAIL] Phase 2B: ${err.message}`);
        debateResults.push({ name: 'Architecture Planning Debate (Phase 2B)', model: `${MODELS.claudeSonnet46} ↔ ${MODELS.nemotron3Super}`, status: 'ERROR', text: `Error: ${err.message}`, inputTokens: 0, outputTokens: 0, costUSD: 0, durationMs: 0 });
      }

      // ── Phase 2C: UX/UI Design Planning Debate ──
      console.log('');
      console.log('  ── Phase 2C: UX/UI Design Planning Debate ──');
      console.log('  Gemini 3.1 Pro (Creative Dir) ↔ MiniMax M2.7');
      console.log('');

      try {
        const p2cStart = Date.now();
        const p2cResult = await runRecursiveConsensus({
          topic: 'UX/UI Design Specification',
          modelA: { name: 'Gemini 3.1 Pro', model: MODELS.gemini31Pro, provider: 'gemini-direct', role: 'Creative Director (Lead Design Authority)' },
          modelB: { name: 'MiniMax M2.7', model: MODELS.minimaxM27, provider: 'openrouter', role: 'Design Implementation Reviewer' },
          finalAuthority: 'A',
          initialPrompt: buildPlanDebateDesignPrompt(planContent, ctx, uxReport),
          callModel: callModelForDebate,
          onRound: (round, speaker, text) => {
            console.log(`    [P2C R${round}] ${speaker.padEnd(20)} ${text.slice(0, 80).replace(/\n/g, ' ')}...`);
          },
        });
        designDebateLog = p2cResult.debateLog;
        console.log(`    [${p2cResult.consensusReached ? 'CONSENSUS' : 'AUTHORITY'}] Phase 2C — ${p2cResult.rounds.length} rounds, ${((Date.now() - p2cStart) / 1000).toFixed(1)}s`);
        debateResults.push({
          name: 'UX/UI Design Planning Debate (Phase 2C)', model: `${MODELS.gemini31Pro} ↔ ${MODELS.minimaxM27}`,
          status: 'SUCCESS', text: p2cResult.finalVerdict,
          inputTokens: p2cResult.totalTokens.input, outputTokens: p2cResult.totalTokens.output,
          costUSD: (p2cResult.totalTokens.input / 1_000_000 * 1.0) + (p2cResult.totalTokens.output / 1_000_000 * 6.0),
          durationMs: Date.now() - p2cStart,
          debateLog: p2cResult.debateLog, consensusReached: p2cResult.consensusReached,
        });
      } catch (err) {
        console.error(`    [FAIL] Phase 2C: ${err.message}`);
        debateResults.push({ name: 'UX/UI Design Planning Debate (Phase 2C)', model: `${MODELS.gemini31Pro} ↔ ${MODELS.minimaxM27}`, status: 'ERROR', text: `Error: ${err.message}`, inputTokens: 0, outputTokens: 0, costUSD: 0, durationMs: 0 });
      }

      // ── Phase 3: Smart Escalation ──
      const allDebateTexts = debateResults.map(r => r.text || '').join('\n');
      const hasCritical = allDebateTexts.toUpperCase().includes('CRITICAL');
      const hasStalled = debateResults.some(r => r.consensusReached === false);

      if (hasCritical || hasStalled) {
        console.log('');
        console.log('  ── Phase 3: Smart Escalation (CRITICAL gaps or stalled debates detected) ──');

        if (hasStalled) {
          console.log('  Nemotron Nano Escalation — resolving stalled planning debate...');
          try {
            const mercStart = Date.now();
            const stalledDebates = debateResults.filter(r => r.consensusReached === false).map(r => `### ${r.name}\n${r.text}`).join('\n\n');
            const mercResult = await callOpenRouter(apiKey, MODELS.escalation1, `You are Nemotron Nano Escalation — the fastest reasoning model. A planning debate between AI models has stalled. Review the contested design/architecture decisions and provide a FINAL RULING on each.\n\nStalled Debates:\n${stalledDebates}\n\nFor each: AGREE with Model A, AGREE with Model B, or provide your OWN recommendation with reasoning.`);
            console.log(`    [OK] Nemotron Nano Escalation — ${((Date.now() - mercStart) / 1000).toFixed(1)}s`);
            debateResults.push({ name: 'Smart Escalation (Nemotron Nano Escalation)', model: MODELS.escalation1, status: 'SUCCESS', text: mercResult.text, inputTokens: mercResult.inputTokens, outputTokens: mercResult.outputTokens, costUSD: (mercResult.inputTokens / 1_000_000 * 0.25) + (mercResult.outputTokens / 1_000_000 * 0.75), durationMs: Date.now() - mercStart });
          } catch (err) {
            console.error(`    [FAIL] Nemotron Nano Escalation: ${err.message}`);
            debateResults.push({ name: 'Smart Escalation (Nemotron Nano Escalation)', model: MODELS.escalation1, status: 'ERROR', text: `Error: ${err.message}`, inputTokens: 0, outputTokens: 0, costUSD: 0, durationMs: 0 });
          }
        }

        if (hasCritical) {
          console.log('  MiniMax M2.7 — deep-diving CRITICAL planning gaps...');
          try {
            const m27Start = Date.now();
            const criticalFindings = allDebateTexts.split('\n').filter(l => l.toUpperCase().includes('CRITICAL')).slice(0, 20).join('\n');
            const m27Result = await callOpenRouter(apiKey, MODELS.minimaxM27, `You are MiniMax M2.7 — #3 ranked AI overall. CRITICAL gaps have been found in a feature implementation plan. Deep-dive each one:\n1. Is this truly CRITICAL or over-classified?\n2. Specific mitigation strategy\n3. Should this block implementation or be addressed in parallel?\n4. Priority order\n\nCRITICAL Findings:\n${criticalFindings}\n\nFull plan:\n${planContent}`);
            console.log(`    [OK] MiniMax M2.7 — ${((Date.now() - m27Start) / 1000).toFixed(1)}s`);
            debateResults.push({ name: 'Smart Escalation (MiniMax M2.7)', model: MODELS.minimaxM27, status: 'SUCCESS', text: m27Result.text, inputTokens: m27Result.inputTokens, outputTokens: m27Result.outputTokens, costUSD: (m27Result.inputTokens / 1_000_000 * 0.30) + (m27Result.outputTokens / 1_000_000 * 1.20), durationMs: Date.now() - m27Start });
          } catch (err) {
            console.error(`    [FAIL] MiniMax M2.7: ${err.message}`);
            debateResults.push({ name: 'Smart Escalation (MiniMax M2.7)', model: MODELS.minimaxM27, status: 'ERROR', text: `Error: ${err.message}`, inputTokens: 0, outputTokens: 0, costUSD: 0, durationMs: 0 });
          }
        }
      } else {
        console.log('');
        console.log('  ── Phase 3: Smart Escalation — SKIPPED (no CRITICAL gaps, all debates reached consensus) ──');
      }
    }

    // ── Generate report ──
    const results = [...phase1Results, ...debateResults];
    const { md, timestamp } = generateReport(results, files, startTime);
    const successCount = results.filter(r => r.status === 'SUCCESS').length;
    const totalCost = results.reduce((sum, r) => sum + (r.costUSD || 0), 0);
    const outputPaths = writeSplitOutput(results, files, md, timestamp);

    // Write web research sources report
    const groundedResults = results.filter(r => r.groundingMeta?.sources?.length);
    if (groundedResults.length > 0) {
      let researchMd = `# Web Research Sources Report\n\n> ${groundedResults.length} brain(s) performed real-time web research via Google Search Grounding\n\n---\n\n`;
      for (const r of groundedResults) {
        researchMd += `## ${r.name}\n**Model:** ${r.model}\n\n`;
        if (r.groundingMeta.searchQueries?.length) researchMd += `**Search queries:**\n${r.groundingMeta.searchQueries.map(q => `- "${q}"`).join('\n')}\n\n`;
        researchMd += `**Sources cited:**\n${r.groundingMeta.sources.map(s => `- ${s}`).join('\n')}\n\n---\n\n`;
      }
      writeFileSync(join(outputPaths.latestDir, 'web-research-sources.md'), researchMd, 'utf-8');
      writeFileSync(join(outputPaths.archiveDir, 'web-research-sources.md'), researchMd, 'utf-8');
    }

    // Write debate logs
    if (securityDebateLog) {
      writeFileSync(join(outputPaths.latestDir, 'security-planning-debate-log.md'), securityDebateLog, 'utf-8');
      writeFileSync(join(outputPaths.archiveDir, 'security-planning-debate-log.md'), securityDebateLog, 'utf-8');
    }
    if (archDebateLog) {
      writeFileSync(join(outputPaths.latestDir, 'architecture-planning-debate-log.md'), archDebateLog, 'utf-8');
      writeFileSync(join(outputPaths.archiveDir, 'architecture-planning-debate-log.md'), archDebateLog, 'utf-8');
    }
    if (designDebateLog) {
      writeFileSync(join(outputPaths.latestDir, 'design-planning-debate-log.md'), designDebateLog, 'utf-8');
      writeFileSync(join(outputPaths.archiveDir, 'design-planning-debate-log.md'), designDebateLog, 'utf-8');
    }

    // Write actionable outputs
    const archVerdict = debateResults.find(r => r.name.includes('Architecture Planning'));
    if (archVerdict?.status === 'SUCCESS') {
      const archPlan = `# Architecture Planning Consensus\n\n> Phase 2B: Claude Sonnet 4.6 ↔ Nemotron 3 Super\n> Consensus: ${archVerdict.consensusReached ? 'YES' : 'Final authority decided'}\n\n---\n\n${archVerdict.text}\n`;
      writeFileSync(join(outputPaths.latestDir, 'architecture-plan.md'), archPlan, 'utf-8');
      writeFileSync(join(outputPaths.archiveDir, 'architecture-plan.md'), archPlan, 'utf-8');
    }
    const designVerdict = debateResults.find(r => r.name.includes('UX/UI Design Planning'));
    if (designVerdict?.status === 'SUCCESS') {
      const designSpec = `# Design Specification Consensus\n\n> Phase 2C: Gemini 3.1 Pro (CTO) ↔ MiniMax M2.7\n> Consensus: ${designVerdict.consensusReached ? 'YES' : 'Final authority decided'}\n\n---\n\n${designVerdict.text}\n`;
      writeFileSync(join(outputPaths.latestDir, 'design-specification.md'), designSpec, 'utf-8');
      writeFileSync(join(outputPaths.archiveDir, 'design-specification.md'), designSpec, 'utf-8');
    }
    const secVerdict = debateResults.find(r => r.name.includes('Security Planning Debate'));
    if (secVerdict?.status === 'SUCCESS') {
      const secPlan = `# Security Planning Consensus\n\n> Phase 2A: Nemotron 3 Nano ↔ Nemotron 3 Super (FREE)\n> Consensus: ${secVerdict.consensusReached ? 'YES' : 'Final authority decided'}\n\n---\n\n${secVerdict.text}\n`;
      writeFileSync(join(outputPaths.latestDir, 'security-plan.md'), secPlan, 'utf-8');
      writeFileSync(join(outputPaths.archiveDir, 'security-plan.md'), secPlan, 'utf-8');
    }

    mkdirSync(CONFIG.legacyReportDir, { recursive: true });
    writeFileSync(join(CONFIG.legacyReportDir, 'LATEST.md'), md, 'utf-8');

    console.log('');
    console.log('  ════════════════════════════════════════════════════════');
    console.log(`  15-Brain PLANNING MODE (with Web Research) — Complete`);
    console.log(`  Plan:       ${opts.document}`);
    const groundedSummary = results.filter(r => r.groundingMeta?.sources?.length);
    if (groundedSummary.length > 0) {
      const totalSources = groundedSummary.reduce((sum, r) => sum + r.groundingMeta.sources.length, 0);
      console.log(`  Research:   ${groundedSummary.length} brain(s) cited ${totalSources} web sources`);
    }
    console.log(`  Output:     ${outputPaths.latestDir}/`);
    console.log(`  Validators: ${successCount}/${results.length} passed`);
    if (archVerdict?.status === 'SUCCESS') console.log(`  Arch Plan:  latest/architecture-plan.md`);
    if (designVerdict?.status === 'SUCCESS') console.log(`  Design:     latest/design-specification.md`);
    if (secVerdict?.status === 'SUCCESS') console.log(`  Security:   latest/security-plan.md`);
    console.log(`  Cost:       $${totalCost.toFixed(4)}`);
    console.log(`  Time:       ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log('  ════════════════════════════════════════════════════════');
    console.log('');
    console.log('  Next step: Review output as Opus CEO, then implement.');
    console.log('');
    return;
  }

  // ── Standard Code Review Mode ──
  const files = getRecentFiles(opts);

  if (files.length === 0) {
    console.error('  No code files found to validate.\n');
    console.error('  Usage:');
    console.error('    node scripts/validation-orchestrator.mjs                    # recent changes (2h)');
    console.error('    node scripts/validation-orchestrator.mjs --since 24h        # last 24 hours');
    console.error('    node scripts/validation-orchestrator.mjs --staged            # git staged files');
    console.error('    node scripts/validation-orchestrator.mjs --files src/App.tsx  # specific file');
    console.error('    node scripts/validation-orchestrator.mjs --files a.tsx b.mjs  # multiple files (space-separated)');
    console.error('    node scripts/validation-orchestrator.mjs --files a.tsx,b.mjs  # multiple files (comma-separated)');
    console.error('    node scripts/validation-orchestrator.mjs --document path/to/report.md  # review a document');
    process.exit(1);
  }

  console.log(`  Found ${files.length} file(s) to validate:`);
  files.forEach(f => console.log(`    ${f.path} (${(f.content.length / 1024).toFixed(1)} KB)`));
  console.log('');

  const codeBundle = formatCodeBundle(files);
  const fileNames = files.map(f => f.path).join(', ');
  const ctx = `SwanStudios is a personal training SaaS platform (React + TypeScript + styled-components frontend, Node.js + Express + Sequelize + PostgreSQL backend). Enchanted Apex: Crystalline Swan theme (frozen enchanted forest + deep-ocean luxury vault + competitive arena). Active palette: Midnight Sapphire #002060 (Primary), Royal Depth #003080 (Surface), Ice Wing #60C0F0 (Gaming Accent), Arctic Cyan #50A0F0 (Glow Accent — buttons, hovers, animations), Gilded Fern #C6A84B (Luxury Accent), Frost White #E0ECF4 (Background), Swan Lavender #4070C0 (Tertiary), Wing Purple #8B5CF6 (Secondary Accent). Typography: Plus Jakarta Sans (headings), Cormorant Garamond Italic (drama), Fira Code (data), Sora (UI/gaming). RETIRED Galaxy-Swan theme (#0a0a1a, #00FFFF, #7851A9) — do NOT use. Production: sswanstudios.com. Files: ${fileNames}`;
  const tracks = buildValidatorTracks(codeBundle, files);

  // All tracks are Phase 1 now — Phase 2+3 are recursive debates
  const phase1Tracks = tracks;
  const totalPhases = hasGemini31 ? 3 : 1;

  console.log(`  Phase 1: Launching ${phase1Tracks.length} validators (staggered 2s apart)...`);
  if (hasGemini31) {
    console.log(`  Phase 2: 3 Specialty Debates (Security, Code Quality, UX/UI)...`);
    console.log(`  Phase 3: Smart Escalation (only if CRITICAL findings or stalled debates)...`);
  }
  console.log('');

  // ── Phase 1: Run all standard tracks in parallel ──
  const phase1Results = await Promise.all(phase1Tracks.map(async (track, index) => {
    const tag = track.name.padEnd(35);
    const modelShort = track.model.split('/').pop();
    console.log(`    [P1 ${index + 1}/${phase1Tracks.length}] ${tag} -> ${modelShort}`);
    const result = await runValidator(apiKey, track, index);
    const badge = result.status === 'SUCCESS' ? 'OK  ' : 'FAIL';
    console.log(`    [${badge}] ${tag} ${(result.durationMs / 1000).toFixed(1)}s`);
    return result;
  }));

  // ── Build Phase 1 summary for Phase 2+3 context ──
  const phase1Summary = phase1Results
    .filter(r => r.status === 'SUCCESS')
    .map(r => `### ${r.name} (${r.model})\n${r.text.slice(0, 2000)}${r.text.length > 2000 ? '\n... (truncated)' : ''}`)
    .join('\n\n---\n\n');

  const uxReport = phase1Results.find(r => r.name === 'UX & Accessibility' && r.status === 'SUCCESS')?.text || null;

  // ── Phase 2: Code Quality Recursive Debate ──
  const debateResults = [];
  let phase2DebateLog = null;
  let phase3DebateLog = null;

  // Helper to call either OpenRouter or Gemini based on provider
  async function callModelForDebate(provider, model, prompt) {
    if (provider === 'gemini-direct') {
      return callGeminiDirect(getGeminiKey(), model, prompt);
    } else {
      return callOpenRouter(apiKey, model, prompt);
    }
  }

  if (hasGemini31) {
    // ── Phase 2A: Security Specialty Debate (FREE) ──
    console.log('');
    console.log('  ── Phase 2A: Security Specialty Debate ──');
    console.log('  Nemotron 3 Nano ↔ Nvidia Nemotron 3 Super (both FREE)');
    console.log('  Max 5 rounds');
    console.log('');

    try {
      const p2aStart = Date.now();
      const securityReport = phase1Results.find(r => r.name === 'Security' && r.status === 'SUCCESS')?.text || '';
      const nemotronReport = phase1Results.find(r => r.name === 'Security II (Nemotron)' && r.status === 'SUCCESS')?.text || '';
      const p2aResult = await runRecursiveConsensus({
        topic: 'Security Analysis',
        modelA: {
          name: 'Nemotron 3 Nano',
          model: MODELS.nemotron3Nano,
          provider: 'openrouter',
          role: 'Primary Security Auditor',
        },
        modelB: {
          name: 'Nemotron 3 Super',
          model: MODELS.nemotron3Super,
          provider: 'openrouter',
          role: 'Secondary Security Auditor (120B MoE)',
        },
        finalAuthority: 'A', // Step 3.5 = primary security authority (74.4% SWE-bench)
        initialPrompt: `You are the PRIMARY security auditor. Here are both security scan results from Phase 1. Identify areas of agreement and disagreement. For disagreements, provide evidence.\n\n## Your Phase 1 Report:\n${securityReport}\n\n## Nemotron's Phase 1 Report:\n${nemotronReport}\n\n## CODE:\n${codeBundle}`,
        callModel: callModelForDebate,
        onRound: (round, speaker, text) => {
          console.log(`    [P2A R${round}] ${speaker.padEnd(20)} ${text.slice(0, 80).replace(/\n/g, ' ')}...`);
        },
      });
      const p2aDuration = Date.now() - p2aStart;
      console.log(`    [${p2aResult.consensusReached ? 'CONSENSUS' : 'AUTHORITY'}] Phase 2A — ${p2aResult.rounds.length} rounds, ${(p2aDuration / 1000).toFixed(1)}s`);
      debateResults.push({
        name: 'Security Debate (Phase 2A)',
        model: `${MODELS.nemotron3Nano} ↔ ${MODELS.nemotron3Super}`,
        status: 'SUCCESS', text: p2aResult.finalVerdict,
        inputTokens: p2aResult.totalTokens.input, outputTokens: p2aResult.totalTokens.output,
        costUSD: 0, // Both models are FREE
        durationMs: p2aDuration, debateLog: p2aResult.debateLog, consensusReached: p2aResult.consensusReached,
      });
    } catch (err) {
      console.error(`    [FAIL] Phase 2A: ${err.message}`);
      debateResults.push({ name: 'Security Debate (Phase 2A)', model: `${MODELS.nemotron3Nano} ↔ ${MODELS.nemotron3Super}`, status: 'ERROR', text: `Error: ${err.message}`, inputTokens: 0, outputTokens: 0, costUSD: 0, durationMs: 0 });
    }

    // ── Phase 2B: Code Quality Specialty Debate (mixed cost) ──
    console.log('');
    console.log('  ── Phase 2B: Code Quality Specialty Debate ──');
    console.log('  Claude Sonnet 4.6 ↔ Nemotron 3 Super:free');
    console.log('  Max 5 rounds · Claude = final authority');
    console.log('');

    try {
      const p2bStart = Date.now();
      const phase2Result = await runRecursiveConsensus({
        topic: 'Code Quality & Architecture',
        modelA: {
          name: 'Claude Sonnet 4.6',
          model: MODELS.claudeSonnet46,
          provider: 'openrouter',
          role: 'Senior Code Quality Lead',
        },
        modelB: {
          name: 'Nemotron 3 Super',
          model: MODELS.nemotron3Super,
          provider: 'openrouter',
          role: 'Code Architecture Specialist (1M context)',
        },
        finalAuthority: 'A', // Claude Sonnet = final say on code quality
        initialPrompt: buildPhase2DebatePrompt(codeBundle, ctx, phase1Summary),
        callModel: callModelForDebate,
        onRound: (round, speaker, text) => {
          console.log(`    [P2B R${round}] ${speaker.padEnd(20)} ${text.slice(0, 80).replace(/\n/g, ' ')}...`);
        },
      });
      const p2bDuration = Date.now() - p2bStart;
      phase2DebateLog = phase2Result.debateLog;
      console.log(`    [${phase2Result.consensusReached ? 'CONSENSUS' : 'AUTHORITY'}] Phase 2B — ${phase2Result.rounds.length} rounds, ${(p2bDuration / 1000).toFixed(1)}s`);
      debateResults.push({
        name: 'Code Quality Debate (Phase 2B)',
        model: `${MODELS.claudeSonnet46} ↔ ${MODELS.nemotron3Super}`,
        status: 'SUCCESS', text: phase2Result.finalVerdict,
        inputTokens: phase2Result.totalTokens.input, outputTokens: phase2Result.totalTokens.output,
        costUSD: (phase2Result.totalTokens.input / 1_000_000 * 1.5) + (phase2Result.totalTokens.output / 1_000_000 * 7.5), // Only Claude costs, Qwen is free
        durationMs: p2bDuration, debateLog: phase2Result.debateLog, consensusReached: phase2Result.consensusReached,
      });
    } catch (err) {
      console.error(`    [FAIL] Phase 2B: ${err.message}`);
      debateResults.push({ name: 'Code Quality Debate (Phase 2B)', model: `${MODELS.claudeSonnet46} ↔ ${MODELS.nemotron3Super}`, status: 'ERROR', text: `Error: ${err.message}`, inputTokens: 0, outputTokens: 0, costUSD: 0, durationMs: 0 });
    }

    // ── Phase 2C: UX/UI Design Specialty Debate ──
    console.log('');
    console.log('  ── Phase 2C: UX/UI Design Specialty Debate ──');
    console.log('  Gemini 3.1 Pro (Creative Dir) ↔ MiniMax M2.7');
    console.log('  Max 5 rounds · Gemini = final authority on design');
    console.log('');

    try {
      const p2cStart = Date.now();
      const phase3Result = await runRecursiveConsensus({
        topic: 'UX/UI Design Quality',
        modelA: {
          name: 'Gemini 3.1 Pro',
          model: MODELS.gemini31Pro,
          provider: 'gemini-direct',
          role: 'Creative Director (Lead Design Authority)',
        },
        modelB: {
          name: 'MiniMax M2.7',
          model: MODELS.minimaxM27,
          provider: 'openrouter',
          role: 'Design Implementation Reviewer',
        },
        finalAuthority: 'A', // Gemini = Creative Director = final say on design
        initialPrompt: buildPhase3DesignPrompt(codeBundle, ctx, uxReport),
        callModel: callModelForDebate,
        onRound: (round, speaker, text) => {
          console.log(`    [P2C R${round}] ${speaker.padEnd(20)} ${text.slice(0, 80).replace(/\n/g, ' ')}...`);
        },
      });
      const p2cDuration = Date.now() - p2cStart;
      phase3DebateLog = phase3Result.debateLog;
      console.log(`    [${phase3Result.consensusReached ? 'CONSENSUS' : 'AUTHORITY'}] Phase 2C — ${phase3Result.rounds.length} rounds, ${(p2cDuration / 1000).toFixed(1)}s`);
      debateResults.push({
        name: 'UX/UI Design Debate (Phase 2C)',
        model: `${MODELS.gemini31Pro} ↔ ${MODELS.minimaxM27}`,
        status: 'SUCCESS', text: phase3Result.finalVerdict,
        inputTokens: phase3Result.totalTokens.input, outputTokens: phase3Result.totalTokens.output,
        costUSD: (phase3Result.totalTokens.input / 1_000_000 * 1.0) + (phase3Result.totalTokens.output / 1_000_000 * 6.0), // Only Gemini costs, M2.5 is free
        durationMs: p2cDuration, debateLog: phase3Result.debateLog, consensusReached: phase3Result.consensusReached,
      });
    } catch (err) {
      console.error(`    [FAIL] Phase 2C: ${err.message}`);
      debateResults.push({ name: 'UX/UI Design Debate (Phase 2C)', model: `${MODELS.gemini31Pro} ↔ ${MODELS.minimaxM27}`, status: 'ERROR', text: `Error: ${err.message}`, inputTokens: 0, outputTokens: 0, costUSD: 0, durationMs: 0 });
    }

    // ── Phase 3: Smart Escalation (only for CRITICAL findings or stalled debates) ──
    const allDebateTexts = debateResults.map(r => r.text || '').join('\n');
    const hasCritical = allDebateTexts.toUpperCase().includes('CRITICAL');
    const hasStalled = debateResults.some(r => r.consensusReached === false);

    if (hasCritical || hasStalled) {
      console.log('');
      console.log('  ── Phase 3: Smart Escalation (CRITICAL/stalled detected) ──');

      if (hasStalled) {
        console.log('  Nemotron Nano Escalation — resolving stalled debate...');
        try {
          const mercStart = Date.now();
          const stalledDebates = debateResults.filter(r => r.consensusReached === false).map(r => `### ${r.name}\n${r.text}`).join('\n\n');
          const mercResult = await callOpenRouter(apiKey, MODELS.escalation1, `You are Nemotron Nano Escalation — the fastest reasoning model. A debate between AI models has stalled without consensus. Review the contested points and provide a FINAL RULING on each one.\n\nStalled Debates:\n${stalledDebates}\n\nFor each contested point: AGREE with Model A, AGREE with Model B, or provide your OWN ruling with evidence.`);
          console.log(`    [OK] Nemotron Nano Escalation escalation — ${((Date.now() - mercStart) / 1000).toFixed(1)}s`);
          debateResults.push({
            name: 'Smart Escalation (Nemotron Nano Escalation)', model: MODELS.escalation1,
            status: 'SUCCESS', text: mercResult.text,
            inputTokens: mercResult.inputTokens, outputTokens: mercResult.outputTokens,
            costUSD: (mercResult.inputTokens / 1_000_000 * 0.25) + (mercResult.outputTokens / 1_000_000 * 0.75),
            durationMs: Date.now() - mercStart,
          });
        } catch (err) {
          console.error(`    [FAIL] Nemotron Nano Escalation: ${err.message}`);
          debateResults.push({ name: 'Smart Escalation (Nemotron Nano Escalation)', model: MODELS.escalation1, status: 'ERROR', text: `Error: ${err.message}`, inputTokens: 0, outputTokens: 0, costUSD: 0, durationMs: 0 });
        }
      }

      if (hasCritical) {
        console.log('  MiniMax M2.7 — deep-diving CRITICAL findings...');
        try {
          const m27Start = Date.now();
          const criticalFindings = allDebateTexts.split('\n').filter(l => l.toUpperCase().includes('CRITICAL')).slice(0, 20).join('\n');
          const m27Result = await callOpenRouter(apiKey, MODELS.minimaxM27, `You are MiniMax M2.7 — the #3 ranked AI overall, #2 in Programming. CRITICAL security and code findings have been detected by the AI Village. Deep-dive into each one and provide:\n1. Is this truly CRITICAL or over-classified?\n2. Exact fix with code snippet\n3. Blast radius — how many users affected?\n4. Priority order for fixing\n\nCRITICAL Findings:\n${criticalFindings}\n\nFull context:\n${codeBundle}`);
          console.log(`    [OK] MiniMax M2.7 escalation — ${((Date.now() - m27Start) / 1000).toFixed(1)}s`);
          debateResults.push({
            name: 'Smart Escalation (MiniMax M2.7)', model: MODELS.minimaxM27,
            status: 'SUCCESS', text: m27Result.text,
            inputTokens: m27Result.inputTokens, outputTokens: m27Result.outputTokens,
            costUSD: (m27Result.inputTokens / 1_000_000 * 0.30) + (m27Result.outputTokens / 1_000_000 * 1.20),
            durationMs: Date.now() - m27Start,
          });
        } catch (err) {
          console.error(`    [FAIL] MiniMax M2.7: ${err.message}`);
          debateResults.push({ name: 'Smart Escalation (MiniMax M2.7)', model: MODELS.minimaxM27, status: 'ERROR', text: `Error: ${err.message}`, inputTokens: 0, outputTokens: 0, costUSD: 0, durationMs: 0 });
        }
      }
    } else {
      console.log('');
      console.log('  ── Phase 3: Smart Escalation — SKIPPED (no CRITICAL findings, all debates reached consensus) ──');
    }
  }

  const results = [...phase1Results, ...debateResults];

  console.log('');

  const { md, timestamp } = generateReport(results, files, startTime);
  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const totalCost = results.reduce((sum, r) => sum + (r.costUSD || 0), 0);

  // ── Write section-specific files to AI Village ──
  const outputPaths = writeSplitOutput(results, files, md, timestamp);

  // ── Write debate logs (Phase 2 + 3) ──
  if (phase2DebateLog) {
    writeFileSync(join(outputPaths.latestDir, 'debate-log.md'), phase2DebateLog, 'utf-8');
    writeFileSync(join(outputPaths.archiveDir, 'debate-log.md'), phase2DebateLog, 'utf-8');
  }
  if (phase3DebateLog) {
    writeFileSync(join(outputPaths.latestDir, 'design-debate-log.md'), phase3DebateLog, 'utf-8');
    writeFileSync(join(outputPaths.archiveDir, 'design-debate-log.md'), phase3DebateLog, 'utf-8');
  }

  // ── Write fix-instructions.md (actionable from Phase 2B code quality consensus) ──
  const phase2bVerdict = debateResults.find(r => r.name.includes('Code Quality'));
  if (phase2bVerdict?.status === 'SUCCESS') {
    const fixInstructions = `# Fix Instructions — Code Quality Consensus\n\n> Generated from Phase 2B specialty debate (Claude Sonnet 4.6 ↔ Nemotron 3 Super)\n> Consensus: ${phase2bVerdict.consensusReached ? 'YES' : 'Final authority decided'}\n\n---\n\n${phase2bVerdict.text}\n`;
    writeFileSync(join(outputPaths.latestDir, 'fix-instructions.md'), fixInstructions, 'utf-8');
    writeFileSync(join(outputPaths.archiveDir, 'fix-instructions.md'), fixInstructions, 'utf-8');
  }

  // ── Write design-recommendations.md (actionable from Phase 2C UX/UI consensus) ──
  const phase2cVerdict = debateResults.find(r => r.name.includes('UX/UI'));
  if (phase2cVerdict?.status === 'SUCCESS') {
    const designRecs = `# Design Recommendations — UX/UI Consensus\n\n> Generated from Phase 2C specialty debate (Gemini 3.1 Pro ↔ MiniMax M2.7)\n> Consensus: ${phase2cVerdict.consensusReached ? 'YES' : 'Final authority decided'}\n\n---\n\n${phase2cVerdict.text}\n`;
    writeFileSync(join(outputPaths.latestDir, 'design-recommendations.md'), designRecs, 'utf-8');
    writeFileSync(join(outputPaths.archiveDir, 'design-recommendations.md'), designRecs, 'utf-8');
  }

  // ── Write security-consensus.md (actionable from Phase 2A security debate) ──
  const phase2aVerdict = debateResults.find(r => r.name.includes('Security Debate'));
  if (phase2aVerdict?.status === 'SUCCESS') {
    const securityRecs = `# Security Consensus\n\n> Generated from Phase 2A specialty debate (Nemotron 3 Nano ↔ Nemotron 3 Super)\n> Consensus: ${phase2aVerdict.consensusReached ? 'YES' : 'Final authority decided'}\n\n---\n\n${phase2aVerdict.text}\n`;
    writeFileSync(join(outputPaths.latestDir, 'security-consensus.md'), securityRecs, 'utf-8');
    writeFileSync(join(outputPaths.archiveDir, 'security-consensus.md'), securityRecs, 'utf-8');
  }

  // ── Legacy mirror (backwards compat) ──
  mkdirSync(CONFIG.legacyReportDir, { recursive: true });
  writeFileSync(join(CONFIG.legacyReportDir, 'LATEST.md'), md, 'utf-8');

  const totalValidators = phase1Tracks.length + debateResults.length;
  console.log('  ════════════════════════════════════════════════════════');
  console.log(`  15-Brain Recursive Consensus System — Complete`);
  console.log(`  AI Village Output:`);
  console.log(`    Latest:     ${outputPaths.latestDir}/`);
  console.log(`    Summary:    ${outputPaths.summary}`);
  if (phase2DebateLog) console.log(`    Debate Log: latest/debate-log.md`);
  if (phase3DebateLog) console.log(`    Design Log: latest/design-debate-log.md`);
  console.log(`    Archive:    ${outputPaths.archiveDir}/`);
  console.log(`  Phase 1:  ${successCount}/${phase1Tracks.length} validators passed`);
  if (debateResults.length > 0) {
    const debateSuccess = debateResults.filter(r => r.status === 'SUCCESS').length;
    console.log(`  Phase 2:  ${debateSuccess}/${debateResults.length} specialty debates + escalations`);
  }
  console.log(`  Cost:     $${totalCost.toFixed(4)}`);
  console.log(`  Time:     ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log('  ════════════════════════════════════════════════════════');
  console.log('');
}

// ─────────────────────────────────────────────
// Split Output Writer (AI Village)
// ─────────────────────────────────────────────

// Track name → clean filename mapping
const TRACK_SLUGS = {
  // Code review tracks
  'UX & Accessibility': '01-ux-accessibility',
  'Code Quality': '02-code-quality',
  'Security': '03-security',
  'Performance & Scalability': '04-performance',
  'Competitive Intelligence': '05-competitive-intel',
  'User Research & Persona Alignment': '06-user-research',
  'Architecture & Bug Hunter': '07-architecture-bugs',
  'Frontend UX & Code Patterns': '08-frontend-ux-patterns',
  'Data Safety & Integrity': '09-data-safety',
  'Security II (Nemotron)': '10-security-nemotron',
  'Code Architecture (Qwen)': '11-code-architecture-qwen',
  'Bug Hunter II (Step)': '12-bug-hunter-step',
  'Security Debate (Phase 2A)': '13-security-debate',
  'Code Quality Debate (Phase 2B)': '14-code-quality-debate',
  'UX/UI Design Debate (Phase 2C)': '15-design-debate',
  'Smart Escalation (Nemotron Nano Escalation)': '16-escalation-mercury',
  'Smart Escalation (MiniMax M2.7)': '17-escalation-minimax',
  // Legacy slugs (backwards compat)
  'Code Quality Debate (Phase 2)': '14-code-quality-debate',
  'UX/UI Design Debate (Phase 3)': '15-design-debate',
  // Document review tracks
  'Technical Accuracy': '01-technical-accuracy',
  'Strategic Analysis': '02-strategic-analysis',
  'UX/Design Gap Validation': '03-ux-design-gaps',
  'Business & Revenue Validation': '04-business-revenue',
  'Gamification & Engagement Review': '05-gamification-engagement',
  'NASM & Fitness Science Validation': '06-nasm-fitness-science',
  'Security & Privacy Assessment': '07-security-privacy',
  'Architecture & Implementation Gap': '08-architecture-implementation',
  'Document Quality & Completeness': '09-document-quality',
  // Planning mode tracks
  'UX Research & Competitor Analysis': '01-ux-research',
  'Architecture & Component Design': '02-architecture-design',
  'Security & Privacy Planning': '03-security-planning',
  'Performance & Bundle Impact': '04-performance-planning',
  'Competitive Intelligence': '05-competitive-intel',
  'User Persona Alignment': '06-persona-alignment',
  'Implementation Risk Assessment': '07-risk-assessment',
  'Frontend Patterns & React Best Practices': '08-frontend-patterns',
  'Data Safety & Schema Impact': '09-data-safety-planning',
  'API Design & Backend Contracts': '10-api-design',
  'Module Architecture & File Budget': '11-module-architecture',
  'Mobile & Edge Case Analysis': '12-mobile-edge-cases',
  'Security Planning Debate (Phase 2A)': '13-security-planning-debate',
  'Architecture Planning Debate (Phase 2B)': '14-architecture-planning-debate',
  'UX/UI Design Planning Debate (Phase 2C)': '15-design-planning-debate',
};

function writeSplitOutput(results, files, fullReport, timestamp) {
  const latestDir = join(CONFIG.promptDir, 'latest');
  const archiveDir = join(CONFIG.promptDir, 'archive', timestamp);

  mkdirSync(latestDir, { recursive: true });
  mkdirSync(archiveDir, { recursive: true });

  const fileNames = files.map(f => f.path).join(', ');
  const now = new Date().toLocaleString();

  // ── Write individual track files to latest/ ──
  for (const r of results) {
    const slug = TRACK_SLUGS[r.name] || r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const badge = r.status === 'SUCCESS' ? 'PASS' : 'FAIL';
    const content = `# ${r.name} — Validation Report

> **Status:** ${badge} | **Model:** ${r.model} | **Duration:** ${(r.durationMs / 1000).toFixed(1)}s
> **Files:** ${fileNames}
> **Generated:** ${now}

---

${r.text}

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
`;
    writeFileSync(join(latestDir, `${slug}.md`), content, 'utf-8');
    writeFileSync(join(archiveDir, `${slug}.md`), content, 'utf-8');
  }

  // ── Write summary.md (quick aggregate) to latest/ ──
  const summary = buildSummaryPrompt(results, files);
  writeFileSync(join(latestDir, 'summary.md'), summary, 'utf-8');
  writeFileSync(join(archiveDir, 'summary.md'), summary, 'utf-8');

  // ── Write full report to archive ──
  writeFileSync(join(archiveDir, 'full-report.md'), fullReport, 'utf-8');

  // ── Rotate archive: keep max 20 runs ──
  rotateArchive();

  return {
    latestDir,
    archiveDir,
    summary: join(latestDir, 'summary.md'),
  };
}

function buildSummaryPrompt(results, files) {
  const fileNames = files.map(f => f.path).join(', ');
  const now = new Date().toLocaleString();
  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const totalCost = results.reduce((sum, r) => sum + (r.costUSD || 0), 0);

  // Extract findings by severity
  const criticals = [];
  const highs = [];
  const mediums = [];

  for (const r of results) {
    if (r.status !== 'SUCCESS') continue;
    for (const line of r.text.split('\n')) {
      const upper = line.toUpperCase();
      if (line.startsWith('#') || line.startsWith('|')) continue;
      if (upper.includes('CRITICAL')) criticals.push(`[${r.name}] ${line.trim()}`);
      else if (upper.includes('HIGH')) highs.push(`[${r.name}] ${line.trim()}`);
      else if (upper.includes('MEDIUM')) mediums.push(`[${r.name}] ${line.trim()}`);
    }
  }

  return `# Validation Summary — ${now}

> **Files:** ${fileNames}
> **Validators:** ${successCount}/7 passed | **Cost:** $${totalCost.toFixed(4)}

## Quick Status

| # | Track | Status | Time |
|---|-------|--------|------|
${results.map((r, i) => `| ${i + 1} | ${r.name} | ${r.status === 'SUCCESS' ? 'PASS' : 'FAIL'} | ${(r.durationMs / 1000).toFixed(1)}s |`).join('\n')}

## CRITICAL Findings (fix now)
${criticals.length > 0 ? criticals.slice(0, 10).join('\n') : '_None._'}

## HIGH Findings (fix before deploy)
${highs.length > 0 ? highs.slice(0, 10).join('\n') : '_None._'}

## MEDIUM Findings (fix this sprint)
${mediums.length > 0 ? mediums.slice(0, 10).join('\n') : '_None._'}

---

## Individual Reports

Each track has its own file — read only the ones relevant to your task:

| File | When to Read |
|------|-------------|
| \`01-ux-accessibility.md\` | UI/UX changes, styling, responsive design |
| \`02-code-quality.md\` | TypeScript, React patterns, code structure |
| \`03-security.md\` | Auth, API security, input validation |
| \`04-performance.md\` | Bundle size, rendering, database queries |
| \`05-competitive-intel.md\` | Feature gaps, market positioning |
| \`06-user-research.md\` | User flows, persona alignment, onboarding |
| \`07-architecture-bugs.md\` | Bugs, architecture issues, tech debt |
| \`08-frontend-ux-patterns.md\` | React patterns, styled-components, animations |
| \`09-data-safety.md\` | Data integrity, destructive operations, PII |
| \`10-security-nemotron.md\` | Security II — Nemotron 3 Super deep scan |
| \`11-code-architecture-qwen.md\` | Code Architecture — Nemotron 3 Super review |
| \`12-bug-hunter-step.md\` | Bug Hunter II — edge cases, race conditions |
| \`13-security-debate.md\` | Phase 2A: Security debate (Step ↔ Nemotron) |
| \`14-code-quality-debate.md\` | Phase 2B: Code quality debate (Claude ↔ Qwen) |
| \`15-design-debate.md\` | Phase 2C: UX/UI debate (Gemini ↔ M2.5:free) |
| \`debate-log.md\` | Full Phase 2B code quality debate transcript |
| \`design-debate-log.md\` | Full Phase 2C design debate transcript |
| \`fix-instructions.md\` | Actionable code fixes from Phase 2B consensus |
| \`design-recommendations.md\` | Actionable design fixes from Phase 2C consensus |
| \`security-consensus.md\` | Security consensus from Phase 2A debate |

*SwanStudios 15-Brain Recursive Consensus System v14.0*
`;
}

function rotateArchive() {
  const archiveRoot = join(CONFIG.promptDir, 'archive');
  if (!existsSync(archiveRoot)) return;

  try {
    const runs = readdirSync(archiveRoot, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort(); // ISO timestamps sort chronologically

    if (runs.length > CONFIG.maxArchiveRuns) {
      const toDelete = runs.slice(0, runs.length - CONFIG.maxArchiveRuns);
      for (const dir of toDelete) {
        rmSync(join(archiveRoot, dir), { recursive: true, force: true });
        console.log(`    [ROTATE] Deleted old archive: ${dir}`);
      }
    }
  } catch {
    // Archive rotation is non-critical — don't fail the whole run
  }
}

// ─────────────────────────────────────────────
// Handoff Prompt Builder (legacy — kept for backwards compat)
// ─────────────────────────────────────────────

function buildHandoffPrompt(results, files) {
  const successResults = results.filter(r => r.status === 'SUCCESS');
  const fileNames = files.map(f => f.path).join(', ');

  // Extract all CRITICAL and HIGH findings
  const criticals = [];
  const highs = [];
  const mediums = [];

  for (const r of successResults) {
    const lines = r.text.split('\n');
    for (const line of lines) {
      const upper = line.toUpperCase();
      if (upper.includes('CRITICAL') && !line.startsWith('#') && !line.startsWith('|')) {
        criticals.push(`[${r.name}] ${line.trim()}`);
      } else if (upper.includes('HIGH') && !line.startsWith('#') && !line.startsWith('|')) {
        highs.push(`[${r.name}] ${line.trim()}`);
      } else if (upper.includes('MEDIUM') && !line.startsWith('#') && !line.startsWith('|')) {
        mediums.push(`[${r.name}] ${line.trim()}`);
      }
    }
  }

  return `# SwanStudios Validation Handoff — Paste This Into Claude Code or Gemini

I just ran the 11-Brain Recursive Consensus System on these files: ${fileNames}

Here is a consolidated summary of all findings from Phase 1 (8 parallel validators) + Phase 2 (code quality debate) + Phase 3 (design debate). Please analyze these findings, prioritize them, create an action plan, and fix the CRITICAL and HIGH issues.

---

## Validator Results Summary

${successResults.map(r => `### ${r.name} (${r.model})
${r.text.slice(0, 3000)}${r.text.length > 3000 ? '\n\n... (truncated — see full report)' : ''}
`).join('\n---\n\n')}

---

## Consolidated Priority Findings

### CRITICAL (fix immediately)
${criticals.length > 0 ? criticals.slice(0, 15).join('\n') : 'None found.'}

### HIGH (fix before next deploy)
${highs.length > 0 ? highs.slice(0, 15).join('\n') : 'None found.'}

### MEDIUM (fix this sprint)
${mediums.length > 0 ? mediums.slice(0, 15).join('\n') : 'None found.'}

---

## Your Task

1. Read through all 7 validator reports above
2. Identify which findings are real issues vs false positives
3. Prioritize: CRITICAL first, then HIGH, then MEDIUM
4. For each real issue, provide the exact fix (file, line, code change)
5. Group related fixes that can be done together
6. Implement the fixes in order of priority

Files reviewed: ${fileNames}
Project: SwanStudios (React + TypeScript + styled-components, Crystalline Swan theme)
`;
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
