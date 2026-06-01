import React from 'react';
import { Trash2 } from 'lucide-react';
import GlowButton from '../../../ui/buttons/GlowButton';
import { StyledDialog, DialogActionsBar, DialogContentArea, DialogTitleBar } from './AdminSessionsDialog.styles';
import { DetailValue, DialogDescriptionText, FormField, FormLabel, FormTextarea } from './AdminSessionsForm.styles';
import { DialogPanelNarrow, FlexRow } from './AdminSessionsTable.styles';

interface SessionDeleteCandidate {
  id: string;
  sessionDate: string;
}

interface AdminSessionsDeleteDialogsProps {
  openDeleteDialog: boolean;
  openBulkDeleteDialog: boolean;
  sessionToDelete: SessionDeleteCandidate | null;
  selectedCount: number;
  bulkDeleteReason: string;
  isProcessing: boolean;
  formatDate: (dateString: string) => string;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  onCloseBulkDelete: () => void;
  onConfirmBulkDelete: () => void;
  onBulkDeleteReasonChange: (reason: string) => void;
}

const AdminSessionsDeleteDialogs: React.FC<AdminSessionsDeleteDialogsProps> = ({
  openDeleteDialog,
  openBulkDeleteDialog,
  sessionToDelete,
  selectedCount,
  bulkDeleteReason,
  isProcessing,
  formatDate,
  onCloseDelete,
  onConfirmDelete,
  onCloseBulkDelete,
  onConfirmBulkDelete,
  onBulkDeleteReasonChange,
}) => (
  <>
    <StyledDialog $open={openDeleteDialog} onClick={onCloseDelete}>
      <DialogPanelNarrow onClick={(event: React.MouseEvent) => event.stopPropagation()} $maxWidth="420px">
        <DialogTitleBar>
          <FlexRow $gap="0.75rem">
            <Trash2 size={22} />
            <span>Confirm Delete</span>
          </FlexRow>
        </DialogTitleBar>
        <DialogContentArea>
          <DialogDescriptionText>
            Are you sure you want to delete this session? This action cannot be undone.
          </DialogDescriptionText>
          {sessionToDelete && (
            <DetailValue $top="0.5rem">
              Session {sessionToDelete.id} - {formatDate(sessionToDelete.sessionDate)}
            </DetailValue>
          )}
        </DialogContentArea>
        <DialogActionsBar>
          <GlowButton text="Cancel" theme="cosmic" size="small" onClick={onCloseDelete} disabled={isProcessing} />
          <GlowButton
            text={isProcessing ? 'Deleting...' : 'Delete'}
            theme="ruby"
            size="small"
            leftIcon={<Trash2 size={16} />}
            onClick={onConfirmDelete}
            disabled={isProcessing}
          />
        </DialogActionsBar>
      </DialogPanelNarrow>
    </StyledDialog>

    <StyledDialog $open={openBulkDeleteDialog} onClick={onCloseBulkDelete}>
      <DialogPanelNarrow onClick={(event: React.MouseEvent) => event.stopPropagation()} $maxWidth="480px">
        <DialogTitleBar>
          <FlexRow $gap="0.75rem">
            <Trash2 size={22} />
            <span>Bulk Delete Sessions</span>
          </FlexRow>
        </DialogTitleBar>
        <DialogContentArea>
          <DialogDescriptionText>
            Are you sure you want to delete {selectedCount} selected sessions? This action cannot be undone.
          </DialogDescriptionText>
          <FormField>
            <FormLabel htmlFor="bulk-delete-reason">Reason (optional)</FormLabel>
            <FormTextarea
              id="bulk-delete-reason"
              value={bulkDeleteReason}
              onChange={(event) => onBulkDeleteReasonChange(event.target.value)}
              placeholder="Reason for bulk deletion..."
              rows={2}
            />
          </FormField>
        </DialogContentArea>
        <DialogActionsBar>
          <GlowButton text="Cancel" theme="cosmic" size="small" onClick={onCloseBulkDelete} disabled={isProcessing} />
          <GlowButton
            text={isProcessing ? 'Deleting...' : `Delete ${selectedCount} Sessions`}
            theme="ruby"
            size="small"
            leftIcon={<Trash2 size={16} />}
            onClick={onConfirmBulkDelete}
            disabled={isProcessing}
          />
        </DialogActionsBar>
      </DialogPanelNarrow>
    </StyledDialog>
  </>
);

export default AdminSessionsDeleteDialogs;
