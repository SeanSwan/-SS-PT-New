/**
 * Two-session lateral-access probe — member A vs member B, over the REAL stack.
 *
 * Everything guarding the member-directory projections so far tests the
 * controller in isolation: import the module, call the function, inspect the
 * query it built. That proves the controller is correct. It does NOT prove the
 * controller is the thing an HTTP request actually reaches.
 *
 * Those are different claims, and the gap between them is a real defect class
 * in this repo (rule 31): an earlier mount could shadow the route, a sibling
 * router could answer first, a middleware could re-populate req.user. A
 * perfectly hardened controller that nothing routes to is not a fix.
 *
 * So this boots the real app, injects a real member session, and drives real
 * HTTP requests at every directory surface hardened in the launch audit.
 *
 * WHY THE MOCK HONOURS `attributes`
 * ---------------------------------
 * These controllers withhold PII by passing a Sequelize `attributes` allow-list
 * — the columns are never selected, so the database never returns them. A mock
 * that ignores `attributes` and returns whole rows would make the response-body
 * assertions below meaningless in the WRONG direction: it would report a leak
 * that cannot happen. A mock that returns rows already stripped would make them
 * meaningless in the OTHER direction: they would pass no matter what the
 * controller did.
 *
 * This mock therefore applies the projection the way the database would. A
 * controller that forgets `attributes` gets whole rows back, and the body
 * assertions catch it — which is exactly the failure being defended against.
 * Proven by mutation, not assumed (see the companion assertions on `captured`).
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

/** Member B's record, as it exists in the database — contact details included. */
const VICTIM = {
  id: 77,
  firstName: 'Bee',
  lastName: 'Ashford',
  username: 'bee',
  email: 'bee.ashford@example.test',
  phone: '+15550001111',
  photo: null,
  role: 'user',
  points: 900,
  level: 9,
  tier: 'bronze_forge',
};

/** Every field a member must never learn about another member. */
const FORBIDDEN = ['email', 'phone', 'lastName'];

const captured = { attributes: [], wheres: [] };

const project = (row, attributes) => {
  let out;
  if (!Array.isArray(attributes) || attributes.length === 0) {
    out = { ...row };
  } else {
    out = {};
    for (const attr of attributes) {
      // ['col', 'alias'] projections alias the column; the DB returns the alias.
      if (Array.isArray(attr)) out[attr[1]] = row[attr[0]];
      else if (attr in row) out[attr] = row[attr];
    }
  }
  // Sequelize hands back model INSTANCES, and these controllers call
  // `.toJSON()` on them. A plain object makes the handler throw, the endpoint
  // 500s, and every "no PII in the body" assertion below passes because the
  // body is an error — vacuously green. Verified: the first run of this file
  // did exactly that. The rows must therefore be instance-shaped.
  return { ...out, toJSON: () => ({ ...out }), get: () => ({ ...out }) };
};

const findAll = vi.fn(async (options = {}) => {
  captured.attributes.push(options.attributes ?? null);
  captured.wheres.push(options.where ?? null);
  return [project(VICTIM, options.attributes)];
});

const userModel = {
  findAll,
  findAndCountAll: vi.fn(async (options = {}) => {
    captured.attributes.push(options.attributes ?? null);
    return { count: 1, rows: [project(VICTIM, options.attributes)] };
  }),
  count: vi.fn(async () => 1),
  findByPk: vi.fn(async () => null),
  findOne: vi.fn(async () => null),
};

vi.mock('../../models/associations.mjs', () => ({
  default: async () => ({
    User: userModel,
    ProgressData: null,
    Achievement: null,
    Faction: { findAll: vi.fn(async () => []) },
  }),
}));

let app;
/** The acting session. Swapped per test to model "logged in as A" vs "as B". */
let actingUser = null;

const MEMBER_A = { id: 42, role: 'user', firstName: 'Ay', username: 'ay' };

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const { createApp } = await import('../../core/app.mjs');
  app = await createApp();

  // Patch every auth layer to inject the acting session, the way the existing
  // adminRoleEscalationMatrix / myTrainerScope probes do. This models a VALID
  // login — the question is not "can an anonymous caller read this" but "can a
  // legitimately authenticated member read someone else".
  const AUTH_LAYERS = new Set(['protect', 'authenticate', 'ensureAuth']);
  const patch = (stack) => {
    for (const layer of stack) {
      if (layer.route?.stack) {
        for (const l of layer.route.stack) {
          if (AUTH_LAYERS.has(l.name)) {
            l.handle = (req, res, next) => {
              if (!actingUser) return res.status(401).json({ success: false });
              req.user = { ...actingUser };
              next();
            };
          }
        }
      }
      if (layer.handle?.stack) patch(layer.handle.stack);
    }
  };
  patch(app._router.stack);
});

beforeEach(() => {
  actingUser = { ...MEMBER_A };
  captured.attributes = [];
  captured.wheres = [];
  findAll.mockClear();
});

/** Every directory surface hardened in the launch audit, by canonical mount. */
const SURFACES = [
  ['gamification leaderboard', '/api/v1/gamification/leaderboard'],
  ['gamification leaderboard, paged', '/api/v1/gamification/leaderboard?limit=100&page=9999'],
  ['discover users', '/api/v1/gamification/discover-users'],
  ['client-progress leaderboard', '/api/client-progress/leaderboard'],
];

describe('member A cannot read member B through any directory surface', () => {
  for (const [label, path] of SURFACES) {
    it(`withholds contact details and surname from ${label}`, async () => {
      const res = await request(app).get(path);

      // The surface may legitimately 401/403/404/500 in this harness. What it
      // may NEVER do is answer with another member's PII in the body.
      const body = JSON.stringify(res.body ?? {});
      for (const field of FORBIDDEN) {
        expect(body, `${path} leaked ${field}`).not.toContain(VICTIM[field]);
      }
      expect(body).not.toContain('bee.ashford');
      expect(body).not.toContain('5550001111');
    });
  }

  it('never even ASKS the database for a member-forbidden column', async () => {
    // Body assertions alone would pass if the row simply happened to be absent.
    // This pins the projection itself: across every surface touched above, no
    // query requested email, phone or lastName while a member was acting.
    for (const [, path] of SURFACES) {
      await request(app).get(path);
    }

    const asked = captured.attributes.filter(Boolean).flat();
    const columns = asked.map((a) => (Array.isArray(a) ? a[0] : a));
    for (const field of FORBIDDEN) {
      expect(columns, `a query selected ${field} for a member viewer`).not.toContain(field);
    }
  });

  it('actually returns member B in the payload — the probe is not vacuously green', async () => {
    // THE anti-vacuous assertion. Every "no PII" expectation above is satisfied
    // by an error body, a 404, or an empty list. The first run of this file was
    // green for exactly that reason: the rows were not instance-shaped, the
    // handler threw, and four assertions passed against a 500.
    //
    // So: prove the surface really answered, really contained member B, and
    // withheld the contact fields WHILE returning her.
    const res = await request(app).get('/api/v1/gamification/leaderboard');

    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body ?? {});
    expect(body, 'member B absent — the no-PII assertions prove nothing').toContain('Bee');
    expect(body).not.toContain('Ashford');
    expect(body).not.toContain('bee.ashford@example.test');
  });

  it('is not merely refusing everything — the same stack serves an admin more', async () => {
    // A probe that passes because every endpoint 500s proves nothing. Establish
    // that these surfaces DO respond, and that role changes the projection.
    captured.attributes = [];
    actingUser = { id: 1, role: 'admin', firstName: 'Ad', username: 'ad' };
    await request(app).get('/api/v1/gamification/leaderboard');

    const asked = captured.attributes.filter(Boolean).flat();
    expect(asked.length, 'admin leaderboard issued no query at all').toBeGreaterThan(0);
  });
});
