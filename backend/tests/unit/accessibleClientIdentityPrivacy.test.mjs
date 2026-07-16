/**
 * SECURITY REGRESSION: Accessible client identity redaction.
 *
 * Proves staff-visible client names and contact fields are replaced locally
 * before an AI provider can receive command or unpinned-chat text.
 */
import { describe, expect, it, vi } from 'vitest';
import { createAccessibleClientIdentitySanitizer } from '../../services/ai/accessibleClientIdentityPrivacy.mjs';

const identities = [
  {
    id: 61,
    firstName: 'Jackie',
    lastName: 'Reed',
    email: 'jackie.reed@example.com',
    phone: '5551234567',
  },
  {
    id: 62,
    firstName: 'Mark',
    lastName: 'Stone',
    email: 'mark.stone@example.com',
    phone: null,
  },
];

const sequelizeWith = (rows) => ({ query: vi.fn(async () => rows) });

const admin = { id: 7, role: 'admin' };
const trainer = { id: 8, role: 'trainer' };


describe('createAccessibleClientIdentitySanitizer', () => {
  it('replaces full names, possessives, emails, and phone variants without substring corruption', async () => {
    const sequelize = sequelizeWith(identities);
    const { sanitize, identityCount } = await createAccessibleClientIdentitySanitizer({
      requester: admin,
      sequelize,
    });

    const result = sanitize(
      "Schedule Jackie Reed, email jackie.reed@example.com, or call (555) 123-4567. "
      + "Mark Stone's benchmark is ready; please mark it complete.",
    );

    expect(identityCount).toBe(2);
    expect(result.sanitizedMessage).not.toMatch(/Jackie Reed|jackie\.reed@example\.com|555.?123.?4567|Mark Stone/i);
    expect(result.sanitizedMessage).toContain('Client #61');
    expect(result.sanitizedMessage).toContain("Client #62's benchmark");
    expect(result.sanitizedMessage).toContain('please mark it complete');
    expect(result.identitiesStripped).toBeGreaterThanOrEqual(4);
  });

  it('normalizes a stored US country code when staff types the national phone number', async () => {
    const sequelize = sequelizeWith([{
      id: 64,
      firstName: 'Ava',
      lastName: 'North',
      email: null,
      phone: '+1 (206) 555-0123',
    }]);
    const { sanitize } = await createAccessibleClientIdentitySanitizer({ requester: admin, sequelize });

    const result = sanitize('Call 206-555-0123 about the schedule.');

    expect(result.sanitizedMessage).toBe('Call Client #64 about the schedule.');
  });

  it('includes legacy pre-assignment user roles in the protected admin roster', async () => {
    const sequelize = sequelizeWith([]);

    await createAccessibleClientIdentitySanitizer({ requester: admin, sequelize });

    const [sql] = sequelize.query.mock.calls[0];
    expect(sql).toMatch(/u\.role IN \('client', 'user'\)/);
  });

  it('uses a generic client token for an ambiguous non-common single name', async () => {
    const sequelize = sequelizeWith([
      ...identities,
      { id: 63, firstName: 'Jackie', lastName: 'Lake', email: null, phone: null },
    ]);
    const { sanitize } = await createAccessibleClientIdentitySanitizer({ requester: admin, sequelize });

    const result = sanitize('Ask Jackie about tomorrow.');

    expect(result.sanitizedMessage).toBe('Ask Client about tomorrow.');
    expect(result.sanitizedMessage).not.toContain('Jackie');
  });

  it('scopes trainer identity queries to active assignments or session history', async () => {
    const sequelize = sequelizeWith([]);

    await createAccessibleClientIdentitySanitizer({ requester: trainer, sequelize });

    const [sql, options] = sequelize.query.mock.calls[0];
    expect(sql).toMatch(/client_trainer_assignments/i);
    expect(sql).toMatch(/sessions/i);
    expect(options.replacements).toEqual({ trainerId: trainer.id });
  });

  it('does not query the client roster for non-staff callers', async () => {
    const sequelize = sequelizeWith(identities);
    const { sanitize, identityCount } = await createAccessibleClientIdentitySanitizer({
      requester: { id: 61, role: 'client' },
      sequelize,
    });

    expect(identityCount).toBe(0);
    expect(sanitize('General training question').sanitizedMessage).toBe('General training question');
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  it('fails closed when a staff roster cannot be loaded', async () => {
    const sequelize = { query: vi.fn(async () => { throw new Error('database unavailable'); }) };

    await expect(createAccessibleClientIdentitySanitizer({ requester: admin, sequelize }))
      .rejects.toThrow(/identity redaction unavailable/i);
  });
});
