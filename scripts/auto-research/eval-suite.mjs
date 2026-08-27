/**
 * ============================================================================
 * FILE: eval-suite.mjs
 * PURPOSE: Evaluate a skill prompt against binary criteria using an LLM judge
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Takes a skill prompt + eval criteria, simulates the skill being applied,
 * then uses an LLM judge to score each criterion as pass/fail.
 * Returns a structured score object.
 *
 * JUDGE MODEL: Gemini 2.5 Flash (free via OpenRouter) by default.
 * Override with EVAL_MODEL env var.
 */

import { fetchForEgress } from '../lib/redact-egress.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────
// SECTION: LLM Judge
// ─────────────────────────────────────────────────────────────
async function callJudge(systemPrompt, userPrompt) {
  // Prefer Gemini direct API (free) over OpenRouter
  const geminiKey = process.env.GEMINI_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (geminiKey) {
    // Use Gemini 3.1 Pro direct API (free) — smartest available judge
    const model = process.env.EVAL_MODEL || 'gemini-3.1-pro-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

    const response = await fetchForEgress(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2000 },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Judge API error (${response.status}): ${text}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return content;
  }

  if (!openrouterKey) {
    throw new Error('GEMINI_API_KEY or OPENROUTER_API_KEY required. Set in .env.');
  }

  // Fallback: OpenRouter
  const model = process.env.EVAL_MODEL || 'google/gemini-3-flash-preview';

  const response = await fetchForEgress('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openrouterKey}`,
      'HTTP-Referer': 'https://sswanstudios.com',
      'X-Title': 'SwanStudios Auto-Research',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Judge API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ─────────────────────────────────────────────────────────────
// SECTION: Scenario Generator
// ─────────────────────────────────────────────────────────────
function buildScenario(skillName, evalDef) {
  // Generate a realistic coding scenario that the skill should handle
  const scenarios = {
    'verification-before-completion': [
      'User asks to fix a bug in a React component that causes infinite re-renders. The fix involves adding a dependency array to useEffect.',
      'User asks to add a new API endpoint for fetching user achievements. The route needs auth middleware.',
      'User asks to refactor a 500-line component into smaller pieces.',
    ],
    'systematic-debugging': [
      'A user reports that the login page shows a blank white screen on mobile Safari. No error in console.',
      'The gamification engine awards double points sometimes. It happens intermittently.',
      'API returns 500 on POST /api/sessions but only when the trainer has no availability set.',
    ],
    'requesting-code-review': [
      'Developer has made changes to 3 files: a new React hook, a styled-component, and a route handler.',
      'A PR adds a new workout generation feature with 200 lines of changes across 5 files.',
    ],
  };

  const skillScenarios = scenarios[skillName] || [
    'User asks for help implementing a new feature in a React + Node.js application.',
    'User reports a bug in the application and asks for a fix.',
  ];

  // Pick a random scenario
  return skillScenarios[Math.floor(Math.random() * skillScenarios.length)];
}

// ─────────────────────────────────────────────────────────────
// SECTION: Core Eval Function
// ─────────────────────────────────────────────────────────────
async function evaluate(skillName, skillPrompt, evalDef) {
  const scenario = buildScenario(skillName, evalDef);

  // Build the judge prompt
  const systemPrompt = `You are an AI skill evaluation judge. You will be given:
1. A "skill prompt" — instructions that guide an AI coding assistant's behavior
2. A "scenario" — a realistic coding task the assistant would handle
3. A list of "criteria" — binary pass/fail checks

Your job: Read the skill prompt carefully, imagine how an AI assistant following those instructions would handle the scenario, then evaluate each criterion.

For each criterion, respond with:
- "PASS" if the skill prompt would likely cause the assistant to satisfy this criterion
- "FAIL" if the skill prompt is missing guidance that would ensure this criterion is met

Respond in this exact JSON format:
{
  "results": [
    { "id": "criterion-id", "passed": true, "reasoning": "Brief explanation" },
    ...
  ]
}

Be strict but fair. A criterion passes only if the skill prompt explicitly or strongly implicitly guides toward it.`;

  const userPrompt = `## Skill Prompt
\`\`\`
${skillPrompt}
\`\`\`

## Scenario
${scenario}

## Criteria to Evaluate
${evalDef.criteria.map((c, i) => `${i + 1}. [${c.id}] ${c.description} (weight: ${c.weight || 1})`).join('\n')}

Evaluate each criterion. Return JSON only.`;

  const judgeResponse = await callJudge(systemPrompt, userPrompt);

  // Parse judge response
  let parsed;
  try {
    // Extract JSON from response (may have markdown code fences)
    const jsonMatch = judgeResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in judge response');
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.warn('  ⚠️ Failed to parse judge response, treating as all-fail');
    parsed = {
      results: evalDef.criteria.map(c => ({
        id: c.id,
        passed: false,
        reasoning: 'Judge response parse error',
      })),
    };
  }

  // Score
  const criteriaResults = evalDef.criteria.map(criterion => {
    const judgeResult = parsed.results?.find(r => r.id === criterion.id);
    const passed = judgeResult?.passed ?? false;
    const weight = criterion.weight || 1;

    return {
      id: criterion.id,
      description: criterion.description,
      passed,
      score: passed ? weight : 0,
      maxScore: weight,
      reasoning: judgeResult?.reasoning || 'No reasoning provided',
    };
  });

  const totalScore = criteriaResults.reduce((s, c) => s + c.score, 0);
  const maxScore = criteriaResults.reduce((s, c) => s + c.maxScore, 0);

  return {
    skillName,
    scenario,
    criteriaResults,
    totalScore,
    maxScore,
    timestamp: new Date().toISOString(),
  };
}

export const evalSuite = { evaluate };
