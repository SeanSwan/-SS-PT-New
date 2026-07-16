/**
 * FILE: supportIssueService.ts
 * PURPOSE: Typed, authenticated client for the reporter-facing Report Room API.
 * SECURITY: The server derives reporter identity from the authenticated session;
 *           this client never sends a user id or raw browser storage.
 */
import { authAxiosInstance } from '../utils/axiosConfig';

export type SupportIssueCategory =
  | 'bug' | 'error' | 'access' | 'billing' | 'workout'
  | 'account' | 'performance' | 'usability' | 'content' | 'other';
export type SupportIssueSeverity = 'critical' | 'high' | 'medium' | 'low';
export type SupportIssueStatus =
  | 'new' | 'triaged' | 'in_progress' | 'waiting_on_reporter'
  | 'resolved' | 'closed' | 'duplicate';
export type SupportIssueSource = 'text' | 'voice' | 'swan_coach' | 'error_boundary';

export interface SupportIssue {
  id: string;
  referenceCode: string;
  category: SupportIssueCategory;
  severity: SupportIssueSeverity;
  status: SupportIssueStatus;
  source: SupportIssueSource;
  title: string;
  description: string;
  expectedBehavior?: string | null;
  impact?: string | null;
  reproductionSteps: string[];
  diagnostics: Record<string, unknown>;
  resolutionSummary?: string | null;
  lastActivityAt: string;
  firstResponseAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  events?: SupportIssueEvent[];
}

export interface SupportIssueEvent {
  id: string | number;
  eventType: string;
  visibility: 'reporter' | 'owner';
  body?: string | null;
  createdAt: string;
}

export interface CreateSupportIssueRequest {
  clientRequestId: string;
  category: SupportIssueCategory;
  severity: SupportIssueSeverity;
  source: SupportIssueSource;
  title: string;
  description: string;
  expectedBehavior: string;
  impact: string;
  reproductionSteps: string[];
  diagnostics: Record<string, unknown>;
}

export interface SupportIssuePage {
  issues: SupportIssue[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

type SupportApi = {
  get<T = unknown>(url: string, config?: unknown): Promise<{ data: T }>;
  post<T = unknown>(url: string, data?: unknown): Promise<{ data: T }>;
};

export interface SupportIssueClient {
  createIssue(request: CreateSupportIssueRequest): Promise<SupportIssue>;
  listIssues(query?: { page?: number; pageSize?: number }): Promise<SupportIssuePage>;
  getIssue(issueId: string): Promise<SupportIssue>;
  addReply(issueId: string, body: string): Promise<SupportIssueEvent>;
}

function safeMessage(error: unknown): string {
  const candidate = error as { response?: { data?: { message?: unknown } }; message?: unknown };
  const serverMessage = candidate?.response?.data?.message;
  if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage.trim();
  if (typeof candidate?.message === 'string' && candidate.message.trim()) return candidate.message.trim();
  return 'The support request could not be completed.';
}

export function createSupportIssueClient(api: SupportApi = authAxiosInstance): SupportIssueClient {
  return {
    async createIssue(request) {
      try {
        const response = await api.post<{ issue: SupportIssue }>('/api/support/issues', request);
        return response.data.issue;
      } catch (error) {
        throw new Error(safeMessage(error));
      }
    },
    async listIssues(query = {}) {
      try {
        const params = { page: query.page ?? 1, pageSize: query.pageSize ?? 20 };
        const response = await api.get<SupportIssuePage>('/api/support/issues', { params });
        return { issues: response.data.issues, pagination: response.data.pagination };
      } catch (error) {
        throw new Error(safeMessage(error));
      }
    },
    async getIssue(issueId) {
      try {
        const response = await api.get<{ issue: SupportIssue }>(`/api/support/issues/${encodeURIComponent(issueId)}`);
        return response.data.issue;
      } catch (error) {
        throw new Error(safeMessage(error));
      }
    },
    async addReply(issueId, body) {
      try {
        const response = await api.post<{ event: SupportIssueEvent }>(
          `/api/support/issues/${encodeURIComponent(issueId)}/replies`,
          { body },
        );
        return response.data.event;
      } catch (error) {
        throw new Error(safeMessage(error));
      }
    },
  };
}

export const supportIssueClient = createSupportIssueClient();
