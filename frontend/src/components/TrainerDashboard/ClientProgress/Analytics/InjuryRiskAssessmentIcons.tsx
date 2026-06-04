import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
} from 'lucide-react';

import { getRiskColor } from './InjuryRiskAssessment.logic';

interface StatusIconProps {
  status: string;
}

const StatusIcon: React.FC<StatusIconProps> = ({ status }) => {
  const iconColor = getRiskColor(status);

  switch (status) {
    case 'good':
      return <CheckCircle size={16} color={iconColor} />;
    case 'attention':
      return <Info size={16} color={iconColor} />;
    case 'caution':
      return <AlertTriangle size={16} color={iconColor} />;
    default:
      return <XCircle size={16} color={iconColor} />;
  }
};

export default StatusIcon;
