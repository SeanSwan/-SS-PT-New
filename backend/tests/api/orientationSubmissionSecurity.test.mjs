import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  Orientation: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
  sendAdminNotification: vi.fn(),
  sendNotification: vi.fn(),
  createAdminNotification: vi.fn(),
}));

vi.mock('../../models/Orientation.mjs', () => ({ default: mocks.Orientation }));
vi.mock('../../models/User.mjs', () => ({ default: {} }));
vi.mock('../../services/notificationService.mjs', () => ({
  sendAdminNotification: mocks.sendAdminNotification,
  sendNotification: mocks.sendNotification,
}));
vi.mock('../../controllers/notificationController.mjs', () => ({
  createAdminNotification: mocks.createAdminNotification,
}));

const { orientationSubmit } = await import('../../controllers/orientationController.mjs');

const makeResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
    status: vi.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((body) => {
      res.body = body;
      return res;
    }),
  };
  return res;
};

const makeBody = (overrides = {}) => ({
  fullName: 'Prospect <img src=x onerror=alert(1)>',
  email: 'prospect@example.test',
  phone: '555-0100',
  healthInfo: '<script>alert("xss")</script>',
  waiverInitials: 'PT',
  trainingGoals: '<b>strength</b>',
  experienceLevel: 'Beginner',
  ...overrides,
});

describe('orientation submissions first-login security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.Orientation.findOne.mockResolvedValue(null);
    mocks.Orientation.create.mockResolvedValue({
      id: 77,
      status: 'pending',
      createdAt: new Date('2026-06-25T12:00:00.000Z'),
    });
    mocks.sendNotification.mockResolvedValue({ success: true });
    mocks.sendAdminNotification.mockResolvedValue({ success: true });
  });

  it('rejects whitespace-only required fields before creating public orientation records', async () => {
    const req = { body: makeBody({ fullName: '   ', healthInfo: '   ' }) };
    const res = makeResponse();

    await orientationSubmit(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ message: 'Please fill in all required fields.' });
    expect(mocks.Orientation.findOne).not.toHaveBeenCalled();
    expect(mocks.Orientation.create).not.toHaveBeenCalled();
  });

  it('does not reveal existing orientation id or status on duplicate public email', async () => {
    mocks.Orientation.findOne.mockResolvedValue({
      id: 44,
      status: 'scheduled',
      createdAt: new Date('2026-06-20T12:00:00.000Z'),
    });

    const req = { body: makeBody() };
    const res = makeResponse();

    await orientationSubmit(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Orientation submitted successfully',
      data: {
        message: 'Orientation submitted successfully. We will contact you soon!',
      },
    });
    expect(mocks.Orientation.create).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).not.toContain('scheduled');
    expect(JSON.stringify(res.body)).not.toContain('44');
  });

  it('escapes submitted orientation text before sending notification HTML', async () => {
    const req = { body: makeBody() };
    const res = makeResponse();

    await orientationSubmit(req, res);

    const userHtml = mocks.sendNotification.mock.calls[0][0].html;
    const adminHtml = mocks.sendAdminNotification.mock.calls[0][0].html;

    expect(userHtml).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(adminHtml).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(adminHtml).toContain('&lt;b&gt;strength&lt;/b&gt;');
    expect(`${userHtml}${adminHtml}`).not.toContain('<img src=x');
    expect(`${userHtml}${adminHtml}`).not.toContain('<script>');
  });
});
