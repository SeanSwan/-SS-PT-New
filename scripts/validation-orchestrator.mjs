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
 * ║  11. GLM 5.2 (Lead Designer) ↔ Gemini 3.1 Pro (Reviewer)       ║
 * ║     Loop until CONSENSUS REACHED or MAX_ROUNDS (5)              ║
 * ║     GLM 5.2 = final authority on design (on test 2026-06-20)    ║
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
import { runFusionSynthesis, formatSynthesisMarkdown } from './lib/fusion-synthesis.mjs';
import { evaluateSpendGate, formatCostSummary, formatCostSummaryMarkdown, isOverCap } from './lib/cost-gate.mjs';

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
  // Remaining Chinese model: GLM 5.2 (design debate LEAD only — lowest sensitivity, no PII/security/code).
  //   MiniMax M2.7 retired from the design slot 2026-06-20 (replaced by GLM 5.2 per Sean).
  gemini25Flash:  'google/gemini-2.5-flash',              // FREE — Google/US — UX analysis + competitive intel (2nd instance)
  gemini3Flash:   'google/gemini-3-flash-preview-20251217', // FREE — Google/US — performance review
  gemini31Flash:  'google/gemini-3.1-flash-lite-preview',  // FREE — Google/US — frontend UX patterns
  nemotron3Super: 'nvidia/nemotron-3-super-120b-a12b:free', // FREE — NVIDIA/US — 120B MoE, security + code architecture
  nemotron3Nano:  'nvidia/nemotron-3-nano-30b-a3b:free',   // FREE — NVIDIA/US — 30B MoE, security + bug hunting + user research
  trinityLarge:   'arcee-ai/trinity-large-preview:free',    // FREE — Arcee AI/US — 400B MoE, full-stack integration
  // ── PAID models — US ONLY ──
  claudeSonnet46: 'anthropic/claude-sonnet-4.6',            // $3/$15 per M — Anthropic/US — premium code quality + data safety
  // ── DESIGN DEBATE (lowest-sensitivity role — the ONLY slot where a Chinese-provider model is policy-allowed) ──
  // Sean 2026-06-20: GLM 5.2 is the LEAD designer (Creative Director / final say) in the Phase 2C design debate,
  // opposite Gemini 3.1 Pro as reviewer. On test ("supposed to be really good at this"). Slug + pricing verified
  // via openrouter.ai/z-ai/glm-5.2 on 2026-06-20 ($1.20 in / $4.10 out per M, 1M ctx).
  glm52:          'z-ai/glm-5.2',                          // $1.20/$4.10 per M — Z.ai/China — design debate LEAD (Creative Director). Design slot ONLY.
  minimaxM27:     'minimax/minimax-m2.7',                  // $0.30/$1.20 per M — MiniMax/China — RETIRED from design 2026-06-20 (superseded by GLM 5.2). Kept defined for cost-tracking back-compat + quick rollback; not wired into any active code path.
  // ── SMART ESCALATION (only triggered for CRITICAL findings or stalled debates) ──
  escalation1:    'nvidia/nemotron-3-nano-30b-a3b:free',   // FREE — NVIDIA/US — replaces GLM-4.7 (was Z-AI/China)
  escalation2:    'nvidia/nemotron-3-super-120b-a12b:free', // FREE — NVIDIA/US — CRITICAL escalation deep-dive (was MiniMax M2.7, removed by ORCHESTRATOR-DRIFT-FIX 2026-04-22 Site C — escalation receives the most sensitive findings, worst place for a Chinese model)
  // ── Google GenAI (direct API, not via OpenRouter) ──
  gemini31Pro:    'gemini-3.1-pro-preview',                // Direct Google API — Google/US — Phase 2C UX debate authority
  // ── EXPENSIVE (DO NOT USE in orchestrator) ──
  // claudeOpus:  'anthropic/claude-4.6-opus-20260205'     // $5/$25 per M — use via CLI subscription instead
  // ── FUSION SYNTHESIS JUDGE (reads ALL Phase-1 analysts, writes the fused verdict) ──
  // Per Sean 2026-06-15: the judge is the synthesis Final Decider, so use the STRONGEST
  // available Claude — Opus 4.8 now, Fable 5 when it returns (CLAUDE.md Final-Decider chain).
  // Opus is intentionally absent from the track models above (cost discipline), but the judge
  // runs ONCE per run, not per-track, so the premium model is justified here.
  //   ⚠ The exact OpenRouter slug below is a [HYPOTHESIS] (follows the anthropic/claude-sonnet-4.6
  //   pattern). Set SWAN_FUSION_JUDGE_MODEL to the verified slug — or to Fable 5 when it returns —
  //   to override without a code change. A wrong slug only fails the (non-breaking) synthesis step.
  // ── BANNED MODELS (NEVER USE) ──
  // No Grok. No X-AI models. Hard no, permanent ban. User explicit preference.
  // ── REMOVED (Privacy audit 2026-04-06) ──
  // deepseekV3:   'deepseek/deepseek-v3.2'      — REMOVED: Chinese servers, gov access laws, processed product vision
  // step35Flash:  'stepfun/step-3.5-flash:free'  — REMOVED: Chinese company doing security analysis of codebase
  // minimaxM21:   'minimax/minimax-m2.5:free'    — REMOVED: Chinese company doing competitive intelligence
  // qwen36Plus:   'qwen/qwen3.6-plus:free'       — REMOVED: Alibaba/China doing code architecture analysis
  // mercury2:     'z-ai/glm-4.7-flash'           — REMOVED: Z-AI/China in escalation role
};

const budgetProfile = process.env.SWAN_VILLAGE_BUDGET_PROFILE === '3usd';

// ─────────────────────────────────────────────
// Audit-compliance fail-fast guard
// Added 2026-04-22 by ORCHESTRATOR-DRIFT-FIX-DEBATE-2026-04-22.md
// (full rationale: memory/project_validation_orchestrator_drift_2026_04_22.md)
// ─────────────────────────────────────────────

// Fusion synthesis judge config — strongest available Claude (Opus 4.8 now → Fable 5 later).
// Override model/price via env so the verified slug or Fable can be swapped without a code edit.
const FUSION_JUDGE = {
  model: process.env.SWAN_FUSION_JUDGE_MODEL || 'anthropic/claude-opus-4.8',
  priceInputPerM: Number(process.env.SWAN_FUSION_JUDGE_PRICE_IN) || 5.0,   // Opus 4.8 est. $5/M in
  priceOutputPerM: Number(process.env.SWAN_FUSION_JUDGE_PRICE_OUT) || 25.0, // Opus 4.8 est. $25/M out
};

// POLICY CHANGE 2026-08-03 (Sean): these prefixes were a HARD BLOCK. They are
// now ADVISORY — the run WARNS and continues so Sean can make the call himself.
// His ruling: "I want a warning though, so I can choose for myself. [Don't] set
// up a hard block for Chinese sites. But Kimi K3 has full permission."
//
// `moonshotai/` is deliberately ABSENT: Kimi K3 is fully permitted in every
// slot, including orchestrator, escalation, and synthesis judge.
//
// UNCHANGED: Rule 8 (zero PII to LLMs). That is the control that actually
// protects client data and it binds every provider equally. Provider choice and
// prompt contents are independent decisions.
const ADVISORY_PROVIDER_PREFIXES = ['minimax/', 'stepfun/', 'qwen/', 'deepseek/', 'z-ai/'];

/**
 * Hard-fails (process.exit(2)) if any policy-constrained track or escalation slot
 * uses a Chinese-provider model.
 *
 * Policy (per MODELS comment line 67-68): Chinese models allowed ONLY in design-debate slots.
 *
 * Smallest reliable signal: resolved model ID string, lowercased + prefix-match.
 * Labels are NOT trusted — they were the thing that drifted in 2026-04-22 audit.
 *
 * Phase 2C UX/UI design debate is exempt BY CODE PATH (it does NOT call this function),
 * NOT by label match. Adding a new non-design Chinese-model invocation would require
 * explicitly creating a new code path that bypasses this function — visible in code review.
 *
 * Limitation: this function relies on the calling code passing the correct tracks. It does
 * NOT auto-discover all model invocations in the file. If a future maintainer adds a third
 * Phase 1 mode, they must remember to invoke this guard — there is no global enforcement.
 *
 * @param {Array<{name: string, model: string}>} tracks - Phase 1 tracks (any mode)
 * @param {Array<string>} escalationModels - Escalation model ID strings
 * @param {{checkpoint: string}} opts - Human-readable enforcement-point label
 */
function assertNoChineseProviderInPolicyConstrainedTracks(tracks, escalationModels, opts) {
  const violations = [];
  for (const track of (tracks || [])) {
    const id = String(track.model || '').toLowerCase();
    if (ADVISORY_PROVIDER_PREFIXES.some(p => id.startsWith(p))) {
      violations.push(`[${opts.checkpoint}] track "${track.name}" -> ${track.model}`);
    }
  }
  for (const id of (escalationModels || [])) {
    const normalized = String(id || '').toLowerCase();
    if (ADVISORY_PROVIDER_PREFIXES.some(p => normalized.startsWith(p))) {
      violations.push(`[${opts.checkpoint}] escalation slot -> ${id}`);
    }
  }
  if (violations.length) {
    // WARN AND CONTINUE (2026-08-03). Sean chooses; the tool informs.
    console.warn('');
    console.warn('  ⚠ [PROVIDER NOTICE] Non-US provider in a policy-sensitive slot:');
    violations.forEach(v => console.warn(`    - ${v}`));
    console.warn('  This is ADVISORY, not a block — the run continues.');
    console.warn('  Rule 8 still binds: no PII in any prompt, for any provider.');
    console.warn('  Set SWAN_STRICT_PROVIDER_POLICY=1 to restore the old hard block.');
    console.warn('');
    if (process.env.SWAN_STRICT_PROVIDER_POLICY === '1') {
      console.error('  [AUDIT-FAIL] SWAN_STRICT_PROVIDER_POLICY=1 — aborting.');
      process.exit(2);
    }
    return;
  }
  console.log(`  [audit-compliance] OK at ${opts.checkpoint} — no advisory providers in Phase 1 tracks or escalation`);
}

const CONFIG = {
  maxCodeChars: 60_000,
  // Primary output: AI Village folder (where you already look for things)
  promptDir: join(ROOT, 'AI-Village-Documentation', 'validation-prompts'),
  // Legacy mirror (kept for backwards compat)
  legacyReportDir: join(ROOT, 'docs', 'ai-workflow', 'validation-reports'),
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
  const ctx = `${getProjectContext()} You are reviewing actual code files; derive the feature from the code itself — do NOT assume any particular feature. Files under review: ${fileNames}`;

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
      // Privacy-audit fix 2026-04-22 (ORCHESTRATOR-DRIFT-FIX Site A): was MODELS.minimaxM27.
      // Per policy (line 67-68): MiniMax M2.7 only allowed in design-debate slots.
      model: MODELS.nemotron3Super,
      prompt: `You are a principal software engineer doing a deep architecture review and bug hunt. Use your 120B MoE reasoning to find bugs. ${ctx}

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
      model: budgetProfile ? MODELS.nemotron3Super : MODELS.claudeSonnet46,
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
      name: 'Code Architecture (Nemotron Super)',
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
      name: 'Bug Hunter II (Nemotron Nano)',
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

// ─────────────────────────────────────────────
// Portable project context (env-overridable for cross-app reuse)
// ─────────────────────────────────────────────
// This is the ONLY place project-specific brand/stack/palette context lives.
// Every prompt below must DERIVE feature-specific detail (surfaces, components,
// endpoints, data) from the plan/document/code under review — NEVER from a
// hardcoded assumption about a particular feature. (Fix 2026-06-21: planning &
// document prompts had been hardcoded to past tasks, so the Village mis-designed
// whatever it was actually given. See scripts/test/villagePromptGenericity.test.mjs.)
// Override per-app via SWAN_VILLAGE_PROJECT_CONTEXT (inline string) or
// SWAN_VILLAGE_PROJECT_CONTEXT_FILE (path to a text file). Default = SwanStudios.
const DEFAULT_PROJECT_CONTEXT = `This is a production SaaS platform. Default project = SwanStudios: a personal training SaaS (React + TypeScript + styled-components frontend; Node.js + Express + Sequelize + PostgreSQL backend). Theme: "Enchanted Apex: Crystalline Swan" — dark-first, 18 swappable themes via a theme toggle, so EVERY color must be a CSS custom property with a brand fallback (var(--token, #fallback)) — never hardcode hex except as the fallback. Palette: Midnight Sapphire #002060, Royal Depth #003080, Ice Wing #60C0F0, Arctic Cyan #50A0F0, Gilded Fern #C6A84B (gold), Frost White #E0ECF4, Swan Lavender #4070C0, Wing Purple #8B5CF6, Obsidian Black #0A0A0F, Carbon #141419, Graphite #1A1A24. Dual-Button Glow: blue bg -> purple glow, purple bg -> cyan glow. RETIRED Galaxy-Swan theme (#0a0a1a, #00FFFF, #7851A9) — never use. Stack rules: styled-components only (NO Material-UI); Victory charts only; 44px min touch targets; max 300 lines/file; WCAG 4.5:1. Production: sswanstudios.com.`;

function getProjectContext() {
  const inline = process.env.SWAN_VILLAGE_PROJECT_CONTEXT;
  if (inline && inline.trim()) return inline.trim();
  const filePath = process.env.SWAN_VILLAGE_PROJECT_CONTEXT_FILE;
  if (filePath) {
    try {
      const resolved = resolve(ROOT, filePath);
      if (existsSync(resolved)) return readFileSync(resolved, 'utf-8').trim();
    } catch { /* fall through to default */ }
  }
  return DEFAULT_PROJECT_CONTEXT;
}

function buildDocumentValidatorTracks(documentContent, documentPath) {
  const ctx = `${getProjectContext()} Document under review: ${documentPath}`;

  return [
    {
      name: 'Technical Accuracy',
      model: MODELS.claudeSonnet46,
      prompt: `You are a senior technical reviewer for a fitness SaaS platform. ${ctx}

Review this QA/vision alignment document for TECHNICAL ACCURACY:
1. **Factual correctness** — Are feature descriptions accurate? Does the report match what the codebase actually has?
2. **Score fairness** — Are the 1-10 scores fair based on the evidence presented? Any over-rated or under-rated?
3. **Missing features** — Does the report miss any major features that ARE built and working?
4. **False gaps** — Does the report claim gaps that don't actually exist (features that are built but the tester missed)?
5. **Architecture accuracy** — Are the technical descriptions of the stack, AI pipeline, and integrations correct?

For each finding provide:
- **Severity:** CRITICAL / HIGH / MEDIUM / LOW
- **Section:** Which part of the document
- **Issue:** What's wrong or missing
- **Correction:** What should be stated instead

DOCUMENT TO REVIEW:
${documentContent}`,
    },

    {
      name: 'Strategic Analysis',
      model: MODELS.gemini25Flash,
      prompt: `You are a product strategist and competitive analyst. ${ctx}

Review this vision alignment document for STRATEGIC QUALITY:
1. **Competitive analysis accuracy** — Are the competitor comparisons fair? Is the market positioning realistic?
2. **Priority ordering** — Are the Priority 1/2/3 recommendations in the right order? What should be higher/lower?
3. **Missing opportunities** — What strategic opportunities does the report overlook?
4. **Risk assessment** — What risks are not addressed? (market, technical, operational)
5. **Revenue impact** — Which recommendations would have the highest revenue impact?
6. **Feasibility** — Are the timeline estimates (2-4 weeks, 1-3 months, 3-6 months) realistic?

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown.

DOCUMENT TO REVIEW:
${documentContent}`,
    },

    {
      name: 'UX/Design Gap Validation',
      model: MODELS.gemini31Flash,
      prompt: `You are a UX/UI design expert reviewing a QA report for a luxury fitness platform. ${ctx}

Review this document for UX/DESIGN accuracy (derive its claims from the content; do not assume a prior report):
1. **Gap validity** — Are the UI/UX gaps the document identifies real? Verify each against what it describes.
2. **Priority accuracy** — Are the UX fixes correctly prioritized? Do you agree with the document's top priority?
3. **Missing UX issues** — What UX problems does the document NOT mention? (mobile responsiveness, accessibility, loading/empty/error states, etc.)
4. **Design recommendations** — Are the document's strategic design suggestions the right ones?
5. **Brand compliance** — Does the document correctly assess theme/brand adherence?

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown.

DOCUMENT TO REVIEW:
${documentContent}`,
    },

    {
      name: 'Business & Revenue Validation',
      model: MODELS.gemini25Flash,
      prompt: `You are a fitness industry business analyst. ${ctx}

Review this document for BUSINESS ACCURACY (derive its claims from the content):
1. **Market positioning** — Is the positioning the document argues valid? Is the competitive moat real?
2. **Monetization gaps** — Does the document correctly identify revenue opportunities? What's missing?
3. **Onboarding / activation** — Are the document's onboarding/activation assessments fair?
4. **Pricing strategy** — Does the document address pricing optimization (premium vs freemium)?
5. **Growth blockers** — What growth blockers are missing from the analysis?
6. **Feasibility** — Are the document's business recommendations realistic for this stage?

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown.

DOCUMENT TO REVIEW:
${documentContent}`,
    },

    {
      name: 'Gamification & Engagement Review',
      model: MODELS.nemotron3Nano,
      prompt: `You are a gamification and user engagement specialist. The platform uses the Octalysis Framework with 5 tiers (Bronze Forge → Crystalline Swan), 6 skill trees, and badge rarity system. ${ctx}

Review this document's engagement/gamification assessment (derive its claims from the content):
1. **Assessment accuracy** — If the document assesses engagement/gamification, is it fair? What's working vs missing?
2. **Framework implementation** — For any engagement framework the document references, what's present vs absent?
3. **Cross-feature links** — Are integrations between engagement and other features correctly assessed?
4. **Engagement recommendations** — Are the suggested improvements the RIGHT priorities?
5. **Retention mechanics** — What retention loops does the document miss?
6. **Competitor comparison** — How does it compare to best-in-class engagement patterns (e.g. Duolingo, Strava)?

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown.

DOCUMENT TO REVIEW:
${documentContent}`,
    },

    {
      name: 'NASM & Fitness Science Validation',
      model: MODELS.gemini3Flash,
      prompt: `You are a certified fitness professional and exercise science reviewer. ${ctx}

Review this document for FITNESS-SCIENCE accuracy (derive its claims from the content):
1. **Protocol accuracy** — For any training-protocol claims (e.g. NASM OPT phases, periodization), validate they are accurate.
2. **Feature-existence accuracy** — Does the document under- or over-count capabilities that actually exist (or don't)?
3. **Programming accuracy** — Are any tempo, rep-range, or rest-period descriptions correct?
4. **Differentiator framing** — Does the document correctly rank the training differentiators?
5. **Nutrition integration** — Does it accurately assess any nutrition-training connection?
6. **Recovery & mobility** — Are there training/recovery aspects the document misses?

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown.

DOCUMENT TO REVIEW:
${documentContent}`,
    },

    {
      name: 'Security & Privacy Assessment',
      model: MODELS.nemotron3Nano,
      prompt: `You are a security and privacy expert. ${ctx}

Review this document for SECURITY & PRIVACY considerations:
1. **PII handling** — The report mentions "Identity-Blind AI Privacy" as an advantage. Validate this claim.
2. **Missing security assessment** — The QA report doesn't include security testing. What security gaps should have been assessed?
3. **Data privacy** — Social fitness data, workout history, health metrics — are privacy controls adequate?
4. **HIPAA-adjacent concerns** — Personal training data borders on health data. Is this addressed?
5. **Payment security** — Stripe integration security assessment — was this covered?
6. **Wearable data risks** — If wearable integration is recommended, what security implications exist?

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown.

DOCUMENT TO REVIEW:
${documentContent}`,
    },

    {
      name: 'Architecture & Implementation Gap',
      model: MODELS.nemotron3Super,
      prompt: `You are a principal engineer reviewing a QA gap analysis. ${ctx}

Review this document for ARCHITECTURE & IMPLEMENTATION accuracy (verify its claims; do not assume a prior report):
1. **Built vs visible** — Which capabilities the document discusses are truly built but not surfaced, vs not built at all?
2. **False gaps** — Does the document claim gaps for things that actually exist? Cross-check its claims against reality.
3. **Backend vs UI** — For any "partial" feature, is the backend complete even where the UI is missing (or vice versa)?
4. **Real state** — For each capability the document scores, what is the actual implementation state?
5. **Data mismatches** — For any data discrepancy the document flags, is it a real bug or an artifact (caching, env, stale data)?
6. **Architecture soundness** — Are the document's architecture/implementation claims technically correct?

For each finding provide severity and specific corrections.

DOCUMENT TO REVIEW:
${documentContent}`,
    },

    {
      name: 'Document Quality & Completeness',
      model: MODELS.claudeSonnet46,
      prompt: `You are a technical documentation quality reviewer. ${ctx}

Review this QA report for DOCUMENT QUALITY:
1. **Methodology** — Was the testing methodology sound? What should have been tested differently?
2. **Evidence quality** — Are claims backed by specific observations? Any unsupported assertions?
3. **Bias detection** — Does the report show any bias (overly positive, overly negative, missing context)?
4. **Actionability** — Are the recommendations specific enough to act on? Or too vague?
5. **Completeness** — What major areas were NOT assessed? (performance, accessibility, mobile, security, SEO)
6. **Follow-up plan** — Does the report provide a clear path forward? Can this be used as a sprint planning doc?

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown.

DOCUMENT TO REVIEW:
${documentContent}`,
    },
  ];
}

// Document-mode debate prompt builders

function buildDocDebateCodePrompt(documentContent, ctx, phase1Summary) {
  return `You are the CTO (Chief Technology Officer) reviewing the document below. ${ctx}

## YOUR ROLE — CTO (Technical Authority)

DERIVE what kind of document this is (plan, spec, audit, QA report, etc.) and what it claims FROM its content — do NOT assume any particular feature or prior report. Evaluate whether its technical assessments/claims are accurate and its recommendations are correct.

The CEO will challenge your findings. Defend with evidence or concede.

## Phase 1 Context (document validators already ran)

${phase1Summary}

## Your Analysis — Round 1

For each significant claim/assessment/recommendation in the document:
- **Agree/Disagree:** Is it accurate?
- **Correction:** What should it say instead?
- **Priority Reorder:** Should any recommendation move up or down?
- **Missing Items:** What does the document miss entirely?

Focus on technical accuracy, implementation feasibility, and business impact.

DOCUMENT UNDER REVIEW:
${documentContent}`;
}

function buildDocDebateDesignPrompt(documentContent, ctx, phase1UXReport) {
  return `You are the Creative Director — the FINAL AUTHORITY on all UX/UI design decisions. ${ctx}

## YOUR ROLE — Creative Director (Design Authority)

DERIVE the design-related claims/assessments/recommendations FROM the document below — do NOT assume any particular feature or prior report. Evaluate whether its design assessments are accurate and its design recommendations are the right ones.

## Brand design constraints (from the project context above)
Honor the project's palette, dark-first default, and theme-token discipline (every color a CSS custom property with a brand fallback — never hardcode hex except as the fallback), Dual-Button Glow rule, 44px min touch targets, WCAG 4.5:1.

## UX Phase 1 Report
${phase1UXReport || '_No Phase 1 UX report available._'}

## Your Analysis — Round 1

For each design assessment/recommendation in the document:
- Is the identified gap real? If so, what should the fix look like (exact specs)?
- Is the recommendation the right one, and correctly prioritized?
- What design issues does the document miss?
- Does it capture the brand aesthetic accurately?

Provide specific pixel measurements, token names, color codes, and animation specs for all recommendations. Reference only what the document actually covers.

DOCUMENT UNDER REVIEW:
${documentContent}`;
}

// ─────────────────────────────────────────────
// Planning Mode Validator Tracks (--mode plan)
// ─────────────────────────────────────────────

function buildPlanningValidatorTracks(planContent, planPath) {
  const ctx = `${getProjectContext()} You are reviewing a PLAN document; derive every feature-specific detail from the plan content provided — do NOT assume any particular feature. Plan document: ${planPath}`;

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
2. **State management** — Is the proposed state/hook composition sound for the surfaces THIS plan describes? Any circular dependencies or prop drilling?
3. **Data flow** — Trace the plan's primary data flows (load → transform → render → mutate). Any race conditions or stale-state risks?
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

Review this PLAN for security implications. Derive the actual data, surfaces, and integrations from the plan — assess only what it introduces:
1. **PII / sensitive-data exposure** — Does any new surface store or display PII? Is anything sent to an external LLM properly de-identified (zero-PII policy)?
2. **Upload / file / media risks** — If the plan adds uploads or media, assess malicious-file vectors, SSRF via URLs, and storage-path safety.
3. **Audio/video/biometric privacy** — If the plan captures audio/video/biometric data, where does it go, is it stored, for how long, and what are the privacy-policy implications?
4. **Data at rest** — For any new persisted data, assess encryption, access controls, and who can read whose records.
5. **AuthZ / RBAC enforcement** — For each role (admin/trainer/client/etc.), is access correctly scoped? Any IDOR or cross-tenant leak?
6. **Browser-API / permission risks** — For any new device/permission API the plan uses, assess permission handling, stream cleanup, and data-leak prevention.
7. **Injection / XSS** — For any user-generated or rendered content the plan introduces, assess injection/XSS vectors and sanitization.

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown with specific mitigations.

PLAN TO REVIEW:
${planContent}`,
    },

    {
      name: 'Performance & Bundle Impact',
      model: MODELS.gemini3Flash,
      prompt: `You are a web performance engineer reviewing a feature plan. ${ctx}

Review this PLAN for performance impact. Derive the new dependencies, components, and data flows from the plan — assess only what it introduces:
1. **Bundle size** — Tally any new libraries the plan adds (with realistic gzip weights). Which should be lazy-loaded / code-split?
2. **Render performance** — Which new lists/surfaces re-render often? React.memo strategy? Virtualization needed for long lists?
3. **Memory** — Any new buffers, media streams, or large in-memory structures? Cleanup/lifecycle risks?
4. **Expensive computation** — Any parsing/derivation done on every render that should be memoized? Cost analysis.
5. **Network waterfall** — How do the new data fetches sequence? Parallel vs sequential, a BFF/aggregate endpoint, caching/invalidation strategy?
6. **Media handling** — If the plan handles images/video, assess thumbnail/preview generation and memory for large assets.
7. **Code splitting** — Which new components should be React.lazy()? Proposed split boundaries.
8. **Animation budget** — For each new animation the plan adds, is it GPU-composited (transform/opacity only) with a reduced-motion fallback?

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

Review THIS plan's actual surfaces/flows through each persona's eyes (derive the flows from the plan):
1. **Sean at the gym** — Walk his real-world flow for what this plan introduces. How many taps? Any friction between sets?
2. **Golf client** — Does the new surface feel premium and trustworthy for a high-income, possibly less-tech-savvy user?
3. **Working professional** — They have 5 minutes. Is the new flow fast and efficient? Any blockers?
4. **Accessibility for 40-60 year olds** — Font sizes, touch targets, and interaction model — will the new surfaces work for the less tech-savvy demographic?
5. **Trust signals** — Do the plan's new affordances build trust, or create confusion? (clarity, honesty, expectation-setting)
6. **Emotional response** — Does the dark-first Crystalline Swan aesthetic feel premium and motivating on these surfaces, or cold/intimidating?

Output as structured markdown with persona-specific recommendations.

PLAN TO REVIEW:
${planContent}`,
    },

    {
      name: 'Implementation Risk Assessment',
      // Privacy-audit fix 2026-04-22 (ORCHESTRATOR-DRIFT-FIX Site B): was MODELS.minimaxM27.
      // Per policy (line 67-68): MiniMax M2.7 only allowed in design-debate slots.
      model: MODELS.nemotron3Nano,
      prompt: `You are a project manager and risk assessor for a software project. ${ctx}

Review this implementation plan for risks and feasibility. Derive the phases, dependencies, and file counts from the plan itself:
1. **Dependency risks** — Which phases block others? What happens if the riskiest phase slips?
2. **Technical unknowns** — Which APIs/SDKs/browser features does the plan rely on whose behavior or compatibility is uncertain?
3. **Scope creep indicators** — Which parts are most likely to expand beyond estimates (edge cases, cross-browser, etc.)?
4. **Effort accuracy** — Are the plan's file/line-count estimates realistic? Which files will likely exceed the 300-line budget?
5. **Testing gaps** — What's the testing strategy for the new surfaces? Unit (hooks/logic), integration, E2E, visual regression?
6. **Rollback plan** — If any phase breaks production, can it be feature-flagged off? Is each phase independently revertible?
7. **Database / backend risks** — Does the plan need schema changes, new endpoints, or migrations? Verify any "no backend changes" claim against the plan's actual data needs.
8. **Phase ordering** — Is the proposed order optimal? Could anything be reordered for faster, safer value delivery?

Rate each risk: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown with mitigations for each risk.

PLAN TO REVIEW:
${planContent}`,
    },

    {
      name: 'Frontend Patterns & React Best Practices',
      model: MODELS.gemini31Flash,
      prompt: `You are a React specialist reviewing a component architecture plan. ${ctx}

Review the proposed component structure (derive the actual components/hooks/styles from the plan):
1. **Styled-components organization** — Are the plan's style-file splits / barrel re-exports a good pattern? Any issues?
2. **Hook composition** — For the plan's proposed hooks, is the nesting/composition depth healthy? Better alternatives?
3. **Render customization** — For any custom render maps or component overrides the plan adds, what's the performance cost?
4. **Animation strategy** — Which animation approaches does the plan mix (framer-motion vs CSS keyframes)? Is the mix justified, GPU-safe, reduced-motion-aware?
5. **Responsive patterns** — For the plan's responsive surfaces, is the CSS-vs-JS approach right across the breakpoint matrix?
6. **Form handling** — For any inputs the plan adds, controlled vs uncontrolled? Debounce strategy?
7. **Lazy boundaries** — Which heavy components should be their own React.lazy()-loaded chunks?
8. **Touch gestures** — For any mobile gestures the plan introduces, CSS-only or a gesture library? Accessibility of the gesture?

Output as structured markdown with implementation-ready recommendations.

PLAN TO REVIEW:
${planContent}`,
    },

    {
      name: 'Data Safety & Schema Impact',
      model: MODELS.claudeSonnet46,
      prompt: `You are a DATA SAFETY AUDITOR for a production SaaS platform with real paying customers. ${ctx}

TREAT EVERY FINDING AS IF IT COULD AFFECT REAL USER DATA IN PRODUCTION.

Review this plan for data safety. Derive the actual tables, columns, and write paths from the plan:
1. **Unbounded growth** — Does any new data structure (JSONB arrays, blobs, logs) grow without bound? Size limits / pagination?
2. **Soft-delete integrity** — If the plan relies on soft-delete, are deleted rows correctly excluded from every read path?
3. **Storage cleanup** — For any new file/media storage, what's the cleanup strategy when the parent record is deleted?
4. **Sensitive-data retention** — For any captured audio/video/transcripts, is it stored or discarded? For how long? Privacy implications?
5. **Migration safety** — Does the plan need schema changes or new endpoints? Verify any "no backend changes" claim against the plan's actual data writes. Flag schema-drift risk (model vs real DB columns, FK targets).
6. **Concurrent access** — Any new write path with concurrent-mutation / race-condition risk? Optimistic-update or claim-lock needed?
7. **Data integrity** — Any new denormalized counts, aggregates, or cached values that can drift from source of truth?
8. **Rate limiting** — Do the plan's new read/write operations need their own rate limits?

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
Output as structured markdown with specific database-safe recommendations.

PLAN TO REVIEW:
${planContent}`,
    },

    {
      name: 'API Design & Backend Contracts',
      model: MODELS.nemotron3Super,
      prompt: `You are a backend API architect reviewing a feature plan. ${ctx}

Review the plan's API surface. Derive the actual endpoints (existing + new) from the plan:
1. **Existing API sufficiency** — For each surface, does an existing endpoint already return enough data, or is a new endpoint required? Verify any "no backend changes" claim against the data each surface consumes.
2. **Search / query needs** — Where the plan filters client-side, is that adequate at scale, or is server-side search/pagination needed (and when)?
3. **New endpoint design** — For each new endpoint the plan proposes, is the REST shape correct (verbs, resource nesting, payload, multipart if uploads)?
4. **Multimodal / large payloads** — If the plan sends images/audio/large bodies, how should the contract handle them (inline field vs upload-then-reference)?
5. **Rate limiting** — For each new operation, what rate limits are appropriate?
6. **Realtime vs polling** — Should any new updates be pushed (WebSocket/SSE) instead of polled?
7. **Response contracts** — Are response shapes/types adequate and stable for the consumers the plan describes?
8. **Caching strategy** — For each cached read, is the TTL appropriate, and what invalidates it on write?

Output as structured markdown with specific API design recommendations.

PLAN TO REVIEW:
${planContent}`,
    },

    {
      name: 'Module Architecture & File Budget',
      model: MODELS.nemotron3Super,
      prompt: `You are a code architecture specialist with expertise in large-scale React applications. ${ctx}

MANDATORY CONSTRAINT: No file may exceed 300 lines of code (excluding comments and blank lines).

Review this plan's file organization. Derive the actual proposed files/folders/hooks from the plan:
1. **Decomposition** — Is the plan's file breakdown right? Any files that should be merged, or that are too thin?
2. **styles/ organization** — Are the proposed style files / barrels well-organized, or over-fragmented?
3. **hooks/ separation** — For the plan's proposed hooks, is the separation of concerns clean (data-fetch vs UI-state vs business-logic)?
4. **300-line budget** — Based on the plan's described responsibilities, which files are at risk of exceeding 300 lines? Name them and propose the split.
5. **Import graph** — Sketch the dependency tree the plan implies. Any circular risks or deep import chains?
6. **Barrel exports** — Where do barrels help vs hurt? Any directory that should/shouldn't have an index.ts?
7. **Shared vs local** — For each new module, is the shared-vs-feature-local boundary correct?

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

Review this plan for mobile and edge cases. Derive the actual surfaces from the plan and test each against the matrix:
1. **Narrow-width squeeze (320px)** — Do the plan's densest surfaces fit? Layout-squeeze / clipping risk?
2. **iOS Safari quirks** — For any device/media API the plan uses, assess WebKit support, prefixes, and autoplay/permission policies.
3. **Mobile keyboard** — When an input is focused, does any surface get pushed off-screen? Virtual-keyboard height handling.
4. **Offline / slow network** — For each new fetch, what's the failure + empty-state UX?
5. **Long/overflowing text** — Truncation/wrap strategy for any new dynamic text (titles, labels)?
6. **Large lists** — For any list that can grow large, is virtualization needed? Memory impact?
7. **RTL** — Do the new layouts flip correctly? CSS logical properties used?
8. **Reduced motion** — Does every animation the plan adds respect prefers-reduced-motion?
9. **Screen reader** — Landmarks, list navigation, control roles, and live-region announcements for the new surfaces?
10. **4K / ultrawide** — Max-width constraints vs full-bleed stretch for the new layouts?

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
  return `You are the PRIMARY security auditor reviewing a feature/implementation plan. ${ctx}

## YOUR ROLE — Security Lead

A plan has been analyzed by 12 planning specialists. DERIVE the actual surfaces, data, flows, and endpoints FROM the plan content below — do NOT assume any particular feature. Review the plan's security implications.

## Phase 1 Context (12 planning validators already ran)
${phase1Summary}

## Your Analysis — Round 1

For the specific surfaces/data/flows THIS plan introduces, focus on:
- PII / sensitive-data exposure — especially anything sent to external LLMs (zero-PII policy)
- Injection / XSS vectors in any user-generated or rendered content
- AuthZ / RBAC enforcement gaps (who can read/write what; IDOR / cross-tenant access)
- Upload / file / media attack vectors, if the plan introduces them
- Privacy of any audio/video/biometric data, if present
- Entitlement / access-control leaks (server-enforced vs client-only)

Provide specific, plan-grounded mitigations for each risk you identify.

PLAN UNDER REVIEW:
${planContent}`;
}

function buildPlanDebateArchPrompt(planContent, ctx, phase1Summary) {
  return `You are a Senior Code Quality / Architecture Lead reviewing a feature/implementation plan. ${ctx}

## YOUR ROLE — Architecture Authority

DERIVE the proposed components, hooks, services, state, and files FROM the plan content below — do NOT assume any particular feature or file count. The plan has been analyzed by 12 specialists.

## Phase 1 Context (12 planning validators already ran)
${phase1Summary}

## Your Analysis — Round 1

Focus on:
- Component/module decomposition: correctly scoped? over- or under-engineered?
- State management: single source of truth vs duplicated/derived state risks
- Hook/service design: data-fetching vs UI-state vs business-logic separation; circular deps
- React performance: memoization strategy, re-render prevention
- File budget: which proposed files will exceed 300 lines, and how to split them
- Shared-path integrity: if the plan exposes the same action to BOTH a UI and an AI/automation layer, is there ONE service path (no parallel/duplicate API family)?
- Error handling: where do error boundaries belong?

For each finding: severity, specific component, issue, fix.

PLAN UNDER REVIEW:
${planContent}`;
}

function buildPlanDebateDesignPrompt(planContent, ctx, phase1UXReport) {
  return `You are the Creative Director — the FINAL AUTHORITY on all UX/UI design decisions. ${ctx}

## YOUR ROLE — Creative Director (Design Authority)

Design the visual specification for the EXACT surfaces/components described in the plan below. CRITICAL: DERIVE the list of surfaces to design FROM the plan content — do NOT assume any particular feature. Do not design a chat/assistant, a sidebar, a dashboard, a video library, or any surface unless the plan actually describes it. Create from your OWN bold, opinionated, prescriptive design vision, within the brand constraints.

## Brand design constraints (from the project context above)
Honor the project's palette, dark-first default, and theme-token discipline: every color is a CSS custom property with a brand fallback (var(--token, #fallback)) — never hardcode hex except as the fallback, because the theme is swappable across many themes. Honor the Dual-Button Glow rule, 44px min touch targets, and WCAG 4.5:1. If the plan names its own design system or token contract, OBEY it and reconcile to the brand tokens rather than inventing a parallel token namespace.

## UX Research from Phase 1
${phase1UXReport || '_No Phase 1 UX report available._'}

## Your Analysis — Round 1

For EACH surface/component the plan ACTUALLY introduces, provide EXACT design specs:
- dimensions, spacing, and layout per breakpoint (mobile-first, up through 4K/ultrawide)
- background / surface / text / accent tokens (with brand fallbacks) and every state: default / hover / active / focus-visible / disabled / loading / empty / error
- motion spec + a prefers-reduced-motion fallback (durations, easing curves)
- accessibility (keyboard traversal, ARIA roles, contrast)

Include exact pixel values, token names, animation durations, and easing curves. Reference ONLY components that exist in the plan.

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

async function callOpenRouter(apiKey, model, prompt, maxTokens = 60_000) {
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
      max_tokens: maxTokens,
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
      maxOutputTokens: 60_000,
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
    } else if (track.model === MODELS.glm52) {
      // GLM 5.2: $1.20/M input, $4.10/M output (verified openrouter.ai/z-ai/glm-5.2 2026-06-20)
      costUSD = (result.inputTokens / 1_000_000 * 1.20) +
                (result.outputTokens / 1_000_000 * 4.10);
    } else if (track.model === MODELS.gemini31Pro) {
      // Gemini 3.1 Pro: $2/M input, $12/M output (estimate)
      costUSD = (result.inputTokens / 1_000_000 * 2.0) +
                (result.outputTokens / 1_000_000 * 12.0);
    }
    // Safety: warn if a "free" model somehow reports cost
    const paidModels = [MODELS.claudeSonnet46, MODELS.escalation1, MODELS.minimaxM27, MODELS.glm52, MODELS.gemini31Pro];
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
// Fusion Synthesis Judge (shared across all 3 modes)
// One judge reads every Phase-1 analyst and emits the fused verdict —
// the synthesis step OpenRouter Fusion is built around. Non-breaking:
// runFusionSynthesis returns null (skip) or an ERROR result, never throws
// here, and the synth result rides in the normal results array.
// ─────────────────────────────────────────────

async function runFusionSynthesisStep({ phase1Results, sink, apiKey, ctx, topic, capUSD = null }) {
  // Kill switch: the judge is a premium Opus-class call on EVERY run. Default ON
  // (Sean approved the graft) but killable via env so it never spends without consent.
  if (String(process.env.SWAN_FUSION_SYNTHESIS || 'on').toLowerCase() === 'off') {
    console.log('    [synthesis] disabled via SWAN_FUSION_SYNTHESIS=off');
    return;
  }
  // Mid-run hard-cap guard: skip the (most expensive) judge call if Phase 1 already
  // blew the budget, so the cap can't be exceeded by the synthesis step.
  const priorCost = [...(phase1Results || []), ...(sink || [])].reduce((s, r) => s + (r.costUSD || 0), 0);
  if (isOverCap(priorCost, capUSD)) {
    console.log(`    [synthesis] skipped — accumulated spend $${priorCost.toFixed(4)} already over cap $${Number(capUSD).toFixed(4)}`);
    return;
  }
  // Sean 2026-07-08: OPT-IN "maximize the one paid judge call" mode — used only when we
  // need a big-context authoring pass, not every run. A high output ceiling (so the judge
  // isn't truncated mid-plan) plus, when SWAN_FUSION_DELIVERABLE=1, an instruction to emit
  // a full build plan + Mermaid diagrams in a single pass. Both env-gated; default run is
  // byte-identical (deliverable='' → base prompt; ceiling only raises an unused cap).
  const judgeMaxTokens = Number(process.env.SWAN_FUSION_JUDGE_MAX_TOKENS) || 60_000;
  // Hard dollar cap on the single judge call (Sean 2026-07-08): default 0 = off; set
  // SWAN_FUSION_JUDGE_MAX_USD (e.g. 2) to bound the paid judge (Fable) by dollars, not just
  // tokens — fusion-synthesis computes the safe output ceiling from measured input + price.
  const judgeMaxUsd = Number(process.env.SWAN_FUSION_JUDGE_MAX_USD) || 0;
  const deliverable = process.env.SWAN_FUSION_DELIVERABLE === '1'
    ? `Grounded STRICTLY in the analyst contributions above (no new external research), assemble their fragments into ONE complete, build-ready plan — the single authoritative deliverable, produced in one pass. Include ALL of:
- **Executive summary** (3-5 sentences a founder can act on).
- **System architecture** with at least TWO **Mermaid** diagrams in fenced \`\`\`mermaid code blocks (a flowchart of the intent -> API -> state -> render pipeline, and a state or sequence diagram of one morph transition).
- **Sequenced build slices** — each shippable, numbered, with a one-line success criterion; ordered smallest-diamond-first.
- **Decisions on EVERY open question** in the plan (pick one, one-line why).
- **Risk table** (| risk | severity | mitigation |) with the single most likely fatal risk called out.
- **The one de-risking experiment** to run before heavy investment.
Be exhaustive and decisive. This is the only paid authoring call — leave nothing important for a follow-up.`
    : '';
  try {
    const synth = await runFusionSynthesis({
      analystResults: phase1Results,
      callModel: (model, prompt, mt) => callOpenRouter(apiKey, model, prompt, mt || judgeMaxTokens),
      judgeModel: FUSION_JUDGE.model,
      priceInputPerM: FUSION_JUDGE.priceInputPerM,
      priceOutputPerM: FUSION_JUDGE.priceOutputPerM,
      maxUsd: judgeMaxUsd,
      context: ctx,
      topic,
      deliverable,
      log: (m) => console.log(`    ${m}`),
    });
    if (synth) sink.push(synth);
  } catch (err) {
    console.error(`    [FAIL] Fusion synthesis: ${err.message}`);
  }
}

function writeFusionSynthesisArtifact(results, outputPaths) {
  const synth = results.find(r => r.name === 'Fusion Synthesis (Judge)' && r.status === 'SUCCESS');
  if (!synth) return;
  const md = formatSynthesisMarkdown(synth);
  writeFileSync(join(outputPaths.latestDir, 'synthesis.md'), md, 'utf-8');
  writeFileSync(join(outputPaths.archiveDir, 'synthesis.md'), md, 'utf-8');
  console.log(`    [synthesis] wrote ${join(outputPaths.latestDir, 'synthesis.md')}`);
}

// ─────────────────────────────────────────────
// Spend gate + cost summary (Sean 2026-06-15: protect overspending, keep an eye on credits)
// Pre-run: estimate → hard-cap check (SWAN_VILLAGE_MAX_USD) → confirm (TTY y/N or
// SWAN_VILLAGE_CONFIRM=yes). Post-run: per-model cost summary + cost-summary.md.
// ─────────────────────────────────────────────

async function spendGate({ tracks, inputChars, debatesEnabled, debatePanels }) {
  const synthesisOn = String(process.env.SWAN_FUSION_SYNTHESIS || 'on').toLowerCase() !== 'off';
  const judge = synthesisOn ? { model: FUSION_JUDGE.model } : null;
  const extraPricing = { [FUSION_JUDGE.model]: { in: FUSION_JUDGE.priceInputPerM, out: FUSION_JUDGE.priceOutputPerM } };
  const gate = await evaluateSpendGate({
    tracks, inputChars, judge, debatesEnabled, debatePanels, extraPricing,
    log: (m) => console.log(m),
  });
  if (!gate.proceed) {
    console.error('');
    console.error(`  [SPEND GATE] Run aborted — ${gate.reason}`);
    console.error('');
  }
  return gate;
}

function finalizeCostSummary(results, outputPaths) {
  console.log('');
  console.log(formatCostSummary(results));
  try {
    const md = formatCostSummaryMarkdown(results);
    writeFileSync(join(outputPaths.latestDir, 'cost-summary.md'), md, 'utf-8');
    writeFileSync(join(outputPaths.archiveDir, 'cost-summary.md'), md, 'utf-8');
  } catch (err) {
    console.error(`    [cost-summary] write failed (non-fatal): ${err.message}`);
  }
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
*Phase 1: 13 parallel — Gemini 2.5 Flash + Claude Sonnet 4.6 + Nemotron 3 Nano + Gemini 3 Flash + Gemini 3.1 Flash + Nemotron 3 Nano + Gemini 2.5 Flash + Nemotron 3 Super (Architecture/Bug Hunter) + Gemini 3.1 Flash + Claude Sonnet 4.6 (Data Safety) + Nemotron 3 Super + Nemotron 3 Super + Nemotron 3 Nano (Bug Hunter II) + Trinity Large 400B*
*Phase 2: 3 Specialty Debates — Security (Nemotron Nano ↔ Nemotron Super) + Code Quality (Claude ↔ Nemotron Super) + UX/UI (GLM 5.2 ↔ Gemini 3.1 Pro, design role only)*
*Phase 3: Smart Escalation — Nemotron Nano + Nemotron Super (CRITICAL only)*
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
  console.log('  ║    SwanStudios 15-Brain Recursive Consensus System      ║');
  const subtitle = hasGemini31
    ? `${brainCount}-Brain — Specialty Debates + Smart Escalation`
    : `13-Brain — Phase 1 only (add GEMINI_API_KEY for 15-Brain)`;
  console.log(`  ║    ${subtitle.padEnd(54)}║`);
  console.log('  ║                                                          ║');
  console.log('  ║    Phase 1: 13 Parallel Validators (OpenRouter)         ║');
  console.log('  ║    Gemini 2.5 Flash · Claude Sonnet 4.6 · Nemotron Nano  ║');
  console.log('  ║    Gemini 3 Flash · Gemini 3.1 Flash · Nemotron 3 Nano  ║');
  console.log('  ║    Gemini 2.5 Flash · Nemotron 3 Super · Gemini 3.1 Flash║');
  console.log('  ║    Nemotron 3 Super · Nemotron 3 Super · Data Safety     ║');
  if (hasGemini31) {
    console.log('  ║                                                          ║');
    console.log('  ║    Phase 2: 3 Specialty Recursive Debates              ║');
    console.log('  ║    A. Security: Nemotron Nano ↔ Nemotron Super (FREE)  ║');
    console.log('  ║    B. Code: Claude Sonnet 4.6 ↔ Nemotron 3 Super       ║');
    console.log('  ║    C. UX/UI: GLM 5.2 ↔ Gemini 3.1 Pro (design only)    ║');
    console.log('  ║                                                          ║');
    console.log('  ║    Phase 3: Smart Escalation (CRITICAL only)           ║');
    console.log('  ║    Nemotron Nano + Nemotron Super — skip if not needed ║');
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
    const ctx = `${getProjectContext()} Document under review: ${opts.document}`;
    const tracks = buildDocumentValidatorTracks(documentContent, opts.document);
    const phase1Tracks = tracks;

    assertNoChineseProviderInPolicyConstrainedTracks(phase1Tracks, [MODELS.escalation1, MODELS.escalation2, FUSION_JUDGE.model], { checkpoint: 'phase1-docs' });
    const gate = await spendGate({ tracks: phase1Tracks, inputChars: documentContent.length, debatesEnabled: hasGemini31 });
    if (!gate.proceed) return;
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

    // ── Fusion Synthesis: one judge distills the whole Phase-1 panel ──
    await runFusionSynthesisStep({ phase1Results, sink: debateResults, apiKey, ctx, topic: 'Document Review', capUSD: gate.capUSD });

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
      console.log('  GLM 5.2 (Lead Designer) ↔ Gemini 3.1 Pro (Reviewer)');
      console.log('');

      try {
        const p3Start = Date.now();
        const p3Result = await runRecursiveConsensus({
          topic: 'Document Design Gap Assessment',
          // Sean 2026-06-20: GLM 5.2 is the LEAD designer (final say). Policy exception — design slot is the
          // only place a Chinese-provider model is allowed (see MODELS comment). Gemini 3.1 Pro now reviews.
          modelA: { name: 'GLM 5.2', model: MODELS.glm52, provider: 'openrouter', role: 'Creative Director (Lead Design Authority)' },
          modelB: { name: 'Gemini 3.1 Pro', model: MODELS.gemini31Pro, provider: 'gemini-direct', role: 'Design Reviewer & Implementation Challenger' },
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
          name: 'UX/UI Design Debate (Phase 3)', model: `${MODELS.glm52} ↔ ${MODELS.gemini31Pro}`,
          status: 'SUCCESS', text: p3Result.finalVerdict,
          inputTokens: p3Result.totalTokens.input, outputTokens: p3Result.totalTokens.output,
          // Blended estimate: GLM 5.2 ($1.20/$4.10) + Gemini 3.1 Pro ($2/$12). recursive-consensus returns
          // combined tokens, not a per-model split, so this is a mid-point approximation.
          costUSD: (p3Result.totalTokens.input / 1_000_000 * 1.6) + (p3Result.totalTokens.output / 1_000_000 * 8.0),
          durationMs: Date.now() - p3Start, debateLog: p3Result.debateLog, consensusReached: p3Result.consensusReached,
        });
      } catch (err) {
        console.error(`    [FAIL] Phase 3: ${err.message}`);
        debateResults.push({ name: 'UX/UI Design Debate (Phase 3)', model: `${MODELS.glm52} ↔ ${MODELS.gemini31Pro}`, status: 'ERROR', text: `Error: ${err.message}`, inputTokens: 0, outputTokens: 0, costUSD: 0, durationMs: 0 });
      }
    }

    const results = [...phase1Results, ...debateResults];
    const { md, timestamp } = generateReport(results, files, startTime);
    const successCount = results.filter(r => r.status === 'SUCCESS').length;
    const totalCost = results.reduce((sum, r) => sum + (r.costUSD || 0), 0);
    const outputPaths = writeSplitOutput(results, files, md, timestamp);
    writeFusionSynthesisArtifact(results, outputPaths);
    finalizeCostSummary(results, outputPaths);

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
    const ctx = `${getProjectContext()} You are reviewing a PLAN; derive every feature-specific detail from the plan content — do NOT assume any particular feature. Plan: ${opts.document}`;
    const phase1Tracks = buildPlanningValidatorTracks(planContent, opts.document);

    const groundedCount = phase1Tracks.filter(t => t.useGrounding).length;
    // Mirror of the code-mode gate (line ~2515): without debatePanels the estimator
    // prices worst-case recursive debates even in flat mode and aborts on the cap.
    // PLAN_DEBATE_SEATS is the single source of truth — the Phase 2A/2B/2C seat
    // definitions below consume it too, so the gate always prices the models that
    // actually run (R2 hostile review: a hardcoded copy drifts fail-open/underpriced).
    const singlePassDebates = budgetProfile && process.env.SWAN_VILLAGE_SINGLE_PASS_DEBATES === '1';
    const PLAN_DEBATE_SEATS = {
      p2a: { a: MODELS.nemotron3Nano, b: MODELS.nemotron3Super },
      p2b: { a: MODELS.claudeSonnet46, b: MODELS.nemotron3Super },
      p2c: { a: MODELS.glm52, b: MODELS.gemini31Pro },
    };
    const debatePanels = singlePassDebates
      ? Object.values(PLAN_DEBATE_SEATS).map((s) => [s.a, s.b])
      : undefined;
    assertNoChineseProviderInPolicyConstrainedTracks(phase1Tracks, [MODELS.escalation1, MODELS.escalation2, FUSION_JUDGE.model], { checkpoint: 'phase1-planning' });
    const gate = await spendGate({ tracks: phase1Tracks, inputChars: planContent.length, debatesEnabled: hasGemini31, debatePanels });
    if (!gate.proceed) return;
    console.log(`  Phase 1: Launching ${phase1Tracks.length} planning analysts (staggered 2s apart)...`);
    if (groundedCount > 0) {
      console.log(`           ${groundedCount} brain(s) with Google Search Grounding (real-time web research)`);
    }
    if (hasGemini31) {
      console.log(`  Phase 2: 3 Planning Specialty Debates...`);
      console.log(`    A. Security Planning: Nemotron Nano ↔ Nemotron 3 Super (both FREE)`);
      console.log(`    B. Architecture Planning: Claude Sonnet 4.6 ↔ Nemotron 3 Super`);
      console.log(`    C. UX/UI Design: GLM 5.2 (Lead) ↔ Gemini 3.1 Pro`);
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

    // ── Fusion Synthesis: one judge distills the whole Phase-1 panel ──
    await runFusionSynthesisStep({ phase1Results, sink: debateResults, apiKey, ctx, topic: 'Plan Review (planning mode)', capUSD: gate.capUSD });

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
          modelA: { name: 'Nemotron 3 Nano', model: PLAN_DEBATE_SEATS.p2a.a, provider: 'openrouter', role: 'Primary Security Planner' },
          modelB: { name: 'Nemotron 3 Super', model: PLAN_DEBATE_SEATS.p2a.b, provider: 'openrouter', role: 'Secondary Security Planner (120B MoE)' },
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
          modelA: { name: 'Claude Sonnet 4.6', model: PLAN_DEBATE_SEATS.p2b.a, provider: 'openrouter', role: 'Senior Architecture Lead' },
          modelB: { name: 'Nemotron 3 Super', model: PLAN_DEBATE_SEATS.p2b.b, provider: 'openrouter', role: 'Code Architecture Specialist (1M context)' },
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
      console.log('  GLM 5.2 (Lead Designer) ↔ Gemini 3.1 Pro (Reviewer)');
      console.log('');

      try {
        const p2cStart = Date.now();
        const p2cResult = await runRecursiveConsensus({
          topic: 'UX/UI Design Specification',
          // Policy exception: Phase 2C is the UX/UI design slot — the only place a Chinese-provider model is allowed.
          // The audit-compliance guard (assertNoChineseProviderInPolicyConstrainedTracks) intentionally does NOT
          // scan this code path — see policy comment at the MODELS definition.
          // Sean 2026-06-20: GLM 5.2 is now the LEAD designer (final say); Gemini 3.1 Pro reviews.
          modelA: { name: 'GLM 5.2', model: PLAN_DEBATE_SEATS.p2c.a, provider: 'openrouter', role: 'Creative Director (Lead Design Authority)' },
          modelB: { name: 'Gemini 3.1 Pro', model: PLAN_DEBATE_SEATS.p2c.b, provider: 'gemini-direct', role: 'Design Reviewer & Implementation Challenger' },
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
          name: 'UX/UI Design Planning Debate (Phase 2C)', model: `${MODELS.glm52} ↔ ${MODELS.gemini31Pro}`,
          status: 'SUCCESS', text: p2cResult.finalVerdict,
          inputTokens: p2cResult.totalTokens.input, outputTokens: p2cResult.totalTokens.output,
          // Blended estimate: GLM 5.2 ($1.20/$4.10) + Gemini 3.1 Pro ($2/$12). Combined tokens, not per-model split.
          costUSD: (p2cResult.totalTokens.input / 1_000_000 * 1.6) + (p2cResult.totalTokens.output / 1_000_000 * 8.0),
          durationMs: Date.now() - p2cStart,
          debateLog: p2cResult.debateLog, consensusReached: p2cResult.consensusReached,
        });
      } catch (err) {
        console.error(`    [FAIL] Phase 2C: ${err.message}`);
        debateResults.push({ name: 'UX/UI Design Planning Debate (Phase 2C)', model: `${MODELS.glm52} ↔ ${MODELS.gemini31Pro}`, status: 'ERROR', text: `Error: ${err.message}`, inputTokens: 0, outputTokens: 0, costUSD: 0, durationMs: 0 });
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
          // Privacy-audit fix 2026-04-22 (ORCHESTRATOR-DRIFT-FIX Site C, planning escalation): was MODELS.minimaxM27.
          // Escalation receives the most sensitive findings — worst place for a Chinese model.
          console.log('  Nemotron Super Escalation — deep-diving CRITICAL planning gaps...');
          try {
            const escStart = Date.now();
            const criticalFindings = allDebateTexts.split('\n').filter(l => l.toUpperCase().includes('CRITICAL')).slice(0, 20).join('\n');
            const escResult = await callOpenRouter(apiKey, MODELS.escalation2, `You are Nemotron 3 Super (NVIDIA, 120B MoE) — final escalation reviewer. CRITICAL gaps have been found in a feature implementation plan. Deep-dive each one:\n1. Is this truly CRITICAL or over-classified?\n2. Specific mitigation strategy\n3. Should this block implementation or be addressed in parallel?\n4. Priority order\n\nCRITICAL Findings:\n${criticalFindings}\n\nFull plan:\n${planContent}`);
            console.log(`    [OK] Nemotron Super Escalation — ${((Date.now() - escStart) / 1000).toFixed(1)}s`);
            debateResults.push({ name: 'Smart Escalation (Nemotron Super)', model: MODELS.escalation2, status: 'SUCCESS', text: escResult.text, inputTokens: escResult.inputTokens, outputTokens: escResult.outputTokens, costUSD: 0, durationMs: Date.now() - escStart });
          } catch (err) {
            console.error(`    [FAIL] Nemotron Super Escalation: ${err.message}`);
            debateResults.push({ name: 'Smart Escalation (Nemotron Super)', model: MODELS.escalation2, status: 'ERROR', text: `Error: ${err.message}`, inputTokens: 0, outputTokens: 0, costUSD: 0, durationMs: 0 });
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
    writeFusionSynthesisArtifact(results, outputPaths);
    finalizeCostSummary(results, outputPaths);

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
      const designSpec = `# Design Specification Consensus\n\n> Phase 2C: GLM 5.2 (Lead Designer) ↔ Gemini 3.1 Pro (Reviewer)\n> Consensus: ${designVerdict.consensusReached ? 'YES' : 'Final authority decided'}\n\n---\n\n${designVerdict.text}\n`;
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
  const ctx = `${getProjectContext()} You are reviewing actual code files; derive the feature from the code itself — do NOT assume any particular feature. Files under review: ${fileNames}`;
  const tracks = buildValidatorTracks(codeBundle, files);

  // All tracks are Phase 1 now — Phase 2+3 are recursive debates
  const phase1Tracks = tracks;
  const totalPhases = hasGemini31 ? 3 : 1;
  const singlePassDebates = budgetProfile && process.env.SWAN_VILLAGE_SINGLE_PASS_DEBATES === '1';
  const debatePanels = singlePassDebates ? [
    [MODELS.nemotron3Nano, MODELS.nemotron3Super],
    [MODELS.claudeSonnet46, MODELS.nemotron3Super],
    [MODELS.glm52, MODELS.gemini31Flash],
  ] : undefined;

  assertNoChineseProviderInPolicyConstrainedTracks(phase1Tracks, [MODELS.escalation1, MODELS.escalation2, FUSION_JUDGE.model], { checkpoint: 'phase1-code-review' });
  const gate = await spendGate({ tracks: phase1Tracks, inputChars: codeBundle.length, debatesEnabled: hasGemini31, debatePanels });
  if (!gate.proceed) return;
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

  // ── Fusion Synthesis: one judge distills the whole Phase-1 panel ──
  await runFusionSynthesisStep({ phase1Results, sink: debateResults, apiKey, ctx, topic: 'Code Review' });

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
        finalAuthority: 'A', // Nemotron 3 Nano = primary security authority (post-2026-04-06 privacy audit replacement for Step 3.5)
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
        costUSD: (phase2Result.totalTokens.input / 1_000_000 * 1.5) + (phase2Result.totalTokens.output / 1_000_000 * 7.5), // Only Claude costs, Nemotron Super is free
        durationMs: p2bDuration, debateLog: phase2Result.debateLog, consensusReached: phase2Result.consensusReached,
      });
    } catch (err) {
      console.error(`    [FAIL] Phase 2B: ${err.message}`);
      debateResults.push({ name: 'Code Quality Debate (Phase 2B)', model: `${MODELS.claudeSonnet46} ↔ ${MODELS.nemotron3Super}`, status: 'ERROR', text: `Error: ${err.message}`, inputTokens: 0, outputTokens: 0, costUSD: 0, durationMs: 0 });
    }

    // ── Phase 2C: UX/UI Design Specialty Debate ──
    console.log('');
    console.log('  ── Phase 2C: UX/UI Design Specialty Debate ──');
    console.log('  GLM 5.2 (Lead Designer) ↔ Gemini 3.1 Pro (Reviewer)');
    console.log('  Max 5 rounds · GLM 5.2 = final authority on design');
    console.log('');

    try {
      const p2cStart = Date.now();
      const phase3Result = await runRecursiveConsensus({
        topic: 'UX/UI Design Quality',
        // Policy exception: Phase 2C is the UX/UI design slot — the only place a Chinese-provider model is allowed.
        // The audit-compliance guard (assertNoChineseProviderInPolicyConstrainedTracks) intentionally does NOT
        // scan this code path — see policy comment at the MODELS definition.
        // Sean 2026-06-20: GLM 5.2 is now the LEAD designer (final say); Gemini 3.1 Pro reviews.
        modelA: {
          name: 'GLM 5.2',
          model: MODELS.glm52,
          provider: 'openrouter',
          role: 'Creative Director (Lead Design Authority)',
        },
        modelB: {
          name: budgetProfile ? 'Gemini 3.1 Flash' : 'Gemini 3.1 Pro',
          model: budgetProfile ? MODELS.gemini31Flash : MODELS.gemini31Pro,
          provider: budgetProfile ? 'openrouter' : 'gemini-direct',
          role: 'Design Reviewer & Implementation Challenger',
        },
        finalAuthority: 'A', // GLM 5.2 = Creative Director = final say on design
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
        model: `${MODELS.glm52} ↔ ${MODELS.gemini31Pro}`,
        status: 'SUCCESS', text: phase3Result.finalVerdict,
        inputTokens: phase3Result.totalTokens.input, outputTokens: phase3Result.totalTokens.output,
        // Blended estimate: GLM 5.2 ($1.20/$4.10) + Gemini 3.1 Pro ($2/$12). Combined tokens, not per-model split.
        costUSD: (phase3Result.totalTokens.input / 1_000_000 * 1.6) + (phase3Result.totalTokens.output / 1_000_000 * 8.0),
        durationMs: p2cDuration, debateLog: phase3Result.debateLog, consensusReached: phase3Result.consensusReached,
      });
    } catch (err) {
      console.error(`    [FAIL] Phase 2C: ${err.message}`);
      debateResults.push({ name: 'UX/UI Design Debate (Phase 2C)', model: `${MODELS.glm52} ↔ ${MODELS.gemini31Pro}`, status: 'ERROR', text: `Error: ${err.message}`, inputTokens: 0, outputTokens: 0, costUSD: 0, durationMs: 0 });
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
        // Privacy-audit fix 2026-04-22 (ORCHESTRATOR-DRIFT-FIX Site C, code-review escalation): was MODELS.minimaxM27.
        // Escalation receives the most sensitive findings — worst place for a Chinese model.
        console.log('  Nemotron Super Escalation — deep-diving CRITICAL findings...');
        try {
          const escStart = Date.now();
          const criticalFindings = allDebateTexts.split('\n').filter(l => l.toUpperCase().includes('CRITICAL')).slice(0, 20).join('\n');
          const escResult = await callOpenRouter(apiKey, MODELS.escalation2, `You are Nemotron 3 Super (NVIDIA, 120B MoE) — final escalation reviewer. CRITICAL security and code findings have been detected by the AI Village. Deep-dive into each one and provide:\n1. Is this truly CRITICAL or over-classified?\n2. Exact fix with code snippet\n3. Blast radius — how many users affected?\n4. Priority order for fixing\n\nCRITICAL Findings:\n${criticalFindings}\n\nFull context:\n${codeBundle}`);
          console.log(`    [OK] Nemotron Super Escalation — ${((Date.now() - escStart) / 1000).toFixed(1)}s`);
          debateResults.push({
            name: 'Smart Escalation (Nemotron Super)', model: MODELS.escalation2,
            status: 'SUCCESS', text: escResult.text,
            inputTokens: escResult.inputTokens, outputTokens: escResult.outputTokens,
            costUSD: 0,
            durationMs: Date.now() - escStart,
          });
        } catch (err) {
          console.error(`    [FAIL] Nemotron Super Escalation: ${err.message}`);
          debateResults.push({ name: 'Smart Escalation (Nemotron Super)', model: MODELS.escalation2, status: 'ERROR', text: `Error: ${err.message}`, inputTokens: 0, outputTokens: 0, costUSD: 0, durationMs: 0 });
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
  writeFusionSynthesisArtifact(results, outputPaths);

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
    const designRecs = `# Design Recommendations — UX/UI Consensus\n\n> Generated from Phase 2C specialty debate (GLM 5.2 Lead Designer ↔ Gemini 3.1 Pro Reviewer)\n> Consensus: ${phase2cVerdict.consensusReached ? 'YES' : 'Final authority decided'}\n\n---\n\n${phase2cVerdict.text}\n`;
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
  'Code Architecture (Nemotron Super)': '11-code-architecture-nemotron',
  'Bug Hunter II (Nemotron Nano)': '12-bug-hunter-nemotron',
  // Legacy slugs (backwards compat for older runs that named these tracks differently — pre-ORCHESTRATOR-DRIFT-FIX 2026-04-22)
  'Code Architecture (Qwen)': '11-code-architecture-qwen',
  'Bug Hunter II (Step)': '12-bug-hunter-step',
  'Security Debate (Phase 2A)': '13-security-debate',
  'Code Quality Debate (Phase 2B)': '14-code-quality-debate',
  'UX/UI Design Debate (Phase 2C)': '15-design-debate',
  'Smart Escalation (Nemotron Nano Escalation)': '16-escalation-mercury',
  'Smart Escalation (Nemotron Super)': '17-escalation-nemotron-super',
  // Legacy slug (backwards compat for older runs that named this differently)
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
| \`11-code-architecture-nemotron.md\` | Code Architecture — Nemotron 3 Super review |
| \`12-bug-hunter-nemotron.md\` | Bug Hunter II — Nemotron Nano edge cases / race conditions |
| \`13-security-debate.md\` | Phase 2A: Security debate (Nemotron Nano ↔ Nemotron Super) |
| \`14-code-quality-debate.md\` | Phase 2B: Code quality debate (Claude ↔ Nemotron Super) |
| \`15-design-debate.md\` | Phase 2C: UX/UI debate (GLM 5.2 ↔ Gemini 3.1 Pro) |
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
