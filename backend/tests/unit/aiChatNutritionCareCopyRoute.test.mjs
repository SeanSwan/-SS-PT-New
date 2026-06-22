import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(resolve(__dirname, '../../routes/aiChatRoutes.mjs'), 'utf8');
const serviceSource = readFileSync(resolve(__dirname, '../../services/aiChatService.mjs'), 'utf8');

describe('AI chat nutrition care-copy route guard', () => {
  it('strips previous conversation history before building provider prompt messages', () => {
    expect(routeSource).toContain("} from '../services/ai/aiChatPromptPrivacy.mjs'");
    expect(routeSource).toContain('const promptHistory = await sanitizePromptHistory({');
    expect(routeSource).toContain('messages: conversation.messages');
    expect(routeSource).toContain('enrichUserId');
    expect(routeSource).toContain('const promptMessages = buildPromptMessages(systemPrompt, promptHistory.messages, sanitizedMessage)');
    expect(routeSource).not.toContain('buildPromptMessages(systemPrompt, conversation.messages, sanitizedMessage)');
  });

  it('fails closed instead of sending the current raw message if PII stripping fails', () => {
    const catchIndex = routeSource.indexOf("logger.warn('[AIChatRoutes] PII stripping failed");
    const withheldIndex = routeSource.indexOf('sanitizedMessage = CURRENT_MESSAGE_WITHHELD');

    expect(withheldIndex).toBeGreaterThan(catchIndex);
    expect(routeSource).not.toContain('Continue with original message');
  });

  it('fails closed instead of returning raw assistant text if response PII stripping fails', () => {
    const catchIndex = routeSource.indexOf("logger.warn('[AIChatRoutes] Response PII stripping failed");
    const withheldIndex = routeSource.indexOf('aiContent = RESPONSE_MESSAGE_WITHHELD');
    const privacyIndex = routeSource.indexOf('piiStripped = true', withheldIndex);

    expect(routeSource).toContain('RESPONSE_MESSAGE_WITHHELD');
    expect(withheldIndex).toBeGreaterThan(catchIndex);
    expect(privacyIndex).toBeGreaterThan(withheldIndex);
  });

  it('sanitizes human-facing nutrition chat output after PII stripping and before storage', () => {
    const stripIndex = routeSource.indexOf('stripIdentityFromResponse(aiContent');
    const responsePrivacyIndex = routeSource.indexOf('if (responseStrip.identitiesStripped > 0) piiStripped = true');
    const careCopyIndex = routeSource.indexOf('aiContent = sanitizeNutritionChatCopy(aiContent');
    const assistantIndex = routeSource.indexOf('const assistantMsg = {');
    const proposalContentIndex = routeSource.indexOf('const proposalContent = aiContent === RESPONSE_MESSAGE_WITHHELD');
    const proposalIndex = routeSource.indexOf('createCoachActionProposalsFromAiResponse({');

    expect(routeSource).toContain("import { sanitizeNutritionChatCopy } from '../services/nutrition/nutritionCareCopy.mjs'");
    expect(responsePrivacyIndex).toBeGreaterThan(stripIndex);
    expect(careCopyIndex).toBeGreaterThan(stripIndex);
    expect(assistantIndex).toBeGreaterThan(careCopyIndex);
    expect(proposalContentIndex).toBeGreaterThan(assistantIndex);
    expect(proposalIndex).toBeGreaterThan(assistantIndex);
    expect(routeSource).toContain('message: sanitizedMessage');
    expect(routeSource).toContain('content: proposalContent');
    expect(routeSource).not.toContain('content: aiResult.content');
    expect(routeSource).toContain('maxLength: AI_CHAT_MESSAGE_MAX_CHARS');
  });

  it('places care-first nutrition rules inside the shared AI chat nutrition prompt', () => {
    expect(serviceSource).toContain("import { NUTRITION_CARE_COPY_RULES } from './nutrition/nutritionCareCopy.mjs'");
    expect(serviceSource).toMatch(/const NUTRITION_REFERENCE = `[\s\S]*\$\{NUTRITION_CARE_COPY_RULES\}/);
  });

  it('does not coerce foodContext macro values before adding them to the AI prompt context', () => {
    const sanitizerBlock = routeSource.match(/function sanitizeFoodContext\(raw\) \{[\s\S]*?\n\}/)?.[0] ?? '';

    expect(routeSource).toContain("import { parsePlainDecimalNumber } from '../services/nutrition/numericInputValidation.mjs'");
    expect(sanitizerBlock).toContain('parsePlainDecimalNumber(raw[key])');
    expect(sanitizerBlock).toContain('n !== null && n >= 0 ? n : null');
    expect(sanitizerBlock).not.toMatch(/const\s+n\s*=\s*Number\(raw\[key\]\)/);
  });
});
