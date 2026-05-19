/**
 * DocumentTracker.tsx — v2.0
 * ──────────────────────────────────────────────────────────────────
 * Module 3: Track document statuses with collapsible category
 * sections, status dropdowns, score fields, notes, cost badges,
 * due-date warnings, category summary, and quick actions.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  Heart,
  Landmark,
  Languages,
  Monitor,
  ShieldCheck,
  Fingerprint,
  Users,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  DollarSign,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import type { ImmigrationDocument } from './CanadaImmigrationTab';

/* ────────── Props ────────── */

interface DocumentTrackerProps {
  documents: any[];
  onUpdateDocument?: (id: number, updates: any) => void;
  // Keep backward-compat with existing call-site
  updateDocument?: (id: number, updates: Partial<ImmigrationDocument>) => Promise<void>;
  [key: string]: any; // accept sharedProps spread
}

/* ────────── Constants ────────── */

const DOC_STATUSES = [
  { value: 'not_started', label: 'Not Started', color: 'rgba(224,236,244,0.3)' },
  { value: 'ordered', label: 'Ordered', color: '#f59e0b' },
  { value: 'applied', label: 'Applied', color: '#a78bfa' },
  { value: 'scheduled', label: 'Scheduled', color: '#60C0F0' },
  { value: 'received', label: 'Received', color: '#22c55e' },
  { value: 'completed', label: 'Completed', color: '#C6A84B' },
];

const TERMINAL_STATUSES = new Set(['received', 'completed']);

type CatKey =
  | 'marriage'
  | 'tribal'
  | 'language'
  | 'certification'
  | 'immigration'
  | 'identity'
  | 'family'
  | 'wife_med'
  | 'self_employed'
  | 'pt_market';

interface CatMeta {
  label: string;
  color: string;
  Icon: React.ComponentType<any>;
}

const CAT_CONFIG: Record<CatKey | string, CatMeta> = {
  marriage:       { label: 'Marriage & Legal',           color: '#ef4444',  Icon: Heart },
  tribal:         { label: 'Tribal / Indigenous',        color: '#f97316',  Icon: Landmark },
  language:       { label: 'Language Tests',             color: '#60C0F0',  Icon: Languages },
  certification:  { label: 'AI Certifications',          color: '#22c55e',  Icon: Monitor },
  immigration:    { label: 'Immigration Docs',           color: '#8B5CF6',  Icon: ShieldCheck },
  identity:       { label: 'Identity Documents',         color: '#50A0F0',  Icon: Fingerprint },
  family:         { label: 'Family & Dependents',        color: '#22C55E',  Icon: Users },
  wife_med:       { label: 'Wife MEd / Study Permit',    color: '#E879F9',  Icon: GraduationCap },
  self_employed:  { label: 'Self-Employed Program',      color: '#C6A84B',  Icon: Briefcase },
  pt_market:      { label: 'PT Market Research',         color: '#60C0F0',  Icon: Monitor },
};

/* ────────── Animations ────────── */

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const pulseWarn = keyframes`
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.6; }
`;

const fadeInAnim = css`
  animation: ${fadeIn} 0.4s ease-out;
`;

/* ────────── Styled Components ────────── */

const Container = styled.div`
  ${fadeInAnim}
`;

/* ── Overall Summary ── */

const OverallSummary = styled.div`
  background: rgba(0, 32, 96, 0.15);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 24px;
`;

const SummaryTitle = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #E0ECF4;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SummaryTotalBadge = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  padding: 2px 10px;
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 20px;
  color: #a78bfa;
`;

const ProgressBarOuter = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(224, 236, 244, 0.08);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
`;

const ProgressBarFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${(p) => p.$pct}%;
  background: linear-gradient(90deg, ${(p) => p.$color}, #C6A84B);
  border-radius: 4px;
  transition: width 0.5s ease-out;
`;

const ProgressLabel = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: rgba(224, 236, 244, 0.5);
  text-align: right;
  margin-bottom: 4px;
`;

const SummaryBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const SummaryChip = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(0, 48, 128, 0.3);
  border: 1px solid ${(p) => p.$color}33;
  border-radius: 10px;
`;

const Dot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  flex-shrink: 0;
`;

const SummaryLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  color: rgba(224, 236, 244, 0.5);
`;

const SummaryCount = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #E0ECF4;
`;

/* ── Category Section ── */

const CategorySection = styled.div`
  margin-bottom: 16px;
`;

const CategoryHeader = styled.button<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  background: rgba(0, 32, 96, 0.15);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-left: 3px solid ${(p) => p.$color};
  border-radius: 12px;
  cursor: pointer;
  color: #E0ECF4;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  transition: all 0.15s;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    border-color: rgba(96, 192, 240, 0.25);
  }
`;

const CatIconWrap = styled.span<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${(p) => p.$color}18;
  color: ${(p) => p.$color};
  flex-shrink: 0;
`;

const CatLabel = styled.span`
  flex: 1;
  text-align: left;
`;

const CatCount = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: rgba(224, 236, 244, 0.5);
`;

const CatArrow = styled.span<{ $open: boolean }>`
  display: flex;
  transition: transform 0.2s;
  transform: rotate(${(p) => (p.$open ? '180deg' : '0deg')});
  color: rgba(224, 236, 244, 0.4);
`;

const CatActions = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 0 4px 16px;
`;

const QuickActionBtn = styled.button<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 14px;
  background: ${(p) => p.$color}18;
  border: 1px solid ${(p) => p.$color}44;
  border-radius: 8px;
  color: ${(p) => p.$color};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: ${(p) => p.$color}30;
    border-color: ${(p) => p.$color}66;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const DocList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0 0 16px;

  @media (max-width: 480px) {
    padding-left: 4px;
  }
`;

/* ── Document Card ── */

const DocCard = styled.div`
  background: rgba(0, 32, 96, 0.15);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 12px;
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: start;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const DocInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DocNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const DocName = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #E0ECF4;
`;

const CostBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(198, 168, 75, 0.15);
  border: 1px solid rgba(198, 168, 75, 0.3);
  border-radius: 6px;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: #C6A84B;
`;

const DueDateBadge = styled.span<{ $urgent: 'overdue' | 'soon' | 'ok' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  font-family: 'Fira Code', monospace;
  font-size: 11px;

  ${(p) =>
    p.$urgent === 'overdue'
      ? css`
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #ef4444;
          animation: ${pulseWarn} 1.5s ease-in-out infinite;
        `
      : p.$urgent === 'soon'
      ? css`
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.4);
          color: #f59e0b;
        `
      : css`
          background: rgba(224, 236, 244, 0.06);
          border: 1px solid rgba(224, 236, 244, 0.1);
          color: rgba(224, 236, 244, 0.5);
        `}
`;

const StatusDots = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

const StatusDot = styled.div<{ $active: boolean; $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => (p.$active ? p.$color : 'rgba(224,236,244,0.12)')};
  transition: background 0.2s;
`;

const StatusLabelText = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  color: rgba(224, 236, 244, 0.5);
  margin-left: 6px;
`;

const DocControls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 180px;

  @media (max-width: 768px) {
    min-width: 100%;
  }
`;

const Select = styled.select`
  min-height: 44px;
  padding: 8px 12px;
  background: rgba(0, 16, 64, 0.6);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 8px;
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  cursor: pointer;
  appearance: auto;

  &:focus {
    outline: none;
    border-color: #8B5CF6;
  }

  option {
    background: #001040;
    color: #E0ECF4;
  }
`;

const SmallInput = styled.input`
  min-height: 40px;
  padding: 6px 12px;
  background: rgba(0, 16, 64, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 8px;
  color: #E0ECF4;
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  width: 100%;

  &:focus {
    outline: none;
    border-color: #8B5CF6;
  }

  &::placeholder {
    color: rgba(224, 236, 244, 0.3);
  }
`;

const NotesInput = styled.input`
  min-height: 40px;
  padding: 6px 12px;
  background: rgba(0, 16, 64, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 8px;
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  width: 100%;

  &:focus {
    outline: none;
    border-color: #8B5CF6;
  }

  &::placeholder {
    color: rgba(224, 236, 244, 0.3);
  }
`;

/* ────────── Helpers ────────── */

function getDueUrgency(dueDate?: string | null): 'overdue' | 'soon' | 'ok' | null {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return null;
  const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 30) return 'soon';
  return 'ok';
}

function formatDueDate(dueDate: string): string {
  const d = new Date(dueDate);
  if (isNaN(d.getTime())) return dueDate;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCost(doc: any): string | null {
  const cost = doc.cost ?? doc.costEach ?? doc.cost_each;
  const qty = doc.quantity ?? doc.qty ?? 1;
  if (!cost || cost <= 0) return null;
  if (qty > 1) {
    return `$${cost} ea \u00D7 ${qty} = $${cost * qty}`;
  }
  return `$${cost}`;
}

/* ────────── Component ────────── */

const DocumentTracker: React.FC<DocumentTrackerProps> = ({
  documents,
  onUpdateDocument,
  updateDocument,
}) => {
  // Support both prop naming conventions
  const doUpdate = useCallback(
    async (id: number, updates: any) => {
      if (onUpdateDocument) {
        onUpdateDocument(id, updates);
      } else if (updateDocument) {
        await updateDocument(id, updates);
      }
    },
    [onUpdateDocument, updateDocument]
  );

  const [openCats, setOpenCats] = useState<Set<string>>(new Set(Object.keys(CAT_CONFIG)));
  const [notesDraft, setNotesDraft] = useState<Record<number, string>>({});
  const [scoreDraft, setScoreDraft] = useState<Record<number, string>>({});

  /* ── Group by category ── */

  const grouped = useMemo(() => {
    const map: Record<string, ImmigrationDocument[]> = {};
    for (const doc of documents) {
      const key = doc.category || 'immigration';
      if (!map[key]) map[key] = [];
      map[key].push(doc);
    }
    return map;
  }, [documents]);

  /* ── Status summary ── */

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of DOC_STATUSES) {
      counts[s.value] = documents.filter((d: any) => d.status === s.value).length;
    }
    return counts;
  }, [documents]);

  const completionPct = useMemo(() => {
    if (documents.length === 0) return 0;
    const done = documents.filter((d: any) => TERMINAL_STATUSES.has(d.status)).length;
    return Math.round((done / documents.length) * 100);
  }, [documents]);

  /* ── Handlers ── */

  const toggleCat = (cat: string) => {
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleStatusChange = async (docId: number, status: string) => {
    await doUpdate(docId, { status });
  };

  const handleScoreBlur = async (docId: number) => {
    if (scoreDraft[docId] !== undefined) {
      await doUpdate(docId, { score: scoreDraft[docId] || null });
    }
  };

  const handleNotesBlur = async (docId: number) => {
    if (notesDraft[docId] !== undefined) {
      await doUpdate(docId, { notes: notesDraft[docId] || null });
    }
  };

  const handleMarkAllReceived = async (catDocs: ImmigrationDocument[]) => {
    const pending = catDocs.filter((d) => !TERMINAL_STATUSES.has(d.status));
    for (const doc of pending) {
      await doUpdate(doc.id, { status: 'received' });
    }
  };

  /* ── Status progress dots ── */

  const getStatusIdx = (status: string) =>
    DOC_STATUSES.findIndex((s) => s.value === status);

  return (
    <Container>
      {/* ── Overall Summary ── */}
      <OverallSummary>
        <SummaryTitle>
          Document Progress
          <SummaryTotalBadge>{documents.length} total</SummaryTotalBadge>
        </SummaryTitle>

        <ProgressLabel>{completionPct}% complete</ProgressLabel>
        <ProgressBarOuter>
          <ProgressBarFill $pct={completionPct} $color="#8B5CF6" />
        </ProgressBarOuter>

        <SummaryBar>
          {DOC_STATUSES.map((s) => (
            <SummaryChip key={s.value} $color={s.color}>
              <Dot $color={s.color} />
              <SummaryCount>{statusCounts[s.value] || 0}</SummaryCount>
              <SummaryLabel>{s.label}</SummaryLabel>
            </SummaryChip>
          ))}
        </SummaryBar>
      </OverallSummary>

      {/* ── Category Sections ── */}
      {Object.entries(CAT_CONFIG).map(([catKey, config]) => {
        const docs = grouped[catKey] || [];
        if (docs.length === 0) return null;
        const isOpen = openCats.has(catKey);
        const doneCount = docs.filter(
          (d) => d.status === 'completed' || d.status === 'received'
        ).length;
        const pendingCount = docs.filter((d) => !TERMINAL_STATUSES.has(d.status)).length;
        const CatIconComp = config.Icon;

        return (
          <CategorySection key={catKey}>
            <CategoryHeader $color={config.color} onClick={() => toggleCat(catKey)}>
              <CatIconWrap $color={config.color}>
                <CatIconComp size={16} />
              </CatIconWrap>
              <CatLabel>{config.label}</CatLabel>
              <CatCount>
                {doneCount}/{docs.length}
              </CatCount>
              <CatArrow $open={isOpen}>
                <ChevronDown size={14} />
              </CatArrow>
            </CategoryHeader>

            {isOpen && (
              <>
                {/* Quick Actions */}
                <CatActions>
                  <QuickActionBtn
                    $color="#22c55e"
                    disabled={pendingCount === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAllReceived(docs);
                    }}
                  >
                    <CheckCircle2 size={14} />
                    Mark All Received ({pendingCount})
                  </QuickActionBtn>
                </CatActions>

                <DocList>
                  {docs.map((doc: any) => {
                    const currentIdx = getStatusIdx(doc.status);
                    const costStr = formatCost(doc);
                    const dueDate = doc.dueDate ?? doc.due_date;
                    const urgency = getDueUrgency(dueDate);

                    return (
                      <DocCard key={doc.id}>
                        <DocInfo>
                          <DocNameRow>
                            <DocName>{doc.name}</DocName>
                            {costStr && (
                              <CostBadge>
                                <DollarSign size={10} />
                                {costStr}
                              </CostBadge>
                            )}
                            {urgency && dueDate && (
                              <DueDateBadge $urgent={urgency}>
                                {urgency === 'overdue' ? (
                                  <AlertCircle size={10} />
                                ) : urgency === 'soon' ? (
                                  <AlertTriangle size={10} />
                                ) : (
                                  <Calendar size={10} />
                                )}
                                {urgency === 'overdue'
                                  ? `Overdue \u2014 ${formatDueDate(dueDate)}`
                                  : urgency === 'soon'
                                  ? `Due ${formatDueDate(dueDate)}`
                                  : formatDueDate(dueDate)}
                              </DueDateBadge>
                            )}
                          </DocNameRow>
                          <StatusDots>
                            {DOC_STATUSES.map((s, i) => (
                              <StatusDot
                                key={s.value}
                                $active={i <= currentIdx}
                                $color={s.color}
                              />
                            ))}
                            <StatusLabelText>
                              {DOC_STATUSES.find((s) => s.value === doc.status)?.label ||
                                doc.status}
                            </StatusLabelText>
                          </StatusDots>
                        </DocInfo>

                        <DocControls>
                          <Select
                            value={doc.status}
                            onChange={(e) => handleStatusChange(doc.id, e.target.value)}
                          >
                            {DOC_STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </Select>

                          <SmallInput
                            placeholder="Score / result"
                            value={scoreDraft[doc.id] ?? doc.score ?? ''}
                            onChange={(e) =>
                              setScoreDraft((d) => ({ ...d, [doc.id]: e.target.value }))
                            }
                            onBlur={() => handleScoreBlur(doc.id)}
                          />

                          <NotesInput
                            placeholder="Notes..."
                            value={notesDraft[doc.id] ?? doc.notes ?? ''}
                            onChange={(e) =>
                              setNotesDraft((d) => ({ ...d, [doc.id]: e.target.value }))
                            }
                            onBlur={() => handleNotesBlur(doc.id)}
                          />
                        </DocControls>
                      </DocCard>
                    );
                  })}
                </DocList>
              </>
            )}
          </CategorySection>
        );
      })}
    </Container>
  );
};

export default DocumentTracker;
