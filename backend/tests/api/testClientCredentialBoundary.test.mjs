import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackendFile = (path) => readFileSync(resolve(__dirname, '../..', path), 'utf8');

const apiRoutesSource = readBackendFile('routes/api.mjs');
const testRoutesSource = readBackendFile('routes/testRoutes.mjs');
const testControllerSource = readBackendFile('controllers/testController.mjs');

describe('development test-client credential boundary', () => {
  it('keeps test-client routes development-only and admin-only', () => {
    expect(apiRoutesSource).toContain("if (process.env.NODE_ENV !== 'production')");
    expect(apiRoutesSource).toContain("router.use('/test', testRoutes)");
    expect(testRoutesSource).toContain("router.post('/create-client', protect, adminOnly");
    expect(testRoutesSource).toContain("router.post('/add-sessions', protect, adminOnly");
  });

  it('does not create or return static test-client passwords', () => {
    expect(testControllerSource).not.toContain('Test123');
    expect(testControllerSource).not.toContain('password: hashedPassword');
    expect(testControllerSource).not.toContain('id: uuidv4');
    expect(testControllerSource).not.toContain("import bcrypt from 'bcryptjs'");
    expect(testControllerSource).not.toContain("from 'uuid'");

    expect(testControllerSource).toContain('const accountSeedPassword =');
    expect(testControllerSource).toContain('password: accountSeedPassword');
    expect(testControllerSource).toContain('forcePasswordChange: true');
    expect(testControllerSource).toContain('const resetHandoff = await buildTestClientResetHandoff(testClient);');
    expect(testControllerSource).toContain('...resetHandoff');

    const responseStart = testControllerSource.indexOf('res.status(201).json({');
    const responseEnd = testControllerSource.indexOf('});', responseStart);
    expect(responseStart).toBeGreaterThanOrEqual(0);
    expect(responseEnd).toBeGreaterThan(responseStart);
    const responseBlock = testControllerSource.slice(responseStart, responseEnd);
    expect(responseBlock).not.toMatch(/\bpassword\b/);
  });
});