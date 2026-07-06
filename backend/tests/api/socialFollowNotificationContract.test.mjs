/**
 * socialFollowNotificationContract — source-contract locks on socialController.mjs
 * =================================================================================
 * Trust triple 2026-07-06: the follow flow created a Notification with
 * type 'new_follower' INSIDE the follow transaction. That type is not in
 * Notification.mjs's isIn allowlist, so the create threw a ValidationError
 * and rolled back the whole follow (live follow route 500s). Contract:
 * the notification uses an allowed type, is created AFTER commit, and is
 * best-effort (its failure can never fail the follow).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.resolve(here, '../../controllers/socialController.mjs'), 'utf8');

// Scope all assertions to the followUser handler body.
const start = src.indexOf('followUser:');
const end = src.indexOf('unfollowUser:');
const followUserSrc = src.slice(start, end);

describe('followUser notification contract', () => {
  it('has a followUser handler to lock (guard against refactor moving it)', () => {
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
  });

  it("never creates a Notification with the invalid 'new_follower' type", () => {
    expect(followUserSrc).not.toMatch(/Notification\.create\(\{[\s\S]{0,500}?new_follower/);
  });

  it('uses an allowlisted notification type with the model\'s related-entity pattern', () => {
    expect(followUserSrc).toMatch(/type:\s*'system'/);
    expect(followUserSrc).toMatch(/relatedEntityType:\s*'follow'/);
  });

  it('creates the notification AFTER the transaction commits (no rollback coupling)', () => {
    const commitIdx = followUserSrc.indexOf('await transaction.commit()');
    const notifyIdx = followUserSrc.indexOf('Notification.create(');
    expect(commitIdx).toBeGreaterThan(-1);
    expect(notifyIdx).toBeGreaterThan(commitIdx);
    expect(followUserSrc).not.toMatch(/Notification\.create\(\{[\s\S]{0,600}?\},\s*\{\s*transaction\s*\}\)/);
  });

  it('notification failure is swallowed (best-effort), never failing the follow', () => {
    expect(followUserSrc).toMatch(/catch\s*\(notificationError\)/);
  });
});
