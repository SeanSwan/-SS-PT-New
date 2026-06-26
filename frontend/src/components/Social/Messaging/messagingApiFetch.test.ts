import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGING_ERROR_MESSAGES } from './messagingSafeErrors';
import { apiFetch } from './messagingApiFetch';

const apiServiceMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../../../services/api.service', () => ({
  default: apiServiceMocks,
}));

describe('messagingApiFetch', () => {
  beforeEach(() => {
    Object.values(apiServiceMocks).forEach((mock) => mock.mockReset());
  });

  it('routes reads through the shared production api service', async () => {
    const controller = new AbortController();
    const users = [{ id: 88, name: 'Sean Swan' }];
    apiServiceMocks.get.mockResolvedValue({ data: users });

    await expect(apiFetch('/users/search?q=Sean', { signal: controller.signal })).resolves.toBe(users);

    expect(apiServiceMocks.get).toHaveBeenCalledWith(
      '/api/messaging/users/search?q=Sean',
      expect.objectContaining({ signal: controller.signal })
    );
  });

  it('parses JSON request bodies before posting through the shared client', async () => {
    apiServiceMocks.post.mockResolvedValue({ data: { id: 7, content: 'Need notes' } });

    await apiFetch('/conversations/7/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 'Need notes' }),
    });

    expect(apiServiceMocks.post).toHaveBeenCalledWith(
      '/api/messaging/conversations/7/messages',
      { content: 'Need notes' },
      expect.any(Object)
    );
  });

  it('uses fixed public copy for failed transport requests', async () => {
    apiServiceMocks.get.mockRejectedValue(new Error('SequelizeConnectionError: swanadmin'));

    await expect(apiFetch('/conversations')).rejects.toThrow(MESSAGING_ERROR_MESSAGES.request);
  });

  it('preserves cancellation errors so message polling aborts stay silent', async () => {
    const cancelError = Object.assign(new Error('request canceled'), {
      name: 'CanceledError',
      code: 'ERR_CANCELED',
    });
    apiServiceMocks.get.mockRejectedValue(cancelError);

    await expect(apiFetch('/conversations/7/messages')).rejects.toBe(cancelError);
  });
});
