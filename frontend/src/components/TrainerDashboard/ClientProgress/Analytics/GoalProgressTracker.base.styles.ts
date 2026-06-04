import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

export const SummaryCard = styled.div<{ $accentColor: string }>`
  align-items: center;
  background: color-mix(in srgb, ${({ $accentColor }) => $accentColor} 14%, transparent);
  border: 1px solid color-mix(in srgb, ${({ $accentColor }) => $accentColor} 32%, transparent);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  text-align: center;
  backdrop-filter: blur(12px);
`;

export const StatValue = styled.h4`
  color: var(--text-primary, #e2e8f0);
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
`;

export const StatLabel = styled.span`
  color: var(--text-secondary, #94a3b8);
  font-size: 0.8rem;
`;

export const GlassPanel = styled.div`
  background: var(--bg-elevated, #111827);
  border: 1px solid var(--border-primary, rgba(96, 192, 240, 0.18));
  border-radius: 16px;
  box-shadow: var(--shadow-strong, 0 18px 38px rgba(0, 0, 0, 0.32));
  padding: 24px;
  backdrop-filter: blur(12px);
`;

export const PanelHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 24px;
`;

export const PanelTitle = styled.h3`
  align-items: center;
  color: var(--text-primary, #e2e8f0);
  display: flex;
  font-size: 1.15rem;
  font-weight: 600;
  gap: 8px;
  margin: 0;
`;

export const PanelTitleWithGap = styled(PanelTitle)`
  margin-bottom: 16px;
`;

export const ControlsRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

export const StyledSelect = styled.select`
  appearance: auto;
  background: var(--surface-muted, rgba(96, 192, 240, 0.08));
  border: 1px solid var(--border-primary, rgba(96, 192, 240, 0.22));
  border-radius: 8px;
  color: var(--text-primary, #e2e8f0);
  cursor: pointer;
  font-size: 0.875rem;
  min-height: 44px;
  min-width: 130px;
  outline: none;
  padding: 8px 12px;

  &:focus {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  }

  option {
    background: var(--bg-elevated, #111827);
    color: var(--text-primary, #e2e8f0);
  }
`;

export const AccentButton = styled.button`
  align-items: center;
  background: var(--accent-primary, #60C0F0);
  border: none;
  border-radius: 8px;
  color: var(--button-primary-text, #002060);
  cursor: pointer;
  display: inline-flex;
  font-size: 0.875rem;
  font-weight: 600;
  gap: 6px;
  min-height: 44px;
  min-width: 44px;
  padding: 10px 18px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--accent-primary-hover, #33ffff);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
`;

export const GhostButton = styled.button`
  align-items: center;
  background: transparent;
  border: 1px solid var(--border-primary, rgba(96, 192, 240, 0.22));
  border-radius: 8px;
  color: var(--text-secondary, #94a3b8);
  cursor: pointer;
  display: inline-flex;
  font-size: 0.875rem;
  font-weight: 500;
  gap: 6px;
  min-height: 44px;
  min-width: 44px;
  padding: 10px 18px;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;

  &:hover {
    background: var(--surface-muted, rgba(96, 192, 240, 0.08));
    border-color: var(--accent-primary, #60C0F0);
    color: var(--text-primary, #e2e8f0);
  }
`;

export const IconBtn = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-secondary, #94a3b8);
  cursor: pointer;
  display: inline-flex;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  padding: 10px;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: var(--surface-muted, rgba(96, 192, 240, 0.08));
    color: var(--accent-primary, #60C0F0);
  }
`;

export const EmptyState = styled.div`
  background: var(--surface-muted, rgba(96, 192, 240, 0.08));
  border: 1px dashed var(--border-primary, rgba(96, 192, 240, 0.22));
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  min-height: 132px;
  padding: 20px;
`;

export const BodyText = styled.p<{ $danger?: boolean }>`
  color: ${({ $danger }) => ($danger ? 'var(--feedback-error, #FF6B6B)' : 'var(--text-primary, #e2e8f0)')};
  font-size: 0.875rem;
  line-height: 1.6;
  margin: 0 0 12px;
`;

export const FormGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const FieldLabel = styled.label`
  color: var(--text-secondary, #94a3b8);
  display: flex;
  flex-direction: column;
  font-size: 0.75rem;
  font-weight: 700;
  gap: 8px;
  text-transform: uppercase;
`;

export const TextInput = styled.input`
  background: var(--surface-muted, rgba(96, 192, 240, 0.08));
  border: 1px solid var(--border-primary, rgba(96, 192, 240, 0.22));
  border-radius: 8px;
  color: var(--text-primary, #e2e8f0);
  font-size: 0.9rem;
  min-height: 44px;
  outline: none;
  padding: 10px 12px;

  &:focus {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  }
`;
