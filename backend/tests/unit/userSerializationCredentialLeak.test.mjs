/**
 * §18 — User serialization: credential columns must never reach a response.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * `User` rows were sanitised per call site with a hand-written deny-list:
 *
 *     attributes: { exclude: ['password', 'refreshTokenHash'] }
 *
 * When `resetPasswordToken` / `resetPasswordExpires` were added to the model
 * (models/User.mjs:540,544) every one of those lists silently kept shipping
 * them. Nothing failed, because nothing was checking. Meanwhile two unmounted
 * handlers (`sessionController.getUserProfile`, `userController.getUserProfile`)
 * read the full row with no filter at all and passed it straight to
 * `successResponse`, which serializes the Sequelize instance via `toJSON()`.
 *
 * The fix routes the credential set through one exported constant
 * (`utils/userSerialization.mjs`) and filters the two handlers. These assertions
 * lock the *property* — "the credential set is complete and applied" — rather
 * than the spelling of any single call site.
 *
 * CRLF: every `.mjs` in this repo is `\r\n` on disk (core.autocrlf=true, and
 * `.gitattributes` pins only `scripts/*.sh` to eol=lf). Sources are normalised
 * before matching, otherwise every `\n`-anchored pattern silently returns -1
 * against correct source.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

import {
  USER_CREDENTIAL_FIELDS,
  withoutUserCredentials,
  PUBLIC_USER_FIELDS,
} from '../../utils/userSerialization.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND = resolve(__dirname, '../..');

const read = (rel) => readFileSync(resolve(BACKEND, rel), 'utf8').replace(/\r\n/g, '\n');

// Strip comments so a comment *quoting* a removed literal cannot satisfy or
// break an assertion (this trap has fired three times in this project).
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');

// `utils`/`middleware`/`webhooks` were missing from the original list, so a
// credential deny-list in any of them was invisible to the ratchet below.
const SOURCE_DIRS = ['controllers', 'routes', 'services', 'middleware', 'utils', 'webhooks'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git']);

function walkSource() {
  const out = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      let st;
      try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) {
        // Dot-directories are never source — also keeps the mutation harness's
        // throwaway tree out of scope if a run is killed before cleanup.
        if (!SKIP_DIRS.has(entry) && !entry.startsWith('.')) visit(p);
        continue;
      }
      if (extname(entry) === '.mjs') out.push(p);
    }
  };
  for (const d of SOURCE_DIRS) visit(resolve(BACKEND, d));
  return out;
}

const SOURCES = walkSource().map((p) => ({
  rel: relative(BACKEND, p).split('\\').join('/'),
  code: stripComments(readFileSync(p, 'utf8').replace(/\r\n/g, '\n')),
}));

describe('§18 — USER_CREDENTIAL_FIELDS is the complete credential set', () => {
  // Columns whose NAME looks credential-shaped but which are deliberately NOT
  // credentials. Every entry needs a stated reason; adding one is exactly the
  // explicit decision this test exists to force.
  const REVIEWED_NOT_CREDENTIALS = new Map([
    ['forcePasswordChange', 'boolean flag telling the user to change their password — carries no secret'],
  ]);

  const CREDENTIAL_SHAPED = /password|token|secret|hash|credential/i;
  /** Top-level column keys in a Sequelize model definition. */
  const COLUMN_RE = /^ {4}([A-Za-z_][A-Za-z0-9_]*):\s*\{/gm;

  it('names every credential-shaped column on User — enumerated from the model', () => {
    // This test previously hard-coded four names and never opened models/User.mjs,
    // while its comment claimed "if a credential column is added to
    // models/User.mjs, this fails and forces the author to decide". It could not.
    // Proven by experiment: adding claimTokenHash / claimTokenExpires left all 16
    // assertions green — and those two columns were reaching a response.
    const declared = [...read('models/User.mjs').matchAll(COLUMN_RE)].map((m) => m[1]);
    expect(declared.length, 'column parse found nothing — the regex has drifted').toBeGreaterThan(50);

    const credentialShaped = declared.filter((c) => CREDENTIAL_SHAPED.test(c));
    const unreviewed = credentialShaped.filter(
      (c) => !USER_CREDENTIAL_FIELDS.includes(c) && !REVIEWED_NOT_CREDENTIALS.has(c),
    );

    expect(
      unreviewed,
      'credential-shaped column(s) on User are neither excluded nor explicitly reviewed: '
        + `${unreviewed.join(', ')}. Add to USER_CREDENTIAL_FIELDS, or to `
        + 'REVIEWED_NOT_CREDENTIALS with a reason.',
    ).toEqual([]);
  });

  it('is frozen so a call site cannot mutate the shared set', () => {
    expect(Object.isFrozen(USER_CREDENTIAL_FIELDS)).toBe(true);
    expect(Object.isFrozen(PUBLIC_USER_FIELDS)).toBe(true);
  });

  it('models/User.mjs still declares each column (guards against a stale constant)', () => {
    const model = read('models/User.mjs');
    for (const col of USER_CREDENTIAL_FIELDS) {
      expect(model).toContain(`${col}: {`);
    }
  });

  it('withoutUserCredentials() returns a fresh array (no shared-mutation bug)', () => {
    const a = withoutUserCredentials();
    const b = withoutUserCredentials();
    expect(a.exclude).toEqual([...USER_CREDENTIAL_FIELDS]);
    expect(a.exclude).not.toBe(b.exclude);
    a.exclude.push('mutated');
    expect(b.exclude).not.toContain('mutated');
  });
});

describe('§18 — no source credential deny-list may rot', () => {
  // The anti-rot ratchet. Any `exclude:` array that names `password` must either
  // use the shared constant or name the reset-token columns too. This is the
  // assertion that would have caught the original bug on the day the columns
  // were added.
  const EXCLUDE_RE = /exclude:\s*\[([^\]]*)\]/g;

  const CREDENTIAL_IN_LIST = /'(?:\w*(?:password|token|secret|hash|credential)\w*)'/i;

  it('every credential deny-list uses the shared constant or names the whole set', () => {
    const offenders = [];
    for (const { rel, code } of SOURCES) {
      for (const m of code.matchAll(EXCLUDE_RE)) {
        const list = m[1];
        // This used to `continue` unless the list literally contained
        // `'password'` — so a list naming only, say, 'refreshTokenHash' (equally
        // incomplete) was skipped without ever being inspected.
        const touchesCredentials =
          list.includes('USER_CREDENTIAL_FIELDS') || CREDENTIAL_IN_LIST.test(list);
        if (!touchesCredentials) continue;

        const usesSharedConstant = list.includes('USER_CREDENTIAL_FIELDS');
        const coversWholeSet = USER_CREDENTIAL_FIELDS.every((f) => list.includes(`'${f}'`));
        if (!usesSharedConstant && !coversWholeSet) {
          offenders.push(`${rel}: exclude: [${list.replace(/\s+/g, ' ').trim()}]`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no source still hard-codes the two-column literal', () => {
    const offenders = SOURCES
      .filter(({ code }) => /exclude:\s*\[\s*'password'\s*,\s*'refreshTokenHash'\s*\]/.test(code))
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });

  it('no rest-destructure strips credentials by hand', () => {
    // The shape an `exclude: [` ratchet structurally cannot see:
    //   const { password: _, refreshTokenHash: __, ...rest } = user.toJSON()
    // adminClientController.createExternalClient shipped resetPasswordToken and
    // resetPasswordExpires this way, and stayed broken for as long as every
    // `exclude` site was already correct. Use stripCredentialFields() so the
    // credential set still has exactly one home.
    //
    // Names are derived from the constant, so this covers future columns too.
    const REST_DESTRUCTURE_RE = new RegExp(
      `const\\s*\\{[^}]*\\b(?:${USER_CREDENTIAL_FIELDS.join('|')})\\b[^}]*\\.\\.\\.[^}]*\\}`,
    );
    const offenders = SOURCES
      .filter(({ code }) => REST_DESTRUCTURE_RE.test(code))
      .map(({ rel }) => rel);
    expect(
      offenders,
      'use stripCredentialFields() instead of a hand-written destructure',
    ).toEqual([]);
  });
});

describe('§18 — the unmounted handlers no longer serialize a raw row', () => {
  const CASES = [
    ['controllers/sessionController.mjs', 'User.findByPk'],
    ['controllers/userController.mjs', 'User.findByPk'],
  ];

  for (const [rel, readCall] of CASES) {
    it(`${rel} filters credentials before successResponse`, () => {
      const code = stripComments(read(rel));
      const start = code.indexOf('export const getUserProfile');
      expect(start, `${rel} must still export getUserProfile`).toBeGreaterThan(-1);
      const body = code.slice(start, start + 900);
      expect(body).toContain(readCall);
      expect(body).toContain('attributes: { exclude: [...USER_CREDENTIAL_FIELDS] }');
    });

    it(`${rel} imports the shared constant`, () => {
      expect(read(rel)).toMatch(/from\s+['"][^'"]*userSerialization\.mjs['"]/);
    });
  }

  it('no handler passes a bare `user` to successResponse without a filter in scope', () => {
    // Property: wherever a User row is handed to successResponse as `user`,
    // the surrounding code must filter it. 400 chars of context is enough to
    // cover the read that produced it.
    const offenders = [];
    for (const { rel, code } of SOURCES) {
      let idx = code.indexOf('successResponse(res, user,');
      while (idx !== -1) {
        const ctx = code.slice(Math.max(0, idx - 400), idx);
        const filtered = /exclude|attributes\s*:|sanitize/i.test(ctx);
        if (!filtered) offenders.push(`${rel}@${code.slice(0, idx).split('\n').length}`);
        idx = code.indexOf('successResponse(res, user,', idx + 1);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('§18 — the raw SQL handler is bounded and targets the real table', () => {
  const src = read('controllers/userController.mjs');

  it('no longer issues SELECT *', () => {
    expect(stripComments(src)).not.toMatch(/SELECT\s+\*\s+FROM/i);
  });

  it('queries the canonical quoted "Users" table, not lowercase users', () => {
    const code = stripComments(src);
    expect(code).toContain('FROM "Users"');
    // bare `FROM users` (unquoted, lowercase) cannot resolve against tableName '"Users"'
    expect(code).not.toMatch(/FROM\s+users\b/);
  });

  it('bounds the result set', () => {
    expect(stripComments(src)).toMatch(/LIMIT\s+\d+/);
  });

  it('does not echo internal error text to the client', () => {
    // Pin the *response* shape, not the bare substring: `{ error: error.message }`
    // also appears legitimately in logger.error(...) calls.
    expect(stripComments(src)).not.toMatch(/\.json\(\s*\{\s*error:\s*error\.message\s*\}\s*\)/);
  });
});

describe('§18 — canonical table name is still quoted-cased', () => {
  it('models/User.mjs pins tableName to "Users"', () => {
    // The lowercase-vs-quoted distinction is what makes `FROM users` a dead
    // query; pin it so a future "tidy-up" of the quoting is caught here.
    expect(read('models/User.mjs')).toMatch(/tableName:\s*'"Users"'/);
  });
});
