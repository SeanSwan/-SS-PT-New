/**
 * Compact KPI card used by the active SystemAnalytics overview.
 */

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  BigValue,
  CardBody,
  GlassCard,
  IconBadge,
  SmallText,
  StatLabel,
  StatRow,
  TrendRow,
  TrendText,
} from './SystemAnalyticsCard.styles';
import type { AnalyticsTrend } from './SystemAnalytics.types';

interface SystemAnalyticsStatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: AnalyticsTrend;
  trendValue?: string | number;
  color?: string;
}

export const SystemAnalyticsStatCard: React.FC<SystemAnalyticsStatCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendValue,
  color,
}) => (
  <GlassCard>
    <CardBody>
      <StatRow>
        <StatLabel>{title}</StatLabel>
        <IconBadge $color={color}>{icon}</IconBadge>
      </StatRow>

      <BigValue>{value}</BigValue>

      {trend && (
        <TrendRow>
          {trend === 'up' ? (
            <ChevronUp size={16} color="var(--analytics-success, #4caf50)" />
          ) : trend === 'down' ? (
            <ChevronDown size={16} color="var(--analytics-error, #f44336)" />
          ) : (
            <SmallText aria-hidden="true">-</SmallText>
          )}
          <TrendText $trend={trend}>{trendValue}</TrendText>
        </TrendRow>
      )}
    </CardBody>
  </GlassCard>
);
