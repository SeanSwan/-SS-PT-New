import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAdminClientService } from './adminClientService';

describe('adminClientService exportClients', () => {
  const createObjectURL = vi.fn(() => 'blob:client-export');
  const revokeObjectURL = vi.fn();
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    document.body.replaceChildren();
  });

  it('downloads the protected server-generated CSV exactly once and cleans up the object URL', async () => {
    const csvBlob = new Blob(['id,firstName\n42,Fixture'], { type: 'text/csv' });
    const get = vi.fn().mockResolvedValue({ data: csvBlob });
    const service = createAdminClientService({
      defaults: { baseURL: 'https://sswanstudios.com' },
      get,
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    });

    await expect(service.exportClients('csv')).resolves.toBe(true);

    expect(get).toHaveBeenCalledWith('/api/admin/clients/export', {
      params: { format: 'csv' },
      responseType: 'blob',
    });
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:client-export');
    expect(document.body.querySelector('a[download]')).toBeNull();
  });

  it('releases the object URL and temporary anchor when the browser click throws', async () => {
    const csvBlob = new Blob(['id,firstName\n42,Fixture'], { type: 'text/csv' });
    const get = vi.fn().mockResolvedValue({ data: csvBlob });
    const service = createAdminClientService({
      defaults: { baseURL: 'https://sswanstudios.com' },
      get,
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    clickSpy.mockImplementationOnce(() => {
      throw new Error('browser rejected synthetic click');
    });

    await expect(service.exportClients('csv')).rejects.toThrow('Failed to export client data');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:client-export');
    expect(document.body.querySelector('a[download]')).toBeNull();
    consoleError.mockRestore();
  });

  it('does not log the raw Axios error object when a protected export fails', async () => {
    const requestError = {
      config: {
        headers: {
          Authorization: 'Bearer must-not-reach-console',
        },
      },
      response: { status: 500 },
    };
    const get = vi.fn().mockRejectedValue(requestError);
    const service = createAdminClientService({
      defaults: { baseURL: 'https://sswanstudios.com' },
      get,
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(service.exportClients('csv')).rejects.toThrow('Failed to export client data');

    expect(consoleError).not.toHaveBeenCalled();
    expect(document.body.querySelector('a[download]')).toBeNull();
  });
});
