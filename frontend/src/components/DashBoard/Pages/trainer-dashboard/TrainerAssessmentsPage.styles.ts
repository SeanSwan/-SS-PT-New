import styled from 'styled-components';
import { ClipboardCheck, FileText } from 'lucide-react';
import type { CompensationLevel } from './TrainerAssessmentsPage.data';

export const PageWrapper = styled.div`
  padding: 24px;
  min-height: 100vh;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
`;

export const Header = styled.div`margin-bottom: 28px;`;

export const Title = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 6px;
`;

export const Subtitle = styled.p`
  color: var(--text-secondary, rgba(224,236,244,0.6));
  font-size: 0.9rem;
  margin: 0;
`;

export const FormCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
`;

export const FieldGroup = styled.div`margin-bottom: 20px;`;

/**
 * Inline failure notice. Before the 2026-08-03 launch audit a failed roster or
 * history fetch collapsed to an empty array, so a 500 looked exactly like
 * "no clients yet" and the trainer had nothing to act on.
 */
export const InlineAlert = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--danger-border, rgba(201, 42, 84, 0.35));
  background: var(--danger-soft, rgba(201, 42, 84, 0.1));
  color: var(--text-primary, #E0ECF4);
  font-size: 0.85rem;
  line-height: 1.5;
`;

export const InlineAlertText = styled.span`
  flex: 1 1 220px;
  min-width: 0;
`;

export const RetryButton = styled.button`
  min-height: 44px;
  min-width: 44px;
  padding: 0 18px;
  border-radius: 10px;
  border: 1px solid var(--accent-primary, #60C0F0);
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', 'Plus Jakarta Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 200ms ease, box-shadow 200ms ease;

  &:hover {
    background: var(--accent-primary-soft, rgba(96, 192, 240, 0.12));
    box-shadow: 0 0 12px var(--glow-accent, rgba(139, 92, 246, 0.25));
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const FieldHint = styled.span`
  display: block;
  margin-top: 6px;
  font-size: 0.75rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
`;

export const Label = styled.label`
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, rgba(224,236,244,0.6));
  margin-bottom: 8px;
`;

export const GroupLabel = styled(Label).attrs({ as: 'div' })``;

export const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
`;

export const TitleIcon = styled(ClipboardCheck)`
  vertical-align: middle;
  margin-right: 8px;
`;

export const TypeSelector = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

export const TypeChip = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--border-soft, rgba(96,192,240,0.12))'};
  background: ${({ $active }) => $active ? 'rgba(96,192,240,0.12)' : 'var(--bg-surface, #1A1A24)'};
  color: ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-primary, #E0ECF4)'};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: var(--accent-primary, #60C0F0); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const Select = styled.div`
  position: relative;
  select {
    width: 100%;
    min-height: 44px;
    padding: 10px 40px 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
    background: var(--bg-surface, #1A1A24);
    color: var(--text-primary, #E0ECF4);
    font-size: 0.9rem;
    appearance: none;
    cursor: pointer;
  }
  svg { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; opacity: 0.5; }
`;

export const Input = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9rem;
  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const Textarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9rem;
  resize: vertical;
  font-family: inherit;
  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const SubmitButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 12px 28px;
  border: none;
  border-radius: 10px;
  background: var(--accent-secondary, #8B5CF6);
  color: var(--text-on-accent, #FFFFFF);
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: box-shadow 0.2s;
  &:hover { box-shadow: 0 0 16px rgba(96,192,240,0.3); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 16px;
`;

export const HistoryCard = styled.div`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const HistoryInfo = styled.div``;
export const HistoryType = styled.div`font-weight: 600; font-size: 0.9rem;`;
export const HistoryMeta = styled.div`font-size: 0.8rem; color: var(--text-muted, rgba(224, 236, 244, 0.68));`;

export const HistoryScore = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 32px;
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
`;

export const TypeDescription = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary, rgba(224,236,244,0.6));
  margin-bottom: 16px;
  padding: 12px 16px;
  background: rgba(96, 192, 240, 0.05);
  border-left: 3px solid var(--accent-primary, #60C0F0);
  border-radius: 0 8px 8px 0;
`;

export const CriteriaList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
`;

export const CriteriaTag = styled.span<{ $accent?: boolean }>`
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid ${({ $accent }) => $accent ? 'rgba(139,92,246,0.2)' : 'var(--border-soft, rgba(96,192,240,0.12))'};
  color: ${({ $accent }) => $accent ? 'var(--accent-secondary, #8B5CF6)' : 'var(--text-primary, #E0ECF4)'};
`;

export const TeachModeToggle = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, rgba(96,192,240,0.12))'};
  background: ${({ $active }) => $active ? 'rgba(139,92,246,0.15)' : 'var(--bg-surface, #1A1A24)'};
  color: ${({ $active }) => $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--text-primary, #E0ECF4)'};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: var(--accent-secondary, #8B5CF6); }
  &:focus-visible { outline: 2px solid var(--accent-secondary, #8B5CF6); outline-offset: 2px; }
`;

export const CheckpointRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-soft, rgba(96,192,240,0.06));
  gap: 12px;
  flex-wrap: wrap;
  &:last-child { border-bottom: none; }
`;

export const CheckpointLabel = styled.span`
  font-size: 0.82rem;
  color: var(--text-primary, #E0ECF4);
  flex: 1;
  min-width: 150px;
`;

export const CheckpointView = styled.span`
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
`;

export const PillGroup = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

export const Pill = styled.button<{ $level: CompensationLevel; $active?: boolean }>`
  min-height: 44px;
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid ${({ $active, $level }) => $active ? ($level === 'none' ? 'rgba(96,192,240,0.5)' : $level === 'minor' ? 'rgba(198,168,75,0.5)' : 'rgba(201,42,84,0.5)') : 'var(--border-soft, rgba(96,192,240,0.12))'};
  background: ${({ $active, $level }) => $active ? ($level === 'none' ? 'rgba(96,192,240,0.15)' : $level === 'minor' ? 'rgba(198,168,75,0.15)' : 'rgba(201,42,84,0.15)') : 'transparent'};
  color: ${({ $active, $level }) => $active ? ($level === 'none' ? 'var(--accent-primary, #60C0F0)' : $level === 'minor' ? 'var(--accent-luxury, #C6A84B)' : 'var(--danger, #C92A54)') : 'var(--text-muted, rgba(224, 236, 244, 0.68))'};
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const CheckpointCard = styled.div`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.08));
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 20px;
`;

export const CheckpointCardTitle = styled.div`
  padding: 10px 14px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent-primary, #60C0F0);
  background: var(--bg-elevated, #141419);
`;

export const PerfInput = styled.input`
  width: 100px;
  min-height: 44px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  text-align: center;
  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const SubmitStatus = styled.span<{ $success?: boolean }>`
  font-size: 0.8rem;
  color: ${({ $success }) => $success ? 'var(--accent-primary, #60C0F0)' : 'var(--danger, #C92A54)'};
  margin-left: 12px;
`;

export const UnitInputRow = styled.div`display: flex; align-items: center; gap: 6px;`;
export const UnitLabel = styled.span`font-size: 0.7rem; color: var(--text-muted, rgba(224, 236, 244, 0.68));`;
export const ActionRow = styled.div`display: flex; align-items: center;`;

export const SectionTitleIcon = styled(FileText)`
  vertical-align: middle;
  margin-right: 8px;
`;

export const StatusText = styled.span<{ $completed?: boolean }>`
  color: ${({ $completed }) => $completed ? 'var(--accent-primary, #60C0F0)' : 'var(--accent-luxury, #C6A84B)'};
`;
