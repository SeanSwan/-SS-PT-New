import React from 'react';
import { AlertTriangle, Calendar, User } from 'lucide-react';
import {
  BodyText,
  Caption,
  FlexBox,
  SmallText,
  Spinner,
} from './ui';
import type { useApplyPaymentModalController } from './ApplyPaymentModal.controller';
import {
  CenteredPad,
  ClientAvatar,
  ClientCard,
  ClientList,
  CreditBadge,
  EmptyState,
  SectionHeader,
  SessionBadge,
} from './ApplyPaymentModal.baseStyles';

type PaymentController = ReturnType<typeof useApplyPaymentModalController>;

interface ApplyPaymentClientListProps {
  controller: PaymentController;
}

export const ApplyPaymentClientList: React.FC<ApplyPaymentClientListProps> = ({ controller }) => {
  const { clients, loading, selectedClient, handleSelectClient } = controller;

  return (
    <>
      <SectionHeader>
        <AlertTriangle size={18} />
        <SmallText>Clients Needing Payment ({clients.length})</SmallText>
      </SectionHeader>

      {loading ? (
        <CenteredPad $pad="2rem">
          <Spinner size={32} />
        </CenteredPad>
      ) : clients.length === 0 ? (
        <EmptyState>
          <Caption secondary>No clients with exhausted credits have upcoming sessions.</Caption>
        </EmptyState>
      ) : (
        <ClientList>
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              type="button"
              $selected={selectedClient?.id === client.id}
              onClick={() => handleSelectClient(client)}
            >
              <FlexBox align="center" gap="0.75rem">
                <ClientAvatar><User size={20} /></ClientAvatar>
                <div>
                  <BodyText>{client.name}</BodyText>
                  <Caption secondary>{client.email}</Caption>
                </div>
              </FlexBox>
              <FlexBox gap="1rem" align="center">
                <CreditBadge $negative>{client.availableSessions} credits</CreditBadge>
                <SessionBadge>
                  <Calendar size={14} />
                  {client.upcomingSessions} upcoming
                </SessionBadge>
              </FlexBox>
            </ClientCard>
          ))}
        </ClientList>
      )}
    </>
  );
};
