#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║         SwanStudios 11-Brain Recursive Consensus System         ║
 * ║           OpenRouter + Google GenAI + Recursive Debates          ║
 * ║                                                                  ║
 * ║  Phase 1 — 9 parallel analysts (OpenRouter):                      ║
 * ║  1. Gemini 2.5 Flash     → UX / Accessibility        (FREE)    ║
 * ║  2. Claude 4.5 Sonnet   → Code Quality               (FREE)    ║
 * ║  3. Step 3.5 Flash       → Security scan              (FREE)    ║
 * ║  4. Gemini 3 Flash       → Performance review         (FREE)    ║
 * ║  5. MiniMax M2.1         → Competitive intelligence   (FREE)    ║
 * ║  6. DeepSeek V3.2        → User research / personas   (FREE)    ║
 * ║  7. MiniMax M2.5         → Architecture & Bug Hunter  (~$0.01)  ║
 * ║  8. Gemini 3.1 Flash     → Frontend UX & Code Patterns (FREE)  ║
 * ║  9. Claude 4.5 Sonnet   → Data Safety & Integrity     (FREE)  ║
 * ║                                                                  ║
 * ║  Phase 2 — RECURSIVE CODE QUALITY DEBATE:                       ║
 * ║  10. Gemini 3.1 Pro (CTO) ↔ Claude 4.5 Sonnet (CEO)            ║
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
  // ── VERIFIED FREE on OpenRouter ──
  gemini25Flash:  'google/gemini-2.5-flash',           // FREE — fast, great at structured analysis
  gemini3Flash:   'google/gemini-3-flash-preview-20251217', // FREE — solid for performance review
  gemini31Flash:  'google/gemini-3.1-flash-lite-preview', // FREE — latest Flash lite, strong at code review
  deepseekV3:     'deepseek/deepseek-v3.2-20251201',  // FREE — user research / personas
  step35Flash:    'stepfun/step-3.5-flash:free',       // FREE — 256K ctx, 74.4% SWE-bench, security specialist
  minimaxM21:     'minimax/minimax-m2.1',              // FREE
  claudeSonnet45: 'anthropic/claude-4.5-sonnet-20250929', // FREE on OpenRouter — also used in Phase 2 debate
  // ── PAID models (clearly marked) ──
  minimaxM25:     'minimax/minimax-m2.5',              // ~$0.005/run — #1 programming
  // ── Google GenAI (direct API, not via OpenRouter) ──
  gemini31Pro:    'gemini-3.1-pro-preview',            // Direct Google API — Phase 2+3 recursive debates
  // ── EXPENSIVE (DO NOT USE in orchestrator) ──
  // claudeOpus:  'anthropic/claude-4.6-opus-20260205' // $5/$25 per M tokens — use via CLI subscription instead
};

const CONFIG = {
  maxCodeChars: 60_000,
  // Primary output: AI Village folder (where you already look for things)
  promptDir: join(ROOT, 'AI-Village-Documentation', 'validation-prompts'),
  // Legacy mirror (kept for backwards compat)
  legacyReportDir: join(ROOT, 'docs', 'ai-workflow', 'validation-reports'),
  timeout: 180_000,  // 3 min — free models can be slower
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
  const opts = { files: [], since: null, staged: false };
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
      model: MODELS.claudeSonnet45,
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
      model: MODELS.step35Flash,
      prompt: `You are a security auditor specializing in web application security. You are Step 3.5 Flash — a reasoning model with 74.4% SWE-bench accuracy. Use your deep reasoning to find subtle security flaws. ${ctx}

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
      model: MODELS.minimaxM21,
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
      model: MODELS.deepseekV3,
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
      model: MODELS.minimaxM25,
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
      model: MODELS.claudeSonnet45,
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
  ];

  // Phase 2 + 3 are now recursive debates — handled in main() via runRecursiveConsensus()
  // The old single-pass Gemini track is replaced by debate loops.

  return tracks;
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
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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

async function callGeminiDirect(apiKey, model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    }),
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

  return {
    text,
    inputTokens: usage.promptTokenCount || estimateTokens(prompt),
    outputTokens: usage.candidatesTokenCount || estimateTokens(text),
    model: `google/${model}`,
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
      result = await callGeminiDirect(geminiKey, track.model, track.prompt);
    } else {
      result = await callOpenRouter(apiKey, track.model, track.prompt);
    }

    // Cost tracking
    let costUSD = 0;
    if (track.model === MODELS.minimaxM25) {
      costUSD = (result.inputTokens / 1_000_000 * 0.295) +
                (result.outputTokens / 1_000_000 * 1.20);
    } else if (track.model === MODELS.gemini31Pro) {
      // Gemini 3.1 Pro: $2/M input, $12/M output (estimate)
      costUSD = (result.inputTokens / 1_000_000 * 2.0) +
                (result.outputTokens / 1_000_000 * 12.0);
    }
    // Safety: warn if a "free" model somehow reports cost
    const isPaidModel = track.model === MODELS.minimaxM25 || track.model === MODELS.gemini31Pro || track.model === MODELS.step35Flash;
    if (!isPaidModel && costUSD > 0.01) {
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

  for (const r of results) {
    const badge = r.status === 'SUCCESS' ? 'PASS' : 'FAIL';
    md += `## [${badge}] ${r.name}
**Model:** ${r.model} | **Duration:** ${(r.durationMs / 1000).toFixed(1)}s

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

*SwanStudios 11-Brain Recursive Consensus System v11.0*
*Phase 1: Gemini 2.5 Flash + Claude 4.5 Sonnet + Step 3.5 Flash + Gemini 3 Flash + Gemini 3.1 Flash + DeepSeek V3.2 + MiniMax M2.1 + MiniMax M2.5*
*Phase 2: Gemini 3.1 Pro (CTO) ↔ Claude Sonnet (CEO) recursive debate*
*Phase 3: Gemini 3.1 Pro (Creative Dir) ↔ Claude Sonnet (Collaborator) recursive debate*
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
  const brainCount = hasGemini31 ? 11 : 9;

  console.log('');
  console.log('  ╔══════════════════════════════════════════════════════════╗');
  console.log('  ║    SwanStudios 11-Brain Recursive Consensus System      ║');
  const subtitle = hasGemini31
    ? `${brainCount}-Brain — Recursive Debates ENABLED`
    : `9-Brain — Phase 1 only (add GEMINI_API_KEY for 11-Brain)`;
  console.log(`  ║    ${subtitle.padEnd(54)}║`);
  console.log('  ║                                                          ║');
  console.log('  ║    Phase 1: 9 Parallel Validators (OpenRouter)          ║');
  console.log('  ║    Gemini 2.5 Flash · Claude Sonnet · Step 3.5 Flash   ║');
  console.log('  ║    Gemini 3 Flash · Gemini 3.1 Flash · DeepSeek V3.2  ║');
  console.log('  ║    MiniMax M2.1 · MiniMax M2.5 · Data Safety (Claude) ║');
  if (hasGemini31) {
    console.log('  ║                                                          ║');
    console.log('  ║    Phase 2: Code Quality Recursive Debate              ║');
    console.log('  ║    Gemini 3.1 Pro (CTO) ↔ Claude Sonnet (CEO)         ║');
    console.log('  ║    Claude = final authority · max 5 rounds             ║');
    console.log('  ║                                                          ║');
    console.log('  ║    Phase 3: UX/UI Design Recursive Debate              ║');
    console.log('  ║    Gemini 3.1 Pro (Creative Dir) ↔ Claude (Collab)    ║');
    console.log('  ║    Gemini = final authority · max 5 rounds             ║');
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
    console.log(`  Phase 2: Code Quality recursive debate (Gemini CTO ↔ Claude CEO)...`);
    console.log(`  Phase 3: UX/UI Design recursive debate (Gemini Creative Dir ↔ Claude Collab)...`);
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
    console.log('');
    console.log('  ── Phase 2: Code Quality Recursive Debate ──');
    console.log('  Gemini 3.1 Pro (CTO) ↔ Claude 4.5 Sonnet (CEO)');
    console.log('  Max 5 rounds · Claude has final authority');
    console.log('');

    try {
      const phase2Start = Date.now();
      const phase2Result = await runRecursiveConsensus({
        topic: 'Code Quality & Architecture',
        modelA: {
          name: 'Gemini 3.1 Pro',
          model: MODELS.gemini31Pro,
          provider: 'gemini-direct',
          role: 'CTO (Chief Technology Officer)',
        },
        modelB: {
          name: 'Claude 4.5 Sonnet',
          model: MODELS.claudeSonnet45,
          provider: 'openrouter',
          role: 'CEO (Chief Executive Officer)',
        },
        finalAuthority: 'B', // Claude = CEO = final say on code
        initialPrompt: buildPhase2DebatePrompt(codeBundle, ctx, phase1Summary),
        callModel: callModelForDebate,
        onRound: (round, speaker, text) => {
          const preview = text.slice(0, 80).replace(/\n/g, ' ');
          console.log(`    [P2 R${round}] ${speaker.padEnd(20)} ${preview}...`);
        },
      });

      const phase2Duration = Date.now() - phase2Start;
      phase2DebateLog = phase2Result.debateLog;
      const consensusTag = phase2Result.consensusReached ? 'CONSENSUS' : 'AUTHORITY DECIDED';
      console.log(`    [${consensusTag}] Phase 2 complete — ${phase2Result.rounds.length} rounds, ${(phase2Duration / 1000).toFixed(1)}s`);

      debateResults.push({
        name: 'Code Quality Debate (Phase 2)',
        model: `${MODELS.gemini31Pro} ↔ ${MODELS.claudeSonnet45}`,
        status: 'SUCCESS',
        text: phase2Result.finalVerdict,
        inputTokens: phase2Result.totalTokens.input,
        outputTokens: phase2Result.totalTokens.output,
        costUSD: (phase2Result.totalTokens.input / 1_000_000 * 2.0) + (phase2Result.totalTokens.output / 1_000_000 * 12.0),
        durationMs: phase2Duration,
        debateLog: phase2Result.debateLog,
        consensusReached: phase2Result.consensusReached,
      });
    } catch (err) {
      console.error(`    [FAIL] Phase 2 debate error: ${err.message}`);
      debateResults.push({
        name: 'Code Quality Debate (Phase 2)',
        model: `${MODELS.gemini31Pro} ↔ ${MODELS.claudeSonnet45}`,
        status: 'ERROR',
        text: `Error: ${err.message}`,
        inputTokens: 0, outputTokens: 0, costUSD: 0, durationMs: 0,
      });
    }

    // ── Phase 3: UX/UI Design Recursive Debate ──
    console.log('');
    console.log('  ── Phase 3: UX/UI Design Recursive Debate ──');
    console.log('  Gemini 3.1 Pro (Creative Director) ↔ Claude 4.5 Sonnet (Collaborator)');
    console.log('  Max 5 rounds · Gemini has final authority');
    console.log('');

    try {
      const phase3Start = Date.now();
      const phase3Result = await runRecursiveConsensus({
        topic: 'UX/UI Design Quality',
        modelA: {
          name: 'Gemini 3.1 Pro',
          model: MODELS.gemini31Pro,
          provider: 'gemini-direct',
          role: 'Creative Director (Lead Design Authority)',
        },
        modelB: {
          name: 'Claude 4.5 Sonnet',
          model: MODELS.claudeSonnet45,
          provider: 'openrouter',
          role: 'Design Collaborator',
        },
        finalAuthority: 'A', // Gemini = Creative Director = final say on design
        initialPrompt: buildPhase3DesignPrompt(codeBundle, ctx, uxReport),
        callModel: callModelForDebate,
        onRound: (round, speaker, text) => {
          const preview = text.slice(0, 80).replace(/\n/g, ' ');
          console.log(`    [P3 R${round}] ${speaker.padEnd(20)} ${preview}...`);
        },
      });

      const phase3Duration = Date.now() - phase3Start;
      phase3DebateLog = phase3Result.debateLog;
      const consensusTag = phase3Result.consensusReached ? 'CONSENSUS' : 'AUTHORITY DECIDED';
      console.log(`    [${consensusTag}] Phase 3 complete — ${phase3Result.rounds.length} rounds, ${(phase3Duration / 1000).toFixed(1)}s`);

      debateResults.push({
        name: 'UX/UI Design Debate (Phase 3)',
        model: `${MODELS.gemini31Pro} ↔ ${MODELS.claudeSonnet45}`,
        status: 'SUCCESS',
        text: phase3Result.finalVerdict,
        inputTokens: phase3Result.totalTokens.input,
        outputTokens: phase3Result.totalTokens.output,
        costUSD: (phase3Result.totalTokens.input / 1_000_000 * 2.0) + (phase3Result.totalTokens.output / 1_000_000 * 12.0),
        durationMs: phase3Duration,
        debateLog: phase3Result.debateLog,
        consensusReached: phase3Result.consensusReached,
      });
    } catch (err) {
      console.error(`    [FAIL] Phase 3 debate error: ${err.message}`);
      debateResults.push({
        name: 'UX/UI Design Debate (Phase 3)',
        model: `${MODELS.gemini31Pro} ↔ ${MODELS.claudeSonnet45}`,
        status: 'ERROR',
        text: `Error: ${err.message}`,
        inputTokens: 0, outputTokens: 0, costUSD: 0, durationMs: 0,
      });
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

  // ── Write fix-instructions.md (actionable from Phase 2 consensus) ──
  const phase2Verdict = debateResults.find(r => r.name.includes('Phase 2'));
  if (phase2Verdict?.status === 'SUCCESS') {
    const fixInstructions = `# Fix Instructions — Code Quality Consensus\n\n> Generated from Phase 2 recursive debate (Gemini CTO ↔ Claude CEO)\n> Consensus: ${phase2Verdict.consensusReached ? 'YES' : 'Final authority decided'}\n\n---\n\n${phase2Verdict.text}\n`;
    writeFileSync(join(outputPaths.latestDir, 'fix-instructions.md'), fixInstructions, 'utf-8');
    writeFileSync(join(outputPaths.archiveDir, 'fix-instructions.md'), fixInstructions, 'utf-8');
  }

  // ── Write design-recommendations.md (actionable from Phase 3 consensus) ──
  const phase3Verdict = debateResults.find(r => r.name.includes('Phase 3'));
  if (phase3Verdict?.status === 'SUCCESS') {
    const designRecs = `# Design Recommendations — UX/UI Consensus\n\n> Generated from Phase 3 recursive debate (Gemini Creative Director ↔ Claude Collaborator)\n> Consensus: ${phase3Verdict.consensusReached ? 'YES' : 'Final authority decided'}\n\n---\n\n${phase3Verdict.text}\n`;
    writeFileSync(join(outputPaths.latestDir, 'design-recommendations.md'), designRecs, 'utf-8');
    writeFileSync(join(outputPaths.archiveDir, 'design-recommendations.md'), designRecs, 'utf-8');
  }

  // ── Legacy mirror (backwards compat) ──
  mkdirSync(CONFIG.legacyReportDir, { recursive: true });
  writeFileSync(join(CONFIG.legacyReportDir, 'LATEST.md'), md, 'utf-8');

  const totalValidators = phase1Tracks.length + debateResults.length;
  console.log('  ════════════════════════════════════════════════════════');
  console.log(`  11-Brain Recursive Consensus System — Complete`);
  console.log(`  AI Village Output:`);
  console.log(`    Latest:     ${outputPaths.latestDir}/`);
  console.log(`    Summary:    ${outputPaths.summary}`);
  if (phase2DebateLog) console.log(`    Debate Log: latest/debate-log.md`);
  if (phase3DebateLog) console.log(`    Design Log: latest/design-debate-log.md`);
  console.log(`    Archive:    ${outputPaths.archiveDir}/`);
  console.log(`  Phase 1:  ${successCount}/${phase1Tracks.length} validators passed`);
  if (debateResults.length > 0) {
    const debateSuccess = debateResults.filter(r => r.status === 'SUCCESS').length;
    console.log(`  Phase 2+3: ${debateSuccess}/${debateResults.length} debates completed`);
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
  'UX & Accessibility': '01-ux-accessibility',
  'Code Quality': '02-code-quality',
  'Security': '03-security',
  'Performance & Scalability': '04-performance',
  'Competitive Intelligence': '05-competitive-intel',
  'User Research & Persona Alignment': '06-user-research',
  'Architecture & Bug Hunter': '07-architecture-bugs',
  'Code Quality Debate (Phase 2)': '08-code-quality-debate',
  'UX/UI Design Debate (Phase 3)': '09-design-debate',
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

*Part of SwanStudios 11-Brain Recursive Consensus System*
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
| \`08-code-quality-debate.md\` | Phase 2 recursive debate verdict (Gemini CTO ↔ Claude CEO) |
| \`09-design-debate.md\` | Phase 3 recursive debate verdict (Gemini Creative Dir ↔ Claude Collab) |
| \`debate-log.md\` | Full Phase 2 debate transcript (all rounds) |
| \`design-debate-log.md\` | Full Phase 3 debate transcript (all rounds) |
| \`fix-instructions.md\` | Actionable code fixes from Phase 2 consensus |
| \`design-recommendations.md\` | Actionable design fixes from Phase 3 consensus |

*SwanStudios 11-Brain Recursive Consensus System v11.0*
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
