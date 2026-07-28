import styled from 'styled-components';

export const PickerWrapper = styled.div`
  position: relative;
  margin-bottom: 16px;
`;

export const PickerLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
`;

export const PickerTrigger = styled.button<{ $hasSelection: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  min-height: 56px;
  border: 1px solid ${(p) => (p.$hasSelection ? 'rgba(96, 192, 240, 0.3)' : 'rgba(255, 255, 255, 0.1)')};
  border-radius: 12px;
  background: rgba(0, 32, 96, 0.4);
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(96, 192, 240, 0.4);
    background: rgba(0, 32, 96, 0.6);
  }
`;

export const IconBadge = styled.div<{ $type: string }>`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${(p) => {
    switch (p.$type) {
      case 'gym': return 'rgba(96, 192, 240, 0.15)';
      case 'park': return 'rgba(76, 175, 80, 0.15)';
      case 'home': return 'rgba(255, 183, 77, 0.15)';
      case 'client_home': return 'rgba(139, 92, 246, 0.15)';
      default: return 'rgba(255, 255, 255, 0.08)';
    }
  }};
  color: ${(p) => {
    switch (p.$type) {
      case 'gym': return '#60C0F0';
      case 'park': return '#4caf50';
      case 'home': return '#ffb74d';
      case 'client_home': return '#8B5CF6';
      default: return 'rgba(255, 255, 255, 0.6)';
    }
  }};
`;

export const TriggerInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const TriggerName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #f0f0ff;
`;

export const TriggerMeta = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 2px;
`;

export const ChangeBtn = styled.span`
  font-size: 12px;
  color: #60C0F0;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  &:hover { background: rgba(96, 192, 240, 0.1); }
`;

export const DropdownPanel = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 50;
  background: rgba(0, 20, 60, 0.98);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 12px;
  padding: 6px;
  max-height: 320px;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
`;

export const DropdownItem = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  min-height: 48px;
  border: none;
  border-radius: 8px;
  background: ${(p) => (p.$active ? 'rgba(96, 192, 240, 0.12)' : 'transparent')};
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;

  &:hover {
    background: rgba(96, 192, 240, 0.08);
  }
`;

export const DropdownItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const DropdownItemName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #f0f0ff;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const DropdownItemMeta = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
`;

export const DefaultBadge = styled.span`
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(96, 192, 240, 0.15);
  color: #60C0F0;
  font-weight: 500;
`;

export const ManageLink = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 10px 12px;
  min-height: 44px;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: transparent;
  color: #60C0F0;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 4px;

  &:hover { background: rgba(96, 192, 240, 0.05); }
`;

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 49;
`;

export const CompactWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const CompactManageButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid rgba(96, 192, 240, 0.22);
  background: rgba(96, 192, 240, 0.08);
  color: #60C0F0;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: rgba(96, 192, 240, 0.13);
    outline: 2px solid rgba(96, 192, 240, 0.4);
    outline-offset: 2px;
  }
`;

export const CompactLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
`;

export const CompactSelect = styled.select`
  padding: 10px 12px;
  min-height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(0, 32, 96, 0.4);
  color: #f0f0ff;
  font-size: 13px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: rgba(96, 192, 240, 0.4);
  }

  option {
    background: #001040;
    color: #f0f0ff;
  }
`;
