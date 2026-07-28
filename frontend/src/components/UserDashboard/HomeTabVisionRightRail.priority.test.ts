import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('HomeTabVisionRightRail priority order', () => {
  it('keeps the workout next-best-action before secondary rail widgets', () => {
    const source = readSource('src/components/UserDashboard/components/HomeTabVisionRightRail.tsx');
    const renderBody = source.slice(source.indexOf('return ('));

    expect(renderBody.indexOf('<HomeTabNextBestAction')).toBeGreaterThanOrEqual(0);
    expect(renderBody.indexOf('<HomeTabNextBestAction')).toBeLessThan(renderBody.indexOf('<Panel>'));
  });
  it('renders real active challenge detail instead of only generic participation copy', () => {
    const source = readSource('src/components/UserDashboard/components/HomeTabVisionRightRail.tsx');

    expect(source).toContain('activeChallenge?.impactLabel');
    expect(source).toContain('Progress: ${activeChallenge.progressLabel}');
    expect(source).toContain('activeChallenge?.checkInsCount');
    expect(source).toContain('<MutedTiny>{challengeSupportLine}</MutedTiny>');
  });
  it('does not describe active challenge participants as creators', () => {
    const source = readSource('src/components/UserDashboard/components/HomeTabVisionRightRail.tsx');

    expect(source).not.toContain('creators are in');
    expect(source).toContain('participant is');
    expect(source).toContain('participants are');
  });
});
