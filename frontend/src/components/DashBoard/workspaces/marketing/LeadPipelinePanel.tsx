/**
 * FILE: LeadPipelinePanel.tsx
 * BLUEPRINT: Revenue-focused, ACTIONABLE lead queue for the Marketing command center.
 * DATA: /api/leads, /api/leads/stats, PUT /api/leads/:id. Admin/trainer RBAC.
 * B1: work a lead WITHOUT leaving the panel — change status, set a follow-up date,
 * email or call in one click. Optimistic updates with revert-on-error. Styles live
 * in LeadPipelinePanel.styles.ts (rule 4).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Target, Users, Mail, Phone } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import {
  MarketingCard, CardHeader, HeaderLeft, IconWrap, CardTitle, CardSubtitle,
  DataTable, EmptyState, ActionButton,
} from './marketing.styles';
import {
  Stack, StatsGrid, StatValue, StatLabel, TableScroll, ContactBlock, ContactName,
  ContactMeta, ScoreText, ErrorText, StatusSelect, RowActions, IconLink, FollowupInput, RowError,
} from './LeadPipelinePanel.styles';
import type { LeadStatus } from './LeadPipelinePanel.styles';

const STATUS_OPTIONS: LeadStatus[] = ['new', 'contacted', 'qualified', 'scheduled', 'converted', 'lost'];

interface LeadRecord {
  id: number | string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source?: string;
  status?: LeadStatus;
  score?: number;
  goals?: string;
  nextFollowUpAt?: string | null;
  createdAt?: string;
}

interface LeadStats { total: number; new: number; hotLeads: number; needsFollowUp: number; conversionRate: number; }
const DEFAULT_STATS: LeadStats = { total: 0, new: 0, hotLeads: 0, needsFollowUp: 0, conversionRate: 0 };

const formatSource = (source?: string) =>
  source ? source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Unknown';

const getLeadName = (lead: LeadRecord) =>
  [lead.firstName, lead.lastName].filter(Boolean).join(' ').trim() || `Lead #${lead.id}`;

// <input type="date"> wants YYYY-MM-DD
const toDateInput = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

const LeadPipelinePanel: React.FC = () => {
  const { authAxios } = useAuth();
  const [stats, setStats] = useState<LeadStats>(DEFAULT_STATS);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<LeadRecord['id'] | null>(null);
  const [rowError, setRowError] = useState<{ id: LeadRecord['id']; msg: string } | null>(null);

  const fetchLeadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, leadsRes] = await Promise.all([
        authAxios.get('/api/leads/stats'),
        authAxios.get('/api/leads?limit=8&sortBy=createdAt&sortOrder=DESC'),
      ]);
      setStats({ ...DEFAULT_STATS, ...(statsRes.data?.stats || {}) });
      setLeads(Array.isArray(leadsRes.data?.leads) ? leadsRes.data.leads : []);
    } catch {
      setError('Lead pipeline is unavailable from this session.');
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => { fetchLeadData(); }, [fetchLeadData]);

  const updateLead = useCallback(async (id: LeadRecord['id'], patch: Partial<LeadRecord>) => {
    setSavingId(id);
    setRowError(null);
    const before = leads;
    setLeads((cur) => cur.map((l) => (l.id === id ? { ...l, ...patch } : l))); // optimistic
    try {
      await authAxios.put(`/api/leads/${id}`, patch);
    } catch {
      setLeads(before); // revert on failure
      setRowError({ id, msg: 'Could not save — try again.' });
    } finally {
      setSavingId(null);
    }
  }, [leads, authAxios]);

  return (
    <Stack>
      <StatsGrid>
        <MarketingCard><StatValue>{stats.total}</StatValue><StatLabel>Total leads</StatLabel></MarketingCard>
        <MarketingCard><StatValue>{stats.new}</StatValue><StatLabel>New leads</StatLabel></MarketingCard>
        <MarketingCard><StatValue $tone="gold">{stats.hotLeads}</StatValue><StatLabel>Hot leads</StatLabel></MarketingCard>
        <MarketingCard><StatValue $tone="purple">{stats.needsFollowUp}</StatValue><StatLabel>Follow-ups due</StatLabel></MarketingCard>
      </StatsGrid>

      <MarketingCard>
        <CardHeader>
          <HeaderLeft>
            <IconWrap><Target size={18} /></IconWrap>
            <div>
              <CardTitle>Lead Pipeline</CardTitle>
              <CardSubtitle>Work your leads here — change status, set a follow-up, email or call in one click</CardSubtitle>
            </div>
          </HeaderLeft>
          <ActionButton type="button" $variant="secondary" onClick={fetchLeadData} disabled={loading}>
            <RefreshCw size={14} />
            Refresh
          </ActionButton>
        </CardHeader>

        {error ? (
          <ErrorText>{error}</ErrorText>
        ) : loading && leads.length === 0 ? (
          <EmptyState><RefreshCw size={28} />Loading leads...</EmptyState>
        ) : leads.length === 0 ? (
          <EmptyState><Users size={28} />No leads found for the current filters.</EmptyState>
        ) : (
          <TableScroll>
            <DataTable>
              <thead>
                <tr><th>Contact</th><th>Source</th><th>Status</th><th>Score</th><th>Next follow-up</th><th>Reach out</th></tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const status = lead.status || 'new';
                  const score = lead.score || 0;
                  const saving = savingId === lead.id;
                  return (
                    <tr key={lead.id}>
                      <td>
                        <ContactBlock>
                          <ContactName>{getLeadName(lead)}</ContactName>
                          <ContactMeta>{lead.email || 'No email on file'}</ContactMeta>
                          {rowError?.id === lead.id && <RowError role="alert">{rowError.msg}</RowError>}
                        </ContactBlock>
                      </td>
                      <td>{formatSource(lead.source)}</td>
                      <td>
                        <StatusSelect
                          $status={status}
                          value={status}
                          disabled={saving}
                          aria-label={`Status for ${getLeadName(lead)}`}
                          onChange={(e) => updateLead(lead.id, { status: e.target.value as LeadStatus })}
                        >
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </StatusSelect>
                      </td>
                      <td><ScoreText $hot={score >= 70}>{score}</ScoreText></td>
                      <td>
                        <FollowupInput
                          type="date"
                          value={toDateInput(lead.nextFollowUpAt)}
                          disabled={saving}
                          aria-label={`Set follow-up date for ${getLeadName(lead)}`}
                          onChange={(e) => updateLead(lead.id, { nextFollowUpAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                        />
                      </td>
                      <td>
                        <RowActions>
                          <IconLink href={lead.email ? `mailto:${lead.email}` : undefined} aria-disabled={!lead.email} aria-label={`Email ${getLeadName(lead)}`} title="Email">
                            <Mail size={16} />
                          </IconLink>
                          <IconLink href={lead.phone ? `tel:${lead.phone}` : undefined} aria-disabled={!lead.phone} aria-label={`Call ${getLeadName(lead)}`} title="Call">
                            <Phone size={16} />
                          </IconLink>
                        </RowActions>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          </TableScroll>
        )}
      </MarketingCard>
    </Stack>
  );
};

export default LeadPipelinePanel;
