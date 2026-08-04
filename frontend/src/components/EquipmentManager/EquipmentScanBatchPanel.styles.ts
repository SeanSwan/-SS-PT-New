import styled, { css, keyframes } from 'styled-components';

const pipPulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.18); opacity: 0.75; }
`;

export const Panel = styled.section`
  padding: 16px;
  margin: 8px 0 16px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent), color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)),
    var(--surface-elevated, rgba(0, 32, 96, 0.48));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
`;

export const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

export const Eyebrow = styled.div`
  color: var(--accent-primary, #60C0F0);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const Summary = styled.div`
  margin-top: 6px;
  color: var(--text-primary, #E0ECF4);
  font-size: 14px;
  font-weight: 700;
`;

export const SceneSummary = styled.p`
  margin: 12px 0 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.74));
  font-size: 13px;
`;

export const Section = styled.div`
  margin-top: 14px;
`;

export const PreviewSection = styled.div`
  margin-top: 14px;
`;

export const PreviewFrame = styled.div`
  position: relative;
  display: inline-block;
  width: 100%;
  max-width: 620px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 8px;
  background: var(--surface-base, #001040);
`;

export const PreviewImage = styled.img`
  display: block;
  width: 100%;
  max-height: 280px;
  object-fit: contain;
`;

export const PreviewOverlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

/* Corner-bracket constellation treatment (blueprint §10a #2 — LOCKED):
   brackets are drawn as 8 gradient strips (two per corner), so the box reads
   as "Swan Coach saw this," not CV-debugger chrome. Uncertain items switch to
   a dashed full border + pulsing pip; duplicates go Gilded Fern. When any box
   is focused, the focused box dims everything OUTSIDE itself via the
   100vmax box-shadow spotlight (clipped by PreviewFrame's overflow). */
const bracketColor = (color: string) => css`
  background:
    linear-gradient(${color}, ${color}) left 0 top 0 / 16px 2px,
    linear-gradient(${color}, ${color}) left 0 top 0 / 2px 16px,
    linear-gradient(${color}, ${color}) right 0 top 0 / 16px 2px,
    linear-gradient(${color}, ${color}) right 0 top 0 / 2px 16px,
    linear-gradient(${color}, ${color}) left 0 bottom 0 / 16px 2px,
    linear-gradient(${color}, ${color}) left 0 bottom 0 / 2px 16px,
    linear-gradient(${color}, ${color}) right 0 bottom 0 / 16px 2px,
    linear-gradient(${color}, ${color}) right 0 bottom 0 / 2px 16px;
  background-repeat: no-repeat;
`;

export const DetectionBox = styled.button`
  position: absolute;
  min-width: 18px;
  min-height: 18px;
  padding: 0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  pointer-events: auto;
  transition: opacity 160ms ease;
  ${bracketColor('var(--accent-primary, #60C0F0)')};
  filter: drop-shadow(0 0 8px color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent));

  &[data-status="possible"] {
    background: none;
    border: 2px dashed var(--accent-secondary, #8B5CF6);
    filter: drop-shadow(0 0 8px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent));
  }

  &[data-status="duplicate"] {
    ${bracketColor('var(--accent-warning, #C6A84B)')};
    filter: drop-shadow(0 0 8px color-mix(in srgb, var(--accent-warning, #C6A84B) 40%, transparent));
  }

  &[data-dimmed="true"] {
    opacity: 0.25;
  }

  &[data-focused="true"] {
    box-shadow: 0 0 0 100vmax rgba(10, 10, 15, 0.55);
  }

  &:focus-visible {
    outline: 2px solid var(--text-primary, #E0ECF4);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const PipDot = styled.span`
  position: absolute;
  top: -12px;
  left: -12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-base, #0A0A0F);
  border: 1.5px solid var(--accent-primary, #60C0F0);
  color: var(--accent-primary, #60C0F0);
  font-size: 12px;
  font-weight: 800;

  [data-status='possible'] & {
    border-color: var(--accent-secondary, #8B5CF6);
    color: var(--accent-secondary, #8B5CF6);
    animation: ${pipPulse} 1.6s ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }

  [data-status='duplicate'] & {
    border-color: var(--accent-warning, #C6A84B);
    color: var(--accent-warning, #C6A84B);
  }
`;

export const DegradedBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 12px;
  border-left: 3px solid var(--accent-warning, #C6A84B);
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent-warning, #C6A84B) 10%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 13px;
`;

export const DetectionLabel = styled.span`
  position: absolute;
  top: 4px;
  left: 4px;
  max-width: min(180px, calc(100% - 8px));
  padding: 3px 6px;
  overflow: hidden;
  border-radius: 6px;
  background: color-mix(in srgb, var(--surface-base, #001040) 88%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
export const SectionTitle = styled.div`
  color: var(--text-secondary, rgba(224, 236, 244, 0.76));
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
`;

export const ActionBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface-base, #001040) 44%, transparent);
`;

export const SelectionLabel = styled.label`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary, #E0ECF4);
  font-size: 13px;
  font-weight: 700;

  input {
    width: 20px;
    height: 20px;
    accent-color: var(--accent-primary, #60C0F0);

    &:focus-visible {
      outline: 2px solid var(--accent-secondary, #8B5CF6);
      outline-offset: 3px;
    }
  }
`;

export const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const ItemList = styled.div`
  display: grid;
  gap: 8px;
`;

export const ReviewRow = styled.div`
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface-base, #001040) 62%, transparent);

  @media (max-width: 520px) {
    grid-template-columns: 44px minmax(0, 1fr);

    button {
      grid-column: 1 / -1;
    }
  }
`;

export const SelectControl = styled.label`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  input {
    width: 20px;
    height: 20px;
    accent-color: var(--accent-primary, #60C0F0);

    &:focus-visible {
      outline: 2px solid var(--accent-secondary, #8B5CF6);
      outline-offset: 3px;
    }
  }
`;

export const ItemCopy = styled.div`
  min-width: 0;
`;

export const ItemName = styled.div`
  color: var(--text-primary, #E0ECF4);
  font-size: 14px;
  font-weight: 700;
`;

export const MetaLine = styled.div`
  color: var(--text-muted, rgba(224, 236, 244, 0.64));
  font-size: 12px;
  margin-top: 3px;
`;

export const MutedList = styled.ul`
  display: grid;
  gap: 6px;
  list-style: none;
  margin: 0;
  padding: 0;
`;

export const CandidateRow = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface-base, #001040) 58%, transparent);

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;
export const MutedRow = styled.li`
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 12px;
`;

export const ActionButton = styled.button`
  min-height: 44px;
  padding: 8px 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  border-radius: 8px;
  background: var(--button-primary-bg, #002060);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 3px;
  }
`;

export const ReviewButton = styled(ActionButton)``;

export const DangerActionButton = styled(ActionButton)`
  background: color-mix(in srgb, var(--color-error, #FF4757) 22%, var(--surface-base, #001040));
  border-color: color-mix(in srgb, var(--color-error, #FF4757) 48%, transparent);
`;

export const GhostActionButton = styled(ActionButton)`
  background: transparent;
`;

export const DismissButton = styled(ActionButton)`
  background: transparent;
`;