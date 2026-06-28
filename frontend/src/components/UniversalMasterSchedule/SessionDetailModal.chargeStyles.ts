import styled from 'styled-components';

export const ChargeTypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin: 1rem 0;
`;

export const ChargeOption = styled.label<{ $selected: boolean; $variant: 'success' | 'warning' | 'danger' }>`
  position: relative;
  display: block;
  padding: 1rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
  width: 100%;
  text-align: left;

  background: ${props => {
    if (!props.$selected) return 'rgba(255, 255, 255, 0.03)';
    switch (props.$variant) {
      case 'success': return 'rgba(16, 185, 129, 0.12)';
      case 'warning': return 'rgba(245, 158, 11, 0.12)';
      case 'danger': return 'rgba(239, 68, 68, 0.12)';
    }
  }};

  border: 2px solid ${props => {
    if (!props.$selected) return 'rgba(255, 255, 255, 0.1)';
    switch (props.$variant) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'danger': return '#ef4444';
    }
  }};

  &:hover {
    background: ${props => {
      switch (props.$variant) {
        case 'success': return 'rgba(16, 185, 129, 0.08)';
        case 'warning': return 'rgba(245, 158, 11, 0.08)';
        case 'danger': return 'rgba(239, 68, 68, 0.08)';
      }
    }};
  }
`;

export const ChargeOptionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;

  input[type="radio"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  span {
    font-weight: 600;
    font-size: 0.9rem;
  }
`;

export const ChargeRadio = styled.input`
  width: 18px;
  height: 18px;
  accent-color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  flex-shrink: 0;
`;

export const ChargeAmount = styled.div<{ $variant: 'success' | 'warning' | 'danger' }>`
  margin-top: 0.75rem;
  font-size: 1.25rem;
  font-weight: 700;

  color: ${props => {
    switch (props.$variant) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'danger': return '#ef4444';
    }
  }};
`;

export const ChargeInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;

  span {
    font-size: 1.25rem;
    font-weight: 600;
    color: #f59e0b;
  }

  input {
    width: 100px;
    padding: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
  }
`;

export const RestoreCreditOption = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  margin-bottom: 0.75rem;

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #10b981;
    cursor: pointer;
  }

  label {
    cursor: pointer;
  }
`;

export const NotificationOption = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  background: var(--schedule-notification-bg, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent));
  border: 1px solid var(--schedule-notification-border, color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent));

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--schedule-notification-accent, var(--accent-primary, #60C0F0));
    cursor: pointer;
  }

  label {
    cursor: pointer;
  }
`;
