import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const normalizeSource = (source) => source.replace(/\r\n/g, '\n');
const routeSource = normalizeSource(readFileSync(resolve(__dirname, '../../routes/clientNoteRoutes.mjs'), 'utf8'));
const modelSource = readFileSync(resolve(__dirname, '../../models/ClientNote.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('client note route privacy', () => {
  it('does not expose trainer-only notes to client-role requests', () => {
    expect(coreRoutesSource).toContain("app.use('/api/notes', clientNoteRoutes)");
    expect(modelSource).toContain("DataTypes.ENUM('private', 'trainer_only', 'admin_only')");
    // Launch audit 2026-08-04: this assertion used to pin the literal string
    //   if (req.user?.role === 'client') { return ... data: [] }
    // which meant the test was PROTECTING A BUG. `'user'` is the default role
    // minted by public self-registration, so a normal member walked straight
    // past that guard and received every trainer/admin note written about
    // them — including 'red_flag'/'concern' notes at 'critical' severity —
    // while this green test advertised the opposite. The guard must cover all
    // client-equivalent roles via the canonical shared helper.
    expect(routeSource).toContain("isClientEquivalentRole(req.user?.role)");
    expect(routeSource).toContain("from '../utils/clientAccess.mjs'");
    // And it must NOT regress to the bare-'client' check.
    expect(routeSource).not.toContain("if (req.user?.role === 'client')");
    expect(routeSource).not.toContain("where.visibility = 'trainer_only'");
  });

  it('does not expose raw note route errors to clients or trainers', () => {
    expect(routeSource).toContain("const INTERNAL_ERROR = 'internal_error'");
    expect(routeSource).not.toContain('error: error.message');
    expect(routeSource).not.toContain('message: error.message');
    expect(routeSource).not.toContain('details: error.message');
  });
});
