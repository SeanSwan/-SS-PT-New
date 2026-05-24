import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const riseIn = keyframes`
  from { opacity: 0; transform: translateY(18px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 520;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 32, 96, 0.78);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  animation: ${fadeIn} 180ms ease-out;
`;

export const Card = styled.div`
  position: relative;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid rgba(96, 192, 240, 0.22);
  border-radius: 18px;
  padding: 30px 26px;
  color: var(--text-primary, #e0ecf4);
  background:
    linear-gradient(145deg, rgba(0, 48, 128, 0.96), rgba(10, 10, 15, 0.98)),
    var(--surface-dark, #141419);
  box-shadow: 0 28px 60px rgba(0, 10, 30, 0.58), inset 0 1px 0 rgba(224, 236, 244, 0.08);
  animation: ${riseIn} 260ms cubic-bezier(0.34, 1.56, 0.64, 1);

  @media (max-width: 520px) {
    padding: 24px 20px;
    border-radius: 14px;
  }
`;

export const CloseButton = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(224, 236, 244, 0.12);
  border-radius: 50%;
  color: var(--text-primary, #e0ecf4);
  background: rgba(224, 236, 244, 0.06);
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid var(--accent-primary, #60c0f0);
    outline-offset: 2px;
  }
`;

export const IconBadge = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-gold, #c6a84b);
  background: rgba(198, 168, 75, 0.12);
  border: 1px solid rgba(198, 168, 75, 0.26);
  margin-bottom: 16px;
`;

export const Title = styled.h2`
  margin: 0 48px 6px 0;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 22px;
  line-height: 1.2;
  color: var(--accent-gold, #c6a84b);
`;

export const Subtitle = styled.p`
  margin: 0 0 22px;
  max-width: 58ch;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.55;
  color: rgba(224, 236, 244, 0.68);
`;

export const Field = styled.div`
  margin-bottom: 14px;
`;

export const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent-primary, #60c0f0);
`;

export const Required = styled.span`
  color: #ff8a8a;
`;

export const Input = styled.input`
  width: 100%;
  min-height: 48px;
  box-sizing: border-box;
  border: 1px solid rgba(224, 236, 244, 0.14);
  border-radius: 12px;
  padding: 0 14px;
  color: var(--text-primary, #e0ecf4);
  background: rgba(224, 236, 244, 0.04);
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 14px;

  &:focus {
    border-color: rgba(96, 192, 240, 0.65);
    outline: none;
    box-shadow: 0 0 0 3px rgba(96, 192, 240, 0.16);
  }

  &::placeholder {
    color: rgba(224, 236, 244, 0.32);
  }
`;

export const Feedback = styled.div<{ $type: 'success' | 'error' }>`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin: 4px 0 14px;
  padding: 12px 14px;
  border-radius: 12px;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.45;
  color: ${p => p.$type === 'success' ? 'var(--accent-primary, #60c0f0)' : '#ff8a8a'};
  background: ${p => p.$type === 'success' ? 'rgba(96, 192, 240, 0.08)' : 'rgba(255, 138, 138, 0.08)'};
  border: 1px solid ${p => p.$type === 'success' ? 'rgba(96, 192, 240, 0.22)' : 'rgba(255, 138, 138, 0.2)'};
`;

export const SubmitButton = styled.button<{ $loading?: boolean }>`
  width: 100%;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  color: var(--button-text-dark, #002060);
  background: linear-gradient(135deg, var(--accent-gold, #c6a84b), #d9bd62);
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 800;
  cursor: ${p => p.$loading ? 'wait' : 'pointer'};
  opacity: ${p => p.$loading ? 0.72 : 1};
  transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 12px 26px rgba(198, 168, 75, 0.18);
  }

  &:focus-visible {
    outline: 3px solid var(--accent-primary, #60c0f0);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export const Spinner = styled.span`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0, 32, 96, 0.28);
  border-top-color: var(--button-text-dark, #002060);
  border-radius: 50%;
  animation: ${spin} 650ms linear infinite;
`;
