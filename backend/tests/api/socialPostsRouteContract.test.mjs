/**
 * socialPostsRouteContract — source-contract locks on routes/social/posts.mjs
 * ============================================================================
 * Trust triple 2026-07-06: (1) the friends feed must build its visibility
 * where-clause via the shared feedPolicy helper (the old inline shape
 * unioned own+friend ids with public and leaked friends' PRIVATE posts);
 * (2) create-post must normalize the incoming type against the model enum
 * ('transformation' used to reach the ENUM and 500).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.resolve(here, '../../routes/social/posts.mjs'), 'utf8');

describe('posts.mjs trust contract', () => {
  it('imports the shared feedPolicy helpers', () => {
    expect(src).toMatch(/from '\.\/feedPolicy\.mjs'/);
  });

  it('feed builds visibility via buildFeedVisibilityWhere (private-post leak regression lock)', () => {
    expect(src).toMatch(/buildFeedVisibilityWhere\(\s*req\.user\.id\s*,\s*friendIds\s*\)/);
  });

  it('the leaky own+friends-unioned-with-public shape is gone', () => {
    expect(src).not.toMatch(/const userIds = \[req\.user\.id, \.\.\.friendIds\]/);
  });

  it('create-post normalizes the incoming type against the model enum values', () => {
    expect(src).toMatch(/normalizePostType\(\s*type\s*,\s*SocialPost\.rawAttributes\.type\.values\s*\)/);
  });
});
