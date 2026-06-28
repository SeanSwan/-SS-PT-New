import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  getClientOnboardAvailableSessions,
  getClientOnboardSuccessMessage,
  isAllowedClientOnboardSource,
} from '../../routes/clientOnboardRoutes.mjs';
import {
  buildClientOnboardStubEmail,
  normalizeClientOnboardEmailInput,
} from '../../services/clientOnboardIdentityService.mjs';
import { buildAtRiskComplianceClient } from '../../routes/adminComplianceRoutes.mjs';
import { buildAtRiskComplianceQuery } from '../../utils/adminComplianceHelpers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/clientOnboardRoutes.mjs'), 'utf8');

describe('client onboard route clientSource boundary', () => {
  it('serves the active AI onboarding route mounted at /api/clients/onboard', () => {
    expect(routeSource).toContain('POST /api/clients/onboard');
    expect(routeSource).toContain('router.post');
    expect(routeSource).toContain('buildClientOnboardStubEmail({');
  });

  it('keeps every free-tracking source out of paid session inventory', () => {
    expect(getClientOnboardAvailableSessions({
      clientSource: 'move_fitness',
      availableSessions: 5,
    })).toBe(0);

    expect(getClientOnboardAvailableSessions({
      clientSource: 'external',
      availableSessions: 5,
    })).toBe(0);

    expect(getClientOnboardAvailableSessions({
      clientSource: ' Move Fitness ',
      availableSessions: 5,
    })).toBe(0);

    expect(getClientOnboardAvailableSessions({
      clientSource: 'swanstudios',
      availableSessions: 5,
    })).toBe(5);

    expect(getClientOnboardAvailableSessions({
      clientSource: 'swanstudios',
      availableSessions: 5.9,
    })).toBe(5);
  });

  it('accepts every supported client source at validation before billing policy applies', () => {
    expect(isAllowedClientOnboardSource('swanstudios')).toBe(true);
    expect(isAllowedClientOnboardSource('move_fitness')).toBe(true);
    expect(isAllowedClientOnboardSource('Move Fitness')).toBe(true);
    expect(isAllowedClientOnboardSource('external')).toBe(true);
    expect(isAllowedClientOnboardSource(' External ')).toBe(true);
    expect(isAllowedClientOnboardSource('unknown')).toBe(false);
  });

  it('returns source-aware success copy for every free-tracking client source', () => {
    expect(getClientOnboardSuccessMessage('move_fitness')).toBe(
      'Client onboarded successfully (Move Fitness - free tracking)'
    );
    expect(getClientOnboardSuccessMessage('Move Fitness')).toBe(
      'Client onboarded successfully (Move Fitness - free tracking)'
    );
    expect(getClientOnboardSuccessMessage('external')).toBe(
      'Client onboarded successfully (External - free tracking)'
    );
    expect(getClientOnboardSuccessMessage(' External ')).toBe(
      'Client onboarded successfully (External - free tracking)'
    );
    expect(getClientOnboardSuccessMessage('swanstudios')).toBe(
      'Client onboarded successfully (SwanStudios - paid sessions)'
    );
  });

  it('returns client source, session inventory, account status, and claim handoff without generated passwords', () => {
    const responseBlock = routeSource.slice(
      routeSource.indexOf('const responseData = {'),
      routeSource.indexOf('return res.status(201).json')
    );

    expect(responseBlock).toContain('clientSource: newUser.clientSource');
    expect(responseBlock).toContain('availableSessions: newUser.availableSessions');
    expect(responseBlock).toContain('accountStatus: newUser.accountStatus');
    expect(responseBlock).toContain("credentialMode: claimData ? 'claim_link_ready' : 'claim_link_needed'");
    expect(responseBlock).toContain('claimExpiresAt: claimData?.expires?.toISOString() || null');
    expect(responseBlock).not.toContain('temporaryPassword');
    expect(responseBlock).not.toContain('tempPassword');
  });
  it('sanitizes generated stub emails for names with spaces and punctuation', () => {
    expect(buildClientOnboardStubEmail({
      firstName: 'Mary Ann',
      lastName: "O'Neil-Smith",
      token: 'a1b2c3',
    })).toBe('mary-ann.oneil-smith.a1b2c3@stub.swanstudios.com');
  });

  it('normalizes explicit onboarding emails before route uniqueness and create checks', () => {
    expect(normalizeClientOnboardEmailInput('  Jackie.Client@Example.COM  '))
      .toBe('jackie.client@example.com');
    expect(normalizeClientOnboardEmailInput('   ')).toBeNull();
  });
});

describe('admin compliance client-source boundary', () => {
  it('scopes trainer at-risk compliance SQL by active client assignment', () => {
    const { sql, replacements } = buildAtRiskComplianceQuery({
      user: { id: 7, role: 'trainer' },
      limit: 25,
    });

    expect(sql).toContain('client_trainer_assignments');
    expect(sql).toContain('cta."trainerId" = :trainerId');
    expect(sql).toContain('cta.status = \'active\'');
    expect(replacements).toEqual({ limit: 25, trainerId: 7 });
  });

  it('keeps admin at-risk compliance SQL global without trainer assignment joins', () => {
    const { sql, replacements } = buildAtRiskComplianceQuery({
      user: { id: 1, role: 'admin' },
      limit: 50,
    });

    expect(sql).not.toContain('client_trainer_assignments');
    expect(replacements).toEqual({ limit: 50 });
  });

  it('does not turn free-tracking clients into low-session billing risk', () => {
    const row = buildAtRiskComplianceClient({
      id: 91,
      firstName: 'Move',
      lastName: 'Client',
      availableSessions: 0,
      clientSource: 'move_fitness',
      lastWorkoutDate: null,
      workouts7d: 0,
      workouts30d: 0,
    });

    expect(row.reason).toBe('No workouts in 999 days');
    expect(row.sessionsRemaining).toBeNull();
    expect(row.isFreeTracking).toBe(true);
  });

  it('keeps SwanStudios paid clients on low-session billing risk', () => {
    const row = buildAtRiskComplianceClient({
      id: 92,
      firstName: 'Paid',
      lastName: 'Client',
      availableSessions: 1,
      clientSource: 'swanstudios',
      lastWorkoutDate: null,
      workouts7d: 0,
      workouts30d: 0,
    });

    expect(row.reason).toBe('No workouts in 999 days, only 1 session remaining');
    expect(row.sessionsRemaining).toBe(1);
    expect(row.isFreeTracking).toBe(false);
  });

  it('normalizes SwanStudios paid-session counts before building compliance reasons', () => {
    const row = buildAtRiskComplianceClient({
      id: 93,
      firstName: 'Fractional',
      lastName: 'Client',
      availableSessions: 1.8,
      clientSource: 'swanstudios',
      lastWorkoutDate: null,
      workouts7d: 0,
      workouts30d: 0,
    });

    expect(row.reason).toBe('No workouts in 999 days, only 1 session remaining');
    expect(row.sessionsRemaining).toBe(1);
  });
});
