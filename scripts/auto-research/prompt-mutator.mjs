import { fetchForEgress } from '../lib/redact-egress.mjs';
/**
 * ============================================================================
 * FILE: prompt-mutator.mjs
 * PURPOSE: AI-powered prompt mutation for skill optimization
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Takes a skill prompt + eval feedback (failed criteria, score history),
 * asks an LLM to produce an improved version of the prompt.
 * Includes anti-collapse safeguards to prevent degenerate mutations.
 */

// ─────────────────────────────────────────────────────────────
// SECTION: Mutation via LLM
// ─────────────────────────────────────────────────────────────
async function callMutator(systemPrompt, userPrompt) {
  // Prefer Gemini direct API (free) over OpenRouter
  const geminiKey = process.env.GEMINI_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (geminiKey) {
    const model = process.env.MUTATOR_MODEL || 'gemini-3.1-flash-lite-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

    const response = await fetchForEgress(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4000 },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Mutator API error (${response.status}): ${text}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  if (!openrouterKey) {
    throw new Error('GEMINI_API_KEY or OPENROUTER_API_KEY required.');
  }

  // Fallback: OpenRouter
  const model = process.env.MUTATOR_MODEL || 'google/gemini-3.1-flash-lite-preview';

  const response = await fetchForEgress('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openrouterKey}`,
      'HTTP-Referer': 'https://sswanstudios.com',
      'X-Title': 'SwanStudios Auto-Research Mutator',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mutator API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ─────────────────────────────────────────────────────────────
// SECTION: Anti-Collapse Safeguards
// ─────────────────────────────────────────────────────────────

/**
 * Prevent prompt collapse — reject mutations that are:
 * - Too short (lost content)
 * - Too long (bloated)
 * - Missing key structural elements
 */
function validateMutation(original, mutated) {
  const minLength = original.length * 0.5;
  const maxLength = original.length * 2.0;

  if (mutated.length < minLength) {
    return { valid: false, reason: `Too short (${mutated.length} < ${minLength} min)` };
  }

  if (mutated.length > maxLength) {
    return { valid: false, reason: `Too long (${mutated.length} > ${maxLength} max)` };
  }

  // Check for markdown structure preservation
  const originalHeadings = (original.match(/^#+\s/gm) || []).length;
  const mutatedHeadings = (mutated.match(/^#+\s/gm) || []).length;
  if (mutatedHeadings < originalHeadings * 0.5) {
    return { valid: false, reason: 'Lost too many section headings' };
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────
// SECTION: Main Mutation Function
// ─────────────────────────────────────────────────────────────
export async function mutatePrompt(currentPrompt, context) {
  const { skill, avgScore, maxPossible, failedCriteria, history } = context;

  const systemPrompt = `You are a prompt engineer optimizing AI coding assistant skill prompts.

Your task: Improve the given skill prompt so it scores higher on the evaluation criteria.

Rules:
1. Keep the same overall structure and purpose
2. Add specific, actionable instructions that address failed criteria
3. Do NOT remove existing good instructions — only add or refine
4. Keep the prompt concise — every sentence must earn its place
5. Do NOT add generic filler ("be thorough", "be careful") — be specific
6. Preserve any markdown formatting (headers, lists, code blocks)

Return ONLY the improved prompt text. No explanations, no commentary.`;

  const scoreHistory = history
    .map(h => `Gen ${h.gen}: ${h.pct}%`)
    .join(', ');

  const userPrompt = `## Skill: ${skill}

## Current Score: ${avgScore.toFixed(1)}/${maxPossible} (${(avgScore / maxPossible * 100).toFixed(1)}%)

## Score History: ${scoreHistory || 'First generation'}

## Failed Criteria (most important to fix):
${failedCriteria.length > 0
    ? failedCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')
    : '(All criteria passed — try to make passing more robust)'}

## Current Prompt:
\`\`\`markdown
${currentPrompt}
\`\`\`

Produce an improved version of this prompt that addresses the failed criteria while preserving what already works.`;

  const mutated = await callMutator(systemPrompt, userPrompt);

  // Strip markdown code fences if the model wrapped it
  let cleaned = mutated
    .replace(/^```(?:markdown)?\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim();

  // Validate mutation
  const validation = validateMutation(currentPrompt, cleaned);
  if (!validation.valid) {
    console.warn(`  ⚠️ Mutation rejected: ${validation.reason}. Keeping current prompt.`);
    return currentPrompt;
  }

  return cleaned;
}
