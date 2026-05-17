import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.resolve(__dirname, 'ClientCommunityPage.tsx');
const source = readFileSync(sourcePath, 'utf8');

describe('ClientCommunityPage route ownership', () => {
  it('uses the client observatory as the single social source of truth', () => {
    expect(source).toContain("import ClientObservatoryHome from './observatory/ClientObservatoryHome'");
    expect(source).toContain('<ClientObservatoryHome />');
    expect(source).not.toContain('useSocialFeed');
    expect(source).not.toContain('useSocialChallenges');
  });
});
