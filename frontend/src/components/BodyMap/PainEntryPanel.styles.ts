/**
 * PainEntryPanel.styles.ts — styled-components for the pain entry dialog
 * ======================================================================
 * Extracted 2026-08-04 (dry-loop R4, Rule 4 300-line cap relief) — same
 * pattern as PainChartInsightPanel.styles.ts. Logic stays in the component.
 */
import styled from 'styled-components';
import { device } from '../../styles/breakpoints';


export const Panel = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  z-index: 1200;
  background: ${({ theme }) => theme.background?.card || 'rgba(0, 32, 96, 0.95)'};
  backdrop-filter: blur(16px);
  overflow-y: auto;
  box-sizing: border-box;
  padding: 24px;
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);

  /* Mobile: bottom-sheet */
  bottom: 0;
  left: 0;
  right: 0;
  height: 85vh;
  max-height: 85vh;
  border-top: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(139, 92, 246, 0.2)'};
  border-radius: 20px 20px 0 0;
  transform: translateY(${({ $isOpen }) => ($isOpen ? '0' : '100%')});

  /* Tablet+: side panel */
  ${device.sm} {
    top: 0;
    bottom: 0;
    left: auto;
    right: 0;
    height: 100vh;
    max-height: 100vh;
    width: min(440px, 95vw);
    border-top: none;
    border-left: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(139, 92, 246, 0.2)'};
    border-radius: 0;
    transform: translateX(${({ $isOpen }) => ($isOpen ? '0' : '100%')});
  }
`;

export const DragHandle = styled.div`
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.3);
  margin: 0 auto 16px;

  ${device.sm} {
    display: none;
  }
`;

export const Overlay = styled.div<{ $isOpen: boolean }>`
  display: ${({ $isOpen }) => ($isOpen ? 'block' : 'none')};
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1199;
`;

export const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

export const PanelTitle = styled.h3`
  color: ${({ theme }) => theme.colors?.accent || '#8B5CF6'};
  font-size: 18px;
  font-weight: 600;
  margin: 0;
`;

export const CloseBtn = styled.button`
  background: none;
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(139, 92, 246, 0.3)'};
  color: ${({ theme }) => theme.colors?.accent || '#8B5CF6'};
  border-radius: 8px;
  width: 44px;
  height: 44px;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  &:hover {
    background: rgba(139, 92, 246, 0.1);
  }
`;

export const FormGroup = styled.div`
  margin-bottom: 16px;
`;

export const Label = styled.label`
  display: block;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255, 255, 255, 0.7)'};
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
`;

export const GroupLabel = styled.div`
  display: block;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255, 255, 255, 0.7)'};
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
`;

export const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
`;

export const Slider = styled.input<{ $painColor: string }>`
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 8px;
  border-radius: 4px;
  outline: none;
  background: rgba(255, 255, 255, 0.05);

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #002060;
    border: 3px solid ${({ $painColor }) => $painColor};
    box-shadow: 0 0 12px ${({ $painColor }) => `color-mix(in srgb, ${$painColor} 50%, transparent)`}, inset 0 0 4px ${({ $painColor }) => $painColor};
    cursor: pointer;
    transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
  }

  &::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    box-shadow: 0 0 20px ${({ $painColor }) => `color-mix(in srgb, ${$painColor} 67%, transparent)`}, inset 0 0 6px ${({ $painColor }) => $painColor};
  }

  &:focus-visible::-webkit-slider-thumb {
    outline: 2px solid #8B5CF6;
    outline-offset: 4px;
  }
`;

export const SliderValue = styled.div<{ $color: string }>`
  color: ${({ $color }) => $color};
  font-size: 24px;
  font-weight: 800;
  min-width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => `color-mix(in srgb, ${$color} 8%, transparent)`};
  border: 1px solid ${({ $color }) => `color-mix(in srgb, ${$color} 25%, transparent)`};
  border-radius: 12px;
  text-shadow: 0 0 10px ${({ $color }) => `color-mix(in srgb, ${$color} 38%, transparent)`};
`;

export const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(139, 92, 246, 0.2)'};
  border-radius: 8px;
  color: ${({ theme }) => theme.text?.primary || '#fff'};
  font-size: 14px;
  min-height: 44px;
  &:focus {
    border-color: ${({ theme }) => theme.colors?.accent || '#8B5CF6'};
    outline: none;
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(139, 92, 246, 0.2)'};
  border-radius: 8px;
  color: ${({ theme }) => theme.text?.primary || '#fff'};
  font-size: 14px;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
  &:focus {
    border-color: ${({ theme }) => theme.colors?.accent || '#8B5CF6'};
    outline: none;
  }
`;

export const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(139, 92, 246, 0.2)'};
  border-radius: 8px;
  color: ${({ theme }) => theme.text?.primary || '#fff'};
  font-size: 14px;
  min-height: 44px;
  box-sizing: border-box;
  &:focus {
    border-color: ${({ theme }) => theme.colors?.accent || '#8B5CF6'};
    outline: none;
  }
`;

export const ChipGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export const Chip = styled.button<{ $active: boolean }>`
  padding: 8px 14px;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid ${({ $active, theme }) => ($active ? (theme?.colors?.accent || '#8B5CF6') : 'rgba(255,255,255,0.15)')};
  background: ${({ $active }) => ($active ? 'rgba(139, 92, 246,0.15)' : 'rgba(0,0,0,0.3)')};
  color: ${({ $active, theme }) => ($active ? (theme?.colors?.accent || '#8B5CF6') : 'rgba(255,255,255,0.6)')};
  transition: all 0.15s;
  min-height: 44px;
  &:hover {
    border-color: ${({ theme }) => theme?.colors?.accent || '#8B5CF6'};
    color: ${({ theme }) => theme?.colors?.accent || '#8B5CF6'};
  }
  &:active {
    transform: scale(0.96);
  }
`;

export const SyndromeToggle = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const SyndromeBtn = styled.button<{ $active: boolean; $color: string }>`
  flex: 1;
  min-width: 100px;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid ${({ $active, $color }) => ($active ? $color : 'rgba(255,255,255,0.15)')};
  background: ${({ $active, $color }) => ($active ? `color-mix(in srgb, ${$color} 13%, transparent)` : 'rgba(0,0,0,0.3)')};
  color: ${({ $active, $color }) => ($active ? $color : 'rgba(255,255,255,0.6)')};
  transition: all 0.15s;
`;

export const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 24px;
  flex-wrap: wrap;
`;

export const ActionBtn = styled.button<{ $variant?: 'primary' | 'danger' | 'secondary' }>`
  flex: 1;
  min-width: 100px;
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  ${({ $variant, theme }) => {
    const accent = theme?.colors?.accent || '#8B5CF6';
    switch ($variant) {
      case 'primary':
        return `
          background: linear-gradient(135deg, ${accent}, #8B5CF6);
          border: none;
          color: #002060;
          &:hover { filter: brightness(1.1); }
        `;
      case 'danger':
        return `
          background: rgba(255,50,50,0.15);
          border: 1px solid rgba(255,50,50,0.4);
          color: #FF5555;
          &:hover { background: rgba(255,50,50,0.25); }
        `;
      default:
        return `
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.7);
          &:hover { background: rgba(255,255,255,0.1); }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(139, 92, 246, 0.1)'};
  margin: 16px 0;
`;

export const HintText = styled.div`
  color: ${({ theme }) => theme.text?.muted || 'rgba(255,255,255,0.4)'};
  font-size: 11px;
  margin-top: 4px;
`;

