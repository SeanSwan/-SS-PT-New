import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Op } from 'sequelize';

const mocks = vi.hoisted(() => {
  const transaction = {
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined)
  };
  const userModel = { findOne: vi.fn(), create: vi.fn() };
  const clientProgressModel = { create: vi.fn() };
  const sessionModel = { update: vi.fn() };
  const sequelizeQuery = vi.fn();
  const sendGridEmail = vi.fn();
  const sendPasswordResetEmailForUser = vi.fn();
  const generateClaimToken = vi.fn();
  const adminAuditCreate = vi.fn().mockResolvedValue({ id: 1 });
  const getAllModels = vi.fn(() => ({
    User: userModel,
    ClientProgress: clientProgressModel,
    Session: sessionModel,
    WorkoutSession: {},
    Order: {},
    DailyWorkoutForm: {},
    ClientTrainerAssignment: undefined,
    ClientOnboardingQuestionnaire: undefined
  }));

  return {
    transaction,
    transactionFactory: vi.fn().mockResolvedValue(transaction),
    userModel,
    clientProgressModel,
    sessionModel,
    sequelizeQuery,
    sendGridEmail,
    sendPasswordResetEmailForUser,
    generateClaimToken,
    adminAuditCreate,
    getAllModels
  };
});

vi.mock('../../models/index.mjs', () => ({
  getAllModels: mocks.getAllModels
}));

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: mocks.transactionFactory,
    query: mocks.sequelizeQuery
  }
}));

// adminClientController now writes an append-only AdminAccountAuditLog row on
// create/update of sensitive account fields; stub it so the direct import does
// not init the real model against the mocked database (and audit writes no-op).
vi.mock('../../models/AdminAccountAuditLog.mjs', () => ({
  default: { create: mocks.adminAuditCreate }
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

vi.mock('../../services/sendgridService.mjs', () => ({
  sendGridEmail: mocks.sendGridEmail
}));

vi.mock('../../services/measurementScheduleService.mjs', () => ({
  getMeasurementStatus: vi.fn()
}));

vi.mock('../../services/claimTokenService.mjs', () => ({
  generateClaimToken: mocks.generateClaimToken
}));

vi.mock('../../services/adminClientActivationQueueService.mjs', () => ({
  listPaidClientActivationQueue: vi.fn()
}));

vi.mock('../../services/sessionBillingPolicy.mjs', () => ({
  CLIENT_DEACTIVATION_CANCELLABLE_SESSION_STATUSES: Object.freeze([
    'available',
    'assigned',
    'requested',
    'scheduled',
    'confirmed'
  ]),
  NON_DEDUCTING_CLIENT_SOURCES: new Set(['move_fitness', 'external']),
  normalizePaidSessionCount: vi.fn((value) => {
    const parsed = Number(value ?? 0);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  }),
  isNonDeductingClient: vi.fn((client) => client?.clientSource === 'move_fitness' || client?.clientSource === 'external' || client?.sessionBillingMode === 'no_session_required'),
  parseClientSource: vi.fn((value) => value || 'move_fitness'),
  parseSessionBillingMode: vi.fn((value) => value || 'paid_sessions')
}));

vi.mock('../../services/auth/passwordResetEmailService.mjs', () => ({
  INACTIVE_PASSWORD_RESET_MESSAGE: 'Client is inactive. Reactivate the client before sending a password reset link.',
  sendPasswordResetEmailForUser: mocks.sendPasswordResetEmailForUser
}));

vi.mock('../../services/clientOnboardIdentityService.mjs', () => ({
  normalizeClientOnboardEmailInput: vi.fn((value) => value)
}));

const ADMIN_CLIENT_CONTROLLER_SOURCE = readFileSync(resolve(process.cwd(), 'controllers/adminClientController.mjs'), 'utf8');

const { default: adminClientController } = await import('../../controllers/adminClientController.mjs');

const buildResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
    status: vi.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((payload) => {
      res.body = payload;
      return res;
    })
  };
  return res;
};

const buildClient = (overrides = {}) => ({
  id: 301,
  role: 'client',
  availableSessions: 8,
  update: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('admin client lifecycle controller runtime behavior', () => {
  it('documents reset-link handoff instead of direct admin password handoff', () => {
    expect(ADMIN_CLIENT_CONTROLLER_SOURCE).toContain('reset-link handoff');
    expect(ADMIN_CLIENT_CONTROLLER_SOURCE).not.toMatch(/provide password directly to client/i);
    expect(ADMIN_CLIENT_CONTROLLER_SOURCE).not.toMatch(/generates secure random password/i);
    expect(ADMIN_CLIENT_CONTROLLER_SOURCE).not.toMatch(/resetPassword[^\n]*generates secure password/i);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.commit.mockResolvedValue(undefined);
    mocks.transaction.rollback.mockResolvedValue(undefined);
    mocks.userModel.findOne.mockReset();
    mocks.userModel.create.mockReset();
    mocks.clientProgressModel.create.mockReset();
    mocks.sessionModel.update.mockReset();
    mocks.sequelizeQuery.mockReset();
    mocks.sequelizeQuery.mockResolvedValue([[{ exists: null }]]);
    mocks.sendGridEmail.mockReset();
    mocks.sendGridEmail.mockResolvedValue(undefined);
    mocks.sendPasswordResetEmailForUser.mockReset();
    mocks.sendPasswordResetEmailForUser.mockResolvedValue({ emailSent: true, expiresInMinutes: 60 });
    mocks.generateClaimToken.mockReset();
    mocks.generateClaimToken.mockReturnValue({
      plainToken: 'SWAN-ABCDEFGH',
      hash: 'claim-token-hash',
      expires: new Date('2026-07-17T00:00:00.000Z')
    });
  });

  it('soft-delete cancels every future client-held non-terminal session status', async () => {
    const client = buildClient({ availableSessions: 11 });
    mocks.userModel.findOne.mockResolvedValue(client);
    mocks.sessionModel.update.mockResolvedValue([5]);
    const res = buildResponse();

    await adminClientController.deleteClient(
      { params: { clientId: '301' }, body: {} },
      res
    );

    expect(mocks.userModel.findOne).toHaveBeenCalledWith({
      where: { id: '301', role: 'client' },
      transaction: mocks.transaction
    });
    expect(mocks.sessionModel.update).toHaveBeenCalledTimes(1);
    const [sessionUpdate, updateOptions] = mocks.sessionModel.update.mock.calls[0];
    expect(sessionUpdate).toMatchObject({
      status: 'cancelled',
      notes: expect.stringContaining('client account deactivated')
    });
    expect(updateOptions.where.userId).toBe('301');
    expect(updateOptions.where.sessionDate[Op.gt]).toBeInstanceOf(Date);
    expect(updateOptions.where.status[Op.in]).toEqual(expect.arrayContaining([
      'available',
      'assigned',
      'requested',
      'scheduled',
      'confirmed'
    ]));
    expect(updateOptions.where.status[Op.in]).not.toEqual(expect.arrayContaining([
      'completed',
      'cancelled',
      'blocked'
    ]));
    expect(client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: false,
        accountDeactivatedAt: expect.any(Date),
        accountRetentionUntil: expect.any(Date)
      }),
      { transaction: mocks.transaction }
    );
    expect(mocks.transaction.commit).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.rollback).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.data).toMatchObject({
      clientId: '301',
      cancelledFutureSessions: 5,
      preservedAvailableSessions: 11
    });
  });

  it('restore reactivates the client without mutating retained sessions or credits', async () => {
    const client = buildClient({ availableSessions: 4 });
    mocks.userModel.findOne.mockResolvedValue(client);
    const res = buildResponse();

    await adminClientController.restoreClient(
      { params: { clientId: '301' } },
      res
    );

    expect(client.update).toHaveBeenCalledWith(
      {
        isActive: true,
        accountDeactivatedAt: null,
        accountRetentionUntil: null
      },
      { transaction: mocks.transaction }
    );
    expect(mocks.sessionModel.update).not.toHaveBeenCalled();
    expect(mocks.transaction.commit).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.rollback).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.data).toMatchObject({
      clientId: '301',
      isActive: true
    });
  });

  it('admin password reset returns a manual handoff link when email delivery fails', async () => {
    const client = buildClient({ id: 301, email: 'client@example.test' });
    mocks.userModel.findOne.mockResolvedValue(client);
    mocks.sendPasswordResetEmailForUser.mockRejectedValue(Object.assign(
      new Error('provider credits exceeded'),
      {
        name: 'PasswordResetEmailDeliveryError',
        emailSent: false,
        expiresInMinutes: 60,
        resetUrl: 'https://app.example.test/reset-password/manual-reset-token',
        resetExpiresAt: '2026-07-01T00:00:00.000Z',
      }
    ));
    const res = buildResponse();

    await adminClientController.resetClientPassword(
      { params: { clientId: '301' }, user: { id: 7, role: 'admin' } },
      res,
    );

    expect(mocks.userModel.findOne).toHaveBeenCalledWith({
      where: { id: '301', role: 'client' }
    });
    expect(mocks.sendPasswordResetEmailForUser).toHaveBeenCalledWith(client, { includeResetUrl: true });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.data).toMatchObject({
      credentialAction: 'reset_link_ready',
      credentialMode: 'reset_link_ready',
      clientId: '301',
      resetEmailSent: false,
      emailSent: false,
      resetUrl: 'https://app.example.test/reset-password/manual-reset-token',
      resetExpiresAt: '2026-07-01T00:00:00.000Z',
      expiresInMinutes: 60,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/newPassword|temporaryPassword/i);
  });

  it('admin password reset returns a safe unavailable response when no reset URL is generated', async () => {
    const client = buildClient({ id: 301, email: 'client@example.test' });
    mocks.userModel.findOne.mockResolvedValue(client);
    mocks.sendPasswordResetEmailForUser.mockRejectedValue(new Error('FRONTEND_URL missing'));
    const res = buildResponse();

    await adminClientController.resetClientPassword(
      { params: { clientId: '301' }, user: { id: 7, role: 'admin' } },
      res,
    );

    expect(mocks.userModel.findOne).toHaveBeenCalledWith({
      where: { id: '301', role: 'client' }
    });
    expect(mocks.sendPasswordResetEmailForUser).toHaveBeenCalledWith(client, { includeResetUrl: true });
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Reset link could not be generated. Resolve the account or email delivery issue before trying again.',
      error: 'reset_link_unavailable',
      credentialIssue: 'reset_link_unavailable',
    });
    expect(JSON.stringify(res.body)).not.toMatch(/FRONTEND_URL|newPassword|temporaryPassword/i);
  });
  it('admin password reset requires inactive clients to be restored first', async () => {
    const client = buildClient({ id: 301, email: 'client@example.test', isActive: false });
    mocks.userModel.findOne.mockResolvedValue(client);
    const res = buildResponse();

    await adminClientController.resetClientPassword(
      { params: { clientId: '301' }, user: { id: 7, role: 'admin' } },
      res,
    );

    expect(mocks.userModel.findOne).toHaveBeenCalledWith({
      where: { id: '301', role: 'client' }
    });
    expect(mocks.sendPasswordResetEmailForUser).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Client is inactive. Reactivate the client before sending a password reset link.'
    });
  });
  it('admin-created SwanStudios clients use reset-link handoff without plaintext temp passwords', async () => {
    mocks.userModel.findOne.mockResolvedValue(null);
    const createdClient = {
      id: 902,
      firstName: 'Swan',
      lastName: 'Client',
      email: 'swan.client@example.test',
      clientSource: 'swanstudios',
      sessionBillingMode: 'paid_sessions',
      availableSessions: 4,
    };
    mocks.userModel.create.mockResolvedValue(createdClient);
    mocks.sendPasswordResetEmailForUser.mockResolvedValue({
      emailSent: true,
      expiresInMinutes: 60,
      resetUrl: 'https://app.example.test/reset-password/raw-token',
      resetExpiresAt: '2026-07-01T00:00:00.000Z',
    });
    const res = buildResponse();

    await adminClientController.createClient(
      {
        body: {
          firstName: 'Swan',
          lastName: 'Client',
          email: 'swan.client@example.test',
          username: 'swan.client',
          password: 'TrainerShouldNotKnow123!',
          clientSource: 'swanstudios',
          availableSessions: 4,
        },
        user: { id: 7, role: 'admin' },
      },
      res,
    );

    const generatedSecret = mocks.userModel.create.mock.calls[0][0].password;

    expect(generatedSecret).toEqual(expect.any(String));
    expect(generatedSecret).not.toBe('TrainerShouldNotKnow123!');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mocks.sendGridEmail).not.toHaveBeenCalled();
    expect(mocks.sendPasswordResetEmailForUser).toHaveBeenCalledWith(createdClient, { includeResetUrl: true });
    expect(res.body.data).toMatchObject({
      credentialAction: 'reset_link_sent',
      credentialMode: 'reset_link_sent',
      resetEmailSent: true,
      resetUrl: 'https://app.example.test/reset-password/raw-token',
      resetExpiresAt: '2026-07-01T00:00:00.000Z',
      expiresInMinutes: 60,
    });
    expect(res.body.data).not.toHaveProperty('temporaryPassword');
    expect(JSON.stringify(res.body)).not.toContain(generatedSecret);
  });
  it('admin-created SwanStudios clients return a manual reset link when email delivery fails', async () => {
    mocks.userModel.findOne.mockResolvedValue(null);
    const createdClient = {
      id: 903,
      firstName: 'Email',
      lastName: 'Fallback',
      email: 'email.fallback@example.test',
      clientSource: 'swanstudios',
      sessionBillingMode: 'paid_sessions',
      availableSessions: 0,
    };
    mocks.userModel.create.mockResolvedValue(createdClient);
    mocks.sendPasswordResetEmailForUser.mockRejectedValue(Object.assign(
      new Error('provider credits exceeded'),
      {
        name: 'PasswordResetEmailDeliveryError',
        emailSent: false,
        expiresInMinutes: 60,
        resetUrl: 'https://app.example.test/reset-password/manual-token',
        resetExpiresAt: '2026-07-01T00:00:00.000Z',
      }
    ));
    const res = buildResponse();

    await adminClientController.createClient(
      {
        body: {
          firstName: 'Email',
          lastName: 'Fallback',
          email: 'email.fallback@example.test',
          username: 'email.fallback',
          clientSource: 'swanstudios',
        },
        user: { id: 7, role: 'admin' },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mocks.sendPasswordResetEmailForUser).toHaveBeenCalledWith(createdClient, { includeResetUrl: true });
    expect(res.body.data).toMatchObject({
      credentialAction: 'reset_link_ready',
      credentialMode: 'reset_link_ready',
      resetEmailSent: false,
      emailSent: false,
      resetUrl: 'https://app.example.test/reset-password/manual-token',
      resetExpiresAt: '2026-07-01T00:00:00.000Z',
      expiresInMinutes: 60,
    });
    expect(res.body.data).not.toHaveProperty('temporaryPassword');
  });
  it('admin-created SwanStudios clients mark reset link unavailable when no reset URL is generated', async () => {
    mocks.userModel.findOne.mockResolvedValue(null);
    const createdClient = {
      id: 904,
      firstName: 'No',
      lastName: 'Link',
      email: 'no.link@example.test',
      clientSource: 'swanstudios',
      sessionBillingMode: 'paid_sessions',
      availableSessions: 0,
    };
    mocks.userModel.create.mockResolvedValue(createdClient);
    mocks.sendPasswordResetEmailForUser.mockRejectedValue(new Error('FRONTEND_URL missing'));
    const res = buildResponse();

    await adminClientController.createClient(
      {
        body: {
          firstName: 'No',
          lastName: 'Link',
          email: 'no.link@example.test',
          username: 'no.link',
          clientSource: 'swanstudios',
        },
        user: { id: 7, role: 'admin' },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mocks.sendPasswordResetEmailForUser).toHaveBeenCalledWith(createdClient, { includeResetUrl: true });
    expect(res.body.data).toMatchObject({
      credentialAction: 'reset_link_unavailable',
      credentialMode: 'reset_link_unavailable',
      credentialIssue: 'reset_link_unavailable',
      resetEmailSent: false,
      emailSent: false,
    });
    expect(res.body.data).not.toHaveProperty('resetUrl');
    expect(res.body.data).not.toHaveProperty('temporaryPassword');
  });
  it('rejects non-SwanStudios sources on generic create route before a dead handoff account is created', async () => {
    mocks.userModel.findOne.mockResolvedValue(null);
    mocks.userModel.create.mockResolvedValue({
      id: 905,
      firstName: 'Move',
      lastName: 'Client',
      email: 'move.client@example.test',
      clientSource: 'move_fitness',
      sessionBillingMode: 'no_session_required',
      availableSessions: 0,
    });
    const res = buildResponse();

    await adminClientController.createClient(
      {
        body: {
          firstName: 'Move',
          lastName: 'Client',
          email: 'move.client@example.test',
          username: 'move.client',
          clientSource: 'move_fitness',
        },
        user: { id: 7, role: 'admin' },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toMatchObject({
      success: false,
      message: expect.stringMatching(/create-external|claim-link/i),
    });
    expect(mocks.transaction.rollback).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.commit).not.toHaveBeenCalled();
    expect(mocks.userModel.create).not.toHaveBeenCalled();
    expect(mocks.sendPasswordResetEmailForUser).not.toHaveBeenCalled();
    expect(mocks.generateClaimToken).not.toHaveBeenCalled();
  });
  it('external generated-password clients receive claim flow only, never plaintext temp passwords', async () => {
    const previousFrontendUrl = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = 'https://app.example.test';
    mocks.userModel.findOne.mockResolvedValue(null);
    const createdClient = {
      id: 901,
      toJSON: vi.fn(() => ({
        id: 901,
        firstName: 'Maya',
        lastName: 'Stone',
        email: 'maya@example.test',
        password: 'hashed-secret',
        refreshTokenHash: 'refresh-secret',
        accountStatus: 'stub',
        clientSource: 'move_fitness',
      })),
    };
    mocks.userModel.create.mockResolvedValue(createdClient);
    const res = buildResponse();

    try {
      await adminClientController.createExternalClient(
        {
          body: {
            firstName: 'Maya',
            lastName: 'Stone',
            email: 'maya@example.test',
            clientSource: 'move_fitness',
          },
          user: { id: 7, role: 'admin' },
        },
        res,
      );
    } finally {
      if (previousFrontendUrl === undefined) {
        delete process.env.FRONTEND_URL;
      } else {
        process.env.FRONTEND_URL = previousFrontendUrl;
      }
    }

    const generatedSecret = mocks.userModel.create.mock.calls[0][0].password;
    const emailPayload = mocks.sendGridEmail.mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(201);
    expect(generatedSecret).toEqual(expect.any(String));
    expect(mocks.sendGridEmail).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(emailPayload)).not.toContain(generatedSecret);
    expect(emailPayload.text).not.toMatch(/Temporary Password/i);
    expect(emailPayload.html).not.toMatch(/Temporary Password/i);
    expect(emailPayload.text).toContain('https://app.example.test/claim/SWAN-ABCDEFGH');
    expect(res.body.data).toMatchObject({
      credentialAction: 'claim_link_ready',
      credentialMode: 'claim_link_ready',
      claimToken: 'SWAN-ABCDEFGH',
      claimUrl: 'https://app.example.test/claim/SWAN-ABCDEFGH',
      claimExpiresAt: '2026-07-17T00:00:00.000Z',
    });
    expect(res.body.data).not.toHaveProperty('temporaryPassword');
    expect(JSON.stringify(res.body)).not.toContain(generatedSecret);
  });

  it('updateClient writes exactly one append-only audit row for a billing-mode flip', async () => {
    mocks.userModel.findOne.mockResolvedValue(
      buildClient({ sessionBillingMode: 'paid_sessions', reload: vi.fn().mockResolvedValue({ id: 301 }) }),
    );
    const res = buildResponse();
    await adminClientController.updateClient(
      { params: { clientId: '301' }, body: { sessionBillingMode: 'no_session_required' }, user: { id: 7, role: 'admin' } },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    // pessimistic lock requested on the fetch (race-safe snapshot)
    expect(mocks.userModel.findOne.mock.calls[0][0]).toMatchObject({ lock: true });
    expect(mocks.adminAuditCreate).toHaveBeenCalledTimes(1);
    const [payload, opts] = mocks.adminAuditCreate.mock.calls[0];
    expect(payload).toMatchObject({
      actorUserId: 7,
      targetUserId: 301,
      action: 'admin_client_account_update',
      previousState: { sessionBillingMode: 'paid_sessions' },
      nextState: { sessionBillingMode: 'no_session_required' },
    });
    expect(opts).toMatchObject({ transaction: mocks.transaction });
    expect(mocks.transaction.commit).toHaveBeenCalledTimes(1);
  });

  it('updateClient does NOT audit a profile-only change (no sensitive field touched)', async () => {
    mocks.userModel.findOne.mockResolvedValue(
      buildClient({ firstName: 'Old', reload: vi.fn().mockResolvedValue({ id: 301 }) }),
    );
    const res = buildResponse();
    await adminClientController.updateClient(
      { params: { clientId: '301' }, body: { firstName: 'New' }, user: { id: 7, role: 'admin' } },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mocks.adminAuditCreate).not.toHaveBeenCalled();
  });
});
