import { describe, expect, it, vi } from 'vitest';

import {
  createContentStudioProject,
  fetchContentStudioProjects,
  getNextProjectStatus,
  normalizeContentStudioProject,
  normalizeContentStudioProjectList,
  patchContentStudioProject,
} from './ContentStudioProjects.api';

describe('ContentStudioProjects.api', () => {
  it('normalizes real project records without inventing placeholders', () => {
    expect(normalizeContentStudioProject(null)).toBeNull();
    expect(normalizeContentStudioProject({ id: 'p1' })).toBeNull();
    expect(normalizeContentStudioProjectList([{ id: 'p1', title: ' Demo ', status: 'script', priority: 'high', shotList: [{ angle: 'front' }] }]))
      .toEqual([expect.objectContaining({ id: 'p1', title: 'Demo', status: 'script', priority: 'high', shotList: [{ angle: 'front' }] })]);
  });

  it('walks workflow statuses in creator order', () => {
    expect(getNextProjectStatus('idea')).toBe('script');
    expect(getNextProjectStatus('youtube_ready')).toBe('uploaded');
    expect(getNextProjectStatus('uploaded')).toBeNull();
  });

  it('uses the authenticated project API paths for list, create, and patch', async () => {
    const api = {
      get: vi.fn().mockResolvedValue({ data: { success: true, data: { projects: [{ id: 'p1', title: 'Demo', status: 'idea' }] } } }),
      post: vi.fn().mockResolvedValue({ data: { success: true, data: { project: { id: 'p2', title: 'New', status: 'idea' } } } }),
      patch: vi.fn().mockResolvedValue({ data: { success: true, data: { project: { id: 'p2', title: 'New', status: 'script' } } } }),
    };

    await expect(fetchContentStudioProjects(api as any)).resolves.toHaveLength(1);
    await expect(createContentStudioProject(api as any, { title: 'New' })).resolves.toMatchObject({ id: 'p2' });
    await expect(patchContentStudioProject(api as any, 'p2', { status: 'script' })).resolves.toMatchObject({ status: 'script' });

    expect(api.get).toHaveBeenCalledWith('/api/content-studio/projects');
    expect(api.post).toHaveBeenCalledWith('/api/content-studio/projects', { title: 'New' });
    expect(api.patch).toHaveBeenCalledWith('/api/content-studio/projects/p2', { status: 'script' });
  });

  it('rejects unsuccessful backend payloads', async () => {
    const api = { get: vi.fn().mockResolvedValue({ data: { success: false, message: 'Admin access required.' } }) };
    await expect(fetchContentStudioProjects(api as any)).rejects.toThrow('Admin access required.');
  });
});