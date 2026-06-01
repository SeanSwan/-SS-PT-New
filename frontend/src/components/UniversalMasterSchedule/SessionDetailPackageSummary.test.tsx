import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import SessionDetailPackageSummary from './SessionDetailPackageSummary';

const read = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

describe('SessionDetailPackageSummary', () => {
  it('renders paid package usage without negative remaining or used counts', () => {
    render(
      <SessionDetailPackageSummary
        packageInfo={{
          name: 'Founders 10 Pack',
          sessionsTotal: 10,
          sessionsRemaining: -2,
          purchasedAt: '2026-05-01T12:00:00.000Z',
        }}
      />
    );

    expect(screen.getByText('Package Info')).toBeInTheDocument();
    expect(screen.getByText('Founders 10 Pack')).toBeInTheDocument();
    expect(screen.getByText('12 of 10')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders unlimited plans when session totals are absent', () => {
    render(
      <SessionDetailPackageSummary
        packageInfo={{
          name: 'Founder Unlimited',
          sessionsTotal: null,
        }}
      />
    );

    expect(screen.getByText('Founder Unlimited')).toBeInTheDocument();
    expect(screen.getByText('Unlimited')).toBeInTheDocument();
  });

  it('normalizes malformed remaining counts before rendering paid package usage', () => {
    render(
      <SessionDetailPackageSummary
        packageInfo={{
          name: 'Founders 10 Pack',
          sessionsTotal: 10,
          sessionsRemaining: 'unknown' as any,
        }}
      />
    );

    expect(screen.getByText('10 of 10')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it('keeps package summary JSX out of the modal shell', () => {
    const modalSource = read('SessionDetailModal.tsx');
    const bodySource = read('SessionDetailBodyPanels.tsx');
    const summarySource = read('SessionDetailPackageSummary.tsx');

    expect(modalSource).toContain("from './SessionDetailBodyPanels'");
    expect(bodySource).toContain("from './SessionDetailPackageSummary'");
    expect(modalSource).not.toContain('<PackageSection>');
    expect(summarySource).toContain('<PackageSection>');
    expect(bodySource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(summarySource.split(/\r?\n/).length).toBeLessThanOrEqual(180);
    expect(modalSource.split(/\r?\n/).length).toBeLessThanOrEqual(700);
  });
});
