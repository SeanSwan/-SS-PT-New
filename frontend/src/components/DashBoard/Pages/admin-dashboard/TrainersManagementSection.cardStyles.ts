import styled from 'styled-components';
import { motion } from 'framer-motion';

export const TrainerCard = styled(motion.div)`
  background: color-mix(in srgb, var(--royal-depth, #003080) 20%, transparent);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  padding: 1.5rem;
  transition: all 0.3s ease;

  &:hover {
    background: color-mix(in srgb, var(--royal-depth, #003080) 30%, transparent);
    transform: translateY(-4px);
    box-shadow: 0 12px 40px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  }
`;

export const TrainerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

export const TrainerIdentity = styled.div`
  display: flex;
  align-items: flex-start;
`;

export const TrainerAvatar = styled.div<{ $verified?: boolean }>`
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--swan-lavender, #4070C0) 0%, var(--accent-primary, #60C0F0) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--obsidian-black, #0A0A0F);
  margin-right: 1rem;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: -3px;
    right: -3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--success, #10b981);
    border: 2px solid var(--obsidian-black, #0A0A0F);
    display: ${({ $verified }) => ($verified ? 'block' : 'none')};
  }
`;

export const TrainerInfo = styled.div`
  flex: 1;
`;

export const TrainerName = styled.h3`
  margin: 0 0 0.25rem;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const TrainerEmail = styled.p`
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary, #B6C2CC);
`;

export const TrainerLocation = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: var(--text-muted, #9CA8B5);
  margin-bottom: 0.5rem;
`;

export const TrainerSpecialty = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin: 0.5rem 0;
`;

export const SpecialtyTag = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
  color: var(--accent-primary, #60C0F0);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
`;

export const TrainerStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin: 1rem 0;
  padding-top: 1rem;
  border-top: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
`;

export const StatItem = styled.div`
  text-align: center;
`;

export const StatValue = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  margin-bottom: 0.25rem;
`;

export const StatLabel = styled.div`
  font-size: 0.75rem;
  color: var(--text-muted, #9CA8B5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const ActionMenu = styled.div`
  position: relative;
`;

export const ActionButton = styled(motion.button)`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 60%, transparent);
  }
`;

export const ActionDropdown = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: color-mix(in srgb, var(--obsidian-black, #0A0A0F) 95%, transparent);
  backdrop-filter: blur(20px);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  border-radius: 8px;
  padding: 0.5rem 0;
  min-width: 180px;
  z-index: 1000;
  box-shadow: 0 8px 32px color-mix(in srgb, var(--obsidian-black, #0A0A0F) 50%, transparent);
`;

export const ActionItem = styled(motion.button)`
  min-height: 44px;
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  background: none;
  border: none;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  }

  &.danger {
    color: var(--danger, #ef4444);
  }
`;

export const CertificationBlock = styled.div`
  margin-bottom: 1rem;
`;

export const CertificationLabel = styled.div`
  font-size: 0.875rem;
  color: var(--text-secondary, #B6C2CC);
  margin-bottom: 0.5rem;
`;

export const CertificationList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
`;

export const CertificationBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  background: color-mix(in srgb, var(--success, #10b981) 20%, transparent);
  color: var(--success, #10b981);
  border: 1px solid color-mix(in srgb, var(--success, #10b981) 30%, transparent);
`;

export const RatingValue = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
`;

export const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: var(--text-muted, #9CA8B5);
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
`;
