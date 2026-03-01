import styled, { keyframes, css } from "styled-components";
import { motion } from "framer-motion";

// --- Galaxy-Swan Theme Tokens ---
const theme = {
  bg: 'rgba(15, 23, 42, 0.95)',
  border: 'rgba(14, 165, 233, 0.2)',
  text: '#e2e8f0',
  accent: '#0ea5e9',
  cyan: '#00ffff',
  purple: '#7851a9',
  galaxyCore: '#0a0a1a',
};

// --- Keyframe Animations ---
export const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

export const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

export const pulseAnimation = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 255, 255, 0.7); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(0, 255, 255, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 255, 255, 0); }
`;

export const textGlow = keyframes`
  0%, 100% { text-shadow: 0 0 5px rgba(0, 255, 255, 0.5), 0 0 10px rgba(120, 81, 169, 0.4); }
  50% { text-shadow: 0 0 10px rgba(0, 255, 255, 0.8), 0 0 15px rgba(120, 81, 169, 0.6); }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// --- Styled Components ---
export const PageContainer = styled.div`
  position: relative;
  overflow-x: hidden;
  color: ${theme.text};
  min-height: 400px;
`;

export const ContentContainer = styled.div`
  position: relative;
  z-index: 1;
  padding: 1rem;
  width: 100%;
  max-width: 100vw;
  margin: 0;
  box-sizing: border-box;
`;

export const StyledCard = styled.div`
  border-radius: 15px;
  overflow: hidden;
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(12px);
  border: 1px solid ${theme.border};
  transition: all 0.3s ease;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  }
`;

export const CardHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid ${theme.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const CardTitle = styled.h2`
  margin: 0;
  color: ${theme.text};
  font-size: 1.8rem;
  font-weight: 300;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

export const CardContent = styled.div`
  padding: 1.5rem;
`;

export const StyledTableContainer = styled.div`
  margin-top: 1.5rem;
  background: rgba(20, 20, 40, 0.4);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  overflow-x: auto;
  overflow-y: hidden;
`;

export const StyledTableHead = styled.tr`
  background: rgba(20, 20, 50, 0.6);
  backdrop-filter: blur(5px);
`;

export const StyledTableHeadCell = styled.th<{ $align?: string }>`
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  font-size: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem;
  text-align: ${props => props.$align || 'left'};
`;

export const StyledTableCell = styled.td<{ $align?: string }>`
  color: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 1rem;
  text-align: ${props => props.$align || 'left'};
`;

export const StyledTableRow = styled.tr`
  transition: all 0.2s ease;
  background: transparent;

  &:hover {
    background: rgba(0, 255, 255, 0.05);
    backdrop-filter: blur(10px);
  }

  &:nth-of-type(even) {
    background: rgba(20, 20, 50, 0.2);
  }

  &:nth-of-type(even):hover {
    background: rgba(0, 255, 255, 0.08);
  }
`;

export const StyledButton = styled.button<{
  $variant?: 'contained' | 'outlined' | 'text';
  $color?: 'primary' | 'success' | 'error' | 'default';
  $fullWidth?: boolean;
  $size?: 'small' | 'medium' | 'large';
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: ${props => props.$size === 'small' ? '0.4rem 1rem' : '0.5rem 1.2rem'};
  font-size: ${props => props.$size === 'small' ? '0.85rem' : '0.95rem'};
  font-weight: 500;
  font-family: inherit;
  letter-spacing: 0.5px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  width: ${props => props.$fullWidth ? '100%' : 'auto'};
  text-decoration: none;

  ${props => props.$variant === 'outlined' ? css`
    background: transparent;
    border: 1px solid ${
      props.$color === 'primary' ? '#0073ff' :
      props.$color === 'success' ? '#00bf8f' :
      props.$color === 'error' ? '#ff416c' :
      theme.cyan
    };
    color: ${
      props.$color === 'primary' ? '#0073ff' :
      props.$color === 'success' ? '#00bf8f' :
      props.$color === 'error' ? '#ff416c' :
      theme.cyan
    };
    box-shadow: none;

    &:hover {
      background: rgba(0, 255, 255, 0.05);
      transform: translateY(-2px);
    }
  ` : css`
    background: ${
      props.$color === 'primary' ? 'linear-gradient(135deg, #0073ff, #00c6ff)' :
      props.$color === 'success' ? 'linear-gradient(135deg, #00bf8f, #00ab76)' :
      props.$color === 'error' ? 'linear-gradient(135deg, #ff416c, #ff4b2b)' :
      `linear-gradient(135deg, ${theme.purple}, ${theme.cyan})`
    };
    color: white;
    border: none;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }
  `}

  &:active {
    transform: translateY(1px);
  }
`;

export const IconButtonContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

export const StyledIconButton = styled(motion.button)<{ $btnColor?: string }>`
  background: ${props =>
    props.$btnColor === 'primary' ? 'rgba(0, 115, 255, 0.1)' :
    props.$btnColor === 'success' ? 'rgba(0, 191, 143, 0.1)' :
    props.$btnColor === 'error' ? 'rgba(255, 65, 108, 0.1)' :
    'rgba(0, 255, 255, 0.1)'
  };
  color: ${props =>
    props.$btnColor === 'primary' ? '#0073ff' :
    props.$btnColor === 'success' ? '#00bf8f' :
    props.$btnColor === 'error' ? '#ff416c' :
    theme.cyan
  };
  border: none;
  border-radius: 8px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: ${props =>
      props.$btnColor === 'primary' ? 'rgba(0, 115, 255, 0.2)' :
      props.$btnColor === 'success' ? 'rgba(0, 191, 143, 0.2)' :
      props.$btnColor === 'error' ? 'rgba(255, 65, 108, 0.2)' :
      'rgba(0, 255, 255, 0.2)'
    };
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(1px);
  }
`;

/* ── Modal (Dialog replacement) ── */
export const ModalOverlay = styled.div<{ $open: boolean }>`
  display: ${props => props.$open ? 'flex' : 'none'};
  position: fixed;
  inset: 0;
  z-index: 1300;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

export const ModalPanel = styled.div<{ $maxWidth?: string }>`
  background: linear-gradient(135deg, #1c1c3c, #0d0d20);
  color: ${theme.text};
  border-radius: 12px;
  border: 1px solid ${theme.border};
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  width: 100%;
  max-width: ${props => props.$maxWidth || '600px'};
  max-height: 90vh;
  overflow-y: auto;
`;

export const ModalTitle = styled.div`
  background: rgba(20, 20, 50, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 500;
    color: ${theme.text};
  }
`;

export const ModalContent = styled.div`
  padding: 1.5rem;
`;

export const ModalActions = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

/* ── Glass Panel (Paper replacement) ── */
export const GlassPanel = styled.div<{ $mb?: string }>`
  padding: 1.5rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid ${theme.border};
  margin-bottom: ${props => props.$mb || '0'};
`;

/* ── Form elements ── */
export const FormGrid = styled.div<{ $columns?: number; $gap?: string }>`
  display: grid;
  grid-template-columns: repeat(${props => props.$columns || 2}, 1fr);
  gap: ${props => props.$gap || '1rem'};

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const FormField = styled.div<{ $fullWidth?: boolean }>`
  grid-column: ${props => props.$fullWidth ? '1 / -1' : 'auto'};
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.5rem;
`;

export const FormLabel = styled.label`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
`;

export const FormInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 0.6rem 0.75rem;
  font-size: 0.95rem;
  font-family: inherit;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s ease;
  box-sizing: border-box;

  &:focus {
    border-color: ${theme.accent};
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }
`;

export const FormSelect = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 0.6rem 0.75rem;
  font-size: 0.95rem;
  font-family: inherit;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.7)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2.5rem;
  box-sizing: border-box;

  &:focus {
    border-color: ${theme.accent};
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
  }

  option {
    background: #1c1c3c;
    color: rgba(255, 255, 255, 0.9);
  }
`;

/* ── Content Grid (Grid replacement) ── */
export const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

/* ── Stack rows / columns ── */
export const FlexRow = styled.div<{ $gap?: string; $align?: string; $justify?: string }>`
  display: flex;
  flex-direction: row;
  align-items: ${props => props.$align || 'center'};
  justify-content: ${props => props.$justify || 'flex-start'};
  gap: ${props => props.$gap || '0.5rem'};
`;

export const FlexCol = styled.div<{ $gap?: string }>`
  display: flex;
  flex-direction: column;
  gap: ${props => props.$gap || '0.75rem'};
`;

/* ── Description box ── */
export const DescriptionBox = styled.div`
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 10px;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.2);
`;

/* ── Typography helpers ── */
export const SectionTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.15rem;
  font-weight: 500;
  color: ${theme.text};
`;

export const SubTitle = styled.h4`
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 500;
  color: ${theme.text};
`;

export const BodyText = styled.p<{ $muted?: boolean }>`
  margin: 0;
  font-size: 0.95rem;
  color: ${props => props.$muted ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.9)'};
  line-height: 1.5;
`;

export const UserName = styled.span`
  font-size: 0.95rem;
  font-weight: 500;
  color: ${theme.text};
`;

export const UserMeta = styled.span`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
`;

export const ModalSubText = styled.p`
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
`;

export const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
`;

export const LoadingSpinner = styled.div`
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 4px solid ${theme.cyan};
  width: 40px;
  height: 40px;
  animation: ${spin} 1s linear infinite;
`;

export const ErrorContainer = styled.div`
  text-align: center;
  padding: 2rem;
  background: rgba(255, 65, 108, 0.1);
  border-radius: 10px;
  border: 1px solid rgba(255, 65, 108, 0.3);
  color: #ff4b6a;
  margin: 2rem 0;
`;

export const EmptyStateContainer = styled.div`
  text-align: center;
  padding: 3rem 1rem;
`;

export const EmptyStateIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  color: rgba(255, 255, 255, 0.2);
`;

export const EmptyStateText = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.1rem;
`;

/* ── Feature list item ── */
export const FeatureItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: ${theme.text};
  font-size: 0.95rem;
`;

/* ── Tabs ── */
export const TabBar = styled.div`
  display: flex;
  gap: 0;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    height: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }
`;

export const TabButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 0.75rem 1.25rem;
  background: transparent;
  border: none;
  border-bottom: 3px solid ${props => props.$active ? theme.cyan : 'transparent'};
  color: ${props => props.$active ? theme.cyan : 'rgba(255, 255, 255, 0.6)'};
  font-weight: 500;
  font-size: 1rem;
  font-family: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
  transition: color 0.2s ease, border-color 0.2s ease;
  min-width: 100px;
  justify-content: center;

  &:hover {
    color: ${props => props.$active ? theme.cyan : 'rgba(255, 255, 255, 0.85)'};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

/* ── Role / Status chips ── */
export const RoleChip = styled.span<{ $role: string }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  ${props => {
    switch (props.$role) {
      case 'admin':
        return css`
          background: rgba(255, 65, 108, 0.15);
          color: #ff6b8a;
          border: 1px solid rgba(255, 65, 108, 0.3);
        `;
      case 'trainer':
        return css`
          background: rgba(255, 165, 0, 0.15);
          color: #ffb347;
          border: 1px solid rgba(255, 165, 0, 0.3);
        `;
      case 'client':
        return css`
          background: rgba(0, 191, 143, 0.15);
          color: #4ade80;
          border: 1px solid rgba(0, 191, 143, 0.3);
        `;
      default:
        return css`
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.2);
        `;
    }
  }}
`;

export const StatusChip = styled.span<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  ${props => props.$active ? css`
    background: rgba(0, 191, 143, 0.15);
    color: #4ade80;
    border: 1px solid rgba(0, 191, 143, 0.3);
  ` : css`
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.15);
  `}
`;

/* ── Pagination ── */
export const PaginationBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 0.75rem 1rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  flex-wrap: wrap;
`;

export const PaginationSelect = styled.select`
  min-height: 36px;
  background: rgba(20, 20, 40, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;

  option {
    background: #1c1c3c;
    color: rgba(255, 255, 255, 0.9);
  }
`;

export const PaginationButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-family: inherit;

  &:hover:not(:disabled) {
    background: rgba(0, 255, 255, 0.1);
    border-color: rgba(0, 255, 255, 0.3);
    color: ${theme.cyan};
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

/* ── Divider with text ── */
export const FormDivider = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  font-weight: 500;
  grid-column: 1 / -1;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
  }
`;

// Animation variants for Framer Motion
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.1,
      duration: 0.3
    }
  }
};

export const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 10
    }
  }
};
