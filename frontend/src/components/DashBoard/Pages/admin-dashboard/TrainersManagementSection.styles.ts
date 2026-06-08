import styled from 'styled-components';
import { motion } from 'framer-motion';

export const ManagementContainer = styled.div`
  padding: 0;
`;

export const ActionBar = styled(motion.div)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: color-mix(in srgb, var(--royal-depth, #003080) 20%, transparent);
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const ErrorBanner = styled.div`
  margin-bottom: 1.5rem;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--danger, #ef4444) 35%, transparent);
  background: color-mix(in srgb, var(--danger, #ef4444) 12%, transparent);
  color: var(--danger-soft, #fecaca);
  font-size: 0.875rem;
`;

export const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const SearchField = styled.div`
  position: relative;
  flex: 1;
`;

export const SearchInput = styled.input`
  min-height: 44px;
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;

  &::placeholder {
    color: var(--text-muted, #9CA8B5);
  }

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
  }
`;

export const SearchIcon = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted, #9CA8B5);
`;

export const FilterSelect = styled.select`
  min-height: 44px;
  padding: 0.75rem 1rem;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
  min-width: 150px;

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
  }

  option {
    background: var(--royal-depth, #003080);
    color: var(--text-primary, #E0ECF4);
  }
`;

export const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const CommandButton = styled(motion.button)`
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(45deg, var(--swan-lavender, #4070C0) 0%, var(--accent-primary, #60C0F0) 100%);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  border-radius: 8px;
  color: var(--obsidian-black, #0A0A0F);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(45deg, var(--royal-depth, #003080) 0%, var(--accent-primary, #60C0F0) 100%);
    color: var(--text-primary, #E0ECF4);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  }

  &:focus {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const TrainersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const ConfirmOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: color-mix(in srgb, var(--obsidian-black, #0A0A0F) 82%, transparent);
`;

export const ConfirmDialogShell = styled(motion.div)`
  width: min(100%, 460px);
  border: 1px solid color-mix(in srgb, var(--danger, #ef4444) 38%, transparent);
  border-radius: 12px;
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--graphite, #1A1A24) 94%, transparent),
      color-mix(in srgb, var(--royal-depth, #003080) 32%, var(--obsidian-black, #0A0A0F))
    );
  box-shadow: 0 24px 70px color-mix(in srgb, var(--obsidian-black, #0A0A0F) 70%, transparent);
  padding: 1.25rem;
  color: var(--text-primary, #E0ECF4);
`;

export const ConfirmTitle = styled.h3`
  margin: 0 0 0.75rem;
  font-size: 1.15rem;
  line-height: 1.3;
`;

export const ConfirmBody = styled.p`
  margin: 0;
  color: var(--text-secondary, #B7C7D8);
  line-height: 1.55;
`;

export const ConfirmCallout = styled.p`
  margin: 1rem 0 0;
  padding: 0.85rem;
  border-radius: 8px;
  background: color-mix(in srgb, var(--danger, #ef4444) 12%, transparent);
  color: var(--danger-soft, #fecaca);
  line-height: 1.45;
`;

export const ConfirmButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;

  @media (max-width: 520px) {
    flex-direction: column-reverse;
  }
`;

export const ConfirmSecondaryButton = styled.button`
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-weight: 700;
  padding: 0 1rem;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

export const ConfirmDangerButton = styled(ConfirmSecondaryButton)`
  border-color: color-mix(in srgb, var(--danger, #ef4444) 48%, transparent);
  background: color-mix(in srgb, var(--danger, #ef4444) 22%, transparent);
  color: var(--danger-soft, #fecaca);

`;
