import styled, { keyframes } from "styled-components";
import { motion } from "framer-motion";

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

export const glowAnimation = keyframes`
  0% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.3); }
  50% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.5), 0 0 30px rgba(120, 81, 169, 0.3); }
  100% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.3); }
`;

export const textGlow = keyframes`
  0%, 100% { text-shadow: 0 0 5px rgba(0, 255, 255, 0.5), 0 0 10px rgba(120, 81, 169, 0.4); }
  50% { text-shadow: 0 0 10px rgba(0, 255, 255, 0.8), 0 0 15px rgba(120, 81, 169, 0.6); }
`;

// --- Executive Command Intelligence Theme ---
const executiveTheme = {
  deepSpace: '#0a0a0f',
  commandNavy: '#1e3a8a',
  stellarAuthority: '#3b82f6',
  cyberIntelligence: '#0ea5e9',
  executiveAccent: '#0891b2',
  warningAmber: '#f59e0b',
  successGreen: '#10b981',
  criticalRed: '#ef4444',
  stellarWhite: '#ffffff',
  platinumSilver: '#e5e7eb',
  cosmicGray: '#9ca3af',
};

// --- Styled Components ---
export const PageContainer = styled.div`
  position: relative;
  overflow-x: hidden;
  background: radial-gradient(ellipse at top, ${executiveTheme.stellarAuthority} 0%, ${executiveTheme.commandNavy} 50%, ${executiveTheme.deepSpace} 100%);
  color: white;
  min-height: 100vh;
`;

export const ContentContainer = styled.div`
  position: relative;
  z-index: 1;
  padding: 1rem;
  max-width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  width: 100%;
`;

export const StyledCard = styled.div`
  border-radius: 15px;
  overflow: hidden;
  background: rgba(30, 58, 138, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  transition: all 0.3s ease;
  box-shadow: 0 8px 32px rgba(30, 58, 138, 0.2);

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 40px rgba(30, 58, 138, 0.3);
    border: 1px solid rgba(59, 130, 246, 0.3);
  }
`;

export const CardHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
`;

export const CardTitle = styled.h2`
  margin: 0;
  color: white;
  font-size: 1.8rem;
  font-weight: 300;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
`;

export const CardContent = styled.div`
  padding: 1.5rem;
`;

export const StatsGridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

export const StatsCard = styled(motion.div)<{ $variant?: string }>`
  border-radius: 15px;
  padding: 1.5rem;
  background: ${props =>
    props.$variant === 'primary' ? `linear-gradient(145deg, rgba(59, 130, 246, 0.1), rgba(14, 165, 233, 0.15))` :
    props.$variant === 'success' ? `linear-gradient(145deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.15))` :
    props.$variant === 'warning' ? `linear-gradient(145deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.15))` :
    props.$variant === 'info' ? `linear-gradient(145deg, rgba(8, 145, 178, 0.1), rgba(8, 145, 178, 0.15))` :
    `linear-gradient(145deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.15))`
  };
  border: 1px solid ${props =>
    props.$variant === 'primary' ? 'rgba(59, 130, 246, 0.3)' :
    props.$variant === 'success' ? 'rgba(16, 185, 129, 0.3)' :
    props.$variant === 'warning' ? 'rgba(245, 158, 11, 0.3)' :
    props.$variant === 'info' ? 'rgba(8, 145, 178, 0.3)' :
    'rgba(59, 130, 246, 0.3)'
  };
  box-shadow: 0 4px 16px rgba(30, 58, 138, 0.15);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-7px);
    box-shadow: 0 8px 24px rgba(30, 58, 138, 0.25);
    border: 1px solid ${props =>
      props.$variant === 'primary' ? 'rgba(59, 130, 246, 0.5)' :
      props.$variant === 'success' ? 'rgba(16, 185, 129, 0.5)' :
      props.$variant === 'warning' ? 'rgba(245, 158, 11, 0.5)' :
      props.$variant === 'info' ? 'rgba(8, 145, 178, 0.5)' :
      'rgba(59, 130, 246, 0.5)'
    };
  }
`;

export const StatsIconContainer = styled.div<{ $variant?: string }>`
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  background: ${props =>
    props.$variant === 'primary' ? 'rgba(59, 130, 246, 0.15)' :
    props.$variant === 'success' ? 'rgba(16, 185, 129, 0.15)' :
    props.$variant === 'warning' ? 'rgba(245, 158, 11, 0.15)' :
    props.$variant === 'info' ? 'rgba(8, 145, 178, 0.15)' :
    'rgba(59, 130, 246, 0.15)'
  };
  color: ${props =>
    props.$variant === 'primary' ? '#3b82f6' :
    props.$variant === 'success' ? '#10b981' :
    props.$variant === 'warning' ? '#f59e0b' :
    props.$variant === 'info' ? '#0891b2' :
    '#3b82f6'
  };
`;

export const StatsValue = styled.h3`
  margin: 0;
  font-size: 2.2rem;
  font-weight: 700;
  background: linear-gradient(to right, #00ffff, #3b82f6, #0ea5e9, #0891b2, #00ffff);
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${shimmer} 4s linear infinite;
`;

export const StatsLabel = styled.p`
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
`;

export const FilterContainer = styled(motion.div)`
  padding: 1.2rem;
  background: rgba(30, 58, 138, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(59, 130, 246, 0.15);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

export const SearchField = styled.input`
  border-radius: 10px;
  background: rgba(20, 20, 40, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.9);
  padding: 0.5rem 0.75rem;
  font-size: 0.95rem;
  outline: none;
  min-width: 300px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  &:hover,
  &:focus {
    border-color: rgba(0, 255, 255, 0.5);
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.2);
  }

  @media (max-width: 600px) {
    min-width: 100%;
  }
`;

export const FilterButtonsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

export const FilterButton = styled.button<{ $isActive?: boolean; $buttonColor?: string }>`
  border-radius: 10px;
  text-transform: none;
  font-weight: 500;
  padding: 0.35rem 1rem;
  min-width: 100px;
  min-height: 44px;
  letter-spacing: 0.5px;
  color: white;
  cursor: pointer;
  font-size: 0.95rem;
  background: ${props =>
    props.$isActive
      ? (props.$buttonColor === 'primary'
          ? 'linear-gradient(135deg, #3b82f6, #0ea5e9)' :
        props.$buttonColor === 'success'
          ? 'linear-gradient(135deg, #10b981, #34d399)' :
        props.$buttonColor === 'error'
          ? 'linear-gradient(135deg, #ef4444, #f87171)' :
        'linear-gradient(135deg, #3b82f6, #0ea5e9)')
      : 'transparent'
  };

  border: 1px solid ${props =>
    props.$buttonColor === 'primary' ? 'rgba(59, 130, 246, 0.5)' :
    props.$buttonColor === 'success' ? 'rgba(16, 185, 129, 0.5)' :
    props.$buttonColor === 'error' ? 'rgba(239, 68, 68, 0.5)' :
    'rgba(59, 130, 246, 0.5)'
  };

  transition: all 0.3s ease;
  box-shadow: ${props => props.$isActive ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none'};

  &:hover {
    background: ${props =>
      !props.$isActive
        ? (props.$buttonColor === 'primary'
            ? 'rgba(59, 130, 246, 0.1)' :
          props.$buttonColor === 'success'
            ? 'rgba(16, 185, 129, 0.1)' :
          props.$buttonColor === 'error'
            ? 'rgba(239, 68, 68, 0.1)' :
          'rgba(59, 130, 246, 0.1)')
        : undefined
    };
    transform: translateY(-2px);
  }
`;

export const StyledTableContainer = styled.div`
  margin-top: 1.5rem;
  background: rgba(20, 20, 40, 0.4);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  overflow: hidden;
  overflow-x: auto;
`;

export const StyledTableHead = styled.tr`
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.4), rgba(59, 130, 246, 0.3));
`;

export const StyledTableHeadCell = styled.td`
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  font-size: 0.95rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem;
  letter-spacing: 0.5px;
`;

export const StyledTableCell = styled.td`
  color: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 1rem;
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

export const StyledButton = styled.button<{ $variant?: string; $buttonColor?: string }>`
  background: ${props =>
    props.$variant === "contained"
      ? (props.$buttonColor === 'primary'
          ? 'linear-gradient(135deg, #0073ff, #00c6ff)' :
        props.$buttonColor === 'success'
          ? 'linear-gradient(135deg, #00bf8f, #00ab76)' :
        props.$buttonColor === 'error'
          ? 'linear-gradient(135deg, #ff416c, #ff4b2b)' :
        'linear-gradient(135deg, #7851a9, #00ffff)')
      : 'transparent'
  };

  color: white;
  border-radius: 10px;
  text-transform: none;
  letter-spacing: 0.5px;
  font-weight: 500;
  font-size: 0.95rem;
  padding: 0.5rem 1.2rem;
  min-height: 44px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${props => props.$variant === "contained" ? '0 4px 15px rgba(0, 0, 0, 0.2)' : 'none'};
  border: ${props => props.$variant !== "contained"
    ? `1px solid ${
        props.$buttonColor === 'primary' ? 'rgba(33, 150, 243, 0.5)' :
        props.$buttonColor === 'success' ? 'rgba(46, 125, 50, 0.5)' :
        props.$buttonColor === 'error' ? 'rgba(255, 65, 108, 0.5)' :
        'rgba(0, 255, 255, 0.5)'
      }`
    : 'none'
  };

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.$variant === "contained"
      ? '0 6px 20px rgba(0, 0, 0, 0.3)'
      : '0 4px 12px rgba(0, 0, 0, 0.1)'
    };

    background: ${props =>
      props.$variant !== "contained"
        ? (props.$buttonColor === 'primary'
            ? 'rgba(33, 150, 243, 0.1)' :
          props.$buttonColor === 'success'
            ? 'rgba(46, 125, 50, 0.1)' :
          props.$buttonColor === 'error'
            ? 'rgba(255, 65, 108, 0.1)' :
          'rgba(0, 255, 255, 0.1)')
        : undefined
    };
  }

  &:active {
    transform: translateY(1px);
  }
`;

export const ChipContainer = styled.div<{ $chipStatus?: string; chipstatus?: string }>`
  background: ${props => {
    const s = props.$chipStatus || props.chipstatus || '';
    return s === 'completed' ? 'rgba(16, 185, 129, 0.15)' :
    s === 'scheduled' ? 'rgba(59, 130, 246, 0.15)' :
    s === 'confirmed' ? 'rgba(8, 145, 178, 0.15)' :
    s === 'cancelled' ? 'rgba(239, 68, 68, 0.15)' :
    s === 'available' ? 'rgba(14, 165, 233, 0.15)' :
    'rgba(59, 130, 246, 0.15)';
  }};
  color: ${props => {
    const s = props.$chipStatus || props.chipstatus || '';
    return s === 'completed' ? '#10b981' :
    s === 'scheduled' ? '#3b82f6' :
    s === 'confirmed' ? '#0891b2' :
    s === 'cancelled' ? '#ef4444' :
    s === 'available' ? '#0ea5e9' :
    '#3b82f6';
  }};
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 500;
  padding: 0.3rem 0.7rem;
  display: inline-block;
  text-transform: capitalize;
  border: 1px solid ${props => {
    const s = props.$chipStatus || props.chipstatus || '';
    return s === 'completed' ? 'rgba(16, 185, 129, 0.3)' :
    s === 'scheduled' ? 'rgba(59, 130, 246, 0.3)' :
    s === 'confirmed' ? 'rgba(8, 145, 178, 0.3)' :
    s === 'cancelled' ? 'rgba(239, 68, 68, 0.3)' :
    s === 'available' ? 'rgba(14, 165, 233, 0.3)' :
    'rgba(59, 130, 246, 0.3)';
  }};
`;

export const IconButtonContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

export const StyledIconButton = styled(motion.button)<{ $btnColor?: string; btncolor?: string }>`
  background: ${props => {
    const c = props.$btnColor || props.btncolor || '';
    return c === 'primary' ? 'rgba(0, 115, 255, 0.1)' :
    c === 'success' ? 'rgba(0, 191, 143, 0.1)' :
    c === 'error' ? 'rgba(255, 65, 108, 0.1)' :
    'rgba(0, 255, 255, 0.1)';
  }};
  color: ${props => {
    const c = props.$btnColor || props.btncolor || '';
    return c === 'primary' ? '#0073ff' :
    c === 'success' ? '#00bf8f' :
    c === 'error' ? '#ff416c' :
    '#00ffff';
  }};
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
    background: ${props => {
      const c = props.$btnColor || props.btncolor || '';
      return c === 'primary' ? 'rgba(0, 115, 255, 0.2)' :
      c === 'success' ? 'rgba(0, 191, 143, 0.2)' :
      c === 'error' ? 'rgba(255, 65, 108, 0.2)' :
      'rgba(0, 255, 255, 0.2)';
    }};
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(1px);
  }
`;

export const FooterActionsContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
`;

export const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
`;

export const LoadingSpinner = styled.div`
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top: 4px solid #00ffff;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
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

/* --- Dialog Components --- */
/* StyledDialog is now a pure styled-components modal overlay + panel.
   Usage: wrap children in <StyledDialog $open={bool} onClick={onClose}>
            <DialogPanel onClick={e => e.stopPropagation()}> ... </DialogPanel>
          </StyledDialog>
*/

export const StyledDialog = styled.div<{ $open?: boolean }>`
  display: ${props => props.$open ? 'flex' : 'none'};
  position: fixed;
  inset: 0;
  z-index: 1300;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
`;

export const DialogPanel = styled.div`
  background: linear-gradient(135deg, ${executiveTheme.commandNavy}, ${executiveTheme.deepSpace});
  color: white;
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(30, 58, 138, 0.3);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  margin: 1rem;
`;

export const DialogTitleBar = styled.div`
  background: rgba(30, 58, 138, 0.3);
  border-bottom: 1px solid rgba(59, 130, 246, 0.15);
  padding: 1.25rem 1.5rem;
  font-size: 1.25rem;
  font-weight: 600;
`;

export const DialogContentArea = styled.div`
  padding: 1.5rem;

  input, select, textarea {
    color: rgba(255, 255, 255, 0.9);
    background: rgba(20, 20, 40, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    outline: none;
    font-size: 0.95rem;
    width: 100%;
    box-sizing: border-box;

    &:focus {
      border-color: rgba(0, 255, 255, 0.5);
      box-shadow: 0 0 10px rgba(0, 255, 255, 0.15);
    }

    &::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }
  }

  label {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
    display: block;
  }
`;

export const DialogActionsBar = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

// --- Flex Row / Stack Replacement ---
export const FlexRow = styled.div<{ $gap?: string; $align?: string; $justify?: string; $wrap?: string }>`
  display: flex;
  flex-direction: row;
  gap: ${props => props.$gap || '0.5rem'};
  align-items: ${props => props.$align || 'center'};
  justify-content: ${props => props.$justify || 'flex-start'};
  flex-wrap: ${props => props.$wrap || 'nowrap'};
`;

// --- Avatar ---
export const StyledAvatar = styled.div<{ $size?: number }>`
  width: ${props => props.$size || 32}px;
  height: ${props => props.$size || 32}px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(14, 165, 233, 0.3));
  border: 1px solid rgba(14, 165, 233, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${props => ((props.$size || 32) * 0.35)}px;
  color: #e2e8f0;
  font-weight: 600;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
`;

// --- Session Count Chip (inline in table) ---
export const SessionCountChip = styled.span<{ $hasCredits?: boolean }>`
  display: inline-block;
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  margin-top: 0.25rem;
  border: 1px solid ${props => props.$hasCredits ? 'rgba(46, 125, 50, 0.5)' : 'rgba(211, 47, 47, 0.5)'};
  color: ${props => props.$hasCredits ? 'rgba(46, 125, 50, 1)' : 'rgba(211, 47, 47, 1)'};
  background: ${props => props.$hasCredits ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)'};
`;

// --- Date Input ---
export const DateInput = styled.input`
  border-radius: 8px;
  background: rgba(20, 20, 40, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  outline: none;
  width: 140px;
  min-height: 44px;
  box-sizing: border-box;

  &:hover,
  &:focus {
    border-color: rgba(0, 255, 255, 0.5);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.15);
  }

  &::-webkit-calendar-picker-indicator {
    filter: invert(0.8);
    cursor: pointer;
  }
`;

// --- Search Wrapper (icon + input) ---
export const SearchInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  min-width: 300px;

  @media (max-width: 600px) {
    min-width: 100%;
  }
`;

export const SearchIconSpan = styled.span`
  position: absolute;
  left: 0.75rem;
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.5);
  pointer-events: none;
`;

export const SearchInput = styled.input`
  border-radius: 10px;
  background: rgba(20, 20, 40, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.9);
  padding: 0.5rem 0.75rem 0.5rem 2.5rem;
  font-size: 0.95rem;
  outline: none;
  width: 100%;
  min-height: 44px;
  box-sizing: border-box;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  &:hover,
  &:focus {
    border-color: rgba(0, 255, 255, 0.5);
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.2);
  }
`;

// --- Pagination ---
export const PaginationContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 1rem;
  flex-wrap: wrap;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.85rem;
`;

export const PaginationSelect = styled.select`
  background: rgba(20, 20, 40, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.9);
  padding: 0.3rem 0.5rem;
  font-size: 0.85rem;
  outline: none;
  min-height: 36px;
  cursor: pointer;

  &:focus {
    border-color: rgba(0, 255, 255, 0.5);
  }

  option {
    background: #0a0a1a;
    color: #e2e8f0;
  }
`;

export const PaginationButton = styled.button<{ $disabled?: boolean }>`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: ${props => props.$disabled ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.7)'};
  padding: 0.3rem 0.6rem;
  min-height: 36px;
  min-width: 36px;
  cursor: ${props => props.$disabled ? 'default' : 'pointer'};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    background: rgba(14, 165, 233, 0.15);
    border-color: rgba(14, 165, 233, 0.4);
  }
`;

// --- Muted / Italic Text ---
export const MutedText = styled.span`
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
  font-size: 0.875rem;
`;

export const BodyText = styled.span<{ $weight?: number; $size?: string; $color?: string }>`
  font-size: ${props => props.$size || '0.875rem'};
  font-weight: ${props => props.$weight || 400};
  color: ${props => props.$color || 'rgba(255, 255, 255, 0.8)'};
`;

export const CaptionText = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
`;

// --- Delete Dialog Detail Box ---
export const DeleteDetailBox = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 0, 0, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(255, 0, 0, 0.2);
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

export const staggeredItemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: (custom: number) => ({
    y: 0,
    opacity: 1,
    transition: {
      delay: custom * 0.1,
      type: "spring",
      stiffness: 100,
      damping: 10
    }
  })
};
