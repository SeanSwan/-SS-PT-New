import styled from 'styled-components';

export const ComposerShell = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  gap: 16px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

export const ControlStack = styled.aside`
  display: grid;
  gap: 12px;
  align-content: start;
`;

export const PresetButton = styled.button<{ $active: boolean }>`
  min-height: 64px;
  width: 100%;
  padding: 12px;
  border: 1px solid ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 58%, transparent)'
    : 'var(--border-soft, color-mix(in srgb, var(--text-primary, #E0ECF4) 12%, transparent))'};
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  background: ${({ $active }) => $active
    ? 'linear-gradient(135deg, color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent), color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, transparent))'
    : 'color-mix(in srgb, var(--bg-surface, #141419) 76%, transparent)'};
  box-shadow: ${({ $active }) => $active
    ? '0 0 22px color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent)'
    : 'none'};
  cursor: pointer;
  text-align: left;
  transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1), border-color 180ms ease;

  &:hover,
  &:focus-visible {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 48%, transparent);
    outline: none;
    transform: translateY(-1px);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover,
    &:focus-visible { transform: none; }
  }
`;

export const PresetLabel = styled.span`
  display: block;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 800;
`;

export const PresetMeta = styled.span`
  display: block;
  margin-top: 5px;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 74%, transparent));
  font-size: 12px;
  line-height: 1.4;
`;

export const ControlPanel = styled.div`
  display: grid;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent));
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #141419) 74%, transparent);
`;

export const ViewSwitch = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
`;

export const ViewButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  border: 1px solid ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 58%, transparent)'
    : 'var(--border-soft, color-mix(in srgb, var(--text-primary, #E0ECF4) 12%, transparent))'};
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  background: ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent)'
    : 'transparent'};
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const RangeField = styled.label`
  display: grid;
  gap: 8px;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 76%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;

  input {
    width: 100%;
    min-height: 44px;
    accent-color: var(--accent-primary, #60C0F0);
  }
`;

export const ToggleRow = styled.label`
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 800;

  input {
    width: 22px;
    height: 22px;
    accent-color: var(--accent-primary, #60C0F0);
  }
`;

export const Stage = styled.article`
  position: relative;
  min-height: 520px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--bg-primary, #002060) 42%, transparent), transparent),
    color-mix(in srgb, var(--bg-base, #0A0A0F) 94%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);
`;

export const StageHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  padding: 18px;
  border-bottom: 1px solid var(--border-soft, color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent));

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

export const StageEyebrow = styled.p`
  margin: 0 0 7px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
`;

export const StageTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 26px;
  line-height: 1.08;
`;

export const StageCopy = styled.p`
  max-width: 680px;
  margin: 10px 0 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent));
  font-size: 13px;
  line-height: 1.6;
`;

export const ScoreRing = styled.div<{ $score: number }>`
  display: grid;
  width: 104px;
  height: 104px;
  place-items: center;
  border-radius: 50%;
  color: var(--text-primary, #E0ECF4);
  background:
    radial-gradient(circle at center, var(--bg-surface, #141419) 52%, transparent 54%),
    conic-gradient(var(--accent-primary, #60C0F0) ${({ $score }) => $score}%, color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent) 0);
  font-family: 'Fira Code', monospace;
  font-size: 20px;
  font-weight: 900;
`;

export const CanvasGrid = styled.div<{ $density: number }>`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: ${({ $density }) => `${Math.max(6, 18 - $density / 8)}px`};
  padding: 18px;
  transition: gap 180ms ease;

  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

export const CanvasNode = styled.div<{ $span: number; $tone: string; $lift: number }>`
  grid-column: span ${({ $span }) => $span};
  min-height: ${({ $lift }) => 90 + $lift}px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, ${({ $tone }) => $tone} 40%, transparent);
  border-radius: 8px;
  background: linear-gradient(145deg, color-mix(in srgb, ${({ $tone }) => $tone} 18%, transparent), color-mix(in srgb, var(--bg-surface, #141419) 82%, transparent));
  transform: translateY(${({ $lift }) => -Math.round($lift / 6)}px);
  transition: transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1), min-height 220ms ease;

  @media (prefers-reduced-motion: reduce) { transform: none; transition: none; }

  @media (max-width: 680px) {
    grid-column: span 12;
  }
`;

export const NodeLabel = styled.span`
  display: block;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 900;
`;

export const NodeMeta = styled.span`
  display: block;
  margin-top: 8px;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent));
  font-size: 12px;
  line-height: 1.45;
`;

export const PacketPanel = styled.div`
  display: grid;
  gap: 12px;
  padding: 18px;
`;

export const PacketBlock = styled.div`
  padding: 14px;
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent));
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #141419) 74%, transparent);
`;

export const PacketText = styled.p`
  margin: 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent));
  font-size: 13px;
  line-height: 1.55;
`;

export const CopyButton = styled.button`
  min-height: 44px;
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--accent-tertiary, #C6A84B) 42%, transparent);
  border-radius: 8px;
  color: var(--bg-base, #0A0A0F);
  background: var(--accent-tertiary, #C6A84B);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 900;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 18px 18px;
`;

export const Tag = styled.span`
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 9%, transparent);
  font-family: 'Fira Code', monospace;
  font-size: 11px;
`;
