#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║         SwanStudios Parallel Validation Orchestrator            ║
 * ║           8-Brain System — OpenRouter + Google GenAI              ║
 * ║                                                                  ║
 * ║  7 via OpenRouter + 1 via Google GenAI:                          ║
 * ║  1. Gemini 2.5 Flash     → UX / Accessibility       (FREE)     ║
 * ║  2. Claude 4.5 Sonnet   → Code Quality              (FREE)     ║
 * ║  3. DeepSeek V3.2        → Security scan             (FREE)     ║
 * ║  4. Gemini 3 Flash       → Performance review        (FREE)     ║
 * ║  5. MiniMax M2.1         → Competitive intelligence  (FREE)     ║
 * ║  6. DeepSeek V3.2        → User research / personas  (FREE)     ║
 * ║  7. MiniMax M2.5         → Architecture & Bug Hunter (~$0.01)   ║
 * ║  8. Gemini 3.1 Pro       → Frontend UI/UX Expert  (Google API)  ║
 * ║                                                                  ║
 * ║  Setup: Add to .env:                                             ║
 * ║    OPENROUTER_API_KEY=sk-or-v1-xxxxx                            ║
 * ║    GEMINI_API_KEY=AIzaSy... (optional — enables 8th brain)      ║
 * ║                                                                  ║
 * ║  Usage:                                                          ║
 * ║    node scripts/validation-orchestrator.mjs                      ║
 * ║    node scripts/validation-orchestrator.mjs --files src/App.tsx  ║
 * ║    node scripts/validation-orchestrator.mjs --since 24h         ║
 * ║    node scripts/validation-orchestrator.mjs --staged             ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

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
  deepseekV3:     'deepseek/deepseek-v3.2-20251201',  // FREE
  minimaxM21:     'minimax/minimax-m2.1',              // FREE
  claudeSonnet45: 'anthropic/claude-4.5-sonnet-20250929', // FREE on OpenRouter
  // ── PAID models (clearly marked) ──
  minimaxM25:     'minimax/minimax-m2.5',              // ~$0.005/run — #1 programming
  // ── Google GenAI (direct API, not via OpenRouter) ──
  gemini31Pro:    'gemini-3.1-pro-preview',            // Direct Google API — best for UI/UX frontend review
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
        const val = trimmed.slice(eqIdx + 1).trim();
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
        opts.files.push(args[i]);
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
        timeArg = `--since="${since}"`;
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
    const fullPath = join(ROOT, fp);
    if (!existsSync(fullPath)) continue;
    try {
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
  const ctx = `SwanStudios is a personal training SaaS platform (React + TypeScript + styled-components frontend, Node.js + Express + Sequelize + PostgreSQL backend). Galaxy-Swan dark cosmic theme. Production: sswanstudios.com. Files: ${fileNames}`;

  return [
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
      model: MODELS.deepseekV3,
      prompt: `You are a security auditor specializing in web application security. ${ctx}

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
2. **Differentiation strengths** — what unique value does this codebase deliver? (NASM AI integration, pain-aware training, Galaxy-Swan UX)
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
4. **Emotional design** — does the Galaxy-Swan theme create the right emotional response? (premium, trustworthy, motivating)
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
  ];

  // ── 8th Brain: Gemini 3.1 Pro (only if GEMINI_API_KEY is set) ──
  if (getGeminiKey()) {
    tracks.push({
      name: 'Frontend UI/UX Expert',
      model: MODELS.gemini31Pro,
      provider: 'gemini-direct',
      prompt: `You are a world-class frontend UI/UX engineer and design systems expert. You specialize in React + TypeScript + styled-components applications with dark cosmic themes. ${ctx}

You are the most capable model in this review pipeline. Use your advanced reasoning to provide the deepest, most actionable frontend review possible.

Review the following code for:

1. **Visual Design Quality** — Does the UI avoid "AI slop"? Are gradients, shadows, and animations tasteful or generic?
   - Color harmony: proper use of Galaxy-Swan tokens (#0a0a1a, #00FFFF, #7851A9)
   - Typography hierarchy: readable font sizes, proper line-height, contrast ratios
   - Spacing rhythm: consistent use of 4/8px grid, visual breathing room
   - Glass/cosmic effects: do they enhance or distract?

2. **Component Architecture** — Are styled-components well-structured?
   - Theme token usage vs hardcoded values
   - Responsive breakpoints (must cover: 320, 375, 430, 768, 1024, 1280, 1440, 1920, 2560, 3840)
   - Component composition: too many props? Should be decomposed?
   - Animation performance: CSS transforms vs layout-triggering properties

3. **Interaction Design** — Is the UX smooth and intuitive?
   - Touch targets (must be 44px minimum for mobile)
   - Loading states, skeleton screens, error boundaries
   - Form validation: inline errors, focus management, success feedback
   - Navigation flow: minimal clicks to key actions
   - Micro-interactions: hover effects, transitions, focus rings

4. **Accessibility (WCAG 2.1 AA)** — Can everyone use this?
   - Color contrast ratios (4.5:1 text, 3:1 large text/UI)
   - Keyboard navigation: tab order, focus indicators, skip links
   - Screen reader support: aria labels, roles, live regions
   - Motion preferences: prefers-reduced-motion respected

5. **Mobile-First UX** — Does it work beautifully on phones?
   - Touch gestures: swipe, long-press support where appropriate
   - Bottom-sheet patterns for mobile modals
   - Sticky headers/footers for important actions
   - Input types: numeric keyboards for numbers, email keyboards for email

6. **Performance UX** — Does it feel fast?
   - Perceived performance: optimistic updates, skeleton screens
   - Code splitting: are heavy components lazy-loaded?
   - Image optimization: WebP, srcset, lazy loading
   - Bundle impact: unnecessary dependencies, tree-shaking blockers

For each finding provide:
- **Severity:** CRITICAL / HIGH / MEDIUM / LOW
- **File & Location:** Exact file and section
- **Issue:** Clear description with visual impact
- **Fix:** Specific code change with before/after

Be opinionated about design quality. This platform charges premium prices — the UI must look premium.

CODE TO REVIEW:
${codeBundle}`,
    });
  }

  return tracks;
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
    const isPaidModel = track.model === MODELS.minimaxM25 || track.model === MODELS.gemini31Pro;
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

*SwanStudios Validation Orchestrator v8.0 — AI Village Edition*
*${successCount} Validators: Gemini 2.5 Flash + Claude 4.5 Sonnet + DeepSeek V3.2 x2 + Gemini 3 Flash + MiniMax M2.1 + MiniMax M2.5${getGeminiKey() ? ' + Gemini 3.1 Pro' : ''}*
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
  console.log('');
  const hasGemini31 = !!getGeminiKey();
  const brainCount = hasGemini31 ? 8 : 7;

  console.log('  ╔══════════════════════════════════════════════════════════╗');
  console.log('  ║    SwanStudios Parallel Validation Orchestrator         ║');
  const subtitle = hasGemini31
    ? `${brainCount}-Brain System — Gemini 3.1 Pro ENABLED`
    : `${brainCount}-Brain System — VERIFIED FREE Edition`;
  console.log(`  ║    ${subtitle.padEnd(54)}║`);
  console.log('  ║                                                          ║');
  console.log('  ║    Gemini 2.5 Flash · Claude 4.5 Sonnet · DeepSeek V3.2║');
  console.log('  ║    Gemini 3 Flash · MiniMax M2.1 · MiniMax M2.5        ║');
  if (hasGemini31) {
    console.log('  ║    Gemini 3.1 Pro → Frontend UI/UX Expert (Google API)  ║');
  }
  console.log('  ╚══════════════════════════════════════════════════════════╝');
  console.log('');

  const startTime = Date.now();
  loadEnv();

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
    console.error('    node scripts/validation-orchestrator.mjs --files src/App.tsx  # specific files');
    process.exit(1);
  }

  console.log(`  Found ${files.length} file(s) to validate:`);
  files.forEach(f => console.log(`    ${f.path} (${(f.content.length / 1024).toFixed(1)} KB)`));
  console.log('');

  const codeBundle = formatCodeBundle(files);
  const tracks = buildValidatorTracks(codeBundle, files);

  console.log(`  Launching ${tracks.length} validators (staggered 2s apart for rate limits)...`);
  console.log('');

  // Launch all with staggered delays to respect free-tier rate limits
  const results = await Promise.all(tracks.map(async (track, index) => {
    const tag = track.name.padEnd(35);
    const modelShort = track.model.split('/').pop();
    console.log(`    [${index + 1}/${tracks.length}] ${tag} -> ${modelShort}`);
    const result = await runValidator(apiKey, track, index);
    const badge = result.status === 'SUCCESS' ? 'OK  ' : 'FAIL';
    console.log(`    [${badge}] ${tag} ${(result.durationMs / 1000).toFixed(1)}s`);
    return result;
  }));

  console.log('');

  const { md, timestamp } = generateReport(results, files, startTime);
  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const totalCost = results.reduce((sum, r) => sum + (r.costUSD || 0), 0);

  // ── Write section-specific files to AI Village ──
  const outputPaths = writeSplitOutput(results, files, md, timestamp);

  // ── Legacy mirror (backwards compat) ──
  mkdirSync(CONFIG.legacyReportDir, { recursive: true });
  writeFileSync(join(CONFIG.legacyReportDir, 'LATEST.md'), md, 'utf-8');

  console.log('  ════════════════════════════════════════════════════════');
  console.log(`  AI Village Output:`);
  console.log(`    Latest:     ${outputPaths.latestDir}/`);
  console.log(`    Summary:    ${outputPaths.summary}`);
  console.log(`    Archive:    ${outputPaths.archiveDir}/`);
  console.log(`  Results:  ${successCount}/${tracks.length} validators passed`);
  console.log(`  Cost:     $${totalCost.toFixed(4)}`);
  console.log(`  Time:     ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log('  ════════════════════════════════════════════════════════');
  console.log('');
  console.log('  >> Section-specific prompts are in:');
  console.log('  >>   AI-Village-Documentation/validation-prompts/latest/');
  console.log('  >>');
  console.log('  >> Paste the ONBOARDING.md into Claude Code or Gemini');
  console.log('  >> and the AI will know where to find everything.');
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
  'Frontend UI/UX Expert': '08-frontend-uiux',
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

*Part of SwanStudios 7-Brain Validation System*
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
| \`08-frontend-uiux.md\` | UI design, components, interactions (Gemini 3.1 Pro) |

*SwanStudios 8-Brain Validation System v8.0*
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

I just ran 7 parallel AI validators on these files: ${fileNames}

Here is a consolidated summary of all findings from the 7 AI reviewers. Please analyze these findings, prioritize them, create an action plan, and fix the CRITICAL and HIGH issues.

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
Project: SwanStudios (React + TypeScript + styled-components, Galaxy-Swan theme)
`;
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
