import styled, { keyframes } from "styled-components";
import { motion } from "framer-motion";
import { 
  Box, 
  Button, 
  Card, 
  Paper, 
  Dialog, 
  TableContainer, 
  TableCell, 
  TableRow,
  TextField
} from "@mui/material";

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

// --- Styled Components ---
export const PageContainer = styled.div`
  position: relative;
  overflow-x: hidden;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
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

export const StyledCard = styled(Card)`
  border-radius: 15px !important;
  overflow: hidden;
  background: rgba(30, 30, 60, 0.3) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  transition: all 0.3s ease;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3) !important;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4) !important;
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

export const StatsCard = styled(motion.div)<{ variant?: string }>`
  border-radius: 15px;
  padding: 1.5rem;
  background: ${props => 
    props.variant === 'primary' ? 'linear-gradient(145deg, rgba(33, 150, 243, 0.1), rgba(33, 150, 243, 0.2))' :
    props.variant === 'success' ? 'linear-gradient(145deg, rgba(46, 125, 50, 0.1), rgba(46, 125, 50, 0.2))' :
    props.variant === 'warning' ? 'linear-gradient(145deg, rgba(237, 108, 2, 0.1), rgba(237, 108, 2, 0.2))' :
    props.variant === 'info' ? 'linear-gradient(145deg, rgba(2, 136, 209, 0.1), rgba(2, 136, 209, 0.2))' :
    'linear-gradient(145deg, rgba(120, 81, 169, 0.1), rgba(120, 81, 169, 0.2))'
  };
  border: 1px solid ${props => 
    props.variant === 'primary' ? 'rgba(33, 150, 243, 0.3)' :
    props.variant === 'success' ? 'rgba(46, 125, 50, 0.3)' :
    props.variant === 'warning' ? 'rgba(237, 108, 2, 0.3)' :
    props.variant === 'info' ? 'rgba(2, 136, 209, 0.3)' :
    'rgba(120, 81, 169, 0.3)'
  };
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-7px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
    border: 1px solid ${props => 
      props.variant === 'primary' ? 'rgba(33, 150, 243, 0.5)' :
      props.variant === 'success' ? 'rgba(46, 125, 50, 0.5)' :
      props.variant === 'warning' ? 'rgba(237, 108, 2, 0.5)' :
      props.variant === 'info' ? 'rgba(2, 136, 209, 0.5)' :
      'rgba(120, 81, 169, 0.5)'
    };
  }
`;

export const StatsIconContainer = styled.div<{ variant?: string }>`
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  background: ${props => 
    props.variant === 'primary' ? 'rgba(33, 150, 243, 0.15)' :
    props.variant === 'success' ? 'rgba(46, 125, 50, 0.15)' :
    props.variant === 'warning' ? 'rgba(237, 108, 2, 0.15)' :
    props.variant === 'info' ? 'rgba(2, 136, 209, 0.15)' :
    'rgba(120, 81, 169, 0.15)'
  };
  color: ${props => 
    props.variant === 'primary' ? 'rgba(33, 150, 243, 1)' :
    props.variant === 'success' ? 'rgba(46, 125, 50, 1)' :
    props.variant === 'warning' ? 'rgba(237, 108, 2, 1)' :
    props.variant === 'info' ? 'rgba(2, 136, 209, 1)' :
    'rgba(120, 81, 169, 1)'
  };
`;

export const StatsValue = styled.h3`
  margin: 0;
  font-size: 2.2rem;
  font-weight: 700;
  background: linear-gradient(to right, #a9f8fb, #46cdcf, #7b2cbf, #c8b6ff, #a9f8fb);
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
  background: rgba(30, 30, 60, 0.4);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

export const SearchField = styled(TextField)`
  .MuiInputBase-root {
    border-radius: 10px;
    background: rgba(20, 20, 40, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
    
    &:hover, &.Mui-focused {
      border-color: rgba(0, 255, 255, 0.5);
      box-shadow: 0 0 15px rgba(0, 255, 255, 0.2);
    }
  }
  
  .MuiInputBase-input {
    color: rgba(255, 255, 255, 0.9);
    &::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }
  }
  
  .MuiInputAdornment-root {
    color: rgba(255, 255, 255, 0.7);
  }
`;

export const FilterButtonsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

export const FilterButton = styled(Button)<{ isactive?: "true" | "false" | undefined; buttoncolor?: string }>`
  border-radius: 10px !important;
  text-transform: none !important;
  font-weight: 500 !important;
  padding: 0.35rem 1rem !important;
  min-width: 100px !important;
  letter-spacing: 0.5px !important;
  color: white !important;
  background: ${props => 
    props.isactive === "true" 
      ? (props.buttoncolor === 'primary' 
          ? 'linear-gradient(135deg, #0073ff, #00c6ff)' :
        props.buttoncolor === 'success' 
          ? 'linear-gradient(135deg, #00bf8f, #00ab76)' :
        props.buttoncolor === 'error' 
          ? 'linear-gradient(135deg, #ff416c, #ff4b2b)' :
        'linear-gradient(135deg, #7851a9, #00ffff)')
      : 'transparent'
  } !important;
  
  border: 1px solid ${props => 
    props.buttoncolor === 'primary' ? 'rgba(33, 150, 243, 0.5)' :
    props.buttoncolor === 'success' ? 'rgba(46, 125, 50, 0.5)' :
    props.buttoncolor === 'error' ? 'rgba(255, 65, 108, 0.5)' :
    'rgba(0, 255, 255, 0.5)'
  } !important;
  
  transition: all 0.3s ease !important;
  box-shadow: ${props => props.isactive === "true" ? '0 4px 12px rgba(0, 0, 0, 0.2)' : 'none'} !important;
  
  &:hover {
    background: ${props => 
      props.isactive !== "true" 
        ? (props.buttoncolor === 'primary' 
            ? 'rgba(33, 150, 243, 0.1)' :
          props.buttoncolor === 'success' 
            ? 'rgba(46, 125, 50, 0.1)' :
          props.buttoncolor === 'error' 
            ? 'rgba(255, 65, 108, 0.1)' :
          'rgba(0, 255, 255, 0.1)')
        : null
    } !important;
    transform: translateY(-2px);
  }
`;

export const StyledTableContainer = styled(TableContainer)`
  margin-top: 1.5rem;
  background: rgba(20, 20, 40, 0.4) !important;
  border-radius: 15px !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  backdrop-filter: blur(10px);
  overflow: hidden;
`;

export const StyledTableHead = styled(TableRow)`
  background: linear-gradient(135deg, rgba(120, 81, 169, 0.7), rgba(0, 255, 255, 0.3)) !important;
`;

export const StyledTableHeadCell = styled(TableCell)`
  color: rgba(255, 255, 255, 0.9) !important;
  font-weight: 600 !important;
  font-size: 0.95rem !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  padding: 1rem !important;
  letter-spacing: 0.5px !important;
`;

export const StyledTableCell = styled(TableCell)`
  color: rgba(255, 255, 255, 0.8) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
  padding: 1rem !important;
`;

export const StyledTableRow = styled(TableRow)`
  transition: all 0.2s ease;
  background: transparent !important;
  
  &:hover {
    background: rgba(0, 255, 255, 0.05) !important;
    backdrop-filter: blur(10px);
  }
  
  &:nth-of-type(even) {
    background: rgba(20, 20, 50, 0.2) !important;
  }
  
  &:nth-of-type(even):hover {
    background: rgba(0, 255, 255, 0.08) !important;
  }
`;

export const StyledButton = styled(Button)<{ variant?: string; buttoncolor?: string }>`
  background: ${props => 
    props.variant === "contained"
      ? (props.buttoncolor === 'primary' 
          ? 'linear-gradient(135deg, #0073ff, #00c6ff)' :
        props.buttoncolor === 'success' 
          ? 'linear-gradient(135deg, #00bf8f, #00ab76)' :
        props.buttoncolor === 'error' 
          ? 'linear-gradient(135deg, #ff416c, #ff4b2b)' :
        'linear-gradient(135deg, #7851a9, #00ffff)')
      : 'transparent'
  } !important;
  
  color: white !important;
  border-radius: 10px !important;
  text-transform: none !important;
  letter-spacing: 0.5px !important;
  font-weight: 500 !important;
  font-size: 0.95rem !important;
  padding: 0.5rem 1.2rem !important;
  transition: all 0.3s ease !important;
  box-shadow: ${props => props.variant === "contained" ? '0 4px 15px rgba(0, 0, 0, 0.2)' : 'none'} !important;
  border: ${props => props.variant !== "contained" 
    ? `1px solid ${
        props.buttoncolor === 'primary' ? 'rgba(33, 150, 243, 0.5)' :
        props.buttoncolor === 'success' ? 'rgba(46, 125, 50, 0.5)' :
        props.buttoncolor === 'error' ? 'rgba(255, 65, 108, 0.5)' :
        'rgba(0, 255, 255, 0.5)'
      }`
    : 'none'
  } !important;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.variant === "contained" 
      ? '0 6px 20px rgba(0, 0, 0, 0.3)'
      : '0 4px 12px rgba(0, 0, 0, 0.1)'
    } !important;
    
    background: ${props => 
      props.variant !== "contained" 
        ? (props.buttoncolor === 'primary' 
            ? 'rgba(33, 150, 243, 0.1)' :
          props.buttoncolor === 'success' 
            ? 'rgba(46, 125, 50, 0.1)' :
          props.buttoncolor === 'error' 
            ? 'rgba(255, 65, 108, 0.1)' :
          'rgba(0, 255, 255, 0.1)')
        : null
    } !important;
  }
  
  &:active {
    transform: translateY(1px);
  }
`;

export const ChipContainer = styled.div<{ chipstatus: string }>`
  background: ${props => 
    props.chipstatus === 'completed' ? 'rgba(46, 125, 50, 0.15)' :
    props.chipstatus === 'scheduled' ? 'rgba(33, 150, 243, 0.15)' :
    props.chipstatus === 'cancelled' ? 'rgba(255, 65, 108, 0.15)' :
    'rgba(120, 81, 169, 0.15)'
  };
  color: ${props => 
    props.chipstatus === 'completed' ? 'rgba(46, 125, 50, 1)' :
    props.chipstatus === 'scheduled' ? 'rgba(33, 150, 243, 1)' :
    props.chipstatus === 'cancelled' ? 'rgba(255, 65, 108, 1)' :
    'rgba(120, 81, 169, 1)'
  };
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 500;
  padding: 0.3rem 0.7rem;
  display: inline-block;
  text-transform: capitalize;
  border: 1px solid ${props => 
    props.chipstatus === 'completed' ? 'rgba(46, 125, 50, 0.3)' :
    props.chipstatus === 'scheduled' ? 'rgba(33, 150, 243, 0.3)' :
    props.chipstatus === 'cancelled' ? 'rgba(255, 65, 108, 0.3)' :
    'rgba(120, 81, 169, 0.3)'
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

export const StyledDialog = styled(Dialog)`
  .MuiDialog-paper {
    background: linear-gradient(135deg, #1c1c3c, #0d0d20) !important;
    color: white !important;
    border-radius: 12px !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    overflow: hidden !important;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5) !important;
  }
  
  .MuiDialogTitle-root {
    background: rgba(20, 20, 50, 0.5) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
    padding: 1.25rem 1.5rem !important;
  }
  
  .MuiDialogContent-root {
    padding: 1.5rem !important;
  }
  
  .MuiDialogActions-root {
    padding: 1rem 1.5rem !important;
    border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
  }
  
  .MuiInputBase-input {
    color: rgba(255, 255, 255, 0.9) !important;
  }
  
  .MuiInputLabel-root {
    color: rgba(255, 255, 255, 0.7) !important;
  }
  
  .MuiOutlinedInput-notchedOutline {
    border-color: rgba(255, 255, 255, 0.15) !important;
  }
  
  .MuiSelect-icon {
    color: rgba(255, 255, 255, 0.7) !important;
  }
  
  .MuiMenuItem-root {
    color: rgba(255, 255, 255, 0.9) !important;
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
