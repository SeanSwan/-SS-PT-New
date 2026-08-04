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
  color: #60C0F0;
  font-size: 1.5rem;
  margin: 0;
`;

export const AddButton = styled.button`
  background: linear-gradient(135deg, #8B5CF6, #9b6fcf);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
  }
`;

export const TableScroller = styled.div`
  width: 100%;
  overflow-x: auto;
  border-radius: 12px;
  -webkit-overflow-scrolling: touch;
`;

export const Table = styled.table`
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
`;

export const Th = styled.th`
  text-align: left;
  padding: 16px;
  background: rgba(139, 92, 246, 0.3);
  color: #60C0F0;
  font-weight: 600;
  border-bottom: 1px solid rgba(139, 92, 246, 0.3);
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
  min-height: 44px;
  min-width: 44px;
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
        return 'background: #8B5CF6; color: black;';
      default:
        return 'background: #8B5CF6; color: white;';
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
  border: 1px solid rgba(139, 92, 246, 0.3);
`;

export const ModalTitle = styled.h2`
  color: #60C0F0;
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
  border: 1px solid rgba(139, 92, 246, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: white;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #60C0F0;
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: white;
  font-size: 1rem;
  min-height: 80px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #60C0F0;
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
  background: linear-gradient(135deg, #8B5CF6, #9b6fcf);
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

// ── Client Assignment Styles ──

export const ClientSearchBox = styled.div`
  position: relative;
  margin-bottom: 8px;
`;

export const ClientSearchInput = styled.input`
  width: 100%;
  padding: 10px 12px 10px 36px;
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: white;
  font-size: 0.875rem;

  &::placeholder { color: rgba(255, 255, 255, 0.4); }
  &:focus {
    outline: none;
    border-color: #60C0F0;
  }
`;

export const SearchIcon = styled.span`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
  pointer-events: none;
`;

export const ClientDropdown = styled.div`
  max-height: 160px;
  overflow-y: auto;
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  background: rgba(0, 32, 96, 0.95);
  margin-bottom: 8px;

  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.4); border-radius: 5px; }
`;

export const ClientDropdownItem = styled.button`
  width: 100%;
  padding: 10px 12px;
  min-height: 44px;
  border: none;
  background: transparent;
  color: white;
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover { background: rgba(139, 92, 246, 0.2); }
  &:not(:last-child) { border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
`;

export const AssignedClientChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`;

export const ClientChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-radius: 16px;
  color: #60C0F0;
  font-size: 0.75rem;
  font-weight: 500;
`;

export const ChipRemove = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 0;
  font-size: 14px;
  line-height: 1;

  &:hover { color: #ff6b6b; }
`;

export const ClientNote = styled.p`
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
  margin: 4px 0 0;
  font-style: italic;
`;

export const ModalScrollContent = styled.div`
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 4px;

  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.4); border-radius: 5px; }
`;
