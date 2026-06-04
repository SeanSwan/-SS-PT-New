import React, { useState } from 'react';
import RecurringSessionModal from '../RecurringSessionModal';
import BlockedTimeModal from '../BlockedTimeModal';
import NotificationPreferencesModal from '../NotificationPreferencesModal';
import SessionDetailModal from '../SessionDetailModal';
import SessionEditModal from '../SessionEditModal';
import RecurringSeriesModal from '../RecurringSeriesModal';
import ClientRecurringBookingModal from '../ClientRecurringBookingModal';
import AvailabilityEditor from '../Availability/AvailabilityEditor';
import AvailabilityOverrideModal from '../Availability/AvailabilityOverrideModal';
import ApplyPaymentModal from '../ApplyPaymentModal';
import ConflictPanel from '../Conflicts/ConflictPanel';
import { Modal } from '../ui';
import type { ScheduleMode } from './ScheduleModals.types';

interface ScheduleConnectedModalsProps {
  mode: ScheduleMode;
  showRecurringDialog: boolean;
  setShowRecurringDialog: (show: boolean) => void;
  showBlockedDialog: boolean;
  setShowBlockedDialog: (show: boolean) => void;
  showNotificationDialog: boolean;
  setShowNotificationDialog: (show: boolean) => void;
  showDetailDialog: boolean;
  setShowDetailDialog: (show: boolean) => void;
  showSeriesDialog: boolean;
  setShowSeriesDialog: (show: boolean) => void;
  showAvailabilityEditor: boolean;
  setShowAvailabilityEditor: (show: boolean) => void;
  showOverrideModal: boolean;
  setShowOverrideModal: (show: boolean) => void;
  showPaymentModal: boolean;
  setShowPaymentModal: (show: boolean) => void;
  conflictModalOpen: boolean;
  setConflictModalOpen: (show: boolean) => void;
  showClientRecurringDialog: boolean;
  setShowClientRecurringDialog: (show: boolean) => void;
  dbTrainers: any[];
  dbClients: any[];
  availableSessions: any[];
  normalizedSessionsRemaining?: number;
  isFreeTrackingBooking: boolean;
  detailSession: any;
  activeSeriesGroupId: string | null;
  seriesSessions: any[];
  availabilityTrainerId: number | string | null;
  conflicts: any[];
  setConflicts: (conflicts: any[]) => void;
  alternatives: any[];
  canOverrideConflicts: boolean;
  handleConflictAlternative: (alt: any) => void;
  handleConflictOverride: () => void;
  fetchSessions: () => Promise<void>;
  openSeriesDialog: (groupId: string) => void;
}

const ScheduleConnectedModals: React.FC<ScheduleConnectedModalsProps> = ({
  mode,
  showRecurringDialog,
  setShowRecurringDialog,
  showBlockedDialog,
  setShowBlockedDialog,
  showNotificationDialog,
  setShowNotificationDialog,
  showDetailDialog,
  setShowDetailDialog,
  showSeriesDialog,
  setShowSeriesDialog,
  showAvailabilityEditor,
  setShowAvailabilityEditor,
  showOverrideModal,
  setShowOverrideModal,
  showPaymentModal,
  setShowPaymentModal,
  conflictModalOpen,
  setConflictModalOpen,
  showClientRecurringDialog,
  setShowClientRecurringDialog,
  dbTrainers,
  dbClients,
  availableSessions,
  normalizedSessionsRemaining,
  isFreeTrackingBooking,
  detailSession,
  activeSeriesGroupId,
  seriesSessions,
  availabilityTrainerId,
  conflicts,
  setConflicts,
  alternatives,
  canOverrideConflicts,
  handleConflictAlternative,
  handleConflictOverride,
  fetchSessions,
  openSeriesDialog,
}) => {
  const [preselectedPaymentClientId, setPreselectedPaymentClientId] = useState<number | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  return (
    <>
      <RecurringSessionModal open={showRecurringDialog} onClose={() => setShowRecurringDialog(false)} onSuccess={fetchSessions} />
      <BlockedTimeModal open={showBlockedDialog} onClose={() => setShowBlockedDialog(false)} onSuccess={fetchSessions} />

      {mode === 'client' && !isFreeTrackingBooking && (
        <ClientRecurringBookingModal
          open={showClientRecurringDialog}
          onClose={() => setShowClientRecurringDialog(false)}
          onSuccess={fetchSessions}
          availableSessions={availableSessions}
          userCredits={normalizedSessionsRemaining ?? 0}
        />
      )}

      <NotificationPreferencesModal open={showNotificationDialog} onClose={() => setShowNotificationDialog(false)} onSuccess={() => undefined} />

      <SessionDetailModal
        session={detailSession}
        open={showDetailDialog}
        mode={mode}
        onClose={() => setShowDetailDialog(false)}
        onUpdated={fetchSessions}
        onEditSession={mode === 'admin' || mode === 'trainer' ? () => {
          setShowDetailDialog(false);
          setShowEditDialog(true);
        } : undefined}
        onManageSeries={openSeriesDialog}
        onApplyPayment={mode === 'admin' ? (clientId: number) => {
          setShowDetailDialog(false);
          setPreselectedPaymentClientId(clientId);
          setShowPaymentModal(true);
        } : undefined}
        seriesCount={detailSession?.recurringGroupId ? seriesSessions.length : undefined}
      />

      <SessionEditModal
        open={showEditDialog}
        session={detailSession}
        trainers={dbTrainers}
        clients={dbClients}
        onClose={() => setShowEditDialog(false)}
        onSaved={fetchSessions}
      />

      <RecurringSeriesModal
        groupId={activeSeriesGroupId}
        open={showSeriesDialog}
        onClose={() => setShowSeriesDialog(false)}
        onSuccess={fetchSessions}
        seriesSessions={seriesSessions}
      />

      {showAvailabilityEditor && availabilityTrainerId && (
        <Modal isOpen={showAvailabilityEditor} onClose={() => setShowAvailabilityEditor(false)} title="Manage Availability" size="lg">
          <AvailabilityEditor
            trainerId={availabilityTrainerId}
            onClose={() => setShowAvailabilityEditor(false)}
            onSaved={() => {
              setShowAvailabilityEditor(false);
              fetchSessions();
            }}
          />
        </Modal>
      )}

      {showOverrideModal && availabilityTrainerId && (
        <AvailabilityOverrideModal
          trainerId={availabilityTrainerId}
          isOpen={showOverrideModal}
          onClose={() => setShowOverrideModal(false)}
          onCreated={fetchSessions}
        />
      )}

      {mode === 'admin' && (
        <ApplyPaymentModal
          open={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPreselectedPaymentClientId(null);
          }}
          onApplied={fetchSessions}
          preselectedClientId={preselectedPaymentClientId ?? undefined}
        />
      )}

      <ConflictPanel
        isOpen={conflictModalOpen}
        conflicts={conflicts}
        alternatives={alternatives}
        onSelectAlternative={handleConflictAlternative}
        onOverride={canOverrideConflicts ? handleConflictOverride : undefined}
        onClose={() => {
          setConflictModalOpen(false);
          setConflicts([]);
        }}
        canOverride={canOverrideConflicts}
      />
    </>
  );
};

export default ScheduleConnectedModals;
