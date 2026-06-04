import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Shield,
  User,
  XCircle
} from 'lucide-react';
import {
  PERMISSION_TYPES,
  getPermissionStatus
} from './TrainerPermissionsManager.logic';
import {
  CriticalBadge,
  EmptyState,
  MutedKey,
  PermissionCard,
  PermissionDescription,
  PermissionHeader,
  PermissionLabel,
  PermissionsGrid,
  PermissionStatusText,
  PermissionsSummary,
  PermissionToggle,
  SummaryIconRow,
  SummaryText,
  ToggleLabel,
  ToggleLoadingSpinner,
  ToggleSwitch,
  TrainerCard,
  TrainerCheckbox,
  TrainerHeader,
  TrainersGridWrap,
  WarningCrown
} from './TrainerPermissionsManager.trainerStyles';
import type {
  PermissionData,
  PermissionStatus,
  TrainerWithPermissions
} from './TrainerPermissionsManager.types';

interface TrainerPermissionsGridProps {
  filteredTrainers: TrainerWithPermissions[];
  processingPermissions: Set<string>;
  searchQuery: string;
  selectedTrainers: Set<number>;
  togglePermission: (trainerId: number, permissionType: string, currentlyHas: boolean) => void;
  toggleTrainerSelection: (trainerId: number) => void;
}

const getStatusIcon = (status: PermissionStatus) => {
  switch (status) {
    case 'active':
      return <CheckCircle size={12} />;
    case 'expiring':
      return <AlertTriangle size={12} />;
    case 'expired':
      return <XCircle size={12} />;
    case 'unknown':
      return <AlertTriangle size={12} />;
    default:
      return <Shield size={12} />;
  }
};

const getStatusLabel = (status: PermissionStatus, permissionData: PermissionData): string => {
  if (status === 'active') return 'Active';
  if (status === 'expiring') return `Expires in ${permissionData.daysUntilExpiration} days`;
  if (status === 'expired') return 'Expired';
  if (status === 'unknown') return 'Permission data unavailable';
  return 'Not granted';
};

export const TrainerPermissionsGrid: React.FC<TrainerPermissionsGridProps> = ({
  filteredTrainers,
  processingPermissions,
  searchQuery,
  selectedTrainers,
  togglePermission,
  toggleTrainerSelection
}) => (
  <>
    <TrainersGridWrap>
      {filteredTrainers.map((trainer) => (
        <TrainerCard
          key={trainer.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: trainer.id * 0.1 }}
        >
          <TrainerCheckbox
            type="checkbox"
            checked={selectedTrainers.has(trainer.id)}
            disabled={trainer.permissionLoadFailed}
            onChange={() => toggleTrainerSelection(trainer.id)}
            aria-label={
              trainer.permissionLoadFailed
                ? `Permission data unavailable for ${trainer.firstName} ${trainer.lastName}`
                : `Select ${trainer.firstName} ${trainer.lastName} for bulk operations`
            }
            title={
              trainer.permissionLoadFailed
                ? 'Refresh before selecting this trainer'
                : `Select ${trainer.firstName} ${trainer.lastName} for bulk operations`
            }
          />
          <TrainerHeader>
            <h3>
              <User size={20} />
              {trainer.firstName} {trainer.lastName}
            </h3>
            <p>{trainer.email}</p>
          </TrainerHeader>

          <PermissionsGrid>
            {PERMISSION_TYPES.map((permType) => {
              const permissionData = trainer.permissionsByType[permType.key] || {
                hasPermission: false,
                permission: null,
                isExpiringSoon: false,
                daysUntilExpiration: null
              };
              const status = trainer.permissionLoadFailed ? 'unknown' : getPermissionStatus(permissionData);
              const isProcessing = processingPermissions.has(`${trainer.id}-${permType.key}`);
              const IconComponent = permType.icon;

              return (
                <PermissionCard
                  key={permType.key}
                  $critical={permType.critical}
                  $hasPermission={permissionData.hasPermission}
                  $expiring={permissionData.isExpiringSoon}
                  whileHover={{ scale: 1.02 }}
                >
                  <PermissionHeader>
                    <PermissionLabel>
                      <h4>
                        <IconComponent size={16} />
                        {permType.label}
                        {permType.critical && (
                          <CriticalBadge>Critical</CriticalBadge>
                        )}
                      </h4>
                    </PermissionLabel>

                    <PermissionToggle>
                      <ToggleSwitch
                        checked={permissionData.hasPermission}
                        disabled={isProcessing || trainer.permissionLoadFailed}
                        aria-pressed={permissionData.hasPermission}
                        aria-label={
                          trainer.permissionLoadFailed
                            ? `Permission data unavailable for ${permType.label} on ${trainer.firstName} ${trainer.lastName}`
                            : `${permissionData.hasPermission ? 'Revoke' : 'Grant'} ${permType.label} for ${trainer.firstName} ${trainer.lastName}`
                        }
                        onClick={() => togglePermission(
                          trainer.id,
                          permType.key,
                          permissionData.hasPermission
                        )}
                      >
                        {isProcessing && (
                          <ToggleLoadingSpinner />
                        )}
                      </ToggleSwitch>
                      <ToggleLabel $active={permissionData.hasPermission}>
                        {trainer.permissionLoadFailed ? 'LOCKED' : permissionData.hasPermission ? 'ON' : 'OFF'}
                      </ToggleLabel>
                    </PermissionToggle>
                  </PermissionHeader>

                  <PermissionDescription>
                    {permType.description}
                  </PermissionDescription>

                  <PermissionStatusText type={status}>
                    {getStatusIcon(status)}
                    {getStatusLabel(status, permissionData)}
                  </PermissionStatusText>
                </PermissionCard>
              );
            })}
          </PermissionsGrid>

          <PermissionsSummary>
            <SummaryText>
              Active Permissions: {trainer.totalActivePermissions} / {PERMISSION_TYPES.length}
            </SummaryText>
            <SummaryIconRow>
              {trainer.totalActivePermissions === PERMISSION_TYPES.length ? (
                <WarningCrown size={16} />
              ) : (
                <MutedKey size={16} />
              )}
            </SummaryIconRow>
          </PermissionsSummary>
        </TrainerCard>
      ))}
    </TrainersGridWrap>

    {filteredTrainers.length === 0 && (
      <EmptyState>
        {searchQuery ? 'No trainers match your search' : 'No trainers found'}
      </EmptyState>
    )}
  </>
);
