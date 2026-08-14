import test from 'node:test';
import assert from 'node:assert/strict';
import { OPUS_FIRST_SEAT } from '../config.mjs';
import {
  buildReviewerPrompt,
  buildAdjudicationPrompt,
  buildOpusVerificationPrompt,
} from '../prompts.mjs';

test('reviewer prompt states every parser byte limit before paid output is produced', () => {
  const prompt = buildReviewerPrompt(OPUS_FIRST_SEAT, 'sanitized packet');

  assert.match(prompt, /claim.*600 UTF-8 bytes/i);
  assert.match(prompt, /category.*80 UTF-8 bytes/i);
  assert.match(prompt, /evidence.*800 UTF-8 bytes/i);
  assert.match(prompt, /path.*400 UTF-8 bytes/i);
});

test('adjudication and dismissal prompts state their rationale byte limit', () => {
  const finding = {
    findingId: '0123456789abcdef', path: 'packet.md', startLine: 1, endLine: 1,
    claim: 'claim', severity: 'high', category: 'design', evidence: 'evidence', origins: [],
  };
  const adjudication = { overall: 'REVISE', verdicts: [{
    findingId: finding.findingId, ruling: 'NOT_REAL', rationale: 'reason',
  }] };

  assert.match(buildAdjudicationPrompt('packet', [finding]), /rationale.*1,200 UTF-8 bytes/i);
  assert.match(
    buildOpusVerificationPrompt('packet', [finding], adjudication),
    /rationale.*1,200 UTF-8 bytes/i,
  );
});
