import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const controllerSource = readFileSync(
  resolve(__dirname, '../../controllers/adminClientController.mjs'),
  'utf8'
);

const getMethodSource = (methodName, nextMethodName) => {
  const start = controllerSource.indexOf(`async ${methodName}`);
  const end = nextMethodName
    ? controllerSource.indexOf(`async ${nextMethodName}`, start)
    : controllerSource.indexOf('export default', start);

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return controllerSource.slice(start, end);
};

describe('admin client create email normalization', () => {
  it('normalizes regular admin-created client emails before lookup, create, and reset handoff', () => {
    const source = getMethodSource('createClient', 'updateClient');

    expect(controllerSource).toContain('normalizeClientOnboardEmailInput as normalizeAdminClientEmailInput');
    expect(source).toContain('const normalizedEmail = normalizeAdminClientEmailInput(email);');
    expect(source).toContain("message: 'Please provide a valid email address'");
    expect(source).toContain('{ email: { [Op.iLike]: normalizedEmail } }');
    expect(source).toContain('email: normalizedEmail');
    expect(source).toContain('sendPasswordResetEmailForUser(newClient)');
    expect(source).toContain("credentialAction = resetEmailSent ? 'reset_link_sent' : 'reset_link_needed'");
    expect(source).toContain("const passwordSource = 'server_generated_reset_link';");
    expect(source).not.toContain("password ? 'admin-supplied' : 'generated'");
    expect(source).not.toContain('[Op.or]: [{ email }, { username }]');
  });

  it('normalizes external admin-created client emails before username, lookup, create, and claim invite send', () => {
    const source = getMethodSource('createExternalClient', null);

    expect(source).toContain('const normalizedEmail = normalizeAdminClientEmailInput(email);');
    expect(source).toContain("message: 'Please provide a valid email address'");
    expect(source).toContain("const baseUsername = normalizedEmail.split('@')[0]");
    expect(source).toContain('User.findOne({ where: { email: { [Op.iLike]: normalizedEmail } } })');
    expect(source).toContain('email: normalizedEmail');
    expect(source).toContain('to: normalizedEmail');
    expect(source).toContain('Generate SWAN-XXXXXXXX claim token');
    expect(source).not.toContain('Generate SWAN-XXXX claim token');
  });

  it('normalizes external client source labels before welcome email copy', () => {
    const source = getMethodSource('createExternalClient', null);

    expect(controllerSource).toContain('parseClientSource');
    expect(source).toContain('const normalizedClientSource = parseClientSource(clientSource);');
    expect(source).toContain("const sourceLabel = normalizedClientSource === 'move_fitness' ? 'Move Fitness' : 'External';");
    expect(source).not.toContain("const sourceLabel = clientSource === 'move_fitness'");
  });
});
