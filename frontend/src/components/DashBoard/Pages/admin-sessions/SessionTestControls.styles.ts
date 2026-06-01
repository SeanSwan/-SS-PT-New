import { motion } from 'framer-motion';
import styled from 'styled-components';

export const StyledCard = styled(motion.div)`
  background-color: color-mix(in srgb, var(--bg-surface, #1A1A24) 72%, transparent);
  backdrop-filter: blur(10px);
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  border-radius: 15px;
  box-shadow: 0 15px 35px color-mix(in srgb, var(--bg-base, #0A0A0F) 55%, transparent);
  overflow: hidden;
`;

export const StyledCardHeader = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 28%, transparent);
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const CardHeaderTitle = styled.h6`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--text-primary, #E0ECF4);
  line-height: 1.6;
`;

export const StyledCardContent = styled.div`
  padding: 24px;
`;

export const WarningAlert = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 24px;
  border-radius: 8px;
  border-left: 4px solid var(--warning, #ff9800);
  background-color: color-mix(in srgb, var(--warning, #ff9800) 15%, transparent);
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 90%, transparent);
  font-size: 0.875rem;
  line-height: 1.5;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: var(--warning, #ff9800);
  }
`;

export const InfoAlert = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 20%, transparent);
  background-color: color-mix(in srgb, var(--bg-base, #0A0A0F) 24%, transparent);
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 90%, transparent);
  font-size: 0.875rem;
  line-height: 1.5;
`;

export const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

export const StyledPaper = styled.div`
  padding: 16px;
  background-color: color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent);
  border-radius: 10px;
  height: 100%;
  box-sizing: border-box;
`;

export const SectionTitle = styled.h6`
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1.6;
`;

export const BodyText = styled.p`
  margin: 0 0 16px 0;
  font-size: 0.875rem;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent);
  line-height: 1.5;
`;

export const ButtonWrapper = styled.div`
  margin-bottom: 16px;
`;

export const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 22px;
  margin-top: 8px;
  border: 0;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--primary, #002060);
  cursor: pointer;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--cyan-glow, #00c8ff));
  box-shadow: 0 4px 10px color-mix(in srgb, var(--cyan-glow, #00c8ff) 30%, transparent);
  transition: box-shadow 0.2s ease, background 0.2s ease, opacity 0.2s ease;

  &:hover:not(:disabled) {
    box-shadow: 0 6px 15px color-mix(in srgb, var(--cyan-glow, #00c8ff) 40%, transparent);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const SecondaryButton = styled(PrimaryButton)`
  color: var(--text-primary, #E0ECF4);
  background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--swan-lavender, #4070C0));
  box-shadow: 0 4px 10px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
`;

export const CopyButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  padding: 8px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background-color: color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
    color: var(--text-primary, #E0ECF4);
  }
`;

export const StyledInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  margin: 16px 0;
  min-height: 44px;
  box-sizing: border-box;
  font-size: 0.875rem;
  color: var(--text-primary, #E0ECF4);
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 20%, transparent);
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const InputLabel = styled.label`
  display: block;
  font-size: 0.75rem;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 60%, transparent);
  margin: 16px 0 4px;
`;

export const ClientInfoBox = styled.div`
  margin-top: 16px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
  background-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 5%, transparent);
`;

export const ClientInfoHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

export const ClientInfoTitle = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const ClientInfoDetail = styled.p`
  margin: 4px 0;
  font-size: 0.875rem;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 90%, transparent);
  line-height: 1.5;

  strong {
    color: var(--text-primary, #E0ECF4);
  }
`;

export const SessionInfoBox = styled.div`
  margin-top: 16px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
  background-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent);
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const SessionInfoContent = styled.div`
  display: flex;
  flex-direction: column;
`;

export const SessionInfoTitle = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--accent-secondary, #8B5CF6);
`;

export const SessionInfoText = styled.span`
  font-size: 0.875rem;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent);
  line-height: 1.5;
`;

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
};
