/**
 * Template-backed challenge draft creator styles.
 */

import styled from 'styled-components';

export const DraftPanel = styled.form`
  display: grid;
  gap: 16px;
  margin-bottom: 18px;
  padding: clamp(16px, 2vw, 22px);
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 28%, transparent);
  background: linear-gradient(145deg, color-mix(in srgb, var(--surface-primary, #002060) 70%, var(--bg-surface, #141419) 30%), color-mix(in srgb, var(--bg-surface, #141419) 92%, transparent));
`;

export const DraftHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  @media (max-width: 640px) { flex-direction: column; }
`;

export const DraftTitleGroup = styled.div`
  display: grid;
  gap: 4px;
`;

export const DraftKicker = styled.span`
  color: var(--accent-gold, #C6A84B);
  font-size: 0.74rem;
  font-weight: 900;
  text-transform: uppercase;
`;

export const DraftTitle = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: clamp(1.2rem, 2vw, 1.55rem);
`;

export const TemplateSummary = styled.p`
  margin: 0;
  color: var(--text-secondary, #B8C7D9);
  line-height: 1.55;
`;

export const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  @media (max-width: 720px) { grid-template-columns: 1fr; }
`;

export const Field = styled.label`
  display: grid;
  gap: 6px;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.84rem;
  font-weight: 800;
`;

export const Input = styled.input`
  min-height: 44px;
  width: 100%;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 82%, var(--surface-secondary, #003080) 18%);
  color: var(--text-primary, #E0ECF4);
  padding: 10px 12px;
  font: inherit;
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const TextArea = styled.textarea`
  min-height: 96px;
  resize: vertical;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 82%, var(--surface-secondary, #003080) 18%);
  color: var(--text-primary, #E0ECF4);
  padding: 10px 12px;
  font: inherit;
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const FullWidthField = styled(Field)`
  grid-column: 1 / -1;
`;

export const StepList = styled.ol`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const StepItem = styled.li<{ $active?: boolean }>`
  min-height: 44px;
  display: grid;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 46%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent)'};
  background: ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 16%, var(--surface-secondary, #003080) 40%)'
    : 'color-mix(in srgb, var(--surface-secondary, #003080) 42%, var(--bg-base, #0A0A0F) 58%)'};
  color: var(--text-primary, #E0ECF4);
`;

export const StepButton = styled.button`
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  border: 0;
  border-radius: inherit;
  background: transparent;
  color: inherit;
  padding: 8px 10px;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 900;
  cursor: pointer;
  text-align: center;
  small {
    min-width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: color-mix(in srgb, var(--bg-base, #0A0A0F) 52%, transparent);
    color: var(--accent-gold, #C6A84B);
  }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const PreviewPanel = styled.section`
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 24%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 68%, var(--surface-primary, #002060) 32%);
`;

export const PreviewTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.95rem;
`;

export const PreviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  @media (max-width: 760px) { grid-template-columns: 1fr; }
`;

export const PreviewItem = styled.div`
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface-primary, #002060) 42%, transparent);
  span {
    color: var(--text-secondary, #B8C7D9);
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
  }
  strong {
    color: var(--text-primary, #E0ECF4);
    font-size: 0.86rem;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
  small {
    color: var(--text-secondary, #B8C7D9);
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
`;

export const SetupPanel = styled(PreviewPanel)`
  border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
`;

export const ActiveStepPanel = styled(PreviewPanel)`
  border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
  background: linear-gradient(145deg, color-mix(in srgb, var(--surface-primary, #002060) 48%, transparent), color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent));
`;

export const SetupGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  @media (max-width: 760px) { grid-template-columns: 1fr; }
`;

export const SetupItem = styled(PreviewItem)`
  background: color-mix(in srgb, var(--surface-secondary, #003080) 32%, transparent);
`;

export const ReadinessBadge = styled.strong<{ $ready: boolean }>`
  width: fit-content;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid ${({ $ready }) => $ready
    ? 'color-mix(in srgb, var(--success, #3DDC97) 38%, transparent)'
    : 'color-mix(in srgb, var(--accent-gold, #C6A84B) 42%, transparent)'};
  background: ${({ $ready }) => $ready
    ? 'color-mix(in srgb, var(--success, #3DDC97) 14%, transparent)'
    : 'color-mix(in srgb, var(--accent-gold, #C6A84B) 14%, transparent)'};
`;

export const RequirementList = styled.ul`
  margin: 0;
  padding-left: 18px;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.86rem;
  line-height: 1.45;
`;

export const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  @media (max-width: 430px) { flex-direction: column; }
`;

export const ActionButton = styled.button<{ $variant?: 'primary' | 'ghost' }>`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid ${({ $variant }) => $variant === 'primary' ? 'var(--accent-primary, #60C0F0)' : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 20%, transparent)'};
  background: ${({ $variant }) => $variant === 'primary' ? 'color-mix(in srgb, var(--surface-secondary, #003080) 72%, var(--accent-primary, #60C0F0) 18%)' : 'transparent'};
  color: var(--text-primary, #E0ECF4);
  font-weight: 900;
  cursor: pointer;
  &:disabled { cursor: wait; opacity: 0.65; }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const Feedback = styled.div<{ $tone: 'error' | 'success' }>`
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${({ $tone }) => $tone === 'error' ? 'color-mix(in srgb, var(--error, #FF6B6B) 45%, transparent)' : 'color-mix(in srgb, var(--success, #3DDC97) 45%, transparent)'};
  color: var(--text-primary, #E0ECF4);
  background: ${({ $tone }) => $tone === 'error' ? 'color-mix(in srgb, var(--error, #FF6B6B) 12%, transparent)' : 'color-mix(in srgb, var(--success, #3DDC97) 12%, transparent)'};
`;