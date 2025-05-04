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
  TableRow 
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
  width: 100%;
  max-width: 100vw; /* Allow content to use full viewport width */
  margin: 0;
  box-sizing: border-box;
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

export const StyledTableContainer = styled(TableContainer)`
  margin-top: 1.5rem;
  background: rgba(20, 20, 40, 0.4) !important;
  border-radius: 10px !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  backdrop-filter: blur(10px);
  overflow: hidden;
`;

export const StyledTableHead = styled(TableRow)`
  background: rgba(20, 20, 50, 0.6) !important;
  backdrop-filter: blur(5px);
`;

export const StyledTableHeadCell = styled(TableCell)`
  color: rgba(255, 255, 255, 0.9) !important;
  font-weight: 500 !important;
  font-size: 1rem !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  padding: 1rem !important;
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

export const StyledButton = styled(Button)<{ variant?: string; color?: string }>`
  background: ${props => 
    props.color === 'primary' ? 'linear-gradient(135deg, #0073ff, #00c6ff)' :
    props.color === 'success' ? 'linear-gradient(135deg, #00bf8f, #00ab76)' :
    props.color === 'error' ? 'linear-gradient(135deg, #ff416c, #ff4b2b)' :
    'linear-gradient(135deg, #7851a9, #00ffff)'
  } !important;
  color: white !important;
  border-radius: 8px !important;
  text-transform: none !important;
  letter-spacing: 0.5px !important;
  font-weight: 500 !important;
  font-size: 0.95rem !important;
  padding: 0.5rem 1.2rem !important;
  transition: all 0.3s ease !important;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2) !important;
  border: none !important;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3) !important;
  }
  
  &:active {
    transform: translateY(1px);
  }
  
  &.MuiButton-outlined {
    background: transparent !important;
    border: 1px solid ${props => 
      props.color === 'primary' ? '#0073ff' :
      props.color === 'success' ? '#00bf8f' :
      props.color === 'error' ? '#ff416c' :
      '#00ffff'
    } !important;
    color: ${props => 
      props.color === 'primary' ? '#0073ff' :
      props.color === 'success' ? '#00bf8f' :
      props.color === 'error' ? '#ff416c' :
      '#00ffff'
    } !important;
    
    &:hover {
      background: rgba(0, 255, 255, 0.05) !important;
    }
  }
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

export const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
`;

export const LoadingSpinner = styled.div`
  border: 4px solid rgba(255, 255, 255, 0.3);
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

export const ErrorContainer = styled.div`
  text-align: center;
  padding: 2rem;
  background: rgba(255, 65, 108, 0.1);
  border-radius: 10px;
  border: 1px solid rgba(255, 65, 108, 0.3);
  color: #ff4b6a;
  margin: 2rem 0;
`;

export const TabContainer = styled(Box)`
  position: relative;
  margin-bottom: 1.5rem;
  
  .MuiTabs-indicator {
    background-color: #00ffff !important;
    height: 3px !important;
    border-radius: 3px !important;
  }
  
  .MuiTab-root {
    color: rgba(255, 255, 255, 0.6) !important;
    text-transform: none !important;
    font-weight: 500 !important;
    font-size: 1rem !important;
    min-width: 100px !important;
    
    &.Mui-selected {
      color: #00ffff !important;
    }
  }
  
  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 1px;
    background: linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0));
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
