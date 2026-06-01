import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourceRoot = resolve(__dirname);
const pagePath = resolve(sourceRoot, './enhanced-admin-sessions-view.tsx');
const cardPath = resolve(sourceRoot, './AdminSessionsTrainerAssignmentCard.tsx');

const readSource = (path: string) => readFileSync(path, 'utf8');
const lineCount = (source: string) => source.split(/\r?\n/).length;

describe('Admin sessions trainer assignment card extraction', () => {
  it('keeps the canonical page under the project file cap', () => {
    const pageSource = readSource(pagePath);

    expect(existsSync(cardPath), 'AdminSessionsTrainerAssignmentCard.tsx should exist').toBe(true);
    expect(pageSource).toContain("import AdminSessionsTrainerAssignmentCard from './AdminSessionsTrainerAssignmentCard'");
    expect(pageSource).toContain('<AdminSessionsTrainerAssignmentCard');
    expect(pageSource).not.toContain('Trainer Assignment Center');
    expect(pageSource).not.toContain('TrainerSectionWrap');
    expect(pageSource).not.toContain('<StyledCard>');
    expect(lineCount(pageSource)).toBeLessThanOrEqual(300);
  });

  it('keeps trainer assignment rendering in a small focused component', () => {
    const cardSource = readSource(cardPath);

    expect(cardSource).toContain('TrainerAssignmentSection');
    expect(cardSource).toContain('Trainer Assignment Center');
    expect(cardSource).toContain('onAssignmentSuccess={onAssignmentSuccess}');
    expect(cardSource).not.toContain("import styled from 'styled-components'");
    expect(lineCount(cardSource)).toBeLessThanOrEqual(100);
  });
});
