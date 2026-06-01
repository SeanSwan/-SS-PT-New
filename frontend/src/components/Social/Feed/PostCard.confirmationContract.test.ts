import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const postCardSource = readFileSync(resolve(__dirname, './PostCard.tsx'), 'utf8');

describe('PostCard destructive action contract', () => {
  it('uses a SwanStudios in-app confirmation dialog instead of window.confirm', () => {
    expect(postCardSource).not.toContain('window.confirm');
    expect(postCardSource).toContain('<DeletePostConfirmDialog');
  });

  it('keeps the canonical social feed card below the 300-line component cap', () => {
    const lines = postCardSource.split(/\r?\n/).length;
    expect(lines).toBeLessThanOrEqual(300);
  });
});
