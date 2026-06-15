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
});
