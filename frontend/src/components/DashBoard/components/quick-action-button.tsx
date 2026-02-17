import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Users, BarChart2, Settings, FileText, Calendar, UserCheck } from 'lucide-react';

// Styled components
const ActionCardContainer = styled(motion.div)`
  background: rgba(30, 30, 60, 0.5);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  height: 100%;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
`;

const IconContainer = styled.div<{ color?: string }>`
  background-color: ${props => props.color || 'rgba(0, 255, 255, 0.15)'};
  border-radius: 50%;
  height: 56px;
  width: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
`;

const ActionTitle = styled.h6`
  font-size: 1rem;
  font-weight: 500;
  margin: 0 0 0.5rem 0;
  color: white;
`;

const ActionDescription = styled.p`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
`;

// Animation variants
const cardVariants = {
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

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  users: <Users size={24} color="white" />,
  chart: <BarChart2 size={24} color="white" />,
  settings: <Settings size={24} color="white" />,
  file: <FileText size={24} color="white" />,
  calendar: <Calendar size={24} color="white" />,
  check: <UserCheck size={24} color="white" />,
};

// Color mapping
const colorMap: Record<string, string> = {
  primary: 'rgba(0, 255, 255, 0.15)',
  purple: 'rgba(120, 81, 169, 0.15)',
  success: 'rgba(0, 191, 143, 0.15)',
  warning: 'rgba(255, 183, 0, 0.15)',
  danger: 'rgba(255, 84, 84, 0.15)',
  info: 'rgba(0, 150, 255, 0.15)',
};

interface QuickActionButtonProps {
  title: string;
  description?: string;
  icon: string;
  path: string;
  colorScheme?: string;
}

/**
 * QuickActionButton Component
 *
 * Displays a clickable card with icon and title for quick actions
 * in the admin dashboard.
 */
const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  title,
  description,
  icon,
  path,
  colorScheme = 'primary'
}) => {
  const navigate = useNavigate();
  const iconColor = colorMap[colorScheme] || colorMap.primary;
  const iconComponent = iconMap[icon] || <Settings size={24} color="white" />;

  const handleClick = () => {
    navigate(path);
  };

  return (
    <ActionCardContainer
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      whileHover={{
        y: -5,
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
        backgroundColor: 'rgba(40, 40, 80, 0.5)',
        borderColor: 'rgba(0, 255, 255, 0.3)'
      }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
    >
      <IconContainer color={iconColor}>
        {iconComponent}
      </IconContainer>
      <ActionTitle>
        {title}
      </ActionTitle>
      {description && (
        <ActionDescription>
          {description}
        </ActionDescription>
      )}
    </ActionCardContainer>
  );
};

export default QuickActionButton;
