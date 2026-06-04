import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const shellPath = resolve(__dirname, 'AdminProgressChartsGrid.tsx');
const cardsPath = resolve(__dirname, 'AdminProgressChartsGrid.cards.tsx');
const primaryCardsPath = resolve(__dirname, 'AdminProgressChartsGrid.primaryCards.tsx');
const detailCardsPath = resolve(__dirname, 'AdminProgressChartsGrid.detailCards.tsx');

describe('AdminProgressChartsGrid theme bridge', () => {
  it('keeps the mounted admin progress grid as a small data shell', () => {
    const shellSource = readFileSync(shellPath, 'utf8');

    expect(shellSource).toContain("from './AdminProgressChartsGrid.cards'");
    expect(shellSource).toContain("from './AdminProgressChartsGrid.styles'");
    expect(shellSource).not.toContain('VictoryChart');
    expect(shellSource.split(/\r?\n/).length).toBeLessThanOrEqual(120);
  });

  it('keeps the extracted admin chart deck scoped under the line cap', () => {
    const cardsSource = readFileSync(cardsPath, 'utf8');
    const primaryCardsSource = readFileSync(primaryCardsPath, 'utf8');
    const detailCardsSource = readFileSync(detailCardsPath, 'utf8');

    expect(cardsSource).toContain("from './AdminProgressChartsGrid.primaryCards'");
    expect(cardsSource).toContain("from './AdminProgressChartsGrid.detailCards'");
    expect(primaryCardsSource).toContain('data-testid="admin-chart-workoutFrequency"');
    expect(detailCardsSource).toContain('data-testid="admin-chart-recovery"');
    expect(cardsSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(primaryCardsSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(detailCardsSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
