import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const friendsListSource = readFileSync(resolve(__dirname, './FriendsList.tsx'), 'utf8');

describe('FriendsList destructive action contract', () => {
  it('uses a SwanStudios in-app confirmation dialog instead of window.confirm', () => {
    expect(friendsListSource).not.toContain('window.confirm');
    expect(friendsListSource).toContain('<RemoveFriendConfirmDialog');
  });

  it('keeps the canonical friends list component below the 300-line cap', () => {
    const lines = friendsListSource.split(/\r?\n/).length;
    expect(lines).toBeLessThanOrEqual(300);
  });
});
