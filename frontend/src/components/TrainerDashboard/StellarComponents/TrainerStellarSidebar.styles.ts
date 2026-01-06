import { motion } from 'framer-motion';
import styled, { keyframes, css } from 'styled-components';
import { NavStatus } from './TrainerStellarSidebar.config';

const stellarFloat = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.8; }
  33% { transform: translateY(-8px) rotate(1deg); opacity: 1; }
  66% { transform: translateY(-4px) rotate(-1deg); opacity: 0.95; }
`;

const cosmicPulse = keyframes`
  0%, 100% {
    opacity: 0.7;
    transform: scale(1);
    filter: hue-rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1.02);
    filter: hue-rotate(30deg);
  }
`;

const trainingOrbit = keyframes`
  0% {
    transform: rotate(0deg) translateX(15px) rotate(0deg);
    opacity: 0;
  }
  10%, 90% {
    opacity: 1;
  }
  100% {
    transform: rotate(360deg) translateX(15px) rotate(-360deg);
    opacity: 0;
  }
`;

const stellarGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
    border-color: rgba(0, 255, 255, 0.4);
  }
  50% {
    box-shadow: 0 0 25px rgba(0, 255, 255, 0.6), 0 0 40px rgba(255, 215, 0, 0.3);
    border-color: rgba(0, 255, 255, 0.8);
  }
`;

const auroraShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

export const TrainerSidebarContainer = styled(motion.aside)<{ isCollapsed: boolean; isMobile: boolean }>`
  position: fixed;
  top: 56px;
  left: 0;
  height: calc(100vh - 56px);
  width: ${props => (props.isCollapsed ? '80px' : '280px')};
  background: ${props => props.theme.gradients?.hero || 'radial-gradient(ellipse at center, #1e1e3f 0%, #0a0a1a 70%)'};
  backdrop-filter: blur(20px);
  border-right: 2px solid ${props => props.theme.borders?.elegant || 'rgba(0, 255, 255, 0.2)'};
  z-index: 999;
  display: flex;
  flex-direction: column;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      radial-gradient(2px 2px at 20px 30px, rgba(0, 255, 255, 0.4), transparent),
      radial-gradient(1px 1px at 40px 70px, rgba(255, 215, 0, 0.3), transparent),
      radial-gradient(1px 1px at 90px 40px, rgba(255, 255, 255, 0.2), transparent),
      radial-gradient(2px 2px at 130px 80px, rgba(120, 81, 169, 0.3), transparent),
      radial-gradient(1px 1px at 160px 110px, rgba(0, 255, 255, 0.2), transparent);
    background-size: 120px 100px;
    background-repeat: repeat;
    animation: ${stellarFloat} 10s ease-in-out infinite;
    opacity: 0.6;
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(270deg, #00ffff, #FFD700, #7851A9, #00A0E3, #00ffff);
    background-size: 400% 400%;
    animation: ${auroraShift} 8s ease infinite;
    opacity: 0.8;
  }

  @media (max-width: 768px) {
    top: 0;
    height: 100vh;
    transform: translateX(${props => (props.isMobile && props.isCollapsed ? '-100%' : '0')});
    width: 280px;
    border-right: none;
    box-shadow: ${props => props.theme.shadows?.elevation || '0 15px 35px rgba(0, 0, 0, 0.5)'};
    z-index: 1001;
  }

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(10, 10, 15, 0.3);
  }

  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.gradients?.primary || 'linear-gradient(135deg, #00FFFF, #00A0E3)'};
    border-radius: 3px;

    &:hover {
      background: ${props => props.theme.colors?.accent || '#FFD700'};
    }
  }
`;

export const TrainerSidebarHeader = styled(motion.div)<{ isCollapsed: boolean }>`
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: ${props => (props.isCollapsed ? 'center' : 'space-between')};
  border-bottom: 1px solid ${props => props.theme.borders?.elegant || 'rgba(0, 255, 255, 0.2)'};
  position: relative;
  background: ${props => props.theme.gradients?.card || 'rgba(30, 30, 60, 0.4)'};
  backdrop-filter: blur(10px);
`;

export const TrainerLogoContainer = styled(motion.div)<{ isCollapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;

  .trainer-logo-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${props => props.theme.gradients?.stellar || 'linear-gradient(45deg, #00FFFF 0%, #FFD700 100%)'};
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: ${props => props.theme.shadows?.cosmic || '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(0, 255, 255, 0.3)'};
    animation: ${cosmicPulse} 4s ease-in-out infinite;
    position: relative;
    color: #000000;

    &::before {
      content: '*';
      position: absolute;
      width: 8px;
      height: 8px;
      color: ${props => props.theme.colors?.accent || '#FFD700'};
      animation: ${trainingOrbit} 3s linear infinite;
    }

    &::after {
      content: '*';
      position: absolute;
      width: 6px;
      height: 6px;
      animation: ${trainingOrbit} 4.5s linear infinite reverse;
      animation-delay: 1.5s;
      font-size: 0.7rem;
    }
  }

  .trainer-logo-text {
    font-size: 1.4rem;
    font-weight: 700;
    background: ${props => props.theme.gradients?.stellar || 'linear-gradient(45deg, #00FFFF 0%, #FFD700 100%)'};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    opacity: ${props => (props.isCollapsed ? '0' : '1')};
    transform: translateX(${props => (props.isCollapsed ? '-20px' : '0')});
    transition: all 0.3s ease;
    letter-spacing: 0.5px;
  }
`;

export const TrainerCollapseToggle = styled(motion.button)<{ isCollapsed: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  color: ${props => props.theme.colors?.primary || '#00FFFF'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.2);
    border-color: rgba(0, 255, 255, 0.6);
    box-shadow: ${props => props.theme.shadows?.glow || '0 0 15px currentColor'};
    transform: scale(1.1);
  }

  &:focus {
    outline: 2px solid ${props => props.theme.colors?.accent || '#FFD700'};
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

export const TrainerNavigationSection = styled(motion.div)`
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
  position: relative;
`;

export const TrainerSectionTitle = styled(motion.h3)<{ isCollapsed: boolean }>`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${props => props.theme.colors?.accent || '#FFD700'};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0.5rem 1.5rem;
  opacity: ${props => (props.isCollapsed ? '0' : '1')};
  transform: translateX(${props => (props.isCollapsed ? '-20px' : '0')});
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &::before {
    content: '-';
    color: ${props => props.theme.colors?.accent || '#FFD700'};
    animation: ${cosmicPulse} 3s ease-in-out infinite;
  }
`;

const navStatusStyles: Record<NavStatus, { color: string; background: string; border: string }> = {
  real: { color: '#10b981', background: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.6)' },
  mock: { color: '#f59e0b', background: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.6)' },
  partial: { color: '#3b82f6', background: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.6)' },
  progress: { color: '#3b82f6', background: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.6)' },
  fix: { color: '#ef4444', background: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.6)' },
  new: { color: '#00ffff', background: 'rgba(0, 255, 255, 0.2)', border: 'rgba(0, 255, 255, 0.6)' },
  error: { color: '#ef4444', background: 'rgba(239, 68, 68, 0.3)', border: 'rgba(239, 68, 68, 0.7)' },
};

export const TrainerNavStatusBadge = styled.span<{ status: NavStatus; isCollapsed: boolean }>`
  display: ${props => (props.isCollapsed ? 'none' : 'inline-flex')};
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  border-radius: 6px;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: ${props => navStatusStyles[props.status].color};
  background: ${props => navStatusStyles[props.status].background};
  border: 1px solid ${props => navStatusStyles[props.status].border};
`;

export const TrainerNavItem = styled(motion.button)<{ isActive: boolean; isCollapsed: boolean }>`
  width: 100%;
  padding: ${props => (props.isCollapsed ? '1rem' : '1rem 1.5rem')};
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: ${props =>
    props.isActive
      ? 'linear-gradient(90deg, rgba(0, 255, 255, 0.2) 0%, rgba(120, 81, 169, 0.1) 100%)'
      : 'transparent'};
  border: none;
  border-left: 3px solid ${props => (props.isActive ? props.theme.colors?.primary || '#00FFFF' : 'transparent')};
  color: ${props => (props.isActive ? props.theme.colors?.primary || '#00FFFF' : 'rgba(255, 255, 255, 0.8)')};
  cursor: pointer;
  text-align: left;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  justify-content: ${props => (props.isCollapsed ? 'center' : 'flex-start')};

  ${props =>
    props.isActive &&
    css`
      animation: ${stellarGlow} 3s ease-in-out infinite;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 60%;
        background: ${props => props.theme.gradients?.stellar || 'linear-gradient(45deg, #00FFFF 0%, #FFD700 100%)'};
        border-radius: 0 2px 2px 0;
      }
    `}

  .nav-icon {
    min-width: 24px;
    min-height: 24px;
    position: relative;
    transition: all 0.3s ease;

    ${props =>
      props.isActive &&
      css`
        filter: drop-shadow(0 0 8px currentColor);

        &::before {
          content: '*';
          position: absolute;
          top: -8px;
          right: -8px;
          font-size: 0.7rem;
          color: ${props => props.theme.colors?.accent || '#FFD700'};
          animation: ${stellarFloat} 2s ease-in-out infinite;
        }
      `}
  }

  .nav-text {
    font-size: 0.95rem;
    font-weight: 500;
    opacity: ${props => (props.isCollapsed ? '0' : '1')};
    transform: translateX(${props => (props.isCollapsed ? '-20px' : '0')});
    transition: all 0.3s ease;
    white-space: nowrap;
    letter-spacing: 0.3px;
  }

  .nav-meta {
    margin-left: auto;
    display: ${props => (props.isCollapsed ? 'none' : 'flex')};
    align-items: center;
    gap: 0.5rem;
  }

  .nav-tooltip {
    position: absolute;
    left: 100%;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(10, 10, 15, 0.9);
    color: #ffffff;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    margin-left: 10px;
    border: 1px solid rgba(0, 255, 255, 0.3);
    box-shadow: ${props => props.theme.shadows?.cosmic || '0 0 30px rgba(0, 255, 255, 0.3)'};
    z-index: 1000;

    &::before {
      content: '';
      position: absolute;
      left: -6px;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-right: 6px solid rgba(10, 10, 15, 0.9);
      border-top: 6px solid transparent;
      border-bottom: 6px solid transparent;
    }
  }

  &:hover {
    background: ${props =>
      props.isActive
        ? 'linear-gradient(90deg, rgba(0, 255, 255, 0.3) 0%, rgba(120, 81, 169, 0.15) 100%)'
        : 'rgba(0, 255, 255, 0.05)'};
    transform: translateX(${props => (props.isCollapsed ? '0' : '4px')});

    .nav-icon {
      transform: scale(1.1);
    }

    .nav-tooltip {
      opacity: ${props => (props.isCollapsed ? '1' : '0')};
    }
  }

  &:focus {
    outline: 2px solid ${props => props.theme.colors?.primary || '#00FFFF'};
    outline-offset: 2px;
  }
`;

export const TrainerSidebarFooter = styled(motion.div)<{ isCollapsed: boolean }>`
  padding: 1.5rem;
  border-top: 1px solid ${props => props.theme.borders?.elegant || 'rgba(0, 255, 255, 0.2)'};
  background: ${props => props.theme.gradients?.card || 'rgba(30, 30, 60, 0.4)'};
  backdrop-filter: blur(10px);
  text-align: center;

  .version-info {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 0.5rem;
    opacity: ${props => (props.isCollapsed ? '0' : '1')};
    transform: translateY(${props => (props.isCollapsed ? '10px' : '0')});
    transition: all 0.3s ease;
  }

  .stellar-signature {
    font-size: 0.7rem;
    color: ${props => props.theme.colors?.accent || '#FFD700'};
    font-weight: 500;
    opacity: ${props => (props.isCollapsed ? '0' : '1')};
    transform: translateY(${props => (props.isCollapsed ? '10px' : '0')});
    transition: all 0.3s ease 0.1s;
  }
`;

export const TrainerMobileBackdrop = styled(motion.div)`
  position: fixed;
  top: 56px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  z-index: 1000;
  display: none;

  @media (max-width: 768px) {
    display: block;
  }
`;

export const TrainerMobileToggle = styled(motion.button)`
  position: fixed;
  top: calc(56px + 1rem);
  left: 1rem;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: ${props => props.theme.gradients?.stellar || 'linear-gradient(45deg, #00FFFF 0%, #FFD700 100%)'};
  border: 2px solid ${props => props.theme.borders?.elegant || 'rgba(0, 255, 255, 0.2)'};
  color: #000000;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1002;
  box-shadow: ${props => props.theme.shadows?.cosmic || '0 8px 32px rgba(0, 0, 0, 0.4)'};

  @media (max-width: 768px) {
    display: flex;
  }

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.8);
  }

  &:focus {
    outline: 2px solid ${props => props.theme.colors?.accent || '#FFD700'};
    outline-offset: 2px;
  }
`;
