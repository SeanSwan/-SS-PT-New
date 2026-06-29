import styled from 'styled-components';

export const DrawerBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  justify-content: flex-end;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 62%, transparent);
  backdrop-filter: blur(10px);
`;

export const DrawerPanel = styled.section`
  width: min(100%, 620px);
  min-height: 100%;
  max-height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px;
  border-left: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  background:
    radial-gradient(circle at 24% 0%, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent), transparent 32%),
    linear-gradient(180deg, var(--bg-elevated, #141419), var(--bg-base, #0A0A0F));
  box-shadow: -24px 0 56px color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent);
`;

export const DrawerHeader = styled.header`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
`;

export const HeaderCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`;

export const Eyebrow = styled.span`
  color: var(--accent-gold, #C6A84B);
  font: 800 0.72rem 'Sora', sans-serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const DrawerTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 850 1.28rem 'Plus Jakarta Sans', sans-serif;
`;

export const DrawerText = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent);
  font-size: 0.9rem;
  line-height: 1.5;
`;

export const CloseButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 84%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const ProvenanceStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const Pill = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  color: var(--text-primary, #E0ECF4);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  font: 700 0.75rem 'Sora', sans-serif;
`;

export const FoodList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const FoodRow = styled.article`
  display: grid;
  grid-template-columns: minmax(12rem, 1fr) minmax(7rem, auto);
  gap: 10px;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 78%, transparent);

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const FieldGroup = styled.label`
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent);
  font-size: 0.74rem;
  font-weight: 800;
`;

export const TextInput = styled.input`
  min-height: 44px;
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-radius: 10px;
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  padding: 0 10px;
  font-size: 0.92rem;
`;

export const MealSelect = styled.select`
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-radius: 10px;
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  padding: 0 10px;
`;

export const MacroGrid = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(5, minmax(4.6rem, 1fr));
  gap: 8px;

  @media (max-width: 560px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const MacroInput = styled.input`
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-radius: 10px;
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  padding: 0 8px;
  text-align: center;
`;

export const ActionRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

export const SaveButton = styled.button`
  min-height: 48px;
  flex: 1 1 14rem;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 46%, transparent);
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary, #002060), color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, var(--primary, #002060)));
  color: var(--text-primary, #E0ECF4);
  font-weight: 850;
  cursor: pointer;
  box-shadow: 0 0 18px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 32%, transparent);

  &:disabled { opacity: 0.58; cursor: not-allowed; }
`;

export const SecondaryButton = styled.button`
  min-height: 48px;
  flex: 0 1 10rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 78%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-weight: 750;
  cursor: pointer;
`;

export const Status = styled.div<{ $error?: boolean }>`
  display: flex;
  align-items: center;
  gap: 7px;
  color: ${({ $error }) => ($error ? 'var(--accent-error, #ff8585)' : 'var(--accent-primary, #60C0F0)')};
  font-size: 0.86rem;
`;
