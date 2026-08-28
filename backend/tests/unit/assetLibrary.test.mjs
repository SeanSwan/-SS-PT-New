/**
 * The asset library — finding the work again.
 *
 * WHAT THESE TESTS EXIST TO PREVENT
 *   1. Another owner's assets appearing in your list. The owner comes from the
 *      session, never a parameter, and the query must prove it.
 *   2. A typo'd filter silently matching everything.
 *   3. Two stills from one batch sharing a millisecond and one of them vanishing
 *      from pagination — the reason the cursor carries an id as well as a time.
 *   4. A page that says "more" when there is none, or hides the last row.
 *   5. An r2 storage key reaching a client.
 *
 * WHAT THEY CANNOT PROVE: that the clause EXECUTES. There is no Postgres here, so
 * these assert the query SHAPE. Shape catches a wrong column or a missing owner
 * scope; only execution catches a dialect error. That gap is real and disclosed.
 */

import { describe, it, expect } from 'vitest';
import {
  buildAssetQuery, listAssets, assetView, encodeCursor, decodeCursor,
  DEFAULT_PAGE, MAX_PAGE, APPROVAL_STATUSES, KINDS,
} from '../../services/atelier/assetLibrary.mjs';

/** Stand-in for Sequelize's operator symbols — distinct values, comparable in a test. */
const Op = { contains: Symbol('contains'), or: Symbol('or'), lt: Symbol('lt') };

const row = (over = {}) => ({
  id: over.id || '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  kind: 'image', mime: 'image/png', width: 1920, height: 1080, sizeBytes: '2048',
  approvalStatus: 'draft', createdAt: new Date('2026-08-26T10:00:00.000Z'),
  r2Key: 'atelier/stills/1/abc.png',
  tags: ['atelier', 'still', 'lane:local', 'seed:42', 'workspace:ws-1', 'brandkit:universal', 'brandkit-hash:8f7701a221ed'],
  provenance: { request: { prompt: 'a lone red fox crossing a snowfield', promptTruncated: false } },
  ...over,
});

describe('the query is owner-scoped by construction', () => {
  it('always filters on the session owner', () => {
    expect(buildAssetQuery({ userId: 7 }, { Op }).where.ownerUserId).toBe(7);
  });

  it('refuses to build a query with no owner rather than listing everything', () => {
    expect(() => buildAssetQuery({}, { Op })).toThrow(expect.objectContaining({ code: 'E_BAD_OWNER' }));
  });

  it('has no parameter that could name a different owner', () => {
    // The shape of an IDOR is a caller-supplied id. There is none: passing one changes
    // nothing, because the builder reads only `userId`, which the route takes from session.
    const q = buildAssetQuery({ userId: 7, ownerUserId: 9, owner: 9 }, { Op });
    expect(q.where.ownerUserId).toBe(7);
  });
});

describe('filters are an allowlist', () => {
  it('accepts the known kinds and statuses', () => {
    for (const k of KINDS) expect(buildAssetQuery({ userId: 1, kind: k }, { Op }).where.kind).toBe(k);
    for (const s of APPROVAL_STATUSES) expect(buildAssetQuery({ userId: 1, status: s }, { Op }).where.approvalStatus).toBe(s);
  });

  it('REFUSES an unknown filter rather than ignoring it', () => {
    // Ignoring it would return every asset while the operator believes they filtered —
    // the plausible-wrong-answer failure, in a list instead of a render.
    expect(() => buildAssetQuery({ userId: 1, kind: 'gif' }, { Op })).toThrow(expect.objectContaining({ code: 'E_BAD_FILTER' }));
    expect(() => buildAssetQuery({ userId: 1, status: 'live' }, { Op })).toThrow(expect.objectContaining({ code: 'E_BAD_FILTER' }));
  });

  it('ANDs tag filters, which is what "brand X filed under project Y" means', () => {
    const q = buildAssetQuery({ userId: 1, brandKit: 'universal', workspaceId: 'ws-1', lane: 'local' }, { Op });
    expect(q.where.tags[Op.contains]).toEqual(['brandkit:universal', 'workspace:ws-1', 'lane:local']);
  });

  it('can pin a kit VERSION, not just its name', () => {
    const q = buildAssetQuery({ userId: 1, brandKitHash: '8f7701a221ed' }, { Op });
    expect(q.where.tags[Op.contains]).toEqual(['brandkit-hash:8f7701a221ed']);
  });

  it('adds no tag clause at all when nothing is filtered', () => {
    expect(buildAssetQuery({ userId: 1 }, { Op }).where.tags).toBeUndefined();
  });
});

describe('the cursor survives a batch that shares a millisecond', () => {
  it('round-trips through base64url', () => {
    const c = encodeCursor(row());
    expect(decodeCursor(c)).toMatchObject({ id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' });
    expect(decodeCursor(c).createdAt.toISOString()).toBe('2026-08-26T10:00:00.000Z');
  });

  it('carries an ID as well as a time, so two stills from one batch both survive', () => {
    // A timestamp-only cursor drops one of them: `createdAt < X` excludes its twin.
    const q = buildAssetQuery({ userId: 1, cursor: encodeCursor(row()) }, { Op });
    const clause = q.where[Op.or];
    expect(clause).toHaveLength(2);
    expect(clause[1]).toMatchObject({ createdAt: new Date('2026-08-26T10:00:00.000Z') });
    expect(clause[1].id[Op.lt]).toBe('3f2504e0-4f89-41d3-9a0c-0305e82c3301');
  });

  it('refuses a cursor it did not issue', () => {
    expect(() => decodeCursor('not-a-cursor')).toThrow(expect.objectContaining({ code: 'E_BAD_CURSOR' }));
    expect(() => decodeCursor(Buffer.from('nope', 'utf8').toString('base64url'))).toThrow(expect.objectContaining({ code: 'E_BAD_CURSOR' }));
  });

  it('orders newest first, with the id breaking the tie', () => {
    expect(buildAssetQuery({ userId: 1 }, { Op }).order).toEqual([['createdAt', 'DESC'], ['id', 'DESC']]);
  });
});

describe('paging tells the truth about whether there is more', () => {
  const model = (n) => ({ findAll: async ({ limit }) => Array.from({ length: Math.min(n, limit) }, (_, i) => row({ id: `id-${String(i).padStart(3, '0')}` })) });

  it('fetches one extra row and drops it, so hasMore needs no COUNT over an unindexed table', async () => {
    const out = await listAssets({ userId: 1, limit: 5 }, { assetModel: model(50), Op });
    expect(out.assets).toHaveLength(5);
    expect(out.hasMore).toBe(true);
    expect(out.nextCursor).toBeTruthy();
  });

  it('a short page is the LAST page — no cursor, so a client stops', async () => {
    const out = await listAssets({ userId: 1, limit: 10 }, { assetModel: model(3), Op });
    expect(out.assets).toHaveLength(3);
    expect(out.hasMore).toBe(false);
    expect(out.nextCursor).toBeNull();
  });

  it('an exactly-full page is also the last page', async () => {
    // The off-by-one that says "more" forever: N rows for a page size of N is the END.
    const out = await listAssets({ userId: 1, limit: 4 }, { assetModel: model(4), Op });
    expect(out.assets).toHaveLength(4);
    expect(out.hasMore).toBe(false);
  });

  it('clamps the page size instead of letting a caller ask for everything', () => {
    expect(buildAssetQuery({ userId: 1, limit: 10000 }, { Op })._pageSize).toBe(MAX_PAGE);
    expect(buildAssetQuery({ userId: 1, limit: 0 }, { Op })._pageSize).toBe(1);
    expect(buildAssetQuery({ userId: 1 }, { Op })._pageSize).toBe(DEFAULT_PAGE);
  });

  it('refuses when the store is unconfigured rather than returning an empty library', async () => {
    // An empty list reads as "you have made nothing", which is a lie about the operator's work.
    await expect(listAssets({ userId: 1 }, {})).rejects.toMatchObject({ code: 'E_STORAGE_UNCONFIGURED' });
  });
});

describe('what a client is given', () => {
  it('lifts the brand, workspace, lane and seed out of tags so nobody parses strings', () => {
    expect(assetView(row())).toMatchObject({
      brandKit: 'universal', brandKitHash: '8f7701a221ed', workspaceId: 'ws-1', lane: 'local', seed: 42,
    });
  });

  it('NEVER hands out the storage key — a path is not a URL, and one invites the other', () => {
    const v = assetView(row());
    expect(v.r2Key).toBeUndefined();
    expect(JSON.stringify(v)).not.toMatch(/atelier\/stills/);
  });

  it('shows the prompt so a person can recognise their own work', () => {
    expect(assetView(row()).prompt).toMatch(/red fox/);
    expect(assetView(row()).promptTruncated).toBe(false);
  });

  it('survives a row with no tags and no provenance', () => {
    const v = assetView(row({ tags: undefined, provenance: undefined }));
    expect(v.brandKit).toBeNull();
    expect(v.prompt).toBeNull();
    expect(v.seed).toBeNull();
  });

  it('returns sizeBytes as a number — BIGINT arrives as a string and would sort as text', () => {
    expect(assetView(row({ sizeBytes: '2048' })).sizeBytes).toBe(2048);
    expect(assetView(row({ sizeBytes: null })).sizeBytes).toBeNull();
  });
});

describe('the clause renders to the SQL it is supposed to', () => {
  it('emits JSONB array containment for tag filters', async () => {
    // As close to execution as this environment gets: Sequelize's own generator, with the
    // real Postgres dialect, turning the built clause into SQL. It proves the OPERATOR —
    // `@>` over a JSONB array is what tag filtering needs, and getting it wrong is the
    // kind of error a shape assertion cannot see.
    //
    // What it does NOT prove: that the statement runs, or that attribute names are mapped
    // to their snake_case columns. Calling the generator directly bypasses the mapping
    // that `findAll` applies. The evidence that mapping works is the shipped persistence
    // path — `findOrCreate({ where: { r2Key } })` against a column declared
    // `field: 'r2_key'` — which is in production today.
    const { Sequelize, DataTypes, Op: RealOp } = await import('sequelize');
    const seq = new Sequelize({ dialect: 'postgres', logging: false });
    const M = seq.define('MediaAsset', {
      id: { type: DataTypes.UUID, primaryKey: true },
      ownerUserId: { type: DataTypes.INTEGER, field: 'owner_user_id' },
      kind: DataTypes.STRING,
      approvalStatus: { type: DataTypes.STRING, field: 'approval_status' },
      tags: DataTypes.JSONB,
    }, { tableName: 'media_assets', underscored: true, timestamps: true });

    const q = buildAssetQuery({ userId: 7, brandKit: 'universal', workspaceId: 'ws-1' }, { Op: RealOp });
    const sql = M.queryGenerator.selectQuery('media_assets', { where: q.where, order: q.order, limit: q.limit, model: M }, M).replace(/\s+/g, ' ');

    expect(sql).toMatch(/"tags" @> '\["brandkit:universal","workspace:ws-1"\]'/);
    expect(sql).toMatch(/ORDER BY .*DESC, .*DESC/);
    expect(sql).toMatch(/LIMIT 25/);            // page size 24, plus the probe row
  });
});

describe('the cursor slices at a precision it can actually represent', () => {
  const sequelize = async () => import('sequelize');
  const model = async () => {
    const { Sequelize, DataTypes } = await sequelize();
    const seq = new Sequelize({ dialect: 'postgres', logging: false });
    return seq.define('MediaAsset', {
      id: { type: DataTypes.UUID, primaryKey: true },
      ownerUserId: { type: DataTypes.INTEGER, field: 'owner_user_id' },
      tags: DataTypes.JSONB,
    }, { tableName: 'media_assets', underscored: true, timestamps: true });
  };

  it('sorts AND compares at millisecond precision, so a same-millisecond batch is not eaten', async () => {
    // created_at is TIMESTAMPTZ DEFAULT now() — MICROseconds. A JS Date is MILLIseconds.
    // Comparing the two with a plain `<` silently drops every row inside the truncated
    // remainder: rows older than the cursor but within its millisecond never appear on
    // any page. A four-up Compose batch is exactly such a cluster, which makes the
    // product's most common object the thing this loses.
    const { Op: RealOp, fn, col, where } = await sequelize();
    const M = await model();
    const cursor = encodeCursor({ id: 'aaaaaaaa-0000-4000-8000-000000000001', createdAt: new Date('2026-08-26T10:00:00.000Z') });
    const q = buildAssetQuery({ userId: 7, cursor }, { Op: RealOp, fn, col, where });
    const sql = M.queryGenerator.selectQuery('media_assets', { where: q.where, order: q.order, limit: q.limit, model: M }, M).replace(/\s+/g, ' ');

    // Both halves must truncate, or the slice is cut against a different key than it sorts by.
    const truncs = sql.match(/date_trunc\('milliseconds'/g) || [];
    expect(truncs.length).toBeGreaterThanOrEqual(3);       // order + both cursor branches
    expect(sql).toMatch(/ORDER BY date_trunc\('milliseconds'.*DESC.*"id" DESC/);
    // The same-millisecond branch falls through to the id tie-break.
    expect(sql).toMatch(/"id" < 'aaaaaaaa-0000-4000-8000-000000000001'/);
  });

  it('still builds a plain clause when no SQL helpers are injected', () => {
    // The pure path is what the unit tests above exercise; it must not silently change
    // shape just because the SQL-aware path exists.
    const q = buildAssetQuery({ userId: 7, cursor: encodeCursor(row()) }, { Op });
    expect(q.order).toEqual([['createdAt', 'DESC'], ['id', 'DESC']]);
    expect(q.where[Op.or]).toHaveLength(2);
  });
});

describe('the filter allowlist cannot drift from the model', () => {
  it('mirrors MediaAsset exactly — a new kind must not become an unfilterable one', async () => {
    // Predicted by a reviewer and already TRUE when predicted: the first version of this
    // list was ['image','video'] while the model has allowed 'audio' all along, so an
    // audio asset could be written and never filtered for. Two unlinked sources of truth
    // is the defect; this test is the link.
    const { MEDIA_ASSET_KINDS, MEDIA_ASSET_APPROVAL_STATUSES } = await import('../../models/MediaAsset.mjs');
    expect([...KINDS].sort()).toEqual([...MEDIA_ASSET_KINDS].sort());
    expect([...APPROVAL_STATUSES].sort()).toEqual([...MEDIA_ASSET_APPROVAL_STATUSES].sort());
  });
});

describe('a seed the client cannot read is null, not NaN', () => {
  it('a non-numeric seed tag becomes null rather than NaN', () => {
    // Number('v2') is NaN, and JSON.stringify emits NaN as null — so this already
    // ARRIVED as null, with nothing logged and no error, and a render's reproduction
    // anchor was lost silently. Now it is null on purpose.
    const v = assetView({ id: 'a', tags: ['seed:v2'], provenance: {} });
    expect(v.seed).toBeNull();
    expect(Number.isNaN(v.seed)).toBe(false);
  });

  it('a numeric seed still comes through', () => {
    expect(assetView({ id: 'a', tags: ['seed:42'], provenance: {} }).seed).toBe(42);
  });

  it('an absent seed tag is null', () => {
    expect(assetView({ id: 'a', tags: [], provenance: {} }).seed).toBeNull();
  });
});

describe('sizeBytes gets the same treatment as seed, in the same object literal', () => {
  it('a non-numeric sizeBytes is null, not NaN', () => {
    // Unreachable from a BIGINT column — the guard exists because `seed` six lines away
    // needed it, and a reader who finds one field guarded and its neighbour bare cannot
    // tell which is deliberate. That asymmetry is the shape this subsystem gets bitten by.
    expect(assetView({ id: 'a', sizeBytes: '12MB', tags: [], provenance: {} }).sizeBytes).toBeNull();
  });

  it('a BIGINT arriving as a string still becomes a number', () => {
    // Sequelize returns BIGINT as a string to protect precision, so this coercion is
    // load-bearing rather than decorative.
    expect(assetView({ id: 'a', sizeBytes: '2048', tags: [], provenance: {} }).sizeBytes).toBe(2048);
  });

  it('an absent sizeBytes stays null', () => {
    expect(assetView({ id: 'a', sizeBytes: null, tags: [], provenance: {} }).sizeBytes).toBeNull();
  });
});
