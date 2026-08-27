import { beforeEach, describe, expect, it, vi } from 'vitest';

const { draftModel, sendEmail, logger } = vi.hoisted(() => ({
  draftModel: {
    findByPk: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
  },
  sendEmail: vi.fn(),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../models/index.mjs', () => ({
  getCommunicationDraft: () => draftModel,
}));

vi.mock('../../utils/logger.mjs', () => ({ default: logger }));
vi.mock('../../emailService.mjs', () => ({ sendEmail: sendEmail }));

const { listDrafts, approveDraft, rejectDraft, deleteDraft } = await import('../../controllers/communicationDraftController.mjs');

const makeResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn(),
});

describe('CommunicationDraft trainer ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists only the authenticated trainer’s drafts even when a status is requested', async () => {
    draftModel.findAll.mockResolvedValue([]);
    const res = makeResponse();

    await listDrafts({ user: { id: 42, role: 'trainer' }, query: { status: 'rejected' } }, res);

    expect(draftModel.findAll).toHaveBeenCalledWith({
      where: { status: 'rejected', trainerId: 42 },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    expect(res.json).toHaveBeenCalledWith({ success: true, drafts: [] });
  });

  it('rejects another trainer’s draft without mutating it', async () => {
    const draft = { trainerId: 41, status: 'pending_approval', update: vi.fn() };
    draftModel.findByPk.mockResolvedValue(draft);
    const res = makeResponse();

    await rejectDraft({ user: { id: 42, role: 'trainer' }, params: { draftId: '9' }, body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'You can only reject your own drafts' });
    expect(draft.update).not.toHaveBeenCalled();
  });

  it('rejects deleting another trainer’s draft without mutating it', async () => {
    const draft = { trainerId: 41, destroy: vi.fn() };
    draftModel.findByPk.mockResolvedValue(draft);
    const res = makeResponse();

    await deleteDraft({ user: { id: 42, role: 'trainer' }, params: { draftId: '9' } }, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'You can only delete your own drafts' });
    expect(draft.destroy).not.toHaveBeenCalled();
  });

  it('does not mark SMS as sent while the provider is still disconnected', async () => {
    const draft = {
      id: 9,
      type: 'sms',
      status: 'pending_approval',
      trainerId: 42,
      recipientAddress: '+15555550123',
      update: vi.fn().mockResolvedValue(undefined),
    };
    draftModel.findByPk.mockResolvedValue(draft);
    draftModel.update.mockResolvedValue([1]);
    const res = makeResponse();

    await approveDraft({ user: { id: 42, role: 'trainer' }, params: { draftId: '9' } }, res);

    expect(draftModel.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'approved',
      approvedBy: 42,
      sentAt: null,
    }), { where: { id: 9, status: 'pending_approval' } });
    expect(draft.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'approved',
      approvedBy: 42,
      sentAt: null,
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: 'Draft approved (send pending)',
    }));
  });

  it('does not expose provider error details when email delivery fails', async () => {
    const draft = {
      id: 10,
      type: 'email',
      status: 'pending_approval',
      trainerId: 42,
      recipientAddress: 'client@example.test',
      subject: 'Check in',
      body: '<p>Hello</p>',
      update: vi.fn(),
    };
    draftModel.findByPk.mockResolvedValue(draft);
    draftModel.update.mockResolvedValue([1]);
    sendEmail.mockRejectedValue(new Error('provider-secret internal trace'));
    const res = makeResponse();

    await approveDraft({ user: { id: 42, role: 'trainer' }, params: { draftId: '10' } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Email send failed' });
    expect(res.json.mock.calls[0][0].message).not.toContain('provider-secret');
    expect(draft.update).not.toHaveBeenCalled();
  });

  it('does not deliver when another approver already claimed the draft', async () => {
    const draft = {
      id: 11,
      type: 'email',
      status: 'pending_approval',
      trainerId: 42,
      recipientAddress: 'client@example.test',
      subject: 'Check in',
      body: '<p>Hello</p>',
      update: vi.fn(),
    };
    draftModel.findByPk.mockResolvedValue(draft);
    draftModel.update.mockResolvedValue([0]);
    const res = makeResponse();

    await approveDraft({ user: { id: 42, role: 'trainer' }, params: { draftId: '11' } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Draft is no longer pending approval' });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(draft.update).not.toHaveBeenCalled();
  });
});
