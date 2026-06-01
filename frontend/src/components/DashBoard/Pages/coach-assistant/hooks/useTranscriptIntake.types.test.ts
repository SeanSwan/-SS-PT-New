import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const hookSource = readFileSync(resolve(__dirname, 'useTranscriptIntake.ts'), 'utf8');
const typesSource = readFileSync(resolve(__dirname, 'useTranscriptIntake.types.ts'), 'utf8');

describe('useTranscriptIntake type extraction', () => {
  it('keeps transcript intake contracts in a dedicated type module', () => {
    [
      'TranscriptReviewData',
      'TranscriptApplyResult',
      'UploadFailure',
      'UseTranscriptIntakeReturn',
    ].forEach((exportName) => {
      expect(typesSource).toContain(`export interface ${exportName}`);
    });
    expect(typesSource).toContain('export type UploadOutcome');
    expect(typesSource).toContain('export type ApplyOutcome');
  });

  it('keeps the hook focused on upload/apply behavior instead of contract declarations', () => {
    expect(hookSource).toContain("from './useTranscriptIntake.types'");
    expect(hookSource).not.toContain('export interface TranscriptReviewData');
    expect(hookSource).not.toContain('export interface TranscriptApplyResult');
    expect(hookSource).not.toContain('export interface UploadFailure');
    expect(hookSource).not.toContain('export type UploadOutcome');
    expect(hookSource).not.toContain('export type ApplyOutcome');
    expect(hookSource).not.toContain('export interface UseTranscriptIntakeReturn');
  });
});
