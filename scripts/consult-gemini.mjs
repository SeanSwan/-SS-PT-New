#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║     SwanStudios Co-Orchestrator — Consult Gemini 3.1 Pro        ║
 * ║                                                                  ║
 * ║  Purpose: Claude sends plans/questions to Gemini 3.1 Pro for    ║
 * ║  design review, gap analysis, and enhancement suggestions.       ║
 * ║  Gemini 3.1 Pro is the Lead Design Authority — Claude is the    ║
 * ║  Lead Software Engineer. They work as equals.                    ║
 * ║                                                                  ║
 * ║  Usage (from Claude or CLI):                                     ║
 * ║    node scripts/consult-gemini.mjs --plan "plan text here"      ║
 * ║    node scripts/consult-gemini.mjs --plan --file path/to/plan.md║
 * ║    node scripts/consult-gemini.mjs --design "component desc"    ║
 * ║    node scripts/consult-gemini.mjs --review --file path/to/file.tsx ║
 * ║                                                                  ║
 * ║  Modes:                                                          ║
 * ║    --plan    Review an implementation plan for gaps/enhancements ║
 * ║    --design  Generate design specs for a component/page          ║
 * ║    --review  Review existing code with design authority          ║
 * ║    --ask     Open-ended question for Gemini's expertise          ║
 * ║                                                                  ║
 * ║  Output: Writes response to stdout + saves to                    ║
 * ║    AI-Village-Documentation/gemini-consults/latest.md            ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// Preflight: blocks execution if MODEL_VERSIONS.md has unverified TODO markers
// or if required env vars are missing. Side-effect import runs BEFORE this
// module body, so registry + .env are guaranteed ready below.
import { fetchRedacted } from './lib/egress-fetch.mjs';
import './lib/preflight.mjs';
import { getModelIdOrThrow } from './lib/model-registry.mjs';

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const ROOT = join(__dirname, '..');

// ─────────────────────────────────────────────
// Environment
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

function getGeminiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || null;
}

// ─────────────────────────────────────────────
// Gemini API
// ─────────────────────────────────────────────

async function callGemini(prompt, opts = {}) {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    throw new Error('No GEMINI_API_KEY found in .env');
  }

  // Resolved from config/MODEL_VERSIONS.md at runtime (CLAUDE.md model-ID discipline).
  // Preflight guarantees this is a verified ID (not a TODO: VERIFY_ marker).
  const model = getModelIdOrThrow('gemini-pro-model');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 16384,
    },
  };

  // Enable Google Search grounding for real-time web research (FREE)
  if (opts.useGrounding) {
    body.tools = [{ googleSearch: {} }];
  }

  const res = await fetchRedacted(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300_000), // 5 min for thorough plans
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Gemini API ${res.status}: ${errBody.slice(0, 500)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No text response from Gemini 3.1 Pro');
  }

  const usage = data.usageMetadata || {};

  // Extract grounding metadata if present
  const groundingMeta = data.candidates?.[0]?.groundingMetadata || null;
  const searchQueries = groundingMeta?.webSearchQueries || [];
  const groundingSources = groundingMeta?.groundingChunks?.map(c => c.web?.uri).filter(Boolean) || [];

  return {
    text,
    inputTokens: usage.promptTokenCount || 0,
    outputTokens: usage.candidatesTokenCount || 0,
    groundingMeta: opts.useGrounding ? { searchQueries, sources: groundingSources } : null,
  };
}

// ─────────────────────────────────────────────
// System Context
// ─────────────────────────────────────────────

const SYSTEM_CONTEXT = `You are the Lead UI/UX Design Authority and Co-Orchestrator for SwanStudios, a premium personal training SaaS platform.

PLATFORM CONTEXT:
- Stack: React 18 + TypeScript + styled-components (frontend), Node.js + Express + Sequelize + PostgreSQL (backend)
- Theme: Enchanted Apex — Crystalline Swan (frozen enchanted forest + deep-ocean luxury vault + competitive arena)
- Production: sswanstudios.com (deployed on Render)
- 10-breakpoint responsive: 320, 375, 430, 768, 1024, 1280, 1440, 1920, 2560, 3840px
- 44px minimum touch targets, mobile-first
- No Material-UI — all styled-components
- NASM-certified trainer platform (25+ years experience)

⚠️ CRITICAL — ACTIVE COLOR PALETTE (USE ONLY THESE TOKENS):
- Midnight Sapphire #002060 (Primary — logo deep navy, blue button background)
- Royal Depth #003080 (Surface — elevated cards, secondary bg)
- Ice Wing #60C0F0 (Cyan Glow — glow on purple buttons, XP bars, gaming accents)
- Arctic Cyan #50A0F0 (Data Only — charts, data viz, cold metrics. NOT for buttons/glow)
- Gilded Fern #C6A84B (Luxury Accent — gold contrast, rare rewards)
- Frost White #E0ECF4 (Text — primary text color)
- Swan Lavender #4070C0 (Tertiary — logo mid-body purple-blue)
- Wing Purple #8B5CF6 (Glow Accent — purple button bg, glow on blue buttons, focus rings)
- Obsidian Black #0A0A0F (Deep Dark — primary dark background)
- Carbon #141419 (Card Dark — card/panel backgrounds)
- Graphite #1A1A24 (Surface Dark — elevated surfaces, modals)
- Dual-Button Glow: Blue buttons (#002060 bg) → Wing Purple #8B5CF6 glow. Purple buttons (#8B5CF6 bg) → Ice Wing #60C0F0 glow.
- Cosmic Nebula gradient (#8B5CF6 → #60C0F0) → for premium/hero CTAs

🚫 RETIRED TOKENS — NEVER USE THESE:
- #00FFFF (retired Swan Cyan) → use #60C0F0 (Ice Wing) instead
- #0a0a1a (retired Galaxy Core) → use #0A0A0F (Obsidian Black) instead
- #7851A9 (retired Cosmic Purple) → use #8B5CF6 (Wing Purple) instead
- #FF2D78 (retired Neon Pink) → use #C92A54 (Crimson Frost) for errors
- The "Galaxy-Swan" theme name is RETIRED. The active theme is "Crystalline Swan".

TYPOGRAPHY:
- Headings: "Plus Jakarta Sans"
- Drama/Hero: "Cormorant Garamond" Italic
- Data/Monospace: "Fira Code"
- UI/Gaming: "Sora"

YOUR ROLE:
You work alongside Claude Opus 4.6 (CEO — FINAL authority on all decisions).
- YOU are CTO and Lead Design Authority. Your design opinions are authoritative on aesthetics.
- Claude Opus 4.6 (CEO) can override on engineering/business grounds.
- YOU design. Claude implements.
- YOU set the design vision, component architecture, animation strategy, and UX direction.
- Claude consults you before executing major plans to catch gaps, get design direction, and ensure premium quality.
- Be specific: give exact CSS values, pixel measurements, animation curves, color codes.
- Reference best-in-class fitness apps (Apple Fitness+, Peloton, Nike Training Club) for inspiration.
- Reject "AI slop" — generic gradients, cookie-cutter layouts, stock patterns.
- ALWAYS use the active Crystalline Swan palette above. NEVER reference retired Galaxy-Swan tokens.`;

// ─────────────────────────────────────────────
// Mode Prompts
// ─────────────────────────────────────────────

function buildPlanReviewPrompt(planText) {
  return `${SYSTEM_CONTEXT}

Claude (your co-orchestrator) is about to execute this implementation plan. Review it as the Lead Design Authority:

## The Plan

${planText}

## Your Review

Analyze this plan and provide:

1. **Design Gaps** — What design considerations is Claude missing?
   - Visual design decisions not addressed
   - Animation/interaction specs not defined
   - Responsive behavior not specified
   - Accessibility gaps

2. **Enhancement Opportunities** — How can this be elevated?
   - Where can we add micro-interactions, parallax effects, or visual polish?
   - What would make this feel premium vs generic?
   - Design patterns from top-tier apps that apply here

3. **Architecture Recommendations** — Component structure opinions
   - Styled-component patterns to use
   - Theme token strategy
   - Animation approach (CSS transforms vs Framer Motion)

4. **Implementation Directives for Claude** — Specific instructions
   - Exact CSS values, measurements, colors to use
   - Step-by-step design specs Claude should follow
   - What to build first, what to refine later

5. **Approval / Modifications** — Your verdict
   - APPROVED: Plan is solid, proceed with your enhancements noted
   - APPROVED WITH MODIFICATIONS: Proceed but incorporate these changes
   - NEEDS REVISION: Critical gaps that must be addressed before implementation

Be prescriptive. Claude will follow your design direction exactly.`;
}

function buildDesignPrompt(componentDesc) {
  return `${SYSTEM_CONTEXT}

Claude needs your design specs for this component/page. Create a comprehensive design specification from scratch.

## Component Request

${componentDesc}

## Your Design Specification

Provide a complete design spec that Claude can implement directly:

1. **Visual Design**
   - Layout (CSS Grid/Flexbox specs, exact dimensions)
   - Colors (exact hex values from Crystalline Swan palette + any new accent colors)
   - Typography (font sizes, weights, line-heights for each text element)
   - Spacing (exact px/rem values, padding, margins, gaps)
   - Effects (gradients with exact stops, shadows with exact values, glassmorphism specs)

2. **Responsive Behavior**
   - How it adapts across the 10 breakpoints (320–3840px)
   - What stacks, what reflows, what hides
   - Mobile-specific patterns (bottom sheets, swipe gestures)

3. **Animations & Interactions**
   - Entry animations (timing, easing curves, delays)
   - Hover/focus/active states
   - Scroll-triggered effects (parallax, reveal, sticky)
   - Loading states (skeleton screens, shimmer, staggered reveals)
   - Transitions between states

4. **Accessibility**
   - ARIA roles and labels needed
   - Keyboard navigation flow
   - Color contrast compliance
   - prefers-reduced-motion alternatives

5. **styled-components Code**
   - Provide the actual styled-component definitions Claude should use
   - Include theme token references
   - Include responsive media queries
   - Include animation keyframes

Be extremely specific. Give Claude copy-paste-ready code and exact values.`;
}

function buildCodeReviewPrompt(code, filePath) {
  return `${SYSTEM_CONTEXT}

Review this code as the Lead Design Authority. Provide your independent design analysis and improvement directives.

## File: ${filePath}

\`\`\`
${code}
\`\`\`

## Your Design Review

1. **Design Quality Assessment** — Rate the current visual/UX quality (1-10) with reasoning
2. **Design Problems** — What's wrong from a design perspective?
3. **Design Solutions** — Your specific vision for fixing each problem (include code)
4. **Elevation Opportunities** — How to take this from good to premium
5. **Implementation Directives for Claude** — Step-by-step instructions

For each finding:
- **Severity:** CRITICAL / HIGH / MEDIUM / LOW
- **Design Problem:** What's wrong
- **Design Solution:** Exact code/specs to fix it
- **Claude Instructions:** What Claude should do`;
}

function buildAskPrompt(question) {
  return `${SYSTEM_CONTEXT}

Claude (your co-orchestrator) has a question for you:

${question}

Provide your expert answer with specific, actionable guidance. Include exact values, code snippets, and implementation details where applicable.`;
}

// ─────────────────────────────────────────────
// Args
// ─────────────────────────────────────────────

export function parseArgs(rawArgs = process.argv.slice(2)) {
  const args = rawArgs;
  const opts = { mode: null, input: '', useGrounding: false };

  // Only consume the next arg as inline input for a mode flag if it
  // exists AND does not start with '--'. Prevents greedy flag-swallowing
  // (e.g. `--review --file X` used to bind opts.input = '--file').
  const hasInlineNext = (i) => args[i + 1] && !args[i + 1].startsWith('--');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--plan') {
      opts.mode = 'plan';
      if (hasInlineNext(i)) opts.input = args[++i];
    } else if (args[i] === '--design') {
      opts.mode = 'design';
      if (hasInlineNext(i)) opts.input = args[++i];
    } else if (args[i] === '--review') {
      opts.mode = 'review';
      if (hasInlineNext(i)) opts.input = args[++i];
    } else if (args[i] === '--ask') {
      opts.mode = 'ask';
      if (hasInlineNext(i)) opts.input = args[++i];
    } else if (args[i] === '--research') {
      opts.useGrounding = true;
    } else if (args[i] === '--file') {
      opts.file = args[++i] || '';
    } else if (args[i] === '--help' || args[i] === '-h') {
      printHelp();
      process.exit(0);
    } else if (!opts.input) {
      opts.input = args[i];
    }
  }

  // If --file provided, read it as input
  if (opts.file) {
    const filePath = join(ROOT, opts.file);
    if (!existsSync(filePath)) {
      console.error(`  Error: File not found: ${filePath}`);
      process.exit(1);
    }
    opts.input = readFileSync(filePath, 'utf-8');
    if (opts.mode === 'review') {
      opts.reviewPath = opts.file;
    }
  }

  return opts;
}

function printHelp() {
  console.log(`
  SwanStudios Co-Orchestrator — Consult Gemini 3.1 Pro

  Usage:
    node scripts/consult-gemini.mjs --plan "implementation plan text"
    node scripts/consult-gemini.mjs --plan --file path/to/plan.md
    node scripts/consult-gemini.mjs --design "hero section with parallax cosmic background"
    node scripts/consult-gemini.mjs --review --file frontend/src/components/HomePage.tsx
    node scripts/consult-gemini.mjs --ask "should we use Framer Motion or CSS animations?"

  Modes:
    --plan      Review an implementation plan for gaps and design direction
    --design    Generate design specs for a new component or page
    --review    Review existing code as Lead Design Authority
    --ask       Open-ended design/architecture question

  Options:
    --file      Read input from a file instead of command line
    --research  Enable Google Search grounding for real-time web research (FREE)
    --help      Show this help message

  Output:
    Response is printed to stdout AND saved to:
    AI-Village-Documentation/gemini-consults/latest.md
  `);
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  loadEnv();

  const opts = parseArgs();

  if (!opts.mode) {
    console.error('  Error: No mode specified. Use --plan, --design, --review, or --ask');
    console.error('  Run with --help for usage.');
    process.exit(1);
  }

  if (!opts.input) {
    console.error('  Error: No input provided.');
    console.error('  Run with --help for usage.');
    process.exit(1);
  }

  const apiKey = getGeminiKey();
  if (!apiKey) {
    console.error('  Error: No GEMINI_API_KEY found in .env');
    console.error('  Add GEMINI_API_KEY=your-key to .env');
    process.exit(1);
  }

  // Build prompt based on mode
  let prompt;
  const modeLabels = {
    plan: 'Plan Review',
    design: 'Design Spec Generation',
    review: 'Code Design Review',
    ask: 'Design Consultation',
  };

  switch (opts.mode) {
    case 'plan':
      prompt = buildPlanReviewPrompt(opts.input);
      break;
    case 'design':
      prompt = buildDesignPrompt(opts.input);
      break;
    case 'review':
      prompt = buildCodeReviewPrompt(opts.input, opts.reviewPath || 'unknown');
      break;
    case 'ask':
      prompt = buildAskPrompt(opts.input);
      break;
  }

  console.log('');
  console.log('  SwanStudios Co-Orchestrator');
  console.log(`  Mode:   ${modeLabels[opts.mode]}`);
  console.log('  Model:  Gemini 3.1 Pro (Lead Design Authority)');
  if (opts.useGrounding) console.log('  Research: Google Search Grounding ENABLED (real-time web search)');
  console.log(`  Input:  ${opts.input.length > 80 ? opts.input.slice(0, 77) + '...' : opts.input}`);
  console.log('');
  console.log('  Consulting Gemini 3.1 Pro...');

  const start = Date.now();

  try {
    const result = await callGemini(prompt, { useGrounding: opts.useGrounding });
    const duration = ((Date.now() - start) / 1000).toFixed(1);

    // Save to file
    const outputDir = join(ROOT, 'AI-Village-Documentation', 'gemini-consults');
    mkdirSync(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const groundingSection = result.groundingMeta?.sources?.length ? `
## Web Research Sources

> Google Search Grounding — ${result.groundingMeta.sources.length} sources cited
${result.groundingMeta.searchQueries?.length ? `\n**Search queries:** ${result.groundingMeta.searchQueries.join(', ')}\n` : ''}
**Sources:**
${result.groundingMeta.sources.map(s => `- ${s}`).join('\n')}

---
` : '';

    const outputContent = `# Gemini 3.1 Pro — ${modeLabels[opts.mode]}

> **Generated:** ${new Date().toLocaleString()}
> **Mode:** ${opts.mode}${opts.useGrounding ? ' (with web research)' : ''}
> **Duration:** ${duration}s
> **Tokens:** ${result.inputTokens} in / ${result.outputTokens} out

---

## Input

${opts.mode === 'review' ? `File: \`${opts.reviewPath || 'unknown'}\`` : opts.input.slice(0, 500)}

---
${groundingSection}
## Gemini 3.1 Pro Response

${result.text}

---

*SwanStudios Co-Orchestrator — Gemini 3.1 Pro (Lead Design Authority)*
`;

    writeFileSync(join(outputDir, 'latest.md'), outputContent, 'utf-8');
    writeFileSync(join(outputDir, `${timestamp}-${opts.mode}.md`), outputContent, 'utf-8');

    console.log('');
    console.log('  ════════════════════════════════════════════════════════');
    console.log(`  Duration: ${duration}s`);
    console.log(`  Tokens:   ${result.inputTokens} in / ${result.outputTokens} out`);
    console.log(`  Saved:    AI-Village-Documentation/gemini-consults/latest.md`);
    console.log('  ════════════════════════════════════════════════════════');
    console.log('');

    // Print the response to stdout for Claude to read
    console.log(result.text);
  } catch (err) {
    console.error(`  Error: ${err.message}`);
    process.exit(1);
  }
}

// Only auto-run main() when this file is invoked directly as an entry
// point, not when imported (e.g. by the parseArgs regression test).
// Cross-platform via file URL comparison. Null-safe: some import
// contexts run without process.argv[1] populated (e.g. worker threads,
// some test runners), so we explicitly gate on a non-empty string
// before calling pathToFileURL (which throws on empty input).
function isDirectExecution() {
  const entry = process.argv[1];
  if (typeof entry !== 'string' || entry.length === 0) return false;
  try {
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
