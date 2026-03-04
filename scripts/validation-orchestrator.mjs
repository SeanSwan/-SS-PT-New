#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║         SwanStudios Parallel Validation Orchestrator            ║
 * ║                                                                  ║
 * ║  Fires 6 parallel AI validator tracks after a build/deploy:      ║
 * ║  1. Gemini  → UX / Accessibility audit                          ║
 * ║  2. ChatGPT → Code quality / best practices                     ║
 * ║  3. Grok    → Security / vulnerability scan                     ║
 * ║  4. Claude  → Performance / scalability review                  ║
 * ║  5. Claude  → Competitive intelligence analysis                 ║
 * ║  6. Claude  → User research / persona alignment                 ║
 * ║                                                                  ║
 * ║  Usage:                                                          ║
 * ║    node scripts/validation-orchestrator.js                       ║
 * ║    node scripts/validation-orchestrator.js --files src/App.tsx   ║
 * ║    node scripts/validation-orchestrator.js --since 2h            ║
 * ║    node scripts/validation-orchestrator.js --staged              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const ROOT = join(__dirname, '..');

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────

const CONFIG = {
  // Model pricing (per 1K tokens)
  costs: {
    'gemini-2.0-flash':    { input: 0.000075, output: 0.0003 },
    'gpt-4o':              { input: 0.0025,   output: 0.01 },
    'grok-3':              { input: 0.003,     output: 0.015 },
    'claude-sonnet-4-6':   { input: 0.003,     output: 0.015 },
  },
  // Max chars of code to send per validator (prevent huge bills)
  maxCodeChars: 60_000,
  // Output directory for reports
  reportDir: join(ROOT, 'docs', 'ai-workflow', 'validation-reports'),
  // Request timeout (ms)
  timeout: 120_000,
};

// ─────────────────────────────────────────────
// API Key Management
// ─────────────────────────────────────────────

function loadEnv() {
  // Load .env from root and backend
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
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

function getApiKey(provider) {
  const keyMap = {
    google:    ['GOOGLE_AI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    openai:    ['OPENAI_API_KEY'],
    xai:       ['XAI_API_KEY', 'GROK_API_KEY'],
    anthropic: ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY'],
  };
  const candidates = keyMap[provider] || [];
  for (const k of candidates) {
    if (process.env[k]) return process.env[k];
  }
  return null;
}

// ─────────────────────────────────────────────
// File Discovery
// ─────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { files: [], since: null, staged: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--files' && args[i + 1]) {
      // Collect all following non-flag args
      i++;
      while (i < args.length && !args[i].startsWith('--')) {
        opts.files.push(args[i]);
        i++;
      }
      i--; // back up one for the loop increment
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
    // Git staged files
    try {
      const out = execSync('git diff --cached --name-only', { cwd: ROOT, encoding: 'utf-8' });
      filePaths = out.trim().split('\n').filter(Boolean);
    } catch { filePaths = []; }
  } else {
    // Recently modified files (default: last 2 hours or --since)
    const since = opts.since || '2h';
    try {
      // Use git log to find recently changed files
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
      // Fallback: git status modified files
      try {
        const out = execSync('git diff --name-only HEAD', { cwd: ROOT, encoding: 'utf-8' });
        filePaths = out.trim().split('\n').filter(Boolean);
      } catch { filePaths = []; }
    }
  }

  // Filter to code files only
  filePaths = filePaths.filter(f => codeExts.has(extname(f).toLowerCase()));

  // Read file contents
  const files = [];
  let totalChars = 0;

  for (const fp of filePaths) {
    const fullPath = join(ROOT, fp);
    if (!existsSync(fullPath)) continue;
    try {
      const content = readFileSync(fullPath, 'utf-8');
      if (totalChars + content.length > CONFIG.maxCodeChars) {
        // Truncate to fit budget
        const remaining = CONFIG.maxCodeChars - totalChars;
        if (remaining > 500) {
          files.push({ path: fp, content: content.slice(0, remaining) + '\n\n// ... truncated ...' });
          totalChars = CONFIG.maxCodeChars;
        }
        break;
      }
      files.push({ path: fp, content });
      totalChars += content.length;
    } catch { /* skip unreadable */ }
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

function buildPrompts(codeBundle, fileList) {
  const fileNames = fileList.map(f => f.path).join(', ');
  const context = `SwanStudios is a personal training SaaS platform (React + TypeScript + styled-components frontend, Node.js + Express + Sequelize + PostgreSQL backend). Galaxy-Swan dark cosmic theme. Production site: sswanstudios.com. Files reviewed: ${fileNames}`;

  return {
    ux: {
      name: 'UX & Accessibility',
      provider: 'google',
      model: 'gemini-2.0-flash',
      prompt: `You are a UX and accessibility expert auditor. ${context}

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

    codeQuality: {
      name: 'Code Quality',
      provider: 'openai',
      model: 'gpt-4o',
      prompt: `You are a senior TypeScript/React code quality reviewer. ${context}

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

    security: {
      name: 'Security',
      provider: 'xai',
      model: 'grok-3',
      prompt: `You are a security auditor specializing in web application security. ${context}

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

    performance: {
      name: 'Performance & Scalability',
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      prompt: `You are a performance and scalability engineer. ${context}

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

    competitive: {
      name: 'Competitive Intelligence',
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      prompt: `You are a product strategist analyzing a fitness SaaS platform. ${context}

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

    userResearch: {
      name: 'User Research & Persona Alignment',
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      prompt: `You are a user researcher analyzing a fitness SaaS platform. ${context}

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
  };
}

// ─────────────────────────────────────────────
// API Callers
// ─────────────────────────────────────────────

async function callGoogleGemini(apiKey, model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 4096, temperature: 0.3 },
    }),
    signal: AbortSignal.timeout(CONFIG.timeout),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Gemini API error ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '(no response)';
  const usage = data.usageMetadata || {};
  return {
    text,
    inputTokens: usage.promptTokenCount || estimateTokens(prompt),
    outputTokens: usage.candidatesTokenCount || estimateTokens(text),
  };
}

async function callOpenAI(apiKey, model, prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
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
    throw new Error(`OpenAI API error ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content || '(no response)',
    inputTokens: data.usage?.prompt_tokens || estimateTokens(prompt),
    outputTokens: data.usage?.completion_tokens || estimateTokens(data.choices?.[0]?.message?.content || ''),
  };
}

async function callXAI(apiKey, model, prompt) {
  // xAI (Grok) uses OpenAI-compatible API
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
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
    throw new Error(`xAI API error ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content || '(no response)',
    inputTokens: data.usage?.prompt_tokens || estimateTokens(prompt),
    outputTokens: data.usage?.completion_tokens || estimateTokens(data.choices?.[0]?.message?.content || ''),
  };
}

async function callAnthropic(apiKey, model, prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(CONFIG.timeout),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Anthropic API error ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    text: data.content?.[0]?.text || '(no response)',
    inputTokens: data.usage?.input_tokens || estimateTokens(prompt),
    outputTokens: data.usage?.output_tokens || estimateTokens(data.content?.[0]?.text || ''),
  };
}

function estimateTokens(text) {
  // Rough estimate: ~4 chars per token
  return Math.ceil((text || '').length / 4);
}

// ─────────────────────────────────────────────
// Validator Runner
// ─────────────────────────────────────────────

async function runValidator(track) {
  const apiKey = getApiKey(track.provider);
  if (!apiKey) {
    return {
      name: track.name,
      status: 'SKIPPED',
      text: `No API key found for ${track.provider}. Set one of: ${getKeyNames(track.provider)}`,
      inputTokens: 0,
      outputTokens: 0,
      costUSD: 0,
      durationMs: 0,
    };
  }

  const start = Date.now();
  try {
    let result;
    switch (track.provider) {
      case 'google':
        result = await callGoogleGemini(apiKey, track.model, track.prompt);
        break;
      case 'openai':
        result = await callOpenAI(apiKey, track.model, track.prompt);
        break;
      case 'xai':
        result = await callXAI(apiKey, track.model, track.prompt);
        break;
      case 'anthropic':
        result = await callAnthropic(apiKey, track.model, track.prompt);
        break;
      default:
        throw new Error(`Unknown provider: ${track.provider}`);
    }

    const costConfig = CONFIG.costs[track.model] || { input: 0.003, output: 0.015 };
    const costUSD = (result.inputTokens / 1000 * costConfig.input) +
                    (result.outputTokens / 1000 * costConfig.output);

    return {
      name: track.name,
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
      status: 'ERROR',
      text: `Error: ${err.message}`,
      inputTokens: 0,
      outputTokens: 0,
      costUSD: 0,
      durationMs: Date.now() - start,
    };
  }
}

function getKeyNames(provider) {
  const keyMap = {
    google: 'GOOGLE_AI_API_KEY, GEMINI_API_KEY',
    openai: 'OPENAI_API_KEY',
    xai: 'XAI_API_KEY, GROK_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY, CLAUDE_API_KEY',
  };
  return keyMap[provider] || provider;
}

// ─────────────────────────────────────────────
// Report Generator
// ─────────────────────────────────────────────

function generateReport(results, files, startTime) {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const totalCost = results.reduce((sum, r) => sum + r.costUSD, 0);
  const totalDuration = Date.now() - startTime;

  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const skipCount = results.filter(r => r.status === 'SKIPPED').length;
  const errorCount = results.filter(r => r.status === 'ERROR').length;

  let md = `# SwanStudios Validation Report

> Generated: ${now.toLocaleString()}
> Files reviewed: ${files.length}
> Validators: ${successCount} succeeded, ${skipCount} skipped, ${errorCount} errored
> Total cost: $${totalCost.toFixed(4)}
> Total duration: ${(totalDuration / 1000).toFixed(1)}s

---

## Files Reviewed

${files.map(f => `- \`${f.path}\``).join('\n')}

---

## Cost Breakdown

| Validator | Provider | Model | Input Tokens | Output Tokens | Cost | Duration | Status |
|-----------|----------|-------|--------------|---------------|------|----------|--------|
${results.map(r => `| ${r.name} | ${getProviderForName(r.name)} | ${getModelForName(r.name)} | ${r.inputTokens.toLocaleString()} | ${r.outputTokens.toLocaleString()} | $${r.costUSD.toFixed(4)} | ${(r.durationMs / 1000).toFixed(1)}s | ${statusBadge(r.status)} |`).join('\n')}
| **Total** | | | | | **$${totalCost.toFixed(4)}** | **${(totalDuration / 1000).toFixed(1)}s** | |

---

`;

  for (const r of results) {
    md += `## ${statusBadge(r.status)} ${r.name}

${r.text}

---

`;
  }

  md += `## Summary

### Critical Findings
${extractFindings(results, 'CRITICAL')}

### High Priority Findings
${extractFindings(results, 'HIGH')}

---

*Report generated by SwanStudios Validation Orchestrator v1.0*
*6-Brain Parallel Validation System — Part of AI Village Architecture*
`;

  return { md, timestamp };
}

function statusBadge(status) {
  switch (status) {
    case 'SUCCESS': return '✅';
    case 'SKIPPED': return '⏭️';
    case 'ERROR': return '❌';
    default: return '❓';
  }
}

const providerMap = {
  'UX & Accessibility': 'Google',
  'Code Quality': 'OpenAI',
  'Security': 'xAI',
  'Performance & Scalability': 'Anthropic',
  'Competitive Intelligence': 'Anthropic',
  'User Research & Persona Alignment': 'Anthropic',
};

const modelMap = {
  'UX & Accessibility': 'gemini-2.0-flash',
  'Code Quality': 'gpt-4o',
  'Security': 'grok-3',
  'Performance & Scalability': 'claude-sonnet-4-6',
  'Competitive Intelligence': 'claude-sonnet-4-6',
  'User Research & Persona Alignment': 'claude-sonnet-4-6',
};

function getProviderForName(name) { return providerMap[name] || '?'; }
function getModelForName(name) { return modelMap[name] || '?'; }

function extractFindings(results, severity) {
  const lines = [];
  for (const r of results) {
    if (r.status !== 'SUCCESS') continue;
    // Extract lines mentioning the severity
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
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   SwanStudios Parallel Validation Orchestrator      ║');
  console.log('║   6-Brain AI Validation System                      ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log();

  const startTime = Date.now();

  // Load environment variables
  loadEnv();

  // Parse arguments and discover files
  const opts = parseArgs();
  const files = getRecentFiles(opts);

  if (files.length === 0) {
    console.error('No code files found to validate.');
    console.error('Usage:');
    console.error('  node scripts/validation-orchestrator.js                   # auto-detect recent changes (2h)');
    console.error('  node scripts/validation-orchestrator.js --since 24h       # changes in last 24 hours');
    console.error('  node scripts/validation-orchestrator.js --staged           # git staged files');
    console.error('  node scripts/validation-orchestrator.js --files src/App.tsx # specific files');
    process.exit(1);
  }

  console.log(`📁 Found ${files.length} file(s) to validate:`);
  files.forEach(f => console.log(`   ${f.path} (${(f.content.length / 1024).toFixed(1)} KB)`));
  console.log();

  // Check available API keys
  const providers = ['google', 'openai', 'xai', 'anthropic'];
  console.log('🔑 API Key Status:');
  for (const p of providers) {
    const key = getApiKey(p);
    console.log(`   ${key ? '✅' : '❌'} ${p.padEnd(12)} ${key ? '(configured)' : `(missing — set ${getKeyNames(p)})`}`);
  }
  console.log();

  // Build code bundle and prompts
  const codeBundle = formatCodeBundle(files);
  const prompts = buildPrompts(codeBundle, files);

  // Build validator tracks
  const tracks = Object.values(prompts);

  console.log('🚀 Launching 6 parallel validators...');
  console.log();

  // Fire all 6 in parallel
  const results = await Promise.all(tracks.map(async (track) => {
    const tag = track.name.padEnd(35);
    console.log(`   ⏳ ${tag} → ${track.provider}/${track.model}`);
    const result = await runValidator(track);
    console.log(`   ${statusBadge(result.status)} ${tag} → ${result.status} (${(result.durationMs / 1000).toFixed(1)}s, $${result.costUSD.toFixed(4)})`);
    return result;
  }));

  console.log();

  // Generate report
  const { md, timestamp } = generateReport(results, files, startTime);

  // Ensure report directory exists
  mkdirSync(CONFIG.reportDir, { recursive: true });

  const reportPath = join(CONFIG.reportDir, `validation-${timestamp}.md`);
  writeFileSync(reportPath, md, 'utf-8');

  // Also write latest symlink
  const latestPath = join(CONFIG.reportDir, 'LATEST.md');
  writeFileSync(latestPath, md, 'utf-8');

  const totalCost = results.reduce((sum, r) => sum + r.costUSD, 0);
  const successCount = results.filter(r => r.status === 'SUCCESS').length;

  console.log('═══════════════════════════════════════════════════');
  console.log(`📊 Report: ${reportPath}`);
  console.log(`📊 Latest: ${latestPath}`);
  console.log(`✅ ${successCount}/6 validators completed`);
  console.log(`💰 Total cost: $${totalCost.toFixed(4)}`);
  console.log(`⏱️  Total time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log('═══════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
