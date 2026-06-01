import React from 'react';
import { useToast } from '../../../../hooks/use-toast';
import type { Client, Trainer, Session } from './ViewSessionModal.types';
import TrainerAssignmentSection from './TrainerAssignmentSection';
import { CardContent, CardHeader, CardTitle, StyledCard } from './AdminSessionsShell.styles';
import { containerVariants } from './AdminSessionsTheme.styles';
import { TitleIcon, TrainerSectionWrap } from './AdminSessionsTable.styles';

interface AdminSessionsTrainerAssignmentCardProps {
  sessions: Session[];
  clients: Client[];
  trainers: Trainer[];
  onAssignmentSuccess: () => void;
}

const AdminSessionsTrainerAssignmentCard: React.FC<AdminSessionsTrainerAssignmentCardProps> = ({
  sessions,
  clients,
  trainers,
  onAssignmentSuccess,
}) => {
  const { toast } = useToast();

  return (
    <TrainerSectionWrap variants={containerVariants} initial="hidden" animate="visible">
      <StyledCard>
        <CardHeader>
          <CardTitle>
            <TitleIcon size={24} />
            Trainer Assignment Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrainerAssignmentSection
            sessions={sessions}
            clients={clients}
            trainers={trainers}
            onAssignmentSuccess={onAssignmentSuccess}
            toast={toast}
          />
        </CardContent>
      </StyledCard>
    </TrainerSectionWrap>
  );
};

export default AdminSessionsTrainerAssignmentCard;
