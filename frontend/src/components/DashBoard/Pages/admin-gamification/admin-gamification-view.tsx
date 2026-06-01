/**
 * Canonical admin dashboard page for managing gamification.
 */

import React from 'react';
import { BodyText, PageTitle, Spinner } from '../../../UniversalMasterSchedule/ui';
import { PageContainer } from './styled-gamification-system';
import GamificationEconomyGuardrail from './components/GamificationEconomyGuardrail';
import AdminGamificationTabs from './AdminGamificationTabs';
import AdminGamificationConfirmDialog from './AdminGamificationConfirmDialog';
import { HeaderDescription, LoadingContainer } from './admin-gamification.styles';
import { useAdminGamificationController } from './useAdminGamificationController';

const AdminGamificationView: React.FC = () => {
  const controller = useAdminGamificationController();

  if (controller.loading) {
    return (
      <LoadingContainer>
        <Spinner size={48} />
      </LoadingContainer>
    );
  }

  return (
    <PageContainer role="main" aria-label="Gamification management dashboard">
      <PageTitle>Gamification System Administration</PageTitle>

      <HeaderDescription>
        <BodyText>
          Manage achievements, rewards, and system settings for your gamification platform. Use this dashboard to
          create engaging experiences that motivate your clients.
        </BodyText>
      </HeaderDescription>

      <GamificationEconomyGuardrail />
      <AdminGamificationTabs controller={controller} />
      <AdminGamificationConfirmDialog request={controller.confirmRequest} onClose={controller.closeConfirm} />
    </PageContainer>
  );
};

export default React.memo(AdminGamificationView);
