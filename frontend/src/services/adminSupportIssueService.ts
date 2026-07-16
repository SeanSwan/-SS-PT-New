/**
 * FILE: adminSupportIssueService.ts
 * PURPOSE: Typed client for the fail-closed owner Report Room inbox.
 * SECURITY: Every server route is additionally guarded by requireSupportOwner.
 */
import { authAxiosInstance } from '../utils/axiosConfig';
import type {
  SupportIssue,
  SupportIssueCategory,
  SupportIssueEvent,
  SupportIssueSeverity,
  SupportIssueSource,
  SupportIssueStatus,
} from './supportIssueService';

export interface OwnerSupportIssue extends SupportIssue {
  reporterUserId: number;
  assignedOwnerUserId?: number | null;
  duplicateOfIssueId?: string | null;
  duplicateOfReferenceCode?: string;
  events?: SupportIssueEvent[];
}

export interface OwnerIssueQuery {
  status?: SupportIssueStatus;
  severity?: SupportIssueSeverity;
  category?: SupportIssueCategory;
  source?: SupportIssueSource;
  search?: string;
  assignedOwnerUserId?: number | 'unassigned';
  page?: number;
  pageSize?: number;
}

export interface OwnerIssueChanges {
  status?: SupportIssueStatus;
  severity?: SupportIssueSeverity;
  assignedOwnerUserId?: number | null;
  duplicateOfIssueId?: string | null;
  duplicateOfReferenceCode?: string;
  resolutionSummary?: string | null;
}

interface OwnerIssuePage {
  issues: OwnerSupportIssue[];
  pagination: { page: number; pageSize: number; total: number; pages: number };
}

interface RepairPrompt { referenceCode: string; prompt: string }

type AdminSupportApi = {
  get<T = unknown>(url: string, config?: unknown): Promise<{ data: T }>;
  post<T = unknown>(url: string, data?: unknown): Promise<{ data: T }>;
  patch<T = unknown>(url: string, data?: unknown): Promise<{ data: T }>;
};

export interface AdminSupportIssueClient {
  listIssues(query?: OwnerIssueQuery): Promise<OwnerIssuePage>;
  getIssue(issueId: string): Promise<OwnerSupportIssue>;
  updateIssue(issueId: string, changes: OwnerIssueChanges): Promise<OwnerSupportIssue>;
  addNote(issueId: string, body: string): Promise<SupportIssueEvent>;
  addReply(issueId: string, body: string): Promise<SupportIssueEvent>;
  getRepairPrompt(issueId: string): Promise<RepairPrompt>;
}

function safeMessage(error: unknown): string {
  const candidate = error as { response?: { data?: { message?: unknown } }; message?: unknown };
  const message = candidate?.response?.data?.message ?? candidate?.message;
  return typeof message === 'string' && message.trim()
    ? message.trim()
    : 'The private support inbox could not complete the request.';
}

export function createAdminSupportIssueClient(
  api: AdminSupportApi = authAxiosInstance,
): AdminSupportIssueClient {
  const encoded = (issueId: string) => encodeURIComponent(issueId);
  const wrap = async <T>(operation: () => Promise<T>): Promise<T> => {
    try { return await operation(); } catch (error) { throw new Error(safeMessage(error)); }
  };

  return {
    listIssues(query = {}) {
      return wrap(async () => {
        const response = await api.get<OwnerIssuePage>('/api/admin/support/issues', { params: query });
        return response.data;
      });
    },
    getIssue(issueId) {
      return wrap(async () => {
        const response = await api.get<{ issue: OwnerSupportIssue }>(`/api/admin/support/issues/${encoded(issueId)}`);
        return response.data.issue;
      });
    },
    updateIssue(issueId, changes) {
      return wrap(async () => {
        const response = await api.patch<{ issue: OwnerSupportIssue }>(`/api/admin/support/issues/${encoded(issueId)}`, changes);
        return response.data.issue;
      });
    },
    addNote(issueId, body) {
      return wrap(async () => {
        const response = await api.post<{ event: SupportIssueEvent }>(`/api/admin/support/issues/${encoded(issueId)}/notes`, { body });
        return response.data.event;
      });
    },
    addReply(issueId, body) {
      return wrap(async () => {
        const response = await api.post<{ event: SupportIssueEvent }>(`/api/admin/support/issues/${encoded(issueId)}/replies`, { body });
        return response.data.event;
      });
    },
    getRepairPrompt(issueId) {
      return wrap(async () => {
        const response = await api.get<RepairPrompt>(`/api/admin/support/issues/${encoded(issueId)}/repair-prompt`);
        return response.data;
      });
    },
  };
}

export const adminSupportIssueClient = createAdminSupportIssueClient();
