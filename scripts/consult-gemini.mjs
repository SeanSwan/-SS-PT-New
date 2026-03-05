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
 * ║    node scripts/consult-gemini.mjs --file path/to/plan.md       ║
 * ║    node scripts/consult-gemini.mjs --design "component desc"    ║
 * ║    node scripts/consult-gemini.mjs --review path/to/file.tsx    ║
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

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

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

async function callGemini(prompt) {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    throw new Error('No GEMINI_API_KEY found in .env');
  }

  const model = 'gemini-3.1-pro-preview';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 16384,
      },
    }),
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
  return {
    text,
    inputTokens: usage.promptTokenCount || 0,
    outputTokens: usage.candidatesTokenCount || 0,
  };
}

// ─────────────────────────────────────────────
// System Context
// ─────────────────────────────────────────────

const SYSTEM_CONTEXT = `You are the Lead UI/UX Design Authority and Co-Orchestrator for SwanStudios, a premium personal training SaaS platform.

PLATFORM CONTEXT:
- Stack: React 18 + TypeScript + styled-components (frontend), Node.js + Express + Sequelize + PostgreSQL (backend)
- Theme: Galaxy-Swan (cosmic gradients, glass surfaces, swan motifs)
- Core Tokens: Galaxy Core #0a0a1a, Swan Cyan #00FFFF, Cosmic Purple #7851A9
- Production: sswanstudios.com (deployed on Render)
- 10-breakpoint responsive: 320, 375, 430, 768, 1024, 1280, 1440, 1920, 2560, 3840px
- 44px minimum touch targets, mobile-first
- No Material-UI — all styled-components
- NASM-certified trainer platform (25+ years experience)

YOUR ROLE:
You work alongside Claude (the Lead Software Engineer / implementation AI) as EQUALS.
- YOU design. Claude implements.
- YOU set the design vision, component architecture, animation strategy, and UX direction.
- Claude consults you before executing major plans to catch gaps, get design direction, and ensure premium quality.
- Your design opinions are authoritative — Claude follows your design direction.
- Be specific: give exact CSS values, pixel measurements, animation curves, color codes.
- Reference best-in-class fitness apps (Apple Fitness+, Peloton, Nike Training Club) for inspiration.
- Reject "AI slop" — generic gradients, cookie-cutter layouts, stock patterns.`;

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
   - Colors (exact hex values from Galaxy-Swan palette + any new accent colors)
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

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { mode: null, input: '' };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--plan') {
      opts.mode = 'plan';
      opts.input = args[++i] || '';
    } else if (args[i] === '--design') {
      opts.mode = 'design';
      opts.input = args[++i] || '';
    } else if (args[i] === '--review') {
      opts.mode = 'review';
      opts.input = args[++i] || '';
    } else if (args[i] === '--ask') {
      opts.mode = 'ask';
      opts.input = args[++i] || '';
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
  console.log(`  Input:  ${opts.input.length > 80 ? opts.input.slice(0, 77) + '...' : opts.input}`);
  console.log('');
  console.log('  Consulting Gemini 3.1 Pro...');

  const start = Date.now();

  try {
    const result = await callGemini(prompt);
    const duration = ((Date.now() - start) / 1000).toFixed(1);

    // Save to file
    const outputDir = join(ROOT, 'AI-Village-Documentation', 'gemini-consults');
    mkdirSync(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outputContent = `# Gemini 3.1 Pro — ${modeLabels[opts.mode]}

> **Generated:** ${new Date().toLocaleString()}
> **Mode:** ${opts.mode}
> **Duration:** ${duration}s
> **Tokens:** ${result.inputTokens} in / ${result.outputTokens} out

---

## Input

${opts.mode === 'review' ? `File: \`${opts.reviewPath || 'unknown'}\`` : opts.input.slice(0, 500)}

---

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

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
