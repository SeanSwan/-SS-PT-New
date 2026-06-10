import styled from 'styled-components';
import { swanClientActionButton, swanDataCardShell, swanPill } from '../clientCardSystem';

export const Container = styled.div`
  --swan-card-padding: 20px;
  --swan-card-radius: 14px;
  ${swanDataCardShell}
  max-width: 900px;
  width: 100%;
  margin: 0 auto;

  @media (max-width: 768px) {
    --swan-card-padding: 14px;
  }
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

export const Title = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
  overflow-wrap: anywhere;
`;

export const TitleIcon = styled.span`
  display: inline-flex;
  align-items: center;
  color: var(--accent-primary, #60C0F0);
  flex-shrink: 0;
`;

export const ClientNameAccent = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
  font-size: 14px;
  font-weight: 400;
  min-width: 0;
  overflow-wrap: anywhere;
`;

export const DateInput = styled.input`
  box-sizing: border-box;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  min-height: 44px;
  min-width: 0;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
    border-color: var(--accent-primary, #60C0F0);
  }

  @media (max-width: 520px) {
    width: 100%;
  }
`;

export const JointGroup = styled.div`
  margin-bottom: 20px;
`;

export const GroupHeader = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  padding: 8px 0 6px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  margin-bottom: 8px;
`;

export const MovementRow = styled.div`
  display: grid;
  grid-template-columns: minmax(130px, 1.2fr) repeat(2, minmax(72px, 1fr)) minmax(52px, 0.7fr);
  gap: 8px;
  align-items: center;
  padding: 6px 0;
  min-width: 0;

  @media (max-width: 600px) {
    grid-template-columns: minmax(0, 1.15fr) repeat(2, minmax(64px, 0.85fr)) minmax(50px, 0.6fr);
    gap: 6px;
  }

  @media (max-width: 360px) {
    grid-template-columns: minmax(0, 1fr) repeat(2, minmax(56px, 0.75fr)) minmax(46px, 0.6fr);
  }
`;

export const RomGridHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(130px, 1.2fr) repeat(2, minmax(72px, 1fr)) minmax(52px, 0.7fr);
  gap: 8px;
  margin-bottom: 4px;
  min-width: 0;

  @media (max-width: 600px) {
    grid-template-columns: minmax(0, 1.15fr) repeat(2, minmax(64px, 0.85fr)) minmax(50px, 0.6fr);
    gap: 6px;
  }

  @media (max-width: 360px) {
    grid-template-columns: minmax(0, 1fr) repeat(2, minmax(56px, 0.75fr)) minmax(46px, 0.6fr);
  }
`;

export const MovementLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  min-width: 0;
  overflow-wrap: anywhere;
`;

export const DegreeInput = styled.input<{ $status: 'normal' | 'limited' | 'severe' }>`
  box-sizing: border-box;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid ${({ $status }) =>
    $status === 'normal' ? 'rgba(96, 192, 240, 0.15)'
    : $status === 'limited' ? 'rgba(198, 168, 75, 0.3)'
    : 'rgba(201, 42, 84, 0.3)'};
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  text-align: center;
  min-height: 44px;
  min-width: 0;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
    border-color: var(--accent-primary, #60C0F0);
  }

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.25));
  }
`;

export const NormalBadge = styled.span`
  ${swanPill}
  justify-content: center;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  text-align: center;
  min-height: 36px;
  padding: 4px 6px;
`;

export const SideLabel = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  color: var(--text-muted, rgba(224, 236, 244, 0.75));
  text-align: center;
  padding-bottom: 2px;
  overflow-wrap: anywhere;
`;

export const BtnRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 10px;
  margin-top: 16px;
`;

export const Btn = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  ${swanClientActionButton}
  --swan-action-border: ${({ $variant }) =>
    $variant === 'primary' ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, rgba(96, 192, 240, 0.18))'};
  --swan-action-bg: ${({ $variant }) =>
    $variant === 'primary'
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, var(--surface-accent, #003080) 42%)'
      : 'color-mix(in srgb, var(--surface-accent, #003080) 60%, transparent)'};
  --swan-action-fg: var(--text-primary, #E0ECF4);
  gap: 8px;
  padding: 10px 18px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  overflow-wrap: anywhere;

  &:disabled { opacity: 0.4; cursor: not-allowed; }

  svg {
    flex-shrink: 0;
  }
`;

export const NotesArea = styled.textarea`
  width: 100%;
  padding: 10px 14px;
  min-height: 80px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  resize: vertical;
  margin-top: 12px;

  &:focus { outline: none; border-color: var(--accent-primary, #60C0F0); }
  &::placeholder { color: var(--text-muted, rgba(224, 236, 244, 0.3)); }
`;

export const StatusMsg = styled.div<{ $type: 'success' | 'error' }>`
  padding: 10px 14px;
  border-radius: 8px;
  margin-top: 12px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  background: ${({ $type }) =>
    $type === 'success'
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)'
      : 'rgba(201, 42, 84, 0.1)'};
  color: ${({ $type }) => $type === 'success' ? 'var(--accent-primary, #60C0F0)' : 'var(--text-primary, #E0ECF4)'};
  border: 1px solid ${({ $type }) =>
    $type === 'success'
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)'
      : 'rgba(201, 42, 84, 0.3)'};
`;
