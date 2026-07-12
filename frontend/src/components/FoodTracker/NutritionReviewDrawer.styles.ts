import styled, { css } from 'styled-components';

export const DrawerBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  justify-content: flex-end;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
  backdrop-filter: blur(8px);
`;

export const DrawerPanel = styled.section`
  width: min(100%, 720px);
  min-height: 100%;
  max-height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px;
  border-left: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  background: var(--bg-elevated, #141419);
  box-shadow: -24px 0 56px color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);

  &:focus { outline: none; }

  @media (max-width: 560px) {
    padding: 16px 14px max(16px, env(safe-area-inset-bottom));
  }
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
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const DrawerTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 850 1.28rem 'Plus Jakarta Sans', sans-serif;
`;

export const DrawerText = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 76%, transparent);
  font-size: 0.9rem;
  line-height: 1.5;
`;

const focusRing = css`
  outline: 2px solid var(--accent-primary, #60C0F0);
  outline-offset: 2px;
`;

export const CloseButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;

  &:focus-visible { ${focusRing} }
  &:disabled { opacity: 0.58; cursor: not-allowed; }
`;

export const ProvenanceStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const Pill = styled.span`
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  border-radius: 999px;
  color: var(--text-primary, #E0ECF4);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, var(--bg-surface, #1A1A24));
  font: 700 0.75rem 'Sora', sans-serif;
`;

export const TopFields = styled.div`
  display: grid;
  grid-template-columns: minmax(10rem, 0.8fr) minmax(12rem, 1.2fr);
  gap: 10px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const ReviewNotes = styled.ul`
  margin: 0;
  padding: 12px 12px 12px 30px;
  border-left: 3px solid var(--accent-gold, #C6A84B);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 9%, var(--bg-surface, #1A1A24));
  color: var(--text-primary, #E0ECF4);
  line-height: 1.5;
`;

export const FoodList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const FoodRow = styled.article`
  display: grid;
  grid-template-columns: minmax(12rem, 1fr) minmax(8rem, auto);
  gap: 12px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-radius: 8px;
  background: var(--bg-surface, #1A1A24);

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const FieldGroup = styled.label`
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent);
  font-size: 0.76rem;
  font-weight: 800;
`;

const controlStyles = css`
  min-height: 44px;
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  border-radius: 8px;
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  padding: 0 10px;

  &:focus-visible { ${focusRing} }
`;

export const TextInput = styled.input`
  ${controlStyles}
  font-size: 0.92rem;
`;

export const MealSelect = styled.select`
  ${controlStyles}
`;

export const DateInput = styled.input`
  ${controlStyles}
`;

export const ServingGrid = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: minmax(10rem, 1.2fr) minmax(7rem, 0.6fr) minmax(7rem, 0.7fr);
  gap: 8px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const MacroGrid = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 5.4rem), 1fr));
  gap: 8px;
`;

export const MacroInput = styled.input`
  ${controlStyles}
  text-align: center;
`;

export const ReconciliationPanel = styled.div<{ $warning?: boolean }>`
  grid-column: 1 / -1;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 9px 10px;
  border-left: 3px solid ${({ $warning }) => ($warning
    ? 'var(--accent-gold, #C6A84B)'
    : 'var(--accent-primary, #60C0F0)')};
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, var(--bg-surface, #1A1A24));
  color: var(--text-primary, #E0ECF4);
  font-size: 0.8rem;
`;

export const ActionRow = styled.div`
  position: sticky;
  bottom: -22px;
  z-index: 2;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 0 22px;
  background: var(--bg-elevated, #141419);

  @media (max-width: 560px) {
    position: sticky;
    bottom: -16px;
    display: grid;
    grid-template-columns: 1fr;
    width: 100%;
    margin-top: auto;
    padding: 10px 0 calc(10px + env(safe-area-inset-bottom));
    border-top: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  }
`;

const actionBase = css`
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 8px;
  font-weight: 800;
  cursor: pointer;

  &:focus-visible { ${focusRing} }
  &:disabled { opacity: 0.58; cursor: not-allowed; }
`;

export const SaveButton = styled.button`
  ${actionBase}
  flex: 2 1 16rem;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent);
  background: var(--primary, #002060);
  color: var(--text-primary, #E0ECF4);
  box-shadow: 0 0 18px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 32%, transparent);
`;

export const SecondaryButton = styled.button`
  ${actionBase}
  flex: 1 1 12rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  background: var(--button-secondary-bg, #003080);
  color: var(--text-primary, #E0ECF4);
  box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
`;

export const TertiaryButton = styled.button`
  ${actionBase}
  flex: 0 1 7rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
`;

export const Status = styled.div<{ $error?: boolean }>`
  display: flex;
  align-items: center;
  gap: 7px;
  color: ${({ $error }) => ($error
    ? 'var(--accent-error, #ff8585)'
    : 'var(--accent-primary, #60C0F0)')};
  font-size: 0.86rem;
`;
