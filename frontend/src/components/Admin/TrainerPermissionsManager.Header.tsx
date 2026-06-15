import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  Download,
  MessageSquare,
  RefreshCw,
  Shield,
  ShieldCheck,
  Users
} from 'lucide-react';
import {
  Button,
  Header,
  HeaderActions,
  HeaderTop,
  StatCard,
  StatLabel,
  StatsGrid,
  StatValue,
  TitleSection
} from './TrainerPermissionsManager.styles';
import {
  RequestsBadge,
  RequestsButtonWrap
} from './TrainerPermissionsManager.requestStyles';
import { TrainerTemplateCommands } from './TrainerPermissionsManager.TemplateCommands';
import type {
  PermissionRequest,
  PermissionStats
} from './TrainerPermissionsManager.types';

interface TrainerPermissionsHeaderProps {
  applyTemplate: (templateKey: string, trainerIds: number[]) => void;
  bulkProcessing: boolean;
  handleExportReport: () => void;
  loadData: () => void;
  permissionRequests: PermissionRequest[];
  selectedTemplate: string;
  selectedTrainers: Set<number>;
  setSelectedTemplate: (template: string) => void;
  setShowRequests: (show: boolean) => void;
  showRequests: boolean;
  stats: PermissionStats | null;
}

export const TrainerPermissionsHeader: React.FC<TrainerPermissionsHeaderProps> = ({
  applyTemplate,
  bulkProcessing,
  handleExportReport,
  loadData,
  permissionRequests,
  selectedTemplate,
  selectedTrainers,
  setSelectedTemplate,
  setShowRequests,
  showRequests,
  stats
}) => (
  <Header>
    <HeaderTop>
      <TitleSection>
        <h1>
          <Shield size={28} />
          Trainer Permissions Manager
        </h1>
        <p>Manage granular permissions for trainer access control</p>
      </TitleSection>
      <HeaderActions>
        <TrainerTemplateCommands
          applyTemplate={applyTemplate}
          bulkProcessing={bulkProcessing}
          selectedTemplate={selectedTemplate}
          selectedTrainers={selectedTrainers}
          setSelectedTemplate={setSelectedTemplate}
        />

        <RequestsButtonWrap>
          <Button
            variant={permissionRequests.length > 0 ? 'warning' : 'secondary'}
            onClick={() => setShowRequests(!showRequests)}
            title={`${permissionRequests.length} pending permission requests`}
            disabled={permissionRequests.length === 0}
            aria-label={`${permissionRequests.length} pending permission requests`}
          >
            <MessageSquare size={16} />
            Requests
          </Button>
          {permissionRequests.length > 0 && (
            <RequestsBadge>{permissionRequests.length}</RequestsBadge>
          )}
        </RequestsButtonWrap>

        <Button variant="secondary" onClick={loadData} aria-label="Refresh trainer permissions">
          <RefreshCw size={16} />
          Refresh
        </Button>

        <Button
          variant="primary"
          onClick={handleExportReport}
          aria-label="Export filtered trainer permissions report"
        >
          <Download size={16} />
          Export Report
        </Button>
      </HeaderActions>
    </HeaderTop>

    {stats && (
      <StatsGrid>
        <StatCard type="primary" whileHover={{ scale: 1.02 }}>
          <StatValue>{stats.totalTrainers}</StatValue>
          <StatLabel>
            <Users size={16} />
            Total Trainers
          </StatLabel>
        </StatCard>
        <StatCard type="success" whileHover={{ scale: 1.02 }}>
          <StatValue>{stats.activePermissions}</StatValue>
          <StatLabel>
            <ShieldCheck size={16} />
            Active Permissions
          </StatLabel>
        </StatCard>
        <StatCard type="warning" whileHover={{ scale: 1.02 }}>
          <StatValue>{stats.expiringPermissions}</StatValue>
          <StatLabel>
            <AlertTriangle size={16} />
            Expiring Soon
          </StatLabel>
        </StatCard>
        <StatCard type="info" whileHover={{ scale: 1.02 }}>
          <StatValue>{stats.averagePermissionsPerTrainer}</StatValue>
          <StatLabel>
            <BarChart3 size={16} />
            Avg per Trainer
          </StatLabel>
        </StatCard>
      </StatsGrid>
    )}
  </Header>
);
