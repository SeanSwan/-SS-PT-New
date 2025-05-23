import React from 'react';
import { motion } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import { Box, Typography, Card, CardContent } from '@mui/material';

// Lucide icons
import {
  Award,
  Activity,
  TrendingUp,
  TrendingDown,
  Book,
  Calendar,
  BarChart2,
  Dumbbell,
  User,
  ShoppingBag,
  DollarSign,
  Heart,
  Clock,
  Users,
  Star
} from 'lucide-react';

// Animation keyframes
const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const pulse = keyframes`
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
`;

// Styled components
const StatsCardContainer = styled(Card)<{
  $colorScheme: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'purple'
}>`
  background: ${props => {
    switch (props.$colorScheme) {
      case 'primary':
        return 'linear-gradient(135deg, rgba(0, 109, 255, 0.1), rgba(0, 255, 255, 0.1))';
      case 'secondary':
        return 'linear-gradient(135deg, rgba(156, 39, 176, 0.1), rgba(255, 64, 129, 0.1))';
      case 'success':
        return 'linear-gradient(135deg, rgba(0, 200, 83, 0.1), rgba(124, 179, 66, 0.1))';
      case 'warning':
        return 'linear-gradient(135deg, rgba(255, 152, 0, 0.1), rgba(251, 192, 45, 0.1))';
      case 'error':
        return 'linear-gradient(135deg, rgba(244, 67, 54, 0.1), rgba(229, 57, 53, 0.1))';
      case 'info':
        return 'linear-gradient(135deg, rgba(41, 182, 246, 0.1), rgba(3, 169, 244, 0.1))';
      case 'purple':
        return 'linear-gradient(135deg, rgba(103, 58, 183, 0.1), rgba(170, 0, 255, 0.1))';
      default:
        return 'linear-gradient(135deg, rgba(30, 30, 60, 0.3), rgba(40, 40, 80, 0.3))';
    }
  }};
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid ${props => {
    switch (props.$colorScheme) {
      case 'primary':
        return 'rgba(0, 255, 255, 0.2)';
      case 'secondary':
        return 'rgba(255, 64, 129, 0.2)';
      case 'success':
        return 'rgba(0, 200, 83, 0.2)';
      case 'warning':
        return 'rgba(255, 152, 0, 0.2)';
      case 'error':
        return 'rgba(244, 67, 54, 0.2)';
      case 'info':
        return 'rgba(41, 182, 246, 0.2)';
      case 'purple':
        return 'rgba(103, 58, 183, 0.2)';
      default:
        return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  height: 100%;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
    border-color: ${props => {
      switch (props.$colorScheme) {
        case 'primary':
          return 'rgba(0, 255, 255, 0.4)';
        case 'secondary':
          return 'rgba(255, 64, 129, 0.4)';
        case 'success':
          return 'rgba(0, 200, 83, 0.4)';
        case 'warning':
          return 'rgba(255, 152, 0, 0.4)';
        case 'error':
          return 'rgba(244, 67, 54, 0.4)';
        case 'info':
          return 'rgba(41, 182, 246, 0.4)';
        case 'purple':
          return 'rgba(103, 58, 183, 0.4)';
        default:
          return 'rgba(255, 255, 255, 0.2)';
      }
    }};
  }
`;

const IconContainer = styled.div<{
  $colorScheme: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'purple'
}>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => {
    switch (props.$colorScheme) {
      case 'primary':
        return 'linear-gradient(135deg, rgba(0, 109, 255, 0.2), rgba(0, 255, 255, 0.2))';
      case 'secondary':
        return 'linear-gradient(135deg, rgba(156, 39, 176, 0.2), rgba(255, 64, 129, 0.2))';
      case 'success':
        return 'linear-gradient(135deg, rgba(0, 200, 83, 0.2), rgba(124, 179, 66, 0.2))';
      case 'warning':
        return 'linear-gradient(135deg, rgba(255, 152, 0, 0.2), rgba(251, 192, 45, 0.2))';
      case 'error':
        return 'linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(229, 57, 53, 0.2))';
      case 'info':
        return 'linear-gradient(135deg, rgba(41, 182, 246, 0.2), rgba(3, 169, 244, 0.2))';
      case 'purple':
        return 'linear-gradient(135deg, rgba(103, 58, 183, 0.2), rgba(170, 0, 255, 0.2))';
      default:
        return 'linear-gradient(135deg, rgba(30, 30, 60, 0.3), rgba(40, 40, 80, 0.3))';
    }
  }};
  margin-right: 1rem;
  border: 1px solid ${props => {
    switch (props.$colorScheme) {
      case 'primary':
        return 'rgba(0, 255, 255, 0.3)';
      case 'secondary':
        return 'rgba(255, 64, 129, 0.3)';
      case 'success':
        return 'rgba(0, 200, 83, 0.3)';
      case 'warning':
        return 'rgba(255, 152, 0, 0.3)';
      case 'error':
        return 'rgba(244, 67, 54, 0.3)';
      case 'info':
        return 'rgba(41, 182, 246, 0.3)';
      case 'purple':
        return 'rgba(103, 58, 183, 0.3)';
      default:
        return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.$colorScheme) {
      case 'primary':
        return 'rgba(0, 255, 255, 1)';
      case 'secondary':
        return 'rgba(255, 64, 129, 1)';
      case 'success':
        return 'rgba(0, 200, 83, 1)';
      case 'warning':
        return 'rgba(255, 152, 0, 1)';
      case 'error':
        return 'rgba(244, 67, 54, 1)';
      case 'info':
        return 'rgba(41, 182, 246, 1)';
      case 'purple':
        return 'rgba(170, 0, 255, 1)';
      default:
        return 'rgba(255, 255, 255, 0.9)';
    }
  }};
`;

const ValueText = styled(Typography)<{
  $colorScheme: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'purple'
}>`
  font-size: 1.75rem !important;
  font-weight: 500 !important;
  margin-bottom: 0.25rem !important;
  color: ${props => {
    switch (props.$colorScheme) {
      case 'primary':
        return 'rgba(0, 255, 255, 1)';
      case 'secondary':
        return 'rgba(255, 64, 129, 1)';
      case 'success':
        return 'rgba(0, 200, 83, 1)';
      case 'warning':
        return 'rgba(255, 152, 0, 1)';
      case 'error':
        return 'rgba(244, 67, 54, 1)';
      case 'info':
        return 'rgba(41, 182, 246, 1)';
      case 'purple':
        return 'rgba(170, 0, 255, 1)';
      default:
        return 'white';
    }
  }};
  text-shadow: 0 0 10px ${props => {
    switch (props.$colorScheme) {
      case 'primary':
        return 'rgba(0, 255, 255, 0.5)';
      case 'secondary':
        return 'rgba(255, 64, 129, 0.5)';
      case 'success':
        return 'rgba(0, 200, 83, 0.5)';
      case 'warning':
        return 'rgba(255, 152, 0, 0.5)';
      case 'error':
        return 'rgba(244, 67, 54, 0.5)';
      case 'info':
        return 'rgba(41, 182, 246, 0.5)';
      case 'purple':
        return 'rgba(170, 0, 255, 0.5)';
      default:
        return 'rgba(255, 255, 255, 0.5)';
    }
  }};
`;

const TrendContainer = styled.div<{ $isPositive: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: ${props => props.$isPositive ? 'rgba(0, 200, 83, 0.9)' : 'rgba(244, 67, 54, 0.9)'};  
`;

const SkeletonShimmer = styled.div`
  background: linear-gradient(90deg, 
    rgba(255, 255, 255, 0.05) 0%, 
    rgba(255, 255, 255, 0.1) 50%, 
    rgba(255, 255, 255, 0.05) 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 2s infinite linear;
`;

const ValueSkeleton = styled(SkeletonShimmer)`
  height: 2.5rem;
  width: 100px;
  border-radius: 8px;
  margin-bottom: 0.5rem;
`;

const TitleSkeleton = styled(SkeletonShimmer)`
  height: 1rem;
  width: 80px;
  border-radius: 4px;
`;

const TrendSkeleton = styled(SkeletonShimmer)`
  height: 1rem;
  width: 60px;
  border-radius: 4px;
  margin-top: 0.25rem;
`;

interface DashboardStatsCardProps {
  title: string;
  value: string;
  icon: string;
  trend?: string;
  isPositive?: boolean;
  colorScheme?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'purple';
  isLoading?: boolean;
}

const DashboardStatsCard: React.FC<DashboardStatsCardProps> = ({
  title,
  value,
  icon,
  trend,
  isPositive = true,
  colorScheme = 'primary',
  isLoading = false
}) => {
  // Render the appropriate icon
  const renderIcon = () => {
    switch (icon) {
      case 'award':
        return <Award size={24} />;
      case 'activity':
        return <Activity size={24} />;
      case 'book':
        return <Book size={24} />;
      case 'calendar':
        return <Calendar size={24} />;
      case 'chart':
        return <BarChart2 size={24} />;
      case 'dumbbell':
        return <Dumbbell size={24} />;
      case 'user':
        return <User size={24} />;
      case 'shopping':
        return <ShoppingBag size={24} />;
      case 'dollar':
        return <DollarSign size={24} />;
      case 'heart':
        return <Heart size={24} />;
      case 'clock':
        return <Clock size={24} />;
      case 'users':
        return <Users size={24} />;
      case 'star':
        return <Star size={24} />;
      default:
        return <Activity size={24} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 10,
        delay: 0.1
      }}
      style={{ height: '100%' }}
    >
      <StatsCardContainer $colorScheme={colorScheme}>
        <CardContent sx={{ p: 2, height: '100%' }}>
          <Box display="flex" alignItems="center" mb={1}>
            <IconContainer $colorScheme={colorScheme}>
              {renderIcon()}
            </IconContainer>
            <Box>
              {isLoading ? (
                <>
                  <TitleSkeleton />
                  <Box height="0.5rem" />
                  <ValueSkeleton />
                  <TrendSkeleton />
                </>
              ) : (
                <>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 0.5, display: 'block', fontSize: '0.75rem' }}
                  >
                    {title}
                  </Typography>
                  <ValueText variant="h4" $colorScheme={colorScheme}>
                    {value}
                  </ValueText>
                  {trend && (
                    <TrendContainer $isPositive={isPositive}>
                      {isPositive ? (
                        <TrendingUp size={14} />
                      ) : (
                        <TrendingDown size={14} />
                      )}
                      <span>{trend}</span>
                    </TrendContainer>
                  )}
                </>
              )}
            </Box>
          </Box>
        </CardContent>
      </StatsCardContainer>
    </motion.div>
  );
};

export default DashboardStatsCard;