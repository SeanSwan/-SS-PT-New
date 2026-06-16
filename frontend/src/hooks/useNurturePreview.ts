/**
 * useNurturePreview Hook
 * ======================
 * READ-ONLY operator data for the nurture cockpit. Consumes only the admin GET
 * endpoints SESSION-B shipped — `GET /api/automation/preview` (dry-run audience,
 * PII-safe: presence booleans, never the phone number) and
 * `GET /api/automation/templates/preview` (rendered SMS copy for review).
 *
 * This hook NEVER sends or mutates anything — no test-send, no process. It is the
 * safe "what WOULD happen if armed" view that precedes arming
 * SWAN_AUTOMATION_CRON_ENABLED.
 *
 * The preview shape is owned by automationService.previewScheduledMessages (a lane
 * SESSION-B is actively evolving), so consumers should render it defensively.
 */

import { useCallback, useEffect, useState } from 'react';
import apiService from '../services/api.service';

export type NurturePreviewAction = 'send' | 'defer' | 'cancel' | 'fail';

export interface NurturePreviewItem {
  id: number;
  userId: number | null;
  leadId: number | null;
  recipientKind: 'user' | 'lead' | 'none';
  channel: string;
  templateName: string | null;
  action: NurturePreviewAction;
  reason: string;
  hasPhone: boolean;
  suppressed: boolean;
}

export interface NurturePreviewSummary {
  wouldSend: number;
  wouldDefer: number;
  wouldCancel: number;
  wouldFail: number;
}

export interface NurturePreview {
  dryRun: boolean;
  total: number;
  summary: NurturePreviewSummary;
  byReason: Record<string, number>;
  items: NurturePreviewItem[];
}

export interface SmsTemplatePreview {
  name: string;
  message: string;
}

const EMPTY_PREVIEW: NurturePreview = {
  dryRun: true,
  total: 0,
  summary: { wouldSend: 0, wouldDefer: 0, wouldCancel: 0, wouldFail: 0 },
  byReason: {},
  items: [],
};

/** Normalize the dry-run payload defensively (the backend shape may evolve). */
export function normalizePreview(raw: any): NurturePreview {
  if (!raw || typeof raw !== 'object') return EMPTY_PREVIEW;
  const s = raw.summary || {};
  return {
    dryRun: raw.dryRun !== false,
    total: Number(raw.total) || (Array.isArray(raw.items) ? raw.items.length : 0),
    summary: {
      wouldSend: Number(s.wouldSend) || 0,
      wouldDefer: Number(s.wouldDefer) || 0,
      wouldCancel: Number(s.wouldCancel) || 0,
      wouldFail: Number(s.wouldFail) || 0,
    },
    byReason: raw.byReason && typeof raw.byReason === 'object' ? raw.byReason : {},
    items: Array.isArray(raw.items) ? raw.items : [],
  };
}

/** Normalize template preview to a flat {name, message}[] (array OR keyed object). */
export function normalizeTemplates(raw: any): SmsTemplatePreview[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((t: any) => ({
      name: String(t?.name ?? t?.template ?? ''),
      message: String(t?.message ?? t?.rendered ?? t?.body ?? ''),
    })).filter((t) => t.name);
  }
  if (typeof raw === 'object') {
    return Object.entries(raw).map(([name, v]: [string, any]) => ({
      name,
      message: typeof v === 'string' ? v : String(v?.message ?? v?.rendered ?? ''),
    }));
  }
  return [];
}

interface UseNurturePreviewResult {
  preview: NurturePreview;
  templates: SmsTemplatePreview[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useNurturePreview = (): UseNurturePreviewResult => {
  const [preview, setPreview] = useState<NurturePreview>(EMPTY_PREVIEW);
  const [templates, setTemplates] = useState<SmsTemplatePreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [previewRes, templatesRes] = await Promise.allSettled([
        apiService.get('/api/automation/preview'),
        apiService.get('/api/automation/templates/preview'),
      ]);

      if (previewRes.status === 'fulfilled') {
        const result = previewRes.value.data;
        if (result?.success === false) {
          setError(result?.message || 'Failed to load nurture preview');
        } else {
          setPreview(normalizePreview(result?.data));
        }
      } else {
        setError(previewRes.reason?.response?.data?.message || 'Network error loading nurture preview');
      }

      // Templates are secondary — a failure here must not blank the cockpit.
      if (templatesRes.status === 'fulfilled' && templatesRes.value.data?.success !== false) {
        setTemplates(normalizeTemplates(templatesRes.value.data?.data));
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Network error loading nurture preview');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  return { preview, templates, isLoading, error, refetch: fetchPreview };
};

export default useNurturePreview;
