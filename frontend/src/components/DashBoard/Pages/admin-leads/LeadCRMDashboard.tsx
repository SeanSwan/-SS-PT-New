/**
 * Lead CRM Dashboard
 * ==================
 * Glassmorphic Kanban board (desktop) / Vertical accordion (mobile)
 * for managing leads from all sources: gallery, walk-in, website, referral.
 *
 * Gemini 3.1 Pro design specs applied:
 *   - Galaxy-Swan theme tokens
 *   - Lead source color coding (Gallery=Purple, Walk-in=Cyan, Web=Silver, Referral=Pink)
 *   - 44px minimum touch targets
 *   - Glass blur backgrounds with cosmic depth
 *   - Hot lead scoring glow (90+ pulsing cyan)
 */
import React, { useState, useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Target, Plus, Search, Filter, Phone, Mail,
  Calendar, ChevronDown, ChevronRight, User, X,
  AlertCircle, TrendingUp, Users, UserCheck,
  Clock, ArrowRight, MoreVertical, Edit3, Trash2,
  Star, MessageSquare,
} from 'lucide-react';
import useLeadCRM, { type Lead, type LeadStats, PIPELINE_STAGES } from '../../../../hooks/useLeadCRM';

// ── Source color mapping (Gemini spec) ──
const SOURCE_COLORS: Record<string, string> = {
  gallery: '#7851A9',      // Cosmic Purple
  walk_in: '#00FFFF',      // Swan Cyan
  website: '#E2E8F0',      // Starlight Silver
  referral: '#FF69B4',     // Nebula Pink
  social_media: '#38B2AC', // Teal
  other: '#A0AEC0',        // Gray
};

const SOURCE_LABELS: Record<string, string> = {
  gallery: 'Gallery',
  walk_in: 'Walk-in',
  website: 'Website',
  referral: 'Referral',
  social_media: 'Social',
  other: 'Other',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  scheduled: 'Scheduled',
  converted: 'Converted',
  lost: 'Lost',
};

// ── Animations ──
const hotLeadPulse = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(0, 255, 255, 0.3); }
  50% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.6), 0 0 40px rgba(0, 255, 255, 0.15); }
`;

const slideIn = keyframes`
  from { opacity: 0; transform: translateX(100%); }
  to { opacity: 1; transform: translateX(0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ── Styled Components ──

const Container = styled.div`
  width: 100%;
  min-height: 100%;
  animation: ${fadeIn} 0.4s ease;
`;

const KPIRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
`;

const KPICard = styled.div<{ $accent?: string }>`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 18px;
  backdrop-filter: blur(8px);

  .kpi-label {
    color: #A0AEC0;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }

  .kpi-value {
    color: ${p => p.$accent || '#FFFFFF'};
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .kpi-sub {
    color: #718096;
    font-size: 12px;
    margin-top: 4px;
  }
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchInput = styled.div`
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 10px 14px;
  color: #E0ECF4;
  font-size: 14px;

  input {
    background: transparent;
    border: none;
    outline: none;
    color: #E0ECF4;
    font-size: 14px;
    width: 100%;
    &::placeholder { color: #4A5568; }
  }

  &:focus-within {
    border-color: rgba(0, 255, 255, 0.3);
  }
`;

const AddLeadBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  min-height: 44px;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 10px;
  color: #00FFFF;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(0, 255, 255, 0.2);
    border-color: rgba(0, 255, 255, 0.5);
  }
`;

const FilterChips = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const FilterChip = styled.button<{ $active?: boolean; $color?: string }>`
  padding: 6px 14px;
  min-height: 36px;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid ${p => p.$active ? (p.$color || '#00FFFF') : 'rgba(255,255,255,0.08)'};
  background: ${p => p.$active ? `${p.$color || '#00FFFF'}22` : 'rgba(255,255,255,0.03)'};
  color: ${p => p.$active ? (p.$color || '#00FFFF') : '#A0AEC0'};

  &:hover {
    border-color: ${p => p.$color || '#00FFFF'};
    color: ${p => p.$color || '#00FFFF'};
  }
`;

// ── Desktop Kanban ──

const KanbanBoard = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  min-height: 500px;

  @media (max-width: 1279px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const KanbanColumn = styled.div<{ $status: string }>`
  background: rgba(255, 255, 255, 0.02);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  min-height: 400px;
  overflow: hidden;
`;

const ColumnHeader = styled.div<{ $status: string }>`
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;

  .col-title {
    font-size: 13px;
    font-weight: 600;
    color: #E0ECF4;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .col-count {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 2px 8px;
    font-size: 12px;
    color: #A0AEC0;
    font-weight: 600;
  }
`;

const ColumnBody = styled.div`
  flex: 1;
  padding: 8px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
`;

const LeadCardStyled = styled.div<{ $score: number; $sourceColor: string }>`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(8px);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  animation: ${fadeIn} 0.3s ease;
  ${p => p.$score >= 90 ? `animation: ${hotLeadPulse} 2.5s ease-in-out infinite;` : ''}

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 255, 255, 0.08);
    border-color: rgba(0, 255, 255, 0.3);
  }

  .lead-name {
    font-weight: 600;
    font-size: 15px;
    color: #FFFFFF;
    letter-spacing: -0.01em;
    margin-bottom: 6px;
  }

  .lead-contact {
    font-size: 12px;
    color: #718096;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .lead-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }
`;

const SourceBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: ${p => p.$color};
  background: ${p => p.$color}18;
  border: 1px solid ${p => p.$color}40;
`;

const ScoreBadge = styled.span<{ $score: number }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  color: ${p => p.$score >= 70 ? '#00FFFF' : p.$score >= 40 ? '#ECC94B' : '#A0AEC0'};
  background: ${p => p.$score >= 70 ? 'rgba(0,255,255,0.12)' : p.$score >= 40 ? 'rgba(236,201,75,0.12)' : 'rgba(160,174,192,0.08)'};
`;

// ── Mobile Accordion ──

const MobileAccordion = styled.div`
  display: none;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 768px) {
    display: flex;
  }
`;

const AccordionSection = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  overflow: hidden;
`;

const AccordionHeader = styled.button<{ $expanded: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  min-height: 48px;
  background: transparent;
  border: none;
  color: #E0ECF4;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;

  .acc-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .acc-count {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 2px 8px;
    font-size: 12px;
    color: #A0AEC0;
  }
`;

const AccordionContent = styled.div<{ $expanded: boolean }>`
  max-height: ${p => p.$expanded ? '2000px' : '0'};
  overflow: hidden;
  transition: max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  padding: ${p => p.$expanded ? '0 12px 12px' : '0 12px'};
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

// ── Lead Detail Drawer ──

const DrawerOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1300;
  animation: ${fadeIn} 0.2s ease;
`;

const DrawerPanel = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 480px;
  background: rgba(10, 10, 26, 0.95);
  backdrop-filter: blur(24px);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 1301;
  animation: ${slideIn} 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const DrawerHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    font-size: 18px;
    font-weight: 600;
    color: #FFFFFF;
    margin: 0;
  }
`;

const DrawerBody = styled.div`
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const DrawerCloseBtn = styled.button`
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: #A0AEC0;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover { background: rgba(255, 255, 255, 0.08); color: #E0ECF4; }
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #A0AEC0;

  svg { color: #4A5568; flex-shrink: 0; }
  a { color: #00FFFF; text-decoration: none; &:hover { text-decoration: underline; } }
`;

const StatusSelector = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const StatusBtn = styled.button<{ $active: boolean }>`
  padding: 8px 14px;
  min-height: 44px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid ${p => p.$active ? '#00FFFF' : 'rgba(255,255,255,0.08)'};
  background: ${p => p.$active ? 'rgba(0,255,255,0.15)' : 'rgba(255,255,255,0.03)'};
  color: ${p => p.$active ? '#00FFFF' : '#A0AEC0'};
  &:hover { border-color: rgba(0,255,255,0.4); }
`;

const NotesArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px;
  color: #E0ECF4;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;

  &:focus { outline: none; border-color: rgba(0, 255, 255, 0.3); }
  &::placeholder { color: #4A5568; }
`;

const ActionBtn = styled.button<{ $variant?: 'primary' | 'danger' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  min-height: 44px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid;
  width: 100%;

  ${p => p.$variant === 'primary' ? `
    background: #00FFFF;
    border-color: #00FFFF;
    color: #0a0a1a;
    &:hover { background: #00E5E5; }
  ` : p.$variant === 'danger' ? `
    background: rgba(245, 101, 101, 0.1);
    border-color: rgba(245, 101, 101, 0.3);
    color: #FC8181;
    &:hover { background: rgba(245, 101, 101, 0.2); }
  ` : `
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
    color: #E0ECF4;
    &:hover { background: rgba(255, 255, 255, 0.08); }
  `}
`;

// ── Add Lead Modal ──

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: ${fadeIn} 0.2s ease;
`;

const ModalPanel = styled.div`
  width: 100%;
  max-width: 480px;
  background: rgba(10, 10, 26, 0.95);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  padding: 28px;
  animation: ${fadeIn} 0.3s ease;
`;

const ModalTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #FFFFFF;
  margin: 0 0 20px;
`;

const FormField = styled.div`
  margin-bottom: 14px;

  label {
    display: block;
    font-size: 12px;
    color: #A0AEC0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }

  input, select {
    width: 100%;
    padding: 10px 14px;
    min-height: 44px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    color: #E0ECF4;
    font-size: 14px;
    font-family: inherit;

    &:focus { outline: none; border-color: rgba(0, 255, 255, 0.4); }
    &::placeholder { color: #4A5568; }

    option { background: #0a0a1a; }
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

const EmptyColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: #4A5568;
  font-size: 13px;
  text-align: center;

  svg { margin-bottom: 8px; opacity: 0.5; }
`;

const SectionLabel = styled.div`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #718096;
  font-weight: 600;
  margin-bottom: 6px;
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
`;

const ActivityItem = styled.div`
  font-size: 13px;
  color: #A0AEC0;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border-left: 3px solid rgba(0, 255, 255, 0.2);

  .activity-time {
    font-size: 11px;
    color: #4A5568;
    margin-top: 4px;
  }
`;

// ── LeadCard Component ──

const LeadCard: React.FC<{
  lead: Lead;
  onClick: () => void;
}> = ({ lead, onClick }) => (
  <LeadCardStyled
    $score={lead.score}
    $sourceColor={SOURCE_COLORS[lead.source] || SOURCE_COLORS.other}
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
  >
    <div className="lead-name">{lead.firstName} {lead.lastName || ''}</div>
    {lead.email && (
      <div className="lead-contact">
        <Mail size={12} /> {lead.email}
      </div>
    )}
    {lead.phone && (
      <div className="lead-contact">
        <Phone size={12} /> {lead.phone}
      </div>
    )}
    <div className="lead-meta">
      <SourceBadge $color={SOURCE_COLORS[lead.source] || SOURCE_COLORS.other}>
        {SOURCE_LABELS[lead.source] || lead.source}
      </SourceBadge>
      <ScoreBadge $score={lead.score}>{lead.score}</ScoreBadge>
    </div>
    {lead.nextFollowUpAt && (
      <div className="lead-contact" style={{ marginTop: 6 }}>
        <Clock size={12} /> Follow-up: {new Date(lead.nextFollowUpAt).toLocaleDateString()}
      </div>
    )}
  </LeadCardStyled>
);

// ── Main Component ──

const LeadCRMDashboard: React.FC = () => {
  const {
    leads, stats, loading, error,
    createLead, updateLead, deleteLead, addActivity,
    refetch,
  } = useLeadCRM();

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ new: true, contacted: true });

  // Filter leads by search and source
  const filteredLeads = useMemo(() => {
    let result = leads;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.firstName?.toLowerCase().includes(q) ||
        l.lastName?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.includes(q)
      );
    }
    if (sourceFilter) {
      result = result.filter(l => l.source === sourceFilter);
    }
    return result;
  }, [leads, search, sourceFilter]);

  // Group leads by status for Kanban
  const groupedLeads = useMemo(() => {
    const groups: Record<string, Lead[]> = {};
    PIPELINE_STAGES.forEach(s => { groups[s] = []; });
    filteredLeads.forEach(l => {
      if (groups[l.status]) groups[l.status].push(l);
    });
    return groups;
  }, [filteredLeads]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleStatusChange = useCallback(async (leadId: number, newStatus: string) => {
    await updateLead(leadId, { status: newStatus });
    if (selectedLead?.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
    }
  }, [updateLead, selectedLead]);

  return (
    <Container>
      {/* KPI Cards */}
      <KPIRow>
        <KPICard>
          <div className="kpi-label">Total Leads</div>
          <div className="kpi-value">{(stats as any)?.total ?? stats?.totalLeads ?? leads.length}</div>
          <div className="kpi-sub">All sources</div>
        </KPICard>
        <KPICard $accent="#00FFFF">
          <div className="kpi-label">Conversion Rate</div>
          <div className="kpi-value">{stats?.conversionRate ?? 0}%</div>
          <div className="kpi-sub">Leads → Clients</div>
        </KPICard>
        <KPICard $accent="#FF69B4">
          <div className="kpi-label">Hot Leads</div>
          <div className="kpi-value">{stats?.hotLeads ?? leads.filter(l => l.score >= 70).length}</div>
          <div className="kpi-sub">Score 70+</div>
        </KPICard>
        <KPICard $accent="#ECC94B">
          <div className="kpi-label">Needs Follow-up</div>
          <div className="kpi-value">{stats?.needsFollowUp ?? leads.filter(l => l.nextFollowUpAt && new Date(l.nextFollowUpAt) <= new Date()).length}</div>
          <div className="kpi-sub">Overdue contacts</div>
        </KPICard>
      </KPIRow>

      {/* Search + Add + Filters */}
      <TopBar>
        <SearchInput>
          <Search size={16} color="#4A5568" />
          <input
            type="text"
            placeholder="Search leads by name, email, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#718096', padding: 4 }}>
              <X size={14} />
            </button>
          )}
        </SearchInput>
        <AddLeadBtn onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Add Lead
        </AddLeadBtn>
      </TopBar>

      <FilterChips>
        <FilterChip $active={!sourceFilter} onClick={() => setSourceFilter(null)}>
          All Sources
        </FilterChip>
        {Object.entries(SOURCE_LABELS).map(([key, label]) => (
          <FilterChip
            key={key}
            $active={sourceFilter === key}
            $color={SOURCE_COLORS[key]}
            onClick={() => setSourceFilter(sourceFilter === key ? null : key)}
          >
            {label}
          </FilterChip>
        ))}
      </FilterChips>

      {/* Desktop Kanban Board */}
      <div style={{ marginTop: 20 }}>
        <KanbanBoard>
          {PIPELINE_STAGES.map(status => (
            <KanbanColumn key={status} $status={status}>
              <ColumnHeader $status={status}>
                <span className="col-title">{STATUS_LABELS[status]}</span>
                <span className="col-count">{groupedLeads[status]?.length || 0}</span>
              </ColumnHeader>
              <ColumnBody>
                {groupedLeads[status]?.length === 0 ? (
                  <EmptyColumn>
                    <Target size={20} />
                    No leads
                  </EmptyColumn>
                ) : (
                  groupedLeads[status]?.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => setSelectedLead(lead)}
                    />
                  ))
                )}
              </ColumnBody>
            </KanbanColumn>
          ))}
        </KanbanBoard>

        {/* Mobile Accordion */}
        <MobileAccordion>
          {PIPELINE_STAGES.map(status => (
            <AccordionSection key={status}>
              <AccordionHeader
                $expanded={!!expandedSections[status]}
                onClick={() => toggleSection(status)}
              >
                <div className="acc-left">
                  {expandedSections[status] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  {STATUS_LABELS[status]}
                  <span className="acc-count">{groupedLeads[status]?.length || 0}</span>
                </div>
              </AccordionHeader>
              <AccordionContent $expanded={!!expandedSections[status]}>
                {groupedLeads[status]?.length === 0 ? (
                  <EmptyColumn>No leads in this stage</EmptyColumn>
                ) : (
                  groupedLeads[status]?.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => setSelectedLead(lead)}
                    />
                  ))
                )}
              </AccordionContent>
            </AccordionSection>
          ))}
        </MobileAccordion>
      </div>

      {/* Loading / Error states */}
      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#718096' }}>Loading leads...</div>}
      {error && <div style={{ textAlign: 'center', padding: 20, color: '#FC8181' }}>{error}</div>}

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <LeadDetailDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onStatusChange={handleStatusChange}
          onUpdate={async (id, data) => { await updateLead(id, data); setSelectedLead(prev => prev ? { ...prev, ...data } : null); }}
          onDelete={async (id) => { await deleteLead(id); setSelectedLead(null); }}
          onAddActivity={addActivity}
        />
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onCreate={async (data) => { await createLead(data); setShowAddModal(false); }}
        />
      )}
    </Container>
  );
};

// ── Lead Detail Drawer Component ──

const LeadDetailDrawer: React.FC<{
  lead: Lead;
  onClose: () => void;
  onStatusChange: (id: number, status: string) => void;
  onUpdate: (id: number, data: Partial<Lead>) => void;
  onDelete: (id: number) => void;
  onAddActivity: (leadId: number, data: { type: string; description: string }) => void;
}> = ({ lead, onClose, onStatusChange, onUpdate, onDelete, onAddActivity }) => {
  const [notes, setNotes] = useState(lead.notes || '');
  const [goals, setGoals] = useState(lead.goals || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <DrawerOverlay onClick={onClose} />
      <DrawerPanel onClick={e => e.stopPropagation()}>
        <DrawerHeader>
          <h2>{lead.firstName} {lead.lastName || ''}</h2>
          <DrawerCloseBtn onClick={onClose}><X size={18} /></DrawerCloseBtn>
        </DrawerHeader>

        <DrawerBody>
          {/* Contact Info */}
          <div>
            <SectionLabel>Contact</SectionLabel>
            {lead.email && (
              <InfoRow>
                <Mail size={14} />
                <a href={`mailto:${lead.email}`}>{lead.email}</a>
              </InfoRow>
            )}
            {lead.phone && (
              <InfoRow>
                <Phone size={14} />
                <a href={`tel:${lead.phone}`}>{lead.phone}</a>
              </InfoRow>
            )}
            <InfoRow style={{ marginTop: 8 }}>
              <SourceBadge $color={SOURCE_COLORS[lead.source] || SOURCE_COLORS.other}>
                {SOURCE_LABELS[lead.source] || lead.source}
              </SourceBadge>
              <ScoreBadge $score={lead.score}>Score: {lead.score}</ScoreBadge>
            </InfoRow>
            {lead.sourceDetail && (
              <InfoRow style={{ marginTop: 4 }}>
                <Target size={14} /> {lead.sourceDetail}
              </InfoRow>
            )}
          </div>

          {/* Pipeline Status */}
          <div>
            <SectionLabel>Pipeline Status</SectionLabel>
            <StatusSelector>
              {PIPELINE_STAGES.map(status => (
                <StatusBtn
                  key={status}
                  $active={lead.status === status}
                  onClick={() => onStatusChange(lead.id, status)}
                >
                  {STATUS_LABELS[status]}
                </StatusBtn>
              ))}
            </StatusSelector>
          </div>

          {/* Notes */}
          <div>
            <SectionLabel>Notes</SectionLabel>
            <NotesArea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes about this lead..."
              onBlur={() => {
                if (notes !== (lead.notes || '')) {
                  onUpdate(lead.id, { notes });
                  onAddActivity(lead.id, { type: 'note_added', description: 'Updated notes' });
                }
              }}
            />
          </div>

          {/* Goals */}
          <div>
            <SectionLabel>Goals</SectionLabel>
            <NotesArea
              value={goals}
              onChange={e => setGoals(e.target.value)}
              placeholder="What are they looking to achieve?"
              style={{ minHeight: 60 }}
              onBlur={() => {
                if (goals !== (lead.goals || '')) {
                  onUpdate(lead.id, { goals });
                }
              }}
            />
          </div>

          {/* Activity Log */}
          {lead.activities && lead.activities.length > 0 && (
            <div>
              <SectionLabel>Activity</SectionLabel>
              <ActivityList>
                {lead.activities.slice(0, 10).map((a, i) => (
                  <ActivityItem key={i}>
                    {a.description}
                    <div className="activity-time">
                      {new Date(a.createdAt).toLocaleString()}
                    </div>
                  </ActivityItem>
                ))}
              </ActivityList>
            </div>
          )}

          {/* Actions */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {!showDeleteConfirm ? (
              <ActionBtn $variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 size={16} /> Remove Lead
              </ActionBtn>
            ) : (
              <div>
                <div style={{ color: '#FC8181', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>
                  Are you sure? This cannot be undone.
                </div>
                <ButtonRow>
                  <ActionBtn onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1 }}>Cancel</ActionBtn>
                  <ActionBtn $variant="danger" onClick={() => onDelete(lead.id)} style={{ flex: 1 }}>Delete</ActionBtn>
                </ButtonRow>
              </div>
            )}
          </div>
        </DrawerBody>
      </DrawerPanel>
    </>
  );
};

// ── Add Lead Modal ──

const AddLeadModal: React.FC<{
  onClose: () => void;
  onCreate: (data: Record<string, unknown>) => void;
}> = ({ onClose, onCreate }) => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    source: 'walk_in',
    sourceDetail: '',
    notes: '',
    goals: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim()) return;
    onCreate(form);
  };

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <ModalOverlay onClick={onClose}>
      <ModalPanel onClick={e => e.stopPropagation()}>
        <ModalTitle>Add New Lead</ModalTitle>
        <form onSubmit={handleSubmit}>
          <FormField>
            <label>First Name *</label>
            <input
              type="text"
              value={form.firstName}
              onChange={e => set('firstName', e.target.value)}
              placeholder="First name"
              required
              autoFocus
            />
          </FormField>
          <FormField>
            <label>Last Name</label>
            <input
              type="text"
              value={form.lastName}
              onChange={e => set('lastName', e.target.value)}
              placeholder="Last name"
            />
          </FormField>
          <FormField>
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="email@example.com"
            />
          </FormField>
          <FormField>
            <label>Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="(555) 123-4567"
            />
          </FormField>
          <FormField>
            <label>Lead Source</label>
            <select value={form.source} onChange={e => set('source', e.target.value)}>
              <option value="walk_in">Walk-in / In Person</option>
              <option value="gallery">Swan Photography Gallery</option>
              <option value="website">Website Contact Form</option>
              <option value="referral">Client Referral</option>
              <option value="social_media">Social Media</option>
              <option value="other">Other</option>
            </select>
          </FormField>
          <FormField>
            <label>Source Detail</label>
            <input
              type="text"
              value={form.sourceDetail}
              onChange={e => set('sourceDetail', e.target.value)}
              placeholder="e.g., Gold's Gym Anaheim, Basketball Game"
            />
          </FormField>
          <FormField>
            <label>Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Quick note about this lead"
            />
          </FormField>
          <FormField>
            <label>Goals</label>
            <input
              type="text"
              value={form.goals}
              onChange={e => set('goals', e.target.value)}
              placeholder="What do they want to achieve?"
            />
          </FormField>
          <ButtonRow>
            <ActionBtn type="button" onClick={onClose} style={{ flex: 1 }}>Cancel</ActionBtn>
            <ActionBtn type="submit" $variant="primary" style={{ flex: 1 }}>
              <Plus size={16} /> Add Lead
            </ActionBtn>
          </ButtonRow>
        </form>
      </ModalPanel>
    </ModalOverlay>
  );
};

export default LeadCRMDashboard;
