import React from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Target,
  X
} from 'lucide-react';
import { Button } from './TrainerPermissionsManager.styles';
import {
  BulkActionBarWrap,
  BulkActionText,
  BulkButtons
} from './TrainerPermissionsManager.bulkStyles';
import type { BulkPermissionOperation } from './TrainerPermissionsManager.types';

interface TrainerPermissionsBulkActionBarProps {
  bulkProcessing: boolean;
  clearAllSelection: () => void;
  performBulkOperation: (operation: BulkPermissionOperation) => void;
  selectedTrainers: Set<number>;
}

export const TrainerPermissionsBulkActionBar: React.FC<TrainerPermissionsBulkActionBarProps> = ({
  bulkProcessing,
  clearAllSelection,
  performBulkOperation,
  selectedTrainers
}) => (
  <AnimatePresence>
    {selectedTrainers.size > 0 && (
      <BulkActionBarWrap
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <BulkActionText>
          {selectedTrainers.size} trainer{selectedTrainers.size > 1 ? 's' : ''} selected
        </BulkActionText>

        <BulkButtons>
          <Button
            variant="success"
            onClick={() => performBulkOperation({
              action: 'grant',
              permissionType: 'edit_workouts',
              trainerIds: Array.from(selectedTrainers)
            })}
            disabled={bulkProcessing}
            title="Grant Edit Workouts permission to selected trainers"
          >
            <Activity size={16} />
            Grant Workouts
          </Button>

          <Button
            variant="success"
            onClick={() => performBulkOperation({
              action: 'grant',
              permissionType: 'view_progress',
              trainerIds: Array.from(selectedTrainers)
            })}
            disabled={bulkProcessing}
            title="Grant View Progress permission to selected trainers"
          >
            <BarChart3 size={16} />
            Grant Progress
          </Button>

          <Button
            variant="warning"
            onClick={() => performBulkOperation({
              action: 'revoke',
              permissionType: 'access_nutrition',
              trainerIds: Array.from(selectedTrainers)
            })}
            disabled={bulkProcessing}
            title="Revoke Nutrition Access from selected trainers"
          >
            <Target size={16} />
            Revoke Nutrition
          </Button>

          <Button
            variant="secondary"
            onClick={clearAllSelection}
            disabled={bulkProcessing}
          >
            <X size={16} />
            Cancel
          </Button>
        </BulkButtons>
      </BulkActionBarWrap>
    )}
  </AnimatePresence>
);
