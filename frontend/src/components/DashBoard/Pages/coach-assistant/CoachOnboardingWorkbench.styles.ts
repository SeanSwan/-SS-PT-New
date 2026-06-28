import styled from 'styled-components';
import type { WorkbenchCoverageStatus } from './CoachOnboardingWorkbench.logic';

const statusBackground = (status: WorkbenchCoverageStatus) => {
  if (status === 'known') return 'color-mix(in srgb, var(--success, #34D399) 20%, transparent)';
  if (status === 'not_applicable') return 'color-mix(in srgb, var(--text-muted, #9CA3AF) 18%, transparent)';
  if (status === 'client_requested') return 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent)';
  if (status === 'trainer_pending') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 20%, transparent)';
  if (status === 'blocked') return 'color-mix(in srgb, var(--error, #F87171) 20%, transparent)';
  return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)';
};

export const WorkbenchShell = styled.article`
  display: grid;
  gap: 14px;
  width: 100%;
`;

export const WorkbenchHeader = styled.header`
  align-items: center;
  background: linear-gradient(135deg, color-mix(in srgb, var(--surface-elevated, #003080) 76%, transparent), var(--surface-dark, #141419));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  border-radius: 18px;
  display: flex;
  gap: 14px;
  justify-content: space-between;
  padding: 16px;

  h2 {
    color: var(--text-primary, #E0ECF4);
    font-family: 'Plus Jakarta Sans', 'Sora', system-ui, sans-serif;
    font-size: 20px;
    line-height: 1.15;
    margin: 0;
  }

  p {
    color: var(--text-secondary, #B8D4E3);
    margin: 4px 0 0;
  }

  @media (max-width: 760px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const HeaderMetric = styled.div`
  align-items: center;
  background: color-mix(in srgb, var(--bg-base, #030712) 64%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-radius: 14px;
  color: var(--text-primary, #E0ECF4);
  display: grid;
  min-width: 132px;
  padding: 10px 12px;
  text-align: right;

  strong {
    font-family: 'Fira Code', monospace;
    font-size: 24px;
    line-height: 1;
  }

  span {
    color: var(--text-muted, #9CA3AF);
    font-size: 12px;
  }

  @media (max-width: 760px) {
    text-align: left;
  }
`;

export const WorkbenchGrid = styled.div`
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(230px, 0.8fr) minmax(0, 1.4fr) minmax(260px, 0.9fr);

  @media (max-width: 1180px) {
    grid-template-columns: minmax(230px, 0.9fr) minmax(0, 1.2fr);
  }

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

export const WorkbenchPanel = styled.section`
  background: color-mix(in srgb, var(--surface-dark, #141419) 86%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-radius: 16px;
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 14px;

  h3 {
    color: var(--text-primary, #E0ECF4);
    font-family: 'Plus Jakarta Sans', 'Sora', system-ui, sans-serif;
    font-size: 16px;
    line-height: 1.2;
    margin: 0;
  }

  p {
    color: var(--text-secondary, #B8D4E3);
    margin: 0;
  }
`;

export const RosterTools = styled.div`
  display: grid;
  gap: 8px;

  input,
  select {
    background: color-mix(in srgb, var(--bg-base, #030712) 72%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
    border-radius: 12px;
    color: var(--text-primary, #E0ECF4);
    min-height: 44px;
    padding: 0 12px;
    width: 100%;
  }
`;

export const RosterList = styled.div`
  display: grid;
  gap: 8px;
  max-height: 520px;
  overflow: auto;
  padding-right: 2px;
`;

export const RosterButton = styled.button<{ $active?: boolean }>`
  align-items: center;
  background: ${({ $active }) => $active ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent)' : 'color-mix(in srgb, var(--bg-base, #030712) 58%, transparent)'};
  border: 1px solid ${({ $active }) => $active ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 44%, transparent)' : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent)'};
  border-radius: 12px;
  color: var(--text-primary, #E0ECF4);
  display: grid;
  gap: 6px;
  min-height: 76px;
  padding: 10px 12px;
  text-align: left;
  width: 100%;

  strong,
  span {
    overflow-wrap: anywhere;
  }

  small {
    color: var(--text-muted, #9CA3AF);
  }
`;

export const StatusRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export const StatusPill = styled.span<{ $status: WorkbenchCoverageStatus }>`
  align-items: center;
  background: ${({ $status }) => statusBackground($status)};
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 999px;
  color: var(--text-primary, #E0ECF4);
  display: inline-flex;
  font-size: 12px;
  font-weight: 760;
  min-height: 26px;
  padding: 0 9px;
`;

export const IntakeForm = styled.form`
  display: grid;
  gap: 10px;

  textarea {
    background: color-mix(in srgb, var(--bg-base, #030712) 76%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
    border-radius: 14px;
    color: var(--text-primary, #E0ECF4);
    min-height: 170px;
    padding: 12px;
    resize: vertical;
    width: 100%;
  }
`;

export const QuickChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const WorkbenchButton = styled.button<{ $primary?: boolean }>`
  align-items: center;
  background: ${({ $primary }) => $primary ? 'linear-gradient(135deg, var(--primary, #002060), color-mix(in srgb, var(--accent-secondary, #8B5CF6) 54%, var(--primary, #002060)))' : 'color-mix(in srgb, var(--surface-elevated, #003080) 58%, transparent)'};
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  border-radius: 12px;
  color: var(--text-primary, #E0ECF4);
  display: inline-flex;
  font-weight: 780;
  gap: 8px;
  justify-content: center;
  min-height: 44px;
  padding: 0 12px;
`;

export const CategoryList = styled.div`
  display: grid;
  gap: 8px;
  max-height: 560px;
  overflow: auto;
  padding-right: 2px;
`;

export const CategoryItem = styled.div`
  background: color-mix(in srgb, var(--bg-base, #030712) 56%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  border-radius: 12px;
  display: grid;
  gap: 8px;
  padding: 10px;
`;

export const ProgressTrack = styled.div`
  background: color-mix(in srgb, var(--bg-base, #030712) 84%, transparent);
  border-radius: 999px;
  height: 7px;
  overflow: hidden;

  span {
    background: linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
    display: block;
    height: 100%;
  }
`;

export const EmptyNote = styled.div`
  border: 1px dashed color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  border-radius: 14px;
  color: var(--text-secondary, #B8D4E3);
  padding: 12px;
`;
