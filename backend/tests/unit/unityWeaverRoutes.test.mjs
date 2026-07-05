import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAwardUnityWeaverProsocialXP = vi.fn();
const mockGetUnityWeaverProsocialEvents = vi.fn();
const mockLogger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 7, role: 'client' };
    next();
  },
  rateLimiter: () => (_req, _res, next) => next(),
}));

vi.mock('../../utils/logger.mjs', () => ({ default: mockLogger }));

vi.mock('../../services/unityWeaver/prosocialXPService.mjs', () => ({
  UNITY_WEAVER_PROSOCIAL_EVENTS: {
    encourage_friend: {
      label: 'Encourage a Friend',
      requiresHumanOrSystemValidation: false,
    },
    safe_report_confirmed: {
      label: 'Protect the Community',
      requiresHumanOrSystemValidation: true,
    },
  },
  awardUnityWeaverProsocialXP: mockAwardUnityWeaverProsocialXP,
  getUnityWeaverProsocialEvents: mockGetUnityWeaverProsocialEvents,
}));

const { default: unityWeaverRoutes } = await import('../../routes/unityWeaverRoutes.mjs');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/social/unity-weaver', unityWeaverRoutes);
  return app;
}

describe('Unity Weaver routes', () => {
  beforeEach(() => {
    mockAwardUnityWeaverProsocialXP.mockReset();
    mockGetUnityWeaverProsocialEvents.mockReset();
    mockLogger.error.mockReset();
  });

  it('returns the event catalog for authenticated users', async () => {
    mockGetUnityWeaverProsocialEvents.mockReturnValueOnce([{ id: 'encourage_friend' }]);

    const response = await request(buildApp())
      .get('/api/social/unity-weaver/prosocial-events')
      .expect(200);

    expect(response.body).toEqual({ success: true, events: [{ id: 'encourage_friend' }] });
  });

  it('blocks direct self-service award requests for automatic events', async () => {
    const response = await request(buildApp())
      .post('/api/social/unity-weaver/prosocial-events/award')
      .send({ eventId: 'encourage_friend', targetUserId: 22, contextType: 'post', contextId: 99 })
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: 'This prosocial event is awarded automatically after a verified social action, not through direct requests.',
    });
    expect(mockAwardUnityWeaverProsocialXP).not.toHaveBeenCalled();
  });

  it('allows validation-only events to enter the non-awarding review path', async () => {
    mockAwardUnityWeaverProsocialXP.mockResolvedValueOnce({
      success: true,
      awarded: false,
      status: 'requires_validation',
    });

    const response = await request(buildApp())
      .post('/api/social/unity-weaver/prosocial-events/award')
      .send({ eventId: 'safe_report_confirmed', contextId: 'report-1' })
      .expect(202);

    expect(mockAwardUnityWeaverProsocialXP).toHaveBeenCalledWith({
      actorUserId: 7,
      eventId: 'safe_report_confirmed',
      targetUserId: undefined,
      contextType: 'moderation_review',
      contextId: 'report-1',
    });
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      awarded: false,
      status: 'requires_validation',
    }));
  });

  it('rejects unknown events before service calls', async () => {
    const response = await request(buildApp())
      .post('/api/social/unity-weaver/prosocial-events/award')
      .send({ eventId: 'fake_event' })
      .expect(400);

    expect(response.body).toEqual({ success: false, message: 'Unknown prosocial event' });
    expect(mockAwardUnityWeaverProsocialXP).not.toHaveBeenCalled();
  });

  it('rejects prototype event IDs before service calls', async () => {
    const response = await request(buildApp())
      .post('/api/social/unity-weaver/prosocial-events/award')
      .send({ eventId: '__proto__' })
      .expect(400);

    expect(response.body).toEqual({ success: false, message: 'Unknown prosocial event' });
    expect(mockAwardUnityWeaverProsocialXP).not.toHaveBeenCalled();
  });
});
