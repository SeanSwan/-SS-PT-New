import styled from 'styled-components';

export const DockWrap = styled.section`
  margin: 1rem 0;
`;

export const CollapsedButton = styled.button`
  min-height: 48px;
  width: 100%;
  border: 1px solid var(--border-glow, rgba(96, 192, 240, 0.38));
  border-radius: 8px;
  background:
    linear-gradient(135deg, var(--surface-primary, #002060), var(--surface-elevated, #141419)),
    var(--surface-primary, #002060);
  color: var(--text-primary, #e0ecf4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.8rem 1rem;
  cursor: pointer;
  box-shadow: 0 12px 32px var(--shadow-primary, rgba(0, 32, 96, 0.32));

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8b5cf6);
    outline-offset: 3px;
  }
`;

export const CollapsedLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 800;
  letter-spacing: 0;
`;

export const DockPanel = styled.div`
  border: 1px solid var(--border-glow, rgba(96, 192, 240, 0.34));
  border-radius: 8px;
  background:
    linear-gradient(145deg, var(--surface-primary, #002060), var(--surface-secondary, #003080) 48%, var(--surface-elevated, #141419)),
    var(--surface-primary, #002060);
  color: var(--text-primary, #e0ecf4);
  box-shadow: 0 18px 44px var(--shadow-primary, rgba(0, 32, 96, 0.34));
  overflow: hidden;
`;

export const DockHeader = styled.div`
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.12));

  @media (max-width: 640px) {
    align-items: stretch;
  }
`;

export const DockTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.7rem;

  strong {
    display: block;
    font-size: 1rem;
    line-height: 1.2;
  }

  span {
    color: var(--text-secondary, rgba(224, 236, 244, 0.76));
    display: block;
    font-size: 0.85rem;
    line-height: 1.35;
    margin-top: 0.15rem;
  }
`;

export const IconBadge = styled.span`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary, #60c0f0);
  background: color-mix(in srgb, var(--accent-primary, #60c0f0) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 34%, transparent);
`;

export const IconButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.16));
  background: color-mix(in srgb, var(--surface-elevated, #141419) 86%, transparent);
  color: var(--text-primary, #e0ecf4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8b5cf6);
    outline-offset: 3px;
  }
`;

export const DockBody = styled.div`
  display: grid;
  gap: 0.85rem;
  padding: 1rem;
`;

export const RequestArea = styled.div`
  display: grid;
  gap: 0.65rem;
`;

export const RequestTextarea = styled.textarea`
  min-height: 94px;
  width: 100%;
  resize: vertical;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.18));
  background: var(--surface-elevated, #141419);
  color: var(--text-primary, #e0ecf4);
  padding: 0.85rem;
  font: inherit;
  line-height: 1.45;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.56));
  }

  &:focus {
    outline: 2px solid var(--focus-ring, #8b5cf6);
    outline-offset: 2px;
  }
`;

export const ActionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const SendButton = styled.button`
  min-height: 44px;
  border: 0;
  border-radius: 8px;
  padding: 0.7rem 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: var(--button-primary, #002060);
  color: var(--text-on-primary, #ffffff);
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 0 22px color-mix(in srgb, var(--accent-secondary, #8b5cf6) 34%, transparent);

  &:disabled {
    cursor: not-allowed;
    opacity: 0.56;
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8b5cf6);
    outline-offset: 3px;
  }

  @media (max-width: 640px) {
    width: 100%;
  }
`;

export const ProposalCard = styled.article`
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 34%, transparent);
  background: color-mix(in srgb, var(--surface-elevated, #141419) 88%, var(--accent-primary, #60c0f0) 12%);
  padding: 0.9rem;
  display: grid;
  gap: 0.65rem;
`;

export const ProposalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;

  strong {
    display: block;
    font-size: 1rem;
  }

  span {
    color: var(--text-secondary, rgba(224, 236, 244, 0.74));
    font-size: 0.82rem;
  }

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const RiskPill = styled.span`
  min-height: 28px;
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
  display: inline-flex;
  align-items: center;
  color: var(--accent-gold, #c6a84b);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #c6a84b) 38%, transparent);
  background: color-mix(in srgb, var(--accent-gold, #c6a84b) 12%, transparent);
  font-size: 0.78rem;
  font-weight: 800;
`;

export const ProposalText = styled.p`
  margin: 0;
  color: var(--text-primary, #e0ecf4);
  line-height: 1.5;
`;

export const ErrorText = styled.p`
  margin: 0;
  color: var(--error-text, #fca5a5);
  font-weight: 700;
`;

export const SecondaryButton = styled.button`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.18));
  background: transparent;
  color: var(--text-primary, #e0ecf4);
  padding: 0.65rem 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
  font-weight: 700;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8b5cf6);
    outline-offset: 3px;
  }

  @media (max-width: 640px) {
    width: 100%;
  }
`;
export const ScreenReaderOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;