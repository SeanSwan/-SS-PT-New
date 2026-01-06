import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus, LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon?: LucideIcon;
  color?: string;
  format?: 'currency' | 'number' | 'percent';
  target?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  trend,
  icon: Icon,
  color = '#3b82f6',
  format = 'number',
  target
}) => {
  const formatValue = (val: number): string => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(val);
      case 'percent':
        return `${val.toFixed(2)}%`;
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(val);
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend) {
      case 'up':
        return <ArrowUp size={16} />;
      case 'down':
        return <ArrowDown size={16} />;
      case 'stable':
        return <Minus size={16} />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'rgba(255, 255, 255, 0.7)';
    switch (trend) {
      case 'up':
        return '#10b981';
      case 'down':
        return '#ef4444';
      case 'stable':
        return 'rgba(255, 255, 255, 0.7)';
    }
  };

  const progressPercent = target ? Math.min((value / target) * 100, 100) : 0;

  return (
    <Card
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Header>
        <TitleRow>
          {Icon && (
            <IconWrapper color={color}>
              <Icon size={20} />
            </IconWrapper>
          )}
          <Title>{title}</Title>
        </TitleRow>
        {change !== undefined && (
          <ChangeIndicator color={getTrendColor()}>
            {getTrendIcon()}
            <ChangeText>{Math.abs(change).toFixed(1)}%</ChangeText>
          </ChangeIndicator>
        )}
      </Header>

      <Value>{formatValue(value)}</Value>

      {target && (
        <ProgressSection>
          <ProgressBar>
            <ProgressFill percent={progressPercent} color={color} />
          </ProgressBar>
          <ProgressText>
            {progressPercent.toFixed(0)}% of {formatValue(target)} target
          </ProgressText>
        </ProgressSection>
      )}
    </Card>
  );
};

export default MetricCard;

// Styled Components
const Card = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-4px);
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const IconWrapper = styled.div<{ color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: ${props => `${props.color}20`};
  color: ${props => props.color};
`;

const Title = styled.h3`
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  font-weight: 500;
  margin: 0;
`;

const ChangeIndicator = styled.div<{ color: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${props => props.color};
  font-size: 14px;
  font-weight: 600;
`;

const ChangeText = styled.span`
  font-size: 13px;
`;

const Value = styled.div`
  color: #fff;
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
  line-height: 1;
`;

const ProgressSection = styled.div`
  margin-top: 16px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
`;

const ProgressFill = styled.div<{ percent: number; color: string }>`
  width: ${props => props.percent}%;
  height: 100%;
  background: ${props => props.color};
  border-radius: 3px;
  transition: width 0.6s ease-out;
`;

const ProgressText = styled.p`
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  margin: 0;
`;
