/** Alternating debate engine with a two-brain, same-contract consensus handshake. */
import { createHash } from 'node:crypto';
import {
  CONSENSUS_END,
  CONSENSUS_START,
  MAX_ROUNDS,
  MAX_CONSENSUS_CONTRACT_CHARS,
  REQUIRED_PACKET_SECTIONS,
} from './constants.mjs';

const BRAIN_LABEL = { opus: 'Opus 5', kimi: 'Kimi K3' };
const OTHER = { opus: 'Kimi K3', kimi: 'Opus 5' };

export function parseConsensusEnvelope(text) {
  const start = text.indexOf(CONSENSUS_START);
  const end = text.indexOf(CONSENSUS_END);
  if (start < 0 || end < start) throw new Error('response is missing CONSENSUS_JSON envelope');
  const raw = text.slice(start + CONSENSUS_START.length, end).trim();
  let value;
  try { value = JSON.parse(raw); } catch { throw new Error('CONSENSUS_JSON must contain valid JSON'); }
  if (!['agree', 'revise'].includes(value.status)) throw new Error('status must be agree or revise');
  if (typeof value.consensus_contract !== 'string') throw new Error('consensus_contract must be a string');
  if (value.consensus_digest !== undefined && !/^[a-f0-9]{64}$/i.test(value.consensus_digest)) {
    throw new Error('consensus_digest must be a SHA-256 hex digest when supplied');
  }
  if (!Array.isArray(value.open_issues)) throw new Error('open_issues must be an array');
  return value;
}

export function validateBuilderPacket(packet) {
  const text = String(packet ?? '');
  const missing = REQUIRED_PACKET_SECTIONS
    .filter((name) => !new RegExp(`^##\\s+${escapeRegExp(name)}\\s*$`, 'mi').test(text))
    .map((name) => `section: ${name}`);
  if (!/```mermaid[\s\S]+?```/i.test(text)) missing.push('Mermaid diagram');
  if (!/```(?:text|ascii)[\s\S]*?(?:wireframe|\+-{3,})[\s\S]*?```/i.test(text)) missing.push('wireframe');
  if (/\b(?:TBD|TODO|DECIDE LATER|BUILDER TO DECIDE|PLACEHOLDER)\b/i.test(text)) missing.push('unresolved placeholder');
  if (text.length > MAX_CONSENSUS_CONTRACT_CHARS) {
    missing.push(`maximum ${MAX_CONSENSUS_CONTRACT_CHARS} characters`);
  }
  return { ok: missing.length === 0, missing };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fingerprint(contract) {
  return createHash('sha256').update(contract).digest('hex');
}

function buildPrompt({ brain, task, mode, swanContext, lastTurn, candidate, round }) {
  const sectionContract = REQUIRED_PACKET_SECTIONS.map((name) => `- ## ${name}`).join('\n');
  const candidateDigest = candidate ? fingerprint(candidate) : '(none)';
  return `You are ${BRAIN_LABEL[brain]} in the SwanStudios Opus Kimi Debate Brain.

ROUND: ${round}/${MAX_ROUNDS} ? MODE: ${mode}
MISSION: ${task}

Debate ${OTHER[brain]} directly. Attack gaps, upgrade the product/code/design, and resolve disagreements with evidence. Do not agree for politeness. For UI work, obey the Swan Design Brain and specify responsive, accessible, loading, empty, error, permission, and reduced-motion states. For code, specify exact files, interfaces, tests, migrations, rollback, and hostile-review gates. The downstream builder may make ZERO product or architecture decisions.

A valid full replacement packet with zero open issues is that brain's endorsed proposal. Consensus exists when the other brain approves that exact proposal. If you fully agree with the CURRENT CANDIDATE, do not echo the full packet: return status "agree", an empty consensus_contract, zero open issues, and the exact CURRENT CANDIDATE SHA-256 in consensus_digest. If anything changes, return "revise" with the full replacement packet and zero open issues only when that replacement is complete.

Output ONLY the consensus envelope below: no opening critique, commentary, or prose outside it. A full replacement consensus_contract must be at or below ${MAX_CONSENSUS_CONTRACT_CHARS.toLocaleString('en-US')} characters. Use dense tables and compact binding bullets; preserve every required decision while eliminating repetition. Put unresolved disagreements in open_issues. Never return status "agree" when any issue remains.

The consensus_contract must be a builder-exact Markdown packet with these exact H2 sections:
${sectionContract}
It must contain at least one Mermaid diagram and one ASCII wireframe. No TBD/TODO/builder-choice placeholders.

===== BOUNDED, SANITIZED SWAN BRAIN =====
${swanContext}

===== CURRENT CANDIDATE SHA-256 =====
${candidateDigest}

===== CURRENT CANDIDATE PACKET =====
${candidate || '(none yet ? produce the first complete packet)'}

===== OTHER BRAIN'S LAST TURN =====
${lastTurn || '(you are opening the debate)'}

End with exactly:
${CONSENSUS_START}
{"status":"agree|revise","consensus_contract":"<FULL MARKDOWN PACKET, or empty only for digest approval>","consensus_digest":"<CURRENT CANDIDATE SHA-256 for digest approval>","open_issues":[]}
${CONSENSUS_END}`;
}

export async function runConsensusDebate({
  task,
  swanContext,
  callBrain,
  mode = 'auto',
  maxRounds = MAX_ROUNDS,
  onTurn = () => {},
} = {}) {
  if (!task?.trim()) throw new Error('task is required');
  if (typeof callBrain !== 'function') throw new Error('callBrain is required');
  if (!Number.isInteger(maxRounds) || maxRounds < 1 || maxRounds > MAX_ROUNDS) {
    throw new Error(`maxRounds must be between 1 and ${MAX_ROUNDS}`);
  }

  const turns = [];
  let priorAgreement = null;
  let candidate = '';
  let lastTurn = '';

  for (let round = 1; round <= maxRounds; round += 1) {
    for (const brain of ['opus', 'kimi']) {
      const prompt = buildPrompt({ brain, task, mode, swanContext, lastTurn, candidate, round });
      let raw;
      try {
        raw = await callBrain(brain, prompt, { round, turn: turns.length + 1 });
      } catch (error) {
        if (typeof error?.partialContent === 'string' && error.partialContent.trim()) {
          const turn = {
            round,
            brain,
            raw: error.partialContent,
            envelope: null,
            packetCheck: { ok: false, missing: ['complete provider response'] },
            digest: null,
            agreement: false,
          };
          turns.push(turn);
          onTurn(turn);
        }
        const message = String(error?.message || error);
        return {
          status: /spend cap/i.test(message) ? 'spend_cap' : 'provider_error',
          rounds: round,
          turns,
          builderPacket: null,
          lastCandidate: candidate,
          error: message,
        };
      }
      let envelope;
      try {
        envelope = parseConsensusEnvelope(raw);
      } catch (error) {
        const turn = {
          round, brain, raw, envelope: null,
          packetCheck: { ok: false, missing: ['valid consensus envelope'] },
          digest: null, agreement: false,
        };
        turns.push(turn);
        onTurn(turn);
        return {
          status: 'protocol_error',
          rounds: round,
          turns,
          builderPacket: null,
          lastCandidate: candidate,
          error: String(error?.message || error),
        };
      }
      const hasFullContract = envelope.consensus_contract.trim().length > 0;
      const resolvedContract = hasFullContract ? envelope.consensus_contract : candidate;
      const digest = resolvedContract ? fingerprint(resolvedContract) : null;
      const packetCheck = resolvedContract
        ? validateBuilderPacket(resolvedContract)
        : { ok: false, missing: ['full replacement packet or current candidate'] };
      const digestApproval = envelope.status === 'agree'
        && !hasFullContract
        && Boolean(candidate)
        && envelope.consensus_digest === digest;
      if (envelope.status === 'agree' && !hasFullContract && !digestApproval) {
        packetCheck.ok = false;
        packetCheck.missing = [...packetCheck.missing, 'matching current candidate digest'];
      }
      const noOpenIssues = envelope.open_issues.length === 0;
      const agreement = noOpenIssues && packetCheck.ok
        && (digestApproval || (envelope.status === 'agree' && hasFullContract));
      const proposalEndorsement = noOpenIssues && packetCheck.ok
        && hasFullContract && envelope.status === 'revise';
      const endorsement = agreement || proposalEndorsement;
      const turn = { round, brain, raw, envelope, packetCheck, digest, agreement, proposalEndorsement };
      turns.push(turn);
      onTurn(turn);
      if (hasFullContract) candidate = envelope.consensus_contract;
      const critique = raw.split(CONSENSUS_START)[0].trim();
      lastTurn = `${BRAIN_LABEL[brain]} said:\n${critique}\nEnvelope: ${envelope.status}; open issues: ${envelope.open_issues.join('; ') || 'none'}`;

      if (endorsement && priorAgreement && priorAgreement.brain !== brain && priorAgreement.digest === digest) {
        return { status: 'consensus', rounds: round, turns, builderPacket: candidate, digest };
      }
      priorAgreement = endorsement ? { brain, digest } : null;
    }
  }

  return { status: 'max_rounds', rounds: maxRounds, turns, builderPacket: null, lastCandidate: candidate };
}
