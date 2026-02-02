import styled from 'styled-components';

export const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

export const Title = styled.h1`
  color: #00ffff;
  font-size: 1.5rem;
  margin: 0;
`;

export const AddButton = styled.button`
  background: linear-gradient(135deg, #7851a9, #9b6fcf);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(120, 81, 169, 0.4);
  }
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
`;

export const Th = styled.th`
  text-align: left;
  padding: 16px;
  background: rgba(120, 81, 169, 0.3);
  color: #00ffff;
  font-weight: 600;
  border-bottom: 1px solid rgba(120, 81, 169, 0.3);
`;

export const Td = styled.td`
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
`;

export const StatusBadge = styled.span<{ $active: boolean }>`
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $active }) => ($active ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 107, 107, 0.2)')};
  color: ${({ $active }) => ($active ? '#00ff88' : '#ff6b6b')};
`;

export const ActionButton = styled.button<{ $variant?: 'edit' | 'delete' | 'toggle' }>`
  padding: 6px 12px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  margin-right: 8px;
  transition: opacity 0.2s;

  ${({ $variant }) => {
    switch ($variant) {
      case 'delete':
        return 'background: #FF6B6B; color: white;';
      case 'toggle':
        return 'background: #00FFFF; color: black;';
      default:
        return 'background: #7851A9; color: white;';
    }
  }}

  &:hover {
    opacity: 0.8;
  }
`;

export const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

export const ModalContent = styled.div`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 32px;
  width: 90%;
  max-width: 500px;
  border: 1px solid rgba(120, 81, 169, 0.3);
`;

export const ModalTitle = styled.h2`
  color: #00ffff;
  margin: 0 0 24px 0;
`;

export const FormGroup = styled.div`
  margin-bottom: 16px;
`;

export const Label = styled.label`
  display: block;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 6px;
  font-size: 0.875rem;
`;

export const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(120, 81, 169, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: white;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #00ffff;
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(120, 81, 169, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: white;
  font-size: 1rem;
  min-height: 80px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #00ffff;
  }
`;

export const CheckboxGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

export const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  color: white;
  font-size: 0.875rem;
  cursor: pointer;
`;

export const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
`;

export const CancelButton = styled.button`
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: transparent;
  color: white;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

export const SaveButton = styled.button`
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #7851a9, #9b6fcf);
  color: white;
  cursor: pointer;
  font-weight: 600;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 48px;
  color: rgba(255, 255, 255, 0.6);
`;
