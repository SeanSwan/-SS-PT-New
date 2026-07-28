/**
 * Content Studio project API client.
 * Keeps the creator workflow queue on the authenticated admin transport and
 * normalizes backend payloads defensively without inventing placeholder data.
 */

import { useCallback, useEffect, useState } from 'react';
import type { AxiosInstance } from 'axios';

export const CONTENT_PROJECT_STATUSES = [
  'idea',
  'script',
  'shot_list',
  'scheduled',
  'filmed',
  'editing',
  'qa',
  'youtube_ready',
  'uploaded',
] as const;

export type ContentProjectStatus = typeof CONTENT_PROJECT_STATUSES[number];

export interface ContentStudioProject {
  id: string;
  title: string;
  status: ContentProjectStatus;
  sourceType: string;
  sourceId: string | null;
  priority: 'low' | 'normal' | 'high';
  scriptDraft: Record<string, unknown>;
  shotList: unknown[];
  editingHandoff: Record<string, unknown>;
  youtubePackage: Record<string, unknown>;
  assets: unknown[];
  metadata: Record<string, unknown>;
  publishDueAt: string | null;
  updatedAt: string | null;
}

export interface CreateContentStudioProjectInput {
  title: string;
  status?: ContentProjectStatus;
  sourceType?: string;
  sourceId?: string | null;
}

type ContentStudioProjectApi = Pick<AxiosInstance, 'get' | 'post' | 'patch'>;

const PROJECTS_PATH = '/api/content-studio/projects';
const STATUS_SET = new Set<string>(CONTENT_PROJECT_STATUSES);

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
);

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export function normalizeContentStudioProject(raw: unknown): ContentStudioProject | null {
  const row = asRecord(raw);
  const id = typeof row.id === 'string' ? row.id : '';
  const title = typeof row.title === 'string' ? row.title.trim() : '';
  if (!id || !title) return null;

  const status = typeof row.status === 'string' && STATUS_SET.has(row.status)
    ? row.status as ContentProjectStatus
    : 'idea';

  const priority = row.priority === 'low' || row.priority === 'high' ? row.priority : 'normal';

  return {
    id,
    title,
    status,
    sourceType: typeof row.sourceType === 'string' ? row.sourceType : 'manual',
    sourceId: typeof row.sourceId === 'string' ? row.sourceId : null,
    priority,
    scriptDraft: asRecord(row.scriptDraft),
    shotList: asArray(row.shotList),
    editingHandoff: asRecord(row.editingHandoff),
    youtubePackage: asRecord(row.youtubePackage),
    assets: asArray(row.assets),
    metadata: asRecord(row.metadata),
    publishDueAt: typeof row.publishDueAt === 'string' ? row.publishDueAt : null,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null,
  };
}

export function normalizeContentStudioProjectList(raw: unknown): ContentStudioProject[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeContentStudioProject).filter(Boolean) as ContentStudioProject[];
}

const extractData = (response: unknown): Record<string, unknown> => {
  const body = asRecord((response as { data?: unknown })?.data);
  if (body.success === false) throw new Error(typeof body.message === 'string' ? body.message : 'Content Studio request failed.');
  return asRecord(body.data);
};

export async function fetchContentStudioProjects(api: ContentStudioProjectApi): Promise<ContentStudioProject[]> {
  const data = extractData(await api.get(PROJECTS_PATH));
  return normalizeContentStudioProjectList(data.projects);
}

export async function createContentStudioProject(
  api: ContentStudioProjectApi,
  input: CreateContentStudioProjectInput,
): Promise<ContentStudioProject> {
  const data = extractData(await api.post(PROJECTS_PATH, input));
  const project = normalizeContentStudioProject(data.project);
  if (!project) throw new Error('Content Studio returned an invalid project.');
  return project;
}

export async function patchContentStudioProject(
  api: ContentStudioProjectApi,
  id: string,
  input: Partial<CreateContentStudioProjectInput>,
): Promise<ContentStudioProject> {
  const data = extractData(await api.patch(`${PROJECTS_PATH}/${encodeURIComponent(id)}`, input));
  const project = normalizeContentStudioProject(data.project);
  if (!project) throw new Error('Content Studio returned an invalid project.');
  return project;
}

export function getNextProjectStatus(status: ContentProjectStatus): ContentProjectStatus | null {
  const index = CONTENT_PROJECT_STATUSES.indexOf(status);
  return index >= 0 && index < CONTENT_PROJECT_STATUSES.length - 1 ? CONTENT_PROJECT_STATUSES[index + 1] : null;
}

const toSafeError = (err: unknown, fallback: string) => {
  const maybe = err as { response?: { data?: { message?: unknown } }; message?: unknown };
  const message = maybe.response?.data?.message ?? maybe.message;
  return typeof message === 'string' && message.length <= 180 ? message : fallback;
};

export function useContentStudioProjects(api: ContentStudioProjectApi) {
  const [projects, setProjects] = useState<ContentStudioProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setProjects(await fetchContentStudioProjects(api));
    } catch (err) {
      setError(toSafeError(err, 'Unable to load Content Studio projects.'));
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  const createProject = useCallback(async (input: CreateContentStudioProjectInput) => {
    setIsMutating(true);
    setError(null);
    try {
      const project = await createContentStudioProject(api, input);
      setProjects(prev => [project, ...prev.filter(item => item.id !== project.id)]);
      return project;
    } catch (err) {
      setError(toSafeError(err, 'Unable to create the project.'));
      throw err;
    } finally {
      setIsMutating(false);
    }
  }, [api]);

  const updateProject = useCallback(async (id: string, input: Partial<CreateContentStudioProjectInput>) => {
    setIsMutating(true);
    setError(null);
    try {
      const project = await patchContentStudioProject(api, id, input);
      setProjects(prev => prev.map(item => (item.id === project.id ? project : item)));
      return project;
    } catch (err) {
      setError(toSafeError(err, 'Unable to update the project.'));
      throw err;
    } finally {
      setIsMutating(false);
    }
  }, [api]);

  return { projects, isLoading, isMutating, error, refreshProjects, createProject, updateProject };
}