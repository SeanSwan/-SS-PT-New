import React from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Button } from './TrainerPermissionsManager.styles';
import {
  RequestActions,
  RequestClock,
  RequestDate,
  RequestInfo,
  RequestItem,
  RequestsPanelHeader,
  RequestsPanelTitle,
  RequestsPanelWrap,
  WarningTitleIcon
} from './TrainerPermissionsManager.requestStyles';
import { PERMISSION_TYPES } from './TrainerPermissionsManager.logic';
import type { PermissionRequest } from './TrainerPermissionsManager.types';

interface PermissionRequestsPanelProps {
  handlePermissionRequest: (requestId: string, action: 'approve' | 'deny') => void;
  permissionRequests: PermissionRequest[];
  showRequests: boolean;
}

export const PermissionRequestsPanel: React.FC<PermissionRequestsPanelProps> = ({
  handlePermissionRequest,
  permissionRequests,
  showRequests
}) => (
  <AnimatePresence>
    {showRequests && permissionRequests.length > 0 && (
      <RequestsPanelWrap
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
      >
        <RequestsPanelHeader>
          <RequestsPanelTitle>
            <WarningTitleIcon size={20} />
            Pending Permission Requests ({permissionRequests.length})
          </RequestsPanelTitle>
        </RequestsPanelHeader>

        {permissionRequests.map((request) => {
          const permissionType = PERMISSION_TYPES.find((permission) => permission.key === request.permissionType);
          return (
            <RequestItem
              key={request.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <RequestInfo>
                <h4>
                  {request.trainerName} requests <q>{permissionType?.label || request.permissionType}</q>
                </h4>
                <p>
                  <strong>Reason:</strong> {request.reason}
                </p>
                <RequestDate>
                  <RequestClock size={14} />
                  Requested {new Date(request.requestedAt).toLocaleDateString()}
                </RequestDate>
              </RequestInfo>

              <RequestActions>
                <Button
                  variant="success"
                  onClick={() => handlePermissionRequest(request.id, 'approve')}
                >
                  <CheckCircle size={16} />
                  Approve
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handlePermissionRequest(request.id, 'deny')}
                >
                  <XCircle size={16} />
                  Deny
                </Button>
              </RequestActions>
            </RequestItem>
          );
        })}
      </RequestsPanelWrap>
    )}
  </AnimatePresence>
);
