import type { AxiosRequestConfig } from 'axios';
import apiService from '../../../services/api.service';
import { MESSAGING_ERROR_MESSAGES } from './messagingSafeErrors';

const API_BASE = '/api/messaging';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const isCancellationError = (error: unknown): boolean => {
  if (!isRecord(error)) return false;
  return (
    error.name === 'AbortError' ||
    error.name === 'CanceledError' ||
    error.code === 'ERR_CANCELED'
  );
};

const parseRequestBody = (body: RequestInit['body'] | undefined): unknown => {
  if (body == null) return undefined;
  if (typeof body !== 'string') return body;
  if (!body.trim()) return undefined;

  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

const toAxiosConfig = (opts?: RequestInit): AxiosRequestConfig => {
  const config: AxiosRequestConfig = {};
  if (opts?.signal) config.signal = opts.signal;
  if (opts?.headers) config.headers = opts.headers as AxiosRequestConfig['headers'];
  return config;
};

export async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const method = (opts?.method ?? 'GET').toUpperCase();
  const config = toAxiosConfig(opts);
  const body = parseRequestBody(opts?.body);

  try {
    if (method === 'POST') return (await apiService.post<T>(url, body, config)).data;
    if (method === 'PUT') return (await apiService.put<T>(url, body, config)).data;
    if (method === 'PATCH') return (await apiService.patch<T>(url, body, config)).data;
    if (method === 'DELETE') return (await apiService.delete<T>(url, config)).data;
    return (await apiService.get<T>(url, config)).data;
  } catch (error) {
    if (isCancellationError(error)) throw error;
    throw new Error(MESSAGING_ERROR_MESSAGES.request);
  }
}
