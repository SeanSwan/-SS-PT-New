import { beforeEach, describe, expect, it, vi } from 'vitest';

const { draftModel, logger } = vi.hoisted(() => ({
  draftModel: {
    findByPk: vi.fn(),
    findAll: vi.fn(),
  },
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../models/index.mjs', () => ({
  getCommunicationDraft: () => draftModel,
}));

vi.mock('../../utils/logger.mjs', () => ({ default: logger }));

const { listDrafts, rejectDraft, deleteDraft } = await import('../../controllers/communicationDraftController.mjs');

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
});
