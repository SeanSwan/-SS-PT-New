import styled, { keyframes } from 'styled-components';
import { Loader2 } from 'lucide-react';

export const SWAN_CYAN = '#00FFFF';
export const GALAXY_CORE = '#0a0a1a';

export const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
`;

export const ModalPanel = styled.div`
  background: rgba(29, 31, 43, 0.98);
  border-radius: 12px;
  max-width: 900px;
  width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 255, 255, 0.2);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
`;

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #252742;
  border-radius: 12px 12px 0 0;
  flex-shrink: 0;
`;

export const ModalTitle = styled.h2`
  color: ${SWAN_CYAN};
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  background: transparent;
  border: none;
  color: #e2e8f0;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.08); }
`;

export const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

export const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
`;

export const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1.5rem;
  min-height: 44px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  border: none;
  background: linear-gradient(135deg, ${SWAN_CYAN}, #00aadd);
  color: ${GALAXY_CORE};
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 18px rgba(0, 255, 255, 0.35);
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(0, 255, 255, 0.5);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const SecondaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1.5rem;
  min-height: 44px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.08); }
`;

export const Spinner = styled(Loader2)`
  animation: ${spin} 0.6s linear infinite;
`;

export const Input = styled.input`
  padding: 10px 14px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  font-size: 0.95rem;
  transition: border-color 0.2s;
  &:focus {
    outline: none;
    border-color: ${SWAN_CYAN};
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.15);
  }
  &::placeholder { color: rgba(255, 255, 255, 0.3); }
`;

export const TextArea = styled.textarea`
  padding: 10px 14px;
  min-height: 80px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  font-size: 0.95rem;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;
  &:focus {
    outline: none;
    border-color: ${SWAN_CYAN};
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.15);
  }
  &::placeholder { color: rgba(255, 255, 255, 0.3); }
`;

export const FormGroup = styled.div<{ $fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  grid-column: ${({ $fullWidth }) => ($fullWidth ? '1 / -1' : 'auto')};
`;

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
`;

export const Label = styled.label`
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: #94a3b8;
`;

export const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 20px 0;
`;

export const InfoPanel = styled.div<{ $variant?: 'info' | 'warning' | 'error' | 'success' }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  margin: 10px 0;
  color: #dbeafe;
  border: 1px solid rgba(125, 211, 252, 0.25);
  background: rgba(14, 116, 144, 0.12);
  ${({ $variant }) => $variant === 'warning' && `
    color: #ffedd5; border-color: rgba(251, 191, 36, 0.35); background: rgba(180, 83, 9, 0.14);
  `}
  ${({ $variant }) => $variant === 'error' && `
    color: #fee2e2; border-color: rgba(248, 113, 113, 0.35); background: rgba(153, 27, 27, 0.14);
  `}
  ${({ $variant }) => $variant === 'success' && `
    color: #dcfce7; border-color: rgba(74, 222, 128, 0.35); background: rgba(22, 101, 52, 0.14);
  `}
`;

export const InfoContent = styled.div`
  font-size: 0.88rem;
  line-height: 1.45;
  color: inherit;
`;

export const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0;
`;

export const Badge = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 5px 9px;
  border-radius: 999px;
  color: ${({ $color }) => $color || SWAN_CYAN};
  border: 1px solid currentColor;
  background: rgba(255, 255, 255, 0.05);
`;

export const ExerciseCard = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
`;

export const ExerciseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

export const DaySection = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  margin-bottom: 10px;
  overflow: hidden;
`;

export const DayHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  background: rgba(255, 255, 255, 0.03);
  border: none;
  color: #e2e8f0;
  padding: 12px;
  min-height: 44px;
  cursor: pointer;
  font-weight: 600;
  &:hover { background: rgba(255, 255, 255, 0.06); }
`;

export const DayContent = styled.div`
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const SmallInput = styled(Input)`
  min-height: 40px;
  font-size: 0.88rem;
  padding: 8px 10px;
`;

export const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  border-radius: 8px;
  border: 1px dashed rgba(0, 255, 255, 0.45);
  color: ${SWAN_CYAN};
  background: rgba(0, 255, 255, 0.06);
  font-weight: 600;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: rgba(0, 255, 255, 0.12);
  }
`;

export const RemoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #fca5a5;
  background: rgba(127, 29, 29, 0.15);
  cursor: pointer;
  &:hover { background: rgba(127, 29, 29, 0.3); }
`;

export const CenterContent = styled.div`
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
  animation: ${fadeIn} 0.25s ease;
`;

export const TemplateList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 520px;
  margin-top: 6px;
`;

export const TemplateItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 9px 10px;
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.02);
  font-size: 0.85rem;
`;

export const SectionTitle = styled.h3`
  margin: 0 0 10px;
  color: #cbd5e1;
  font-size: 0.94rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const ExplainabilityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px;
`;

export const ExplainCard = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
`;

export const ExplainLabel = styled.div`
  font-size: 0.72rem;
  color: #64748b;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
`;

export const ExplainValue = styled.div`
  font-size: 0.88rem;
  color: #cbd5e1;
  line-height: 1.4;
`;
