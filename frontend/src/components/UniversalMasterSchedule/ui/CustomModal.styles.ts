import styled, { keyframes } from 'styled-components';
import { IconButton } from './StyledButton';

export const CUSTOM_MODAL_THEME = {
  backdrop: 'var(--modal-backdrop, rgba(0, 0, 0, 0.80))',
  handle: 'var(--modal-handle, rgba(224, 236, 244, 0.30))',
  surface: 'linear-gradient(135deg, var(--bg-surface, #1A1A24) 0%, var(--bg-base, #0A0A0F) 100%)',
  border: 'var(--border-soft, rgba(96, 192, 240, 0.18))',
  divider: 'var(--divider-subtle, rgba(224, 236, 244, 0.10))',
  textPrimary: 'var(--text-primary, #E0ECF4)',
  scrollbarTrack: 'var(--scrollbar-track, rgba(224, 236, 244, 0.05))',
  scrollbarThumb: 'var(--scrollbar-thumb, rgba(96, 192, 240, 0.24))',
  scrollbarThumbHover: 'var(--scrollbar-thumb-hover, rgba(96, 192, 240, 0.34))',
  closeBackground: 'var(--modal-close-bg, rgba(0, 0, 0, 0.30))',
  closeHover: 'var(--modal-close-hover, rgba(239, 68, 68, 0.30))',
  danger: 'var(--danger, #EF4444)',
  shadow: 'var(--shadow-strong, 0 20px 60px rgba(0, 0, 0, 0.50))',
} as const;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideUpFromBottom = keyframes`
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
`;

export const Backdrop = styled.div<{ $isMobile?: boolean }>`
  position: fixed;
  inset: 0;
  background: ${CUSTOM_MODAL_THEME.backdrop};
  backdrop-filter: blur(8px);
  z-index: 1300;
  display: flex;
  align-items: ${({ $isMobile }) => ($isMobile ? 'flex-end' : 'flex-start')};
  justify-content: center;
  padding: ${({ $isMobile }) => ($isMobile ? '0' : '1rem')};
  animation: ${fadeIn} 0.2s ease;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
`;

export const DragHandle = styled.div`
  width: 36px;
  height: 4px;
  background: ${CUSTOM_MODAL_THEME.handle};
  border-radius: 2px;
  margin: 0 auto 0.5rem;
  flex-shrink: 0;

  @media (min-width: 481px) {
    display: none;
  }
`;

export const ModalContainer = styled.div<{
  $size?: 'sm' | 'md' | 'lg' | 'xl';
  $isMobile?: boolean;
  $translateY?: number;
}>`
  background: ${CUSTOM_MODAL_THEME.surface};
  border: 1px solid ${CUSTOM_MODAL_THEME.border};
  border-radius: 12px;
  max-width: ${({ $size }) => {
    switch ($size) {
      case 'sm': return '400px';
      case 'lg': return '800px';
      case 'xl': return '1200px';
      default: return '600px';
    }
  }};
  width: 100%;
  margin: auto;
  display: flex;
  flex-direction: column;
  animation: ${slideUp} 0.3s ease;
  box-shadow: ${CUSTOM_MODAL_THEME.shadow};
  position: relative;

  @media (max-width: 768px) {
    max-width: 95%;
    max-height: 92vh;
    border-radius: 16px;
  }

  @media (max-width: 480px) {
    max-width: 100%;
    max-height: 90vh;
    min-height: 40vh;
    border-radius: 20px 20px 0 0;
    margin: 0;
    animation: ${slideUpFromBottom} 0.3s cubic-bezier(0.32, 0.72, 0, 1);
    transform: ${({ $translateY }) => ($translateY ? `translateY(${$translateY}px)` : 'translateY(0)')};
    transition: transform 0.1s ease-out;
    padding-bottom: env(safe-area-inset-bottom, 0);
    padding-bottom: max(env(safe-area-inset-bottom, 0), 0.5rem);
  }
`;

export const MobileHeaderWrapper = styled.div`
  @media (max-width: 480px) {
    padding-top: 0.5rem;
    touch-action: none;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }
`;

export const ModalHeader = styled.div`
  padding: 1.5rem;
  padding-right: 3.5rem;
  border-bottom: 1px solid ${CUSTOM_MODAL_THEME.divider};
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;

  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 500;
    color: ${CUSTOM_MODAL_THEME.textPrimary};
  }

  @media (max-width: 768px) {
    padding: 1.25rem;
    padding-right: 3rem;

    h2 {
      font-size: 1.25rem;
    }
  }

  @media (max-width: 480px) {
    padding: 0.75rem 1rem;
    padding-right: 2.5rem;

    h2 {
      font-size: 1.1rem;
    }
  }
`;

export const ModalBody = styled.div`
  padding: 1.5rem;
  padding-bottom: 2rem;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  position: relative;
  min-height: 100px;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${CUSTOM_MODAL_THEME.scrollbarTrack};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${CUSTOM_MODAL_THEME.scrollbarThumb};
    border-radius: 4px;

    &:hover {
      background: ${CUSTOM_MODAL_THEME.scrollbarThumbHover};
    }
  }

  @media (max-width: 768px) {
    padding: 1.25rem;
  }

  @media (max-width: 480px) {
    padding: 1rem;
    padding-bottom: 1.5rem;
  }
`;

export const ModalFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid ${CUSTOM_MODAL_THEME.divider};
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    padding: 1rem;
    gap: 0.75rem;
  }

  @media (max-width: 480px) {
    padding: 0.75rem 1rem;
    flex-direction: column-reverse;
    gap: 0.5rem;
    padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0));

    button {
      width: 100%;
      justify-content: center;
      min-height: 44px;
    }
  }
`;

export const CloseButton = styled(IconButton)`
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10;
  background: ${CUSTOM_MODAL_THEME.closeBackground};
  min-width: 36px;
  min-height: 36px;

  &:hover {
    background: ${CUSTOM_MODAL_THEME.closeHover};
  }

  @media (max-width: 768px) {
    top: 0.75rem;
    right: 0.75rem;
    min-width: 40px;
    min-height: 40px;
  }

  @media (max-width: 480px) {
    top: calc(0.5rem + 4px);
    right: 0.75rem;
    min-width: 44px;
    min-height: 44px;
    padding: 0.625rem;
  }
`;
