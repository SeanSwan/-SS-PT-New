import { describe, expect, it, vi } from 'vitest';

import {
  ContentProjectValidationError,
  createContentProject,
  sanitizeContentProjectPayload,
  updateContentProject,
} from '../../services/contentStudioProjectService.mjs';

describe('contentStudioProjectService', () => {
  it('sanitizes creator project input with workflow defaults', () => {
    const payload = sanitizeContentProjectPayload({
      title: '  Hip hinge YouTube demo  ',
      sourceType: 'coverage_gap',
      sourceId: 'exercise-123',
      scriptDraft: { hook: 'Stop rounding your back' },
      shotList: [{ angle: 'side' }],
      publishDueAt: '2026-07-15T12:00:00.000Z',
    });

    expect(payload).toMatchObject({
      title: 'Hip hinge YouTube demo',
      status: 'idea',
      sourceType: 'coverage_gap',
      sourceId: 'exercise-123',
      priority: 'normal',
      scriptDraft: { hook: 'Stop rounding your back' },
      shotList: [{ angle: 'side' }],
      editingHandoff: {},
      youtubePackage: {},
      assets: [],
      metadata: {},
    });
    expect(payload.publishDueAt).toBeInstanceOf(Date);
  });

  it('rejects invalid workflow status and unstructured payload fields', () => {
    expect(() => sanitizeContentProjectPayload({ title: 'Demo', status: 'made_up' }))
      .toThrow(ContentProjectValidationError);
    expect(() => sanitizeContentProjectPayload({ title: 'Demo', shotList: 'not-json' }))
      .toThrow(ContentProjectValidationError);
    expect(() => sanitizeContentProjectPayload({ title: 'Demo', scriptDraft: [] }))
      .toThrow('scriptDraft must be structured data.');
    expect(() => sanitizeContentProjectPayload({ title: 'Demo', assets: { url: 'clip.mp4' } }))
      .toThrow('assets must be a list.');
    expect(() => sanitizeContentProjectPayload({ title: 'x'.repeat(181) }))
      .toThrow('title must be 180 characters or fewer.');
    expect(() => sanitizeContentProjectPayload({ title: '   ' }, { partial: true }))
      .toThrow('title is required.');
  });

  it('creates projects with actor attribution and serialized output', async () => {
    const createdRow = {
      toJSON: () => ({ id: 'project-1', title: 'Demo', status: 'idea', sourceType: 'manual', priority: 'normal' }),
    };
    const ContentProject = { create: vi.fn().mockResolvedValue(createdRow) };

    const project = await createContentProject(ContentProject, { title: 'Demo' }, 7);

    expect(ContentProject.create).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Demo',
      createdBy: 7,
      updatedBy: 7,
    }));
    expect(project).toMatchObject({ id: 'project-1', title: 'Demo', status: 'idea' });
  });

  it('patches existing projects and rejects empty updates', async () => {
    const row = {
      update: vi.fn(async function applyPatch(payload) { Object.assign(this.data, payload); }),
      data: { id: 'project-1', title: 'Demo', status: 'idea', sourceType: 'manual', priority: 'normal' },
      toJSON() { return this.data; },
    };
    const ContentProject = { findByPk: vi.fn().mockResolvedValue(row) };

    const updated = await updateContentProject(ContentProject, 'project-1', { status: 'script' }, 9);

    expect(row.update).toHaveBeenCalledWith({ status: 'script', updatedBy: 9 });
    expect(updated.status).toBe('script');
    await expect(updateContentProject(ContentProject, 'project-1', {}, 9)).rejects.toThrow(ContentProjectValidationError);
  });
});