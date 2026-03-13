/**
 * DocumentTracker.tsx
 * ──────────────────────────────────────────────────────────────────
 * Module 3: Track document statuses with collapsible category
 * sections, status dropdowns, score fields, and notes.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import type { ImmigrationDocument } from './CanadaImmigrationTab';

/* ────────── Props ────────── */

interface Props {
  documents: ImmigrationDocument[];
  updateDocument: (id: number, updates: Partial<ImmigrationDocument>) => Promise<void>;
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

const CAT_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  marriage: { label: 'Marriage & Legal', color: '#ef4444', icon: '\u{1F48D}' },
  tribal: { label: 'Tribal / Indigenous', color: '#f97316', icon: '\u{1F3DB}\uFE0F' },
  language: { label: 'Language Tests', color: '#60C0F0', icon: '\u{1F4DD}' },
  certification: { label: 'AI Certifications', color: '#22c55e', icon: '\u{1F4BB}' },
  immigration: { label: 'Immigration Docs', color: '#8B5CF6', icon: '\u{1F6C2}' },
  identity: { label: 'Identity Documents', color: '#50A0F0', icon: '\u{1FAAA}' },
};

/* ────────── Animations ────────── */

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

/* ────────── Styled Components ────────── */

const Container = styled.div`
  animation: ${fadeIn} 0.4s ease-out;
`;

const SummaryBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
`;

const SummaryChip = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 48, 128, 0.3);
  border: 1px solid ${(p) => p.$color}33;
  border-radius: 10px;
`;

const Dot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  flex-shrink: 0;
`;

const SummaryLabel = styled.span`
  font-size: 12px;
  color: rgba(224, 236, 244, 0.6);
`;

const SummaryCount = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  font-weight: 700;
  color: #E0ECF4;
`;

/* ── Category Section ── */

const CategorySection = styled.div`
  margin-bottom: 20px;
`;

const CategoryHeader = styled.button<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  background: rgba(0, 48, 128, 0.25);
  border: 1px solid ${(p) => p.$color}22;
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
  }
`;

const CatIcon = styled.span`
  font-size: 18px;
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
  font-size: 12px;
  transition: transform 0.2s;
  transform: rotate(${(p) => (p.$open ? '180deg' : '0deg')});
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
  background: rgba(0, 48, 128, 0.3);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(96, 192, 240, 0.1);
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

const DocName = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #E0ECF4;
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

const StatusLabel = styled.span`
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

/* ────────── Component ────────── */

const DocumentTracker: React.FC<Props> = ({ documents, updateDocument }) => {
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
      counts[s.value] = documents.filter((d) => d.status === s.value).length;
    }
    return counts;
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
    await updateDocument(docId, { status });
  };

  const handleScoreBlur = async (docId: number) => {
    if (scoreDraft[docId] !== undefined) {
      await updateDocument(docId, { score: scoreDraft[docId] || null });
    }
  };

  const handleNotesBlur = async (docId: number) => {
    if (notesDraft[docId] !== undefined) {
      await updateDocument(docId, { notes: notesDraft[docId] || null });
    }
  };

  /* ── Status progress dots ── */

  const getStatusIdx = (status: string) =>
    DOC_STATUSES.findIndex((s) => s.value === status);

  return (
    <Container>
      {/* Summary Bar */}
      <SummaryBar>
        {DOC_STATUSES.map((s) => (
          <SummaryChip key={s.value} $color={s.color}>
            <Dot $color={s.color} />
            <SummaryCount>{statusCounts[s.value] || 0}</SummaryCount>
            <SummaryLabel>{s.label}</SummaryLabel>
          </SummaryChip>
        ))}
      </SummaryBar>

      {/* Category Sections */}
      {Object.entries(CAT_CONFIG).map(([catKey, config]) => {
        const docs = grouped[catKey] || [];
        if (docs.length === 0) return null;
        const isOpen = openCats.has(catKey);

        return (
          <CategorySection key={catKey}>
            <CategoryHeader $color={config.color} onClick={() => toggleCat(catKey)}>
              <CatIcon>{config.icon}</CatIcon>
              <CatLabel>{config.label}</CatLabel>
              <CatCount>
                {docs.filter((d) => d.status === 'completed' || d.status === 'received').length}/
                {docs.length}
              </CatCount>
              <CatArrow $open={isOpen}>{'\u25BC'}</CatArrow>
            </CategoryHeader>

            {isOpen && (
              <DocList>
                {docs.map((doc) => {
                  const currentIdx = getStatusIdx(doc.status);

                  return (
                    <DocCard key={doc.id}>
                      <DocInfo>
                        <DocName>{doc.name}</DocName>
                        <StatusDots>
                          {DOC_STATUSES.map((s, i) => (
                            <StatusDot key={s.value} $active={i <= currentIdx} $color={s.color} />
                          ))}
                          <StatusLabel>
                            {DOC_STATUSES.find((s) => s.value === doc.status)?.label || doc.status}
                          </StatusLabel>
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
            )}
          </CategorySection>
        );
      })}
    </Container>
  );
};

export default DocumentTracker;
