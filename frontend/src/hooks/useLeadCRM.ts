/**
 * useLeadCRM Hook
 * ===============
 * Data fetching and state management for the CRM Lead Management Dashboard.
 * Connects to /api/leads endpoints with RBAC awareness.
 */
import { useState, useEffect, useCallback } from 'react';

export const PIPELINE_STAGES = ['new', 'contacted', 'qualified', 'scheduled', 'converted', 'lost'] as const;
export type PipelineStage = typeof PIPELINE_STAGES[number];
export type LeadSource = 'gallery' | 'walk_in' | 'website' | 'referral' | 'social_media' | 'other';

export interface LeadActivity {
  id: number;
  leadId: number;
  type: string;
  description: string;
  metadata?: Record<string, unknown>;
  performedByUserId?: number;
  createdAt: string;
}

export interface Lead {
  id: number;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source: LeadSource;
  sourceDetail?: string;
  status: PipelineStage;
  score: number;
  spiritName?: string;
  notes?: string;
  goals?: string;
  tags?: string[];
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  contactCount: number;
  contactedAt?: string;
  qualifiedAt?: string;
  scheduledAt?: string;
  convertedAt?: string;
  lostAt?: string;
  lostReason?: string;
  assignedTrainerId?: number;
  activities?: LeadActivity[];
  createdAt: string;
  updatedAt: string;
}

export interface LeadStats {
  totalLeads: number;
  conversionRate: number;
  hotLeads: number;
  needsFollowUp: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
}

const API_BASE = '/api/leads';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const useLeadCRM = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(API_BASE, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`Failed to fetch leads (${res.status})`);
      const data = await res.json();
      setLeads(data.leads || data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load leads';
      setError(msg);
      console.error('[useLeadCRM] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setStats(data.stats || data);
    } catch {
      // Stats are supplementary — don't fail the UI
    }
  }, []);

  const refetch = useCallback(() => {
    fetchLeads();
    fetchStats();
  }, [fetchLeads, fetchStats]);

  useEffect(() => { refetch(); }, [refetch]);

  const createLead = useCallback(async (data: Record<string, unknown>) => {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create lead');
    }
    const result = await res.json();
    refetch();
    return result;
  }, [refetch]);

  const updateLead = useCallback(async (id: number, data: Partial<Lead> | Record<string, unknown>) => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update lead');
    }
    const result = await res.json();
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } as Lead : l));
    fetchStats();
    return result;
  }, [fetchStats]);

  const deleteLead = useCallback(async (id: number) => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete lead');
    setLeads(prev => prev.filter(l => l.id !== id));
    fetchStats();
  }, [fetchStats]);

  const addActivity = useCallback(async (leadId: number, data: { type: string; description: string; title?: string; metadata?: Record<string, unknown> }) => {
    // API requires title — default to description if not provided
    const payload = { ...data, title: data.title || data.description };
    const res = await fetch(`${API_BASE}/${leadId}/activity`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
    // Refetch the lead to get updated activities
    fetchLeads();
  }, [fetchLeads]);

  return {
    leads,
    stats,
    loading,
    error,
    createLead,
    updateLead,
    deleteLead,
    addActivity,
    refetch,
  };
};

export default useLeadCRM;
