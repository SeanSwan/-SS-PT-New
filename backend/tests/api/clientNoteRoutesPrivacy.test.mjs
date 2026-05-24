import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/clientNoteRoutes.mjs'), 'utf8');
const modelSource = readFileSync(resolve(__dirname, '../../models/ClientNote.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('client note route privacy', () => {
  it('does not expose trainer-only notes to client-role requests', () => {
    expect(coreRoutesSource).toContain("app.use('/api/notes', clientNoteRoutes)");
    expect(modelSource).toContain("DataTypes.ENUM('private', 'trainer_only', 'admin_only')");
    expect(routeSource).toContain("if (req.user?.role === 'client') {\n      return res.status(200).json({ success: true, data: [] });\n    }");
    expect(routeSource).not.toContain("where.visibility = 'trainer_only'");
  });

  it('does not expose raw note route errors to clients or trainers', () => {
    expect(routeSource).toContain("const INTERNAL_ERROR = 'internal_error'");
    expect(routeSource).not.toContain('error: error.message');
    expect(routeSource).not.toContain('message: error.message');
    expect(routeSource).not.toContain('details: error.message');
  });
});
