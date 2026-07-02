/**
 * STYLE MODULE: ClaimAccountPage.styles
 * PURPOSE: Keep the public claim-account route below the component line cap
 * while preserving the Crystalline Swan activation form styles.
 * OWNER: Codex
 * LAST VALIDATED: 2026-06-30
 *
 * DATA FLOW:
 * Props In:  styled-component transient props only
 * State:     none
 * API Calls: none
 * Events:    none
 * Children:  ClaimAccountPage
 */
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';


const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

export const PageOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1500;
  overflow: auto;
  background: var(--bg-base, #0A0A0F);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

export const FormCard = styled(motion.div)`
  width: 90%;
  max-width: 440px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(139, 92, 246, 0.2));
  border-radius: 16px;
  padding: 40px 32px;
  box-shadow: 0 0 40px var(--shadow-purple-soft, rgba(139, 92, 246, 0.08)), 0 0 80px var(--shadow-cyan-soft, rgba(96, 192, 240, 0.04));
`;

export const SwanIcon = styled.div`
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 12px;
  filter: drop-shadow(0 0 8px var(--glow-cyan-soft, rgba(96, 192, 240, 0.4)));
`;

export const Title = styled.h2`
  text-align: center;
  color: var(--accent-primary, #60C0F0);
  margin: 0 0 6px;
  font-size: 1.6rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
`;

export const Subtitle = styled.p`
  text-align: center;
  color: var(--text-secondary, rgba(255, 255, 255, 0.6));
  margin: 0 0 28px;
  font-size: 0.9rem;
  line-height: 1.5;
`;

export const WelcomeName = styled.span`
  color: var(--accent-gold, #C6A84B);
  font-weight: 600;
`;

export const ActivatedUsername = styled.strong`
  color: var(--accent-primary, #60C0F0);
  font-weight: 700;
`;

export const Label = styled.label`
  display: block;
  color: var(--text-secondary, rgba(255, 255, 255, 0.7));
  font-size: 0.85rem;
  margin-bottom: 6px;
  font-family: 'Sora', sans-serif;
`;

export const InputField = styled.input`
  width: 100%;
  padding: 12px 14px;
  margin-bottom: 18px;
  border: 2px solid var(--input-border, rgba(139, 92, 246, 0.3));
  border-radius: 10px;
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
  font-family: 'Fira Code', monospace;
  min-height: 48px;
  box-sizing: border-box;
  letter-spacing: 2px;
  text-transform: uppercase;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 12px var(--focus-glow, rgba(96, 192, 240, 0.2));
  }

  &::placeholder {
    color: var(--text-muted, rgba(255, 255, 255, 0.3));
    text-transform: none;
    letter-spacing: normal;
  }
`;

export const PasswordInput = styled(InputField)`
  letter-spacing: 3px;
  text-transform: none;

  &::placeholder {
    letter-spacing: normal;
  }
`;

export const PasswordPolicyHint = styled.p`
  color: var(--text-secondary, rgba(255, 255, 255, 0.72));
  font-size: 0.78rem;
  line-height: 1.4;
  margin: -10px 0 18px;
`;

export const SubmitButton = styled(motion.button)`
  width: 100%;
  padding: 14px;
  min-height: 52px;
  border: none;
  border-radius: 10px;
  background: var(--accent-secondary, #8B5CF6);
  color: var(--button-text-on-purple, #FFFFFF);
  font-size: 1.05rem;
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  cursor: pointer;
  transition: box-shadow 0.2s;
  margin-top: 4px;

  &:hover:not(:disabled) {
    box-shadow: 0 0 20px var(--glow-cyan-medium, rgba(96, 192, 240, 0.3));
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const StatusMessage = styled.div<{ $type: 'error' | 'success' | 'info' }>`
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 18px;
  font-size: 0.9rem;
  border-left: 4px solid ${({ $type }) =>
    $type === 'error' ? 'var(--error-text, #C92A54)' :
    $type === 'success' ? 'var(--accent-luxury, #C6A84B)' : 'var(--accent-primary, #60C0F0)'};
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
`;

export const LoadingDots = styled.span`
  background: linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  background-size: 200% auto;
  animation: ${shimmer} 1.5s linear infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

export const LoginLink = styled.a`
  display: block;
  text-align: center;
  margin-top: 20px;
  color: var(--accent-primary, #60C0F0);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;

  &:hover {
    color: var(--accent-gold, #C6A84B);
  }
`;