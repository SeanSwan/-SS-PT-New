import styled, { css, keyframes } from 'styled-components';

const nutritionTheme = {
  panel: 'color-mix(in srgb, var(--bg-elevated, #141419) 78%, transparent)',
  panelBorder: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)',
  input: 'color-mix(in srgb, var(--bg-elevated, #141419) 56%, transparent)',
  inputBorder: 'color-mix(in srgb, var(--text-primary, #E0ECF4) 15%, transparent)',
  inputBorderSoft: 'color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent)',
  inputWash: 'color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent)',
  inputWashSoft: 'color-mix(in srgb, var(--text-primary, #E0ECF4) 3%, transparent)',
  accent: 'var(--accent-primary, #60C0F0)',
  accentSecondary: 'var(--accent-secondary, #8B5CF6)',
  accentGlow: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent)',
  accentGlowStrong: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent)',
  secondaryWash: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 6%, transparent)',
  secondaryBorder: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent)',
  secondaryFocus: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)',
  danger: 'var(--accent-error, #C92A54)',
  dangerWash: 'color-mix(in srgb, var(--accent-error, #C92A54) 15%, transparent)',
  dangerBorder: 'color-mix(in srgb, var(--accent-error, #C92A54) 40%, transparent)',
  dangerGlow: 'color-mix(in srgb, var(--accent-error, #C92A54) 25%, transparent)',
  success: 'var(--accent-success, #22C55E)',
  successWash: 'color-mix(in srgb, var(--accent-success, #22C55E) 15%, transparent)',
  successBorder: 'color-mix(in srgb, var(--accent-success, #22C55E) 40%, transparent)',
  text: 'var(--text-primary, #E0ECF4)',
  textSoft: 'var(--text-secondary, rgba(224, 236, 244, 0.7))',
  textMuted: 'var(--text-muted, rgba(224, 236, 244, 0.5))',
  surface: 'var(--bg-surface, #1A1A24)',
  shadow: '0 8px 32px color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent)',
} as const;

const spin = keyframes`0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}`;
const toastSlideIn = keyframes`from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}`;
const toastSlideOut = keyframes`from{transform:translateY(0);opacity:1}to{transform:translateY(100%);opacity:0}`;
const errorShake = keyframes`0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}`;

const focusRing = css`
  outline: none;
  border-color: ${nutritionTheme.accent};
  box-shadow: 0 0 0 3px ${nutritionTheme.accentGlow};
`;

const buttonBase = css`
  min-height: 44px;
  border-radius: 12px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

  &:focus-visible { ${focusRing} }
  &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

export const FormWrapper = styled.div`
  padding: 24px;
  border-radius: 12px;
  background: ${nutritionTheme.panel};
  border: 1px solid ${nutritionTheme.panelBorder};
  backdrop-filter: blur(16px);
  color: ${nutritionTheme.text};
`;

export const Title = styled.h2`
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${nutritionTheme.text};
  font-size: 1.5rem;
  font-weight: 600;
`;

export const StatusRow = styled.div`display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;`;

export const Chip = styled.span<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 500;
  background: ${({ $active }) => $active ? nutritionTheme.successWash : nutritionTheme.inputWash};
  color: ${({ $active }) => $active ? nutritionTheme.success : nutritionTheme.textMuted};
  border: 1px solid ${({ $active }) => $active ? nutritionTheme.successBorder : nutritionTheme.inputBorderSoft};
  svg { width: 14px; height: 14px; }
`;

export const ErrorAlert = styled.div`
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: ${nutritionTheme.dangerWash};
  border: 1px solid ${nutritionTheme.dangerBorder};
  color: ${nutritionTheme.danger};
  animation: ${errorShake} 0.35s ease-in-out;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export const FormGrid = styled.div`display:grid;gap:16px;`;
export const FieldGroup = styled.div`display:flex;flex-direction:column;gap:8px;`;
export const Label = styled.label`color:${nutritionTheme.textSoft};font-size:0.9rem;font-weight:600;`;

export const StyledSelect = styled.select`
  min-height: 44px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid ${nutritionTheme.inputBorder};
  background: ${nutritionTheme.input};
  color: ${nutritionTheme.text};
  font-size: 1rem;
  &:focus { ${focusRing} }
  option { background: ${nutritionTheme.surface}; color: ${nutritionTheme.text}; }
`;

export const FoodCard = styled.div`
  padding: 20px;
  border-radius: 12px;
  border: 1px solid ${nutritionTheme.inputBorderSoft};
  background: ${nutritionTheme.inputWashSoft};
`;

export const FoodCardHeader = styled.div`display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;`;
export const FoodCardTitle = styled.span`color:${nutritionTheme.text};font-weight:700;`;

export const IconBtn = styled.button<{ $danger?: boolean; $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: 1px solid ${({ $danger }) => $danger ? nutritionTheme.dangerBorder : nutritionTheme.inputBorderSoft};
  background: ${({ $danger }) => $danger ? nutritionTheme.dangerWash : nutritionTheme.inputWash};
  color: ${({ $danger }) => $danger ? nutritionTheme.danger : nutritionTheme.textSoft};
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ $disabled }) => $disabled ? 0.5 : 1};
  &:focus-visible { ${focusRing} }
  svg { width: 18px; height: 18px; }
`;

export const FoodFieldGrid = styled.div`display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;`;
export const MacroFieldGrid = styled.div`display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;`;
export const InputWithUnit = styled.div`position:relative;`;
export const UnitSuffix = styled.span`position:absolute;right:12px;top:50%;transform:translateY(-50%);color:${nutritionTheme.textMuted};font-size:0.85rem;`;

export const StyledInput = styled.input<{ $hasUnit?: boolean; $hasError?: boolean }>`
  width: 100%;
  min-height: 44px;
  padding: ${({ $hasUnit }) => $hasUnit ? '12px 48px 12px 16px' : '12px 16px'};
  border-radius: 8px;
  border: 1px solid ${({ $hasError }) => $hasError ? nutritionTheme.dangerBorder : nutritionTheme.inputBorder};
  background: ${nutritionTheme.input};
  color: ${nutritionTheme.text};
  font-size: 1rem;
  &:focus { ${focusRing} }
  &::placeholder { color: ${nutritionTheme.textMuted}; }
`;

export const HelperText = styled.small`color:${nutritionTheme.textMuted};font-size:0.75rem;`;
export const FieldError = styled.span`color:${nutritionTheme.danger};font-size:0.8rem;`;

export const AddButton = styled.button`
  ${buttonBase}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: 1px dashed ${nutritionTheme.secondaryBorder};
  background: ${nutritionTheme.secondaryWash};
  color: ${nutritionTheme.accentSecondary};
  &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px ${nutritionTheme.accentGlow}; }
  svg { width: 18px; height: 18px; }
`;

export const SummaryHeading = styled.h3`margin:0 0 12px;color:${nutritionTheme.text};font-size:1.1rem;`;
export const SummaryGrid = styled.div`display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;`;
export const SummaryCard = styled.div`padding:12px;border-radius:8px;background:${nutritionTheme.inputWash};border:1px solid ${nutritionTheme.inputBorderSoft};`;
export const SummaryLabel = styled.span`display:block;color:${nutritionTheme.textMuted};font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;`;
export const SummaryValue = styled.span`display:block;color:${nutritionTheme.text};font-size:1.25rem;font-weight:700;margin-top:4px;`;

export const SubmitButton = styled.button<{ $loading?: boolean }>`
  ${buttonBase}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 28px;
  border: 1px solid ${nutritionTheme.accentGlowStrong};
  background: linear-gradient(135deg, ${nutritionTheme.accent}, ${nutritionTheme.accentSecondary});
  color: var(--bg-base, #0A0A0F);
  box-shadow: 0 0 20px ${nutritionTheme.accentGlow};
  ${({ $loading }) => $loading && css`opacity:0.8;pointer-events:none;`}
  &:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 0 32px ${nutritionTheme.accentGlowStrong}; }
  svg { width: 20px; height: 20px; }
`;

export const Spinner = styled.span`
  width: 18px;
  height: 18px;
  border: 2px solid color-mix(in srgb, var(--bg-base, #0A0A0F) 30%, transparent);
  border-top-color: var(--bg-base, #0A0A0F);
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export const ToastOverlay = styled.div<{ $exiting: boolean }>`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  animation: ${({ $exiting }) => $exiting ? toastSlideOut : toastSlideIn} 0.3s ease-out;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export const ToastContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: min(360px, calc(100vw - 48px));
  padding: 16px 20px;
  border-radius: 12px;
  background: ${nutritionTheme.success};
  color: var(--bg-base, #0A0A0F);
  box-shadow: ${nutritionTheme.shadow};
  font-weight: 700;
`;

export const ToastCloseBtn = styled.button`
  min-width: 44px;
  min-height: 44px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 1.2rem;
`;

export const SavedMealCard = styled.div`
  display: grid;
  gap: 10px;
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 12px;
  background: ${nutritionTheme.successWash};
  border: 1px solid ${nutritionTheme.successBorder};
`;

export const SavedMealHeader = styled.div`display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;`;
export const SavedMealTitle = styled.strong`color:${nutritionTheme.success};font-size:1rem;`;
export const SavedMealMeta = styled.span`color:${nutritionTheme.textSoft};font-size:0.9rem;`;
export const SavedMealActions = styled.div`display:flex;flex-wrap:wrap;gap:8px;`;

export const SecondaryButton = styled.button<{ $danger?: boolean }>`
  ${buttonBase}
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid ${({ $danger }) => $danger ? nutritionTheme.dangerBorder : nutritionTheme.inputBorder};
  background: ${({ $danger }) => $danger ? nutritionTheme.dangerWash : nutritionTheme.inputWash};
  color: ${({ $danger }) => $danger ? nutritionTheme.danger : nutritionTheme.text};
  svg { width: 16px; height: 16px; }
`;
