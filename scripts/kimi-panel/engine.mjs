/**
 * Kimi Panel deterministic orchestration engine.
 * ==============================================
 * Sequence: Opus blind first review -> ten blind parallel lenses (nine cheap + Gemini) -> Kimi
 * adjudication against original evidence -> Opus dismissal verification. Any stage failure aborts
 * the next stage; every network seat is attempted at most once. Preflight reserves conservative
 * worst-case spend for all thirteen calls under one shared cap before the first call can execute.
 *
 * @module kimi-panel/engine
 */
import { randomBytes } from 'node:crypto';
import { redactSecrets } from '../context-gateway/src/egress.mjs';
import { sha256 } from '../context-gateway/src/receiptV1.mjs';
import {
  BLIND_PANEL_SEATS, OPUS_FIRST_SEAT, KIMI_SEAT, OPUS_VERIFY_SEAT,
  MAX_OUTPUT_TOKENS, buildPreflight, estimateWorstCase,
} from './config.mjs';
import {
  parseReviewerFindings, dedupeFindings, parseAdjudication,
  parseOpusVerification, finalizeWithOpus,
} from './findings.mjs';
import {
  buildReviewerPrompt, buildAdjudicationPrompt, buildOpusVerificationPrompt,
} from './prompts.mjs';
import { callOpenRouter } from './openrouter.mjs';
import { assertDesignDocumentPath } from './packet.mjs';

const noop = () => null;

function upheldForModel(findings, adjudication, model) {
  const real = new Set(adjudication.verdicts.filter((item) => item.ruling === 'REAL').map((item) => item.findingId));
  return findings.filter((finding) => real.has(finding.findingId)
    && finding.origins.some((origin) => origin.model === model)).length;
}

export async function runKimiPanel({
  packet, documentPath = 'packet.md', capUsd, maxTokens = MAX_OUTPUT_TOKENS,
  confirmed = false, opusSelfReview = false, callModel = callOpenRouter,
  receiptSink = noop, env = process.env, runId = null,
}) {
  assertDesignDocumentPath(documentPath);
  const sanitized = redactSecrets(packet).text;
  const preflight = buildPreflight({ packet: sanitized, capUsd, maxTokens });
  if (!confirmed) return { status: 'preflight-only', preflight };
  if (!preflight.allowed) throw new Error(`shared cap blocked run: ${preflight.blockReason}`);

  const id = runId ?? sha256(`${preflight.packetSha256}:${randomBytes(12).toString('hex')}`).slice(0, 16);
  const allocation = new Map(preflight.roster.map((entry) => [entry.id, entry]));
  let spentUsd = 0;

  async function invoke(seat, prompt, findings = []) {
    const planned = allocation.get(seat.id);
    const promptBytes = Buffer.byteLength(prompt, 'utf8');
    if (promptBytes > planned.promptByteCeiling) throw new Error(`${seat.id} prompt exceeded its preflight bound`);
    const estimate = estimateWorstCase(seat, promptBytes, planned.maxTokens);
    if (spentUsd + estimate > capUsd) throw new Error(`shared cap blocked ${seat.id} before call`);
    try {
      const result = await callModel({ seat, prompt, findings, maxTokens: planned.maxTokens, env });
      if (!Number.isFinite(result?.cost) || result.cost < 0) throw new Error('provider returned invalid cost');
      if (result.cost > estimate + 0.000001) {
        const error = new Error('provider cost exceeded the max-price estimate');
        error.code = 'SPEND_CAP';
        error.result = result;
        throw error;
      }
      spentUsd += result.cost;
      if (spentUsd > capUsd + 0.000001) {
        const error = new Error('shared cap exceeded by provider accounting');
        error.code = 'SPEND_CAP';
        error.result = result;
        error.costAlreadyCounted = true;
        throw error;
      }
      return { seat, result, estimate, maxTokens: planned.maxTokens };
    } catch (error) {
      const charged = error.costAlreadyCounted ? 0 : Number(error?.result?.cost) || 0;
      spentUsd += charged;
      receiptSink({ seat, result: error?.result ?? {}, estimate, maxTokens: planned.maxTokens,
        outcome: 'error', errorCode: error?.code ?? 'TRANSPORT' });
      error.receiptRecorded = true;
      throw error;
    }
  }

  function failOutput(call, error, code = 'BAD_OUTPUT') {
    receiptSink({ ...call, outcome: 'error', errorCode: code });
    error.receiptRecorded = true;
    throw error;
  }

  const opusCall = await invoke(OPUS_FIRST_SEAT,
    buildReviewerPrompt(OPUS_FIRST_SEAT, sanitized, { selfReview: opusSelfReview }));
  let opusFindings;
  try {
    opusFindings = parseReviewerFindings(opusCall.result.text, {
      originModel: OPUS_FIRST_SEAT.model, selfReview: opusSelfReview,
    });
  } catch (error) { failOutput(opusCall, error); }

  const fanout = await Promise.allSettled(BLIND_PANEL_SEATS.map(async (seat) => {
    const call = await invoke(seat, buildReviewerPrompt(seat, sanitized));
    try {
      return { ...call, findings: parseReviewerFindings(call.result.text, { originModel: seat.model }) };
    } catch (error) { failOutput(call, error); }
  }));
  const failed = fanout.filter((result) => result.status === 'rejected');
  if (failed.length) {
    receiptSink({ ...opusCall, findingsRaised: opusFindings.length });
    for (const result of fanout) {
      if (result.status === 'fulfilled') receiptSink({ ...result.value, findingsRaised: result.value.findings.length });
    }
    throw new Error(`fanout aborted: ${failed.length} of ${BLIND_PANEL_SEATS.length} blind reviewers failed; no retry and no adjudication`);
  }

  const completed = fanout.map((result) => result.value);
  const findings = dedupeFindings([...opusFindings, ...completed.flatMap((call) => call.findings)]);
  let kimiCall;
  let adjudication;
  try {
    kimiCall = await invoke(KIMI_SEAT, buildAdjudicationPrompt(sanitized, findings), findings);
    adjudication = parseAdjudication(kimiCall.result.text, findings);
  } catch (error) {
    receiptSink({ ...opusCall, findingsRaised: opusFindings.length });
    for (const call of completed) receiptSink({ ...call, findingsRaised: call.findings.length });
    if (kimiCall && !error.receiptRecorded) receiptSink({ ...kimiCall, outcome: 'error', errorCode: 'ADJUDICATION_INCOMPLETE' });
    throw error;
  }

  receiptSink({ ...opusCall, findingsRaised: opusFindings.length,
    findingsUpheld: upheldForModel(findings, adjudication, OPUS_FIRST_SEAT.model) });
  for (const call of completed) receiptSink({ ...call, findingsRaised: call.findings.length,
    findingsUpheld: upheldForModel(findings, adjudication, call.seat.model) });
  receiptSink({ ...kimiCall, findingsRaised: findings.length,
    findingsUpheld: adjudication.verdicts.filter((item) => item.ruling === 'REAL').length });

  const dismissals = adjudication.verdicts.filter((item) => item.ruling === 'NOT_REAL');
  const opusVerifyCall = await invoke(OPUS_VERIFY_SEAT,
    buildOpusVerificationPrompt(sanitized, findings, adjudication), dismissals);
  let verification;
  try { verification = parseOpusVerification(opusVerifyCall.result.text, adjudication); }
  catch (error) { failOutput(opusVerifyCall, error, 'ADJUDICATION_INCOMPLETE'); }
  const final = finalizeWithOpus({ findings, adjudication }, verification);
  receiptSink({ ...opusVerifyCall, findingsRaised: dismissals.length,
    findingsUpheld: verification.dismissals.filter((item) => item.verdict === 'UPHOLD_DISMISSAL').length });

  return {
    status: 'complete', runId: id, packetSha256: preflight.packetSha256,
    modelCallsExecuted: preflight.meteredCallCount, spendUsd: spentUsd,
    preflight, findings, adjudication, verification, final,
  };
}
