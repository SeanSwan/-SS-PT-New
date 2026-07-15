/**
 * socialGroupsRouteContract — source-contract locks for the Groups upgrade
 * ========================================================================
 * Locks the load-bearing security/data-truth shapes of the 2026-07-14
 * groups slice:
 *  (1) group posts NEVER leak into the main feed / trending / profile wall
 *      (groupId: null filters);
 *  (2) create-post validates group membership BEFORE the R2 upload/write;
 *  (3) group posts are stored 'public' but gated by group privacy at read;
 *  (4) the groups routers are auth-protected and mounted under /groups;
 *  (5) membership rules: owner cannot leave, moderators cannot remove
 *      moderators, private join lands as pending.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.resolve(here, rel), 'utf8');

const postsSrc = read('../../routes/social/posts.mjs');
const groupsSrc = read('../../routes/social/groups.mjs');
const membershipSrc = read('../../routes/social/groupMembership.mjs');
const socialIndexSrc = read('../../routes/social/index.mjs');
const modelSrc = read('../../models/social/SocialPost.mjs');
const modelsIndexSrc = read('../../models/social/index.mjs');

describe('group-post main-surface exclusion (data-truth)', () => {
  it('main feed filters groupId: null', () => {
    expect(postsSrc).toMatch(/\{ groupId: null \}\s*\]\s*\}/);
  });
  it('trending filters groupId: null', () => {
    expect(postsSrc).toMatch(/visibility: 'public', groupId: null/);
  });
  it('profile wall filters groupId: null', () => {
    expect(postsSrc).toMatch(/\{ userId, groupId: null \}/);
  });
});

describe('create-post group gate', () => {
  it('validates membership via canPostInGroup before the upload block', () => {
    const gateIdx = postsSrc.indexOf('canPostInGroup(group, membership)');
    const uploadIdx = postsSrc.indexOf('Upload media to R2 BEFORE transaction');
    expect(gateIdx).toBeGreaterThan(-1);
    expect(uploadIdx).toBeGreaterThan(-1);
    expect(gateIdx).toBeLessThan(uploadIdx);
  });
  it('group posts are stored public (group privacy gates reads instead)', () => {
    expect(postsSrc).toMatch(/postData\.groupId = groupPost\.id;\s*\n\s*postData\.visibility = 'public';/);
  });
  it('single-post view gates group posts through canViewGroupContent', () => {
    expect(postsSrc).toMatch(/post\.groupId/);
    expect(postsSrc).toMatch(/canViewGroupContent\(group, membership, req\.user\)/);
  });
});

describe('engagement routes respect the group boundary (hostile-review fixes)', () => {
  it('repost blocks group posts (private-content exfiltration guard)', () => {
    expect(postsSrc).toMatch(/if \(original\.groupId\) \{[\s\S]*?cannot be reposted/);
  });
  it('comments/reactions/unlike/report gate group posts via assertGroupPostAccess', () => {
    expect(postsSrc).toContain("import { assertGroupPostAccess");
    const gateCount = (postsSrc.match(/assertGroupPostAccess\(post, req\.user\)/g) || []).length;
    // like + unlike + comment + report = 4 engagement gates
    expect(gateCount).toBeGreaterThanOrEqual(4);
  });
  it('the three activity broadcasts are skipped for group posts', () => {
    expect(postsSrc).toMatch(/if \(!groupPost\) \{[\s\S]*?post_created/);
    expect(postsSrc).toMatch(/if \(!post\.groupId\) \{[\s\S]*?reaction_added/);
    expect(postsSrc).toMatch(/if \(!post\.groupId\) \{[\s\S]*?comment_added/);
  });
  it('the hashtag detail page excludes group posts', () => {
    const hashtagsSrc = read('../../routes/social/hashtags.mjs');
    expect(hashtagsSrc).toMatch(/groupId: null/);
  });
});

describe('membership hardening (hostile-review fixes)', () => {
  it('join is idempotent via findOrCreate (no double-tap 500)', () => {
    expect(membershipSrc).toContain('findOrCreate');
    expect(membershipSrc).toMatch(/wasCreated \? 201 : 200/);
  });
  it('ownership transfer endpoint exists + is race-safe (row-locked in a service tx)', () => {
    expect(membershipSrc).toMatch(/transfer-ownership/);
    expect(membershipSrc).toContain('transferGroupOwnership');
    const svcSrc = read('../../services/social/groupAccessService.mjs');
    expect(svcSrc).toContain('lock: t.LOCK.UPDATE');
    expect(svcSrc).toMatch(/ownerId: targetUserId/);
  });
});

describe('model/migration index parity (single source of truth)', () => {
  it('SocialGroup + SocialGroupMember + SocialPost declare the migration index names', () => {
    const groupModel = read('../../models/social/SocialGroup.mjs');
    const memberModel = read('../../models/social/SocialGroupMember.mjs');
    const postModel = read('../../models/social/SocialPost.mjs');
    expect(groupModel).toContain('social_groups_privacy_activity_idx');
    expect(memberModel).toContain('social_group_members_unique');
    expect(memberModel).toContain('social_group_members_user_idx');
    expect(postModel).toContain('social_posts_group_created_idx');
  });
});

describe('groups router mounting + auth', () => {
  it('groups routes are mounted under /groups in the social index', () => {
    expect(socialIndexSrc).toMatch(/router\.use\('\/groups', groupsRoutes\)/);
  });
  it('groups router applies protect to all routes', () => {
    expect(groupsSrc).toMatch(/router\.use\(protect\)/);
  });
  it('membership sub-router is mounted by the groups router (inherits protect)', () => {
    expect(groupsSrc).toMatch(/router\.use\('\/', groupMembershipRoutes\)/);
  });
});

describe('membership rules', () => {
  it('private-group join lands as pending', () => {
    expect(membershipSrc).toMatch(/group\.privacy === 'private' \? 'pending' : 'active'/);
  });
  it('the owner cannot leave without transferring', () => {
    expect(membershipSrc).toMatch(/Transfer ownership before leaving/);
  });
  it('moderators cannot remove other moderators', () => {
    expect(membershipSrc).toMatch(/target\.role === 'moderator' && !isGroupOwner\(membership, req\.user\)/);
  });
  it('group feed access requires canViewGroupContent', () => {
    expect(groupsSrc).toMatch(/canViewGroupContent\(group, membership, req\.user\)/);
  });
});

describe('model registration', () => {
  it('SocialPost declares the groupId column referencing SocialGroups', () => {
    expect(modelSrc).toMatch(/groupId:\s*\{[\s\S]*?model:\s*'SocialGroups'/);
  });
  it('models/social/index registers SocialGroup + SocialGroupMember in BOTH export literals', () => {
    const named = modelsIndexSrc.indexOf('export {');
    const dflt = modelsIndexSrc.indexOf('export default {');
    expect(modelsIndexSrc.slice(named, dflt)).toContain('SocialGroup');
    expect(modelsIndexSrc.slice(named, dflt)).toContain('SocialGroupMember');
    expect(modelsIndexSrc.slice(dflt)).toContain('SocialGroup');
    expect(modelsIndexSrc.slice(dflt)).toContain('SocialGroupMember');
  });
});
