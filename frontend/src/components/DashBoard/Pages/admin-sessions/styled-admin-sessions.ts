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

export const ChipContainer = styled.div<{ chipstatus: string }>`
  background: ${props =>
    props.chipstatus === 'completed' ? 'rgba(16, 185, 129, 0.15)' :
    props.chipstatus === 'scheduled' ? 'rgba(59, 130, 246, 0.15)' :
    props.chipstatus === 'confirmed' ? 'rgba(8, 145, 178, 0.15)' :
    props.chipstatus === 'cancelled' ? 'rgba(239, 68, 68, 0.15)' :
    props.chipstatus === 'available' ? 'rgba(14, 165, 233, 0.15)' :
    'rgba(59, 130, 246, 0.15)'
  };
  color: ${props =>
    props.chipstatus === 'completed' ? '#10b981' :
    props.chipstatus === 'scheduled' ? '#3b82f6' :
    props.chipstatus === 'confirmed' ? '#0891b2' :
    props.chipstatus === 'cancelled' ? '#ef4444' :
    props.chipstatus === 'available' ? '#0ea5e9' :
    '#3b82f6'
  };
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 500;
  padding: 0.3rem 0.7rem;
  display: inline-block;
  text-transform: capitalize;
  border: 1px solid ${props =>
    props.chipstatus === 'completed' ? 'rgba(16, 185, 129, 0.3)' :
    props.chipstatus === 'scheduled' ? 'rgba(59, 130, 246, 0.3)' :
    props.chipstatus === 'confirmed' ? 'rgba(8, 145, 178, 0.3)' :
    props.chipstatus === 'cancelled' ? 'rgba(239, 68, 68, 0.3)' :
    props.chipstatus === 'available' ? 'rgba(14, 165, 233, 0.3)' :
    'rgba(59, 130, 246, 0.3)'
  };
`;

export const IconButtonContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

export const StyledIconButton = styled(motion.button)<{ btncolor?: string }>`
  background: ${props =>
    props.btncolor === 'primary' ? 'rgba(0, 115, 255, 0.1)' :
    props.btncolor === 'success' ? 'rgba(0, 191, 143, 0.1)' :
    props.btncolor === 'error' ? 'rgba(255, 65, 108, 0.1)' :
    'rgba(0, 255, 255, 0.1)'
  };
  color: ${props =>
    props.btncolor === 'primary' ? '#0073ff' :
    props.btncolor === 'success' ? '#00bf8f' :
    props.btncolor === 'error' ? '#ff416c' :
    '#00ffff'
  };
  border: none;
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: ${props =>
      props.btncolor === 'primary' ? 'rgba(0, 115, 255, 0.2)' :
      props.btncolor === 'success' ? 'rgba(0, 191, 143, 0.2)' :
      props.btncolor === 'error' ? 'rgba(255, 65, 108, 0.2)' :
      'rgba(0, 255, 255, 0.2)'
    };
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
