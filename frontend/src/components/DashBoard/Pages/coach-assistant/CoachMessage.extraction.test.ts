import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('CoachMessage extraction contract', () => {
  it('keeps the mounted message bubble focused and delegates card styling/rendering', () => {
    const componentSource = readFileSync(resolve(__dirname, './CoachMessage.tsx'), 'utf8');
    const stylesSource = readFileSync(resolve(__dirname, './CoachMessage.styles.ts'), 'utf8');
    const transcriptCardsSource = readFileSync(resolve(__dirname, './CoachMessageTranscriptCards.tsx'), 'utf8');

    expect(componentSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(stylesSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(transcriptCardsSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(componentSource).not.toContain('styled.');
    expect(componentSource).toContain("from './CoachMessage.styles'");
    expect(componentSource).toContain("from './CoachMessageTranscriptCards'");
    expect(transcriptCardsSource).toContain('export const CoachMessageTranscriptCards');
    expect(stylesSource).toContain('export const TranscriptBtn');
    expect(stylesSource).toContain('min-height: 44px');
    expect(stylesSource).toContain('var(--danger-text, #C92A54)');
  });

  it('keeps parsed pain flag badges keyed by their safety evidence, not array position', () => {
    const transcriptCardsSource = readFileSync(resolve(__dirname, './CoachMessageTranscriptCards.tsx'), 'utf8');

    expect(transcriptCardsSource).not.toMatch(/painFlags\.map\(\(flag, i\)[\s\S]*?<PainFlagBadge key=\{i\}/);
    expect(transcriptCardsSource).toContain('coachTranscriptPainFlagKey');
  });
});
