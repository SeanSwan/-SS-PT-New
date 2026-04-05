/**
 * Recursive Consensus Loop Module
 * ================================
 * Implements a debate loop between two AI models until consensus is reached
 * or MAX_ROUNDS is exceeded.
 *
 * Used by:
 * - Phase 2: Code Quality debate (Gemini CTO ↔ Claude CEO)
 * - Phase 3: UX/UI Design debate (Gemini Creative Director ↔ Claude Collaborator)
 *
 * Architecture:
 *   Round 1: Model A proposes → Model B critiques/agrees
 *   Round 2: Model A refines → Model B critiques/agrees
 *   ...
 *   Round N: Either model outputs "CONSENSUS REACHED" → loop ends
 *   Or MAX_ROUNDS hit → final authority model makes the call
 */

const MAX_ROUNDS = 20; // Increased to 20 — Sean wants the deepest possible debates for final validation

/**
 * @typedef {Object} DebateConfig
 * @property {string} topic - Short label for the debate (e.g. "Code Quality", "UX Design")
 * @property {Object} modelA - { name, model, provider, role } — the proposer
 * @property {Object} modelB - { name, model, provider, role } — the critic
 * @property {string} finalAuthority - 'A' or 'B' — who gets final say if no consensus
 * @property {string} initialPrompt - The seed prompt for Model A's first round
 * @property {Function} callModel - async (provider, model, prompt) => { text, inputTokens, outputTokens }
 * @property {Function} [onRound] - optional callback (roundNum, speaker, text) => void
 */

/**
 * Run a recursive consensus debate between two models.
 *
 * @param {DebateConfig} config
 * @returns {Promise<{ consensusReached: boolean, rounds: Array, finalVerdict: string, debateLog: string, totalTokens: { input: number, output: number } }>}
 */
export async function runRecursiveConsensus(config) {
  const { topic, modelA, modelB, finalAuthority, initialPrompt, callModel, onRound } = config;

  const rounds = [];
  let totalInput = 0;
  let totalOutput = 0;
  let conversationHistory = '';
  let consensusReached = false;
  let finalVerdict = '';

  // ── Round 1: Model A proposes ──
  const round1Prompt = initialPrompt;
  const r1 = await callModel(modelA.provider, modelA.model, round1Prompt);
  totalInput += r1.inputTokens;
  totalOutput += r1.outputTokens;

  rounds.push({ round: 1, speaker: modelA.name, role: modelA.role, text: r1.text });
  conversationHistory += `\n\n## ${modelA.role} (${modelA.name}) — Round 1\n${r1.text}`;
  onRound?.(1, modelA.name, r1.text);

  if (detectConsensus(r1.text)) {
    consensusReached = true;
    finalVerdict = r1.text;
    return buildResult(topic, consensusReached, rounds, finalVerdict, totalInput, totalOutput);
  }

  // ── Alternating rounds ──
  for (let roundNum = 2; roundNum <= MAX_ROUNDS * 2; roundNum++) {
    const isModelATurn = roundNum % 2 === 0 ? false : true;
    const currentModel = isModelATurn ? modelA : modelB;
    const otherModel = isModelATurn ? modelB : modelA;

    const debateRound = Math.ceil(roundNum / 2);
    if (debateRound > MAX_ROUNDS) break;

    const turnPrompt = buildTurnPrompt(topic, currentModel, otherModel, conversationHistory, debateRound, MAX_ROUNDS);
    const result = await callModel(currentModel.provider, currentModel.model, turnPrompt);
    totalInput += result.inputTokens;
    totalOutput += result.outputTokens;

    rounds.push({ round: roundNum, speaker: currentModel.name, role: currentModel.role, text: result.text });
    conversationHistory += `\n\n## ${currentModel.role} (${currentModel.name}) — Round ${debateRound}\n${result.text}`;
    onRound?.(roundNum, currentModel.name, result.text);

    if (detectConsensus(result.text)) {
      consensusReached = true;
      finalVerdict = result.text;
      return buildResult(topic, consensusReached, rounds, finalVerdict, totalInput, totalOutput);
    }
  }

  // ── No consensus — final authority decides ──
  const authorityModel = finalAuthority === 'A' ? modelA : modelB;
  const tieBreakPrompt = `You are the ${authorityModel.role} and FINAL AUTHORITY on ${topic}.

The debate has gone ${MAX_ROUNDS} rounds without full consensus. As final authority, you must now issue THE DEFINITIVE VERDICT.

Review the full debate below and produce:
1. A merged list of ALL agreed-upon findings (both models agreed)
2. Your ruling on disputed items (you have final say)
3. A prioritized action plan

End your response with "FINAL AUTHORITY VERDICT" header.

## Full Debate Transcript
${conversationHistory}`;

  const tieBreak = await callModel(authorityModel.provider, authorityModel.model, tieBreakPrompt);
  totalInput += tieBreak.inputTokens;
  totalOutput += tieBreak.outputTokens;

  rounds.push({ round: 'final', speaker: authorityModel.name, role: `${authorityModel.role} (Final Authority)`, text: tieBreak.text });
  finalVerdict = tieBreak.text;

  return buildResult(topic, false, rounds, finalVerdict, totalInput, totalOutput);
}

// ─── Internal helpers ───

function detectConsensus(text) {
  // Check for explicit verdict tag first (most reliable)
  const tagMatch = text.match(/<VERDICT>(.*?)<\/VERDICT>/i);
  if (tagMatch) {
    return tagMatch[1].trim().toUpperCase() === 'CONSENSUS';
  }
  // Fallback: check if "CONSENSUS REACHED" appears as a standalone declaration
  // Avoid false positives like "we have NOT reached consensus"
  const upper = text.toUpperCase();
  const hasConsensus = upper.includes('CONSENSUS REACHED') || upper.includes('FULL CONSENSUS');
  if (!hasConsensus) return false;
  // Reject if preceded by negation within 30 chars
  for (const phrase of ['CONSENSUS REACHED', 'FULL CONSENSUS']) {
    const idx = upper.indexOf(phrase);
    if (idx >= 0) {
      const preceding = upper.slice(Math.max(0, idx - 30), idx);
      if (preceding.includes('NOT') || preceding.includes('NO ') || preceding.includes("HAVEN'T") || preceding.includes("HASN'T")) {
        return false;
      }
    }
  }
  return true;
}

function buildTurnPrompt(topic, currentModel, otherModel, history, roundNum, maxRounds) {
  const remainingRounds = maxRounds - roundNum;
  const urgency = remainingRounds <= 1
    ? `⚠️ This is the FINAL round. You MUST either reach consensus or clearly state your non-negotiable positions.`
    : `${remainingRounds} rounds remaining before final authority decides.`;

  return `You are the ${currentModel.role} in a structured debate about: ${topic}

Your role: ${currentModel.name}
Debating with: ${otherModel.name} (${otherModel.role})

## Rules
- If you AGREE with all points from the other model, output "CONSENSUS REACHED" at the top, then the merged findings.
- If you DISAGREE on specific points, clearly state which and why — propose alternatives.
- Be specific: cite file names, line numbers, exact code changes.
- Do NOT repeat points already agreed upon — only address new issues or disputes.
- ${urgency}

## Debate So Far
${history}

## Your Response (Round ${roundNum})
Analyze the latest response. Agree where valid, dispute where needed. Be constructive.`;
}

function buildResult(topic, consensusReached, rounds, finalVerdict, totalInput, totalOutput) {
  // Build markdown debate log
  let debateLog = `# ${topic} — Recursive Consensus Debate Log\n\n`;
  debateLog += `> **Consensus:** ${consensusReached ? 'YES — Models agreed' : 'NO — Final authority decided'}\n`;
  debateLog += `> **Rounds:** ${rounds.length}\n`;
  debateLog += `> **Tokens:** ${totalInput.toLocaleString()} input / ${totalOutput.toLocaleString()} output\n\n---\n\n`;

  for (const r of rounds) {
    debateLog += `## ${r.role} — ${typeof r.round === 'number' ? `Round ${r.round}` : 'Final Verdict'}\n\n`;
    debateLog += `${r.text}\n\n---\n\n`;
  }

  return {
    consensusReached,
    rounds,
    finalVerdict,
    debateLog,
    totalTokens: { input: totalInput, output: totalOutput },
  };
}
