/**
 * Apply Payment Modal
 * ===================
 * Admin modal for applying session credits to clients
 * who have exhausted their credits but have upcoming sessions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  Modal,
  FormField,
  Label,
  StyledInput,
  StyledTextarea,
  PrimaryButton,
  OutlinedButton,
  ErrorText,
  SmallText,
  BodyText,
  Caption,
  FlexBox,
  Spinner
} from './ui';
import { AlertTriangle, CreditCard, User, Calendar } from 'lucide-react';

interface ClientNeedingPayment {
  id: number;
  name: string;
  email: string;
  phone?: string;
  availableSessions: number;
  upcomingSessions: number;
  nextSession?: string;
}

interface ApplyPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onApplied?: () => void;
}

const ApplyPaymentModal: React.FC<ApplyPaymentModalProps> = ({
  open,
  onClose,
  onApplied
}) => {
  const [clients, setClients] = useState<ClientNeedingPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientNeedingPayment | null>(null);
  const [sessionsToAdd, setSessionsToAdd] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [success, setSuccess] = useState<string | null>(null);

  const fetchClientsNeedingPayment = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view clients.');
        return;
      }

      const response = await fetch('/api/sessions/deductions/clients-needing-payment', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (!response.ok || result?.success === false) {
        setError(result?.message || 'Failed to fetch clients.');
        return;
      }

      setClients(result.data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Failed to fetch clients needing payment.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchClientsNeedingPayment();
      setSelectedClient(null);
      setSessionsToAdd('');
      setPaymentNote('');
      setSuccess(null);
    }
  }, [open, fetchClientsNeedingPayment]);

  const handleApplyPayment = async () => {
    if (!selectedClient) {
      setError('Please select a client.');
      return;
    }

    const sessions = parseInt(sessionsToAdd, 10);
    if (isNaN(sessions) || sessions < 1) {
      setError('Please enter a valid number of sessions (at least 1).');
      return;
    }

    setApplying(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to apply payment.');
        return;
      }

      const response = await fetch('/api/sessions/deductions/apply-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId: selectedClient.id,
          sessionsToAdd: sessions,
          paymentNote: paymentNote.trim() || undefined
        })
      });

      const result = await response.json();
      if (!response.ok || result?.success === false) {
        setError(result?.message || 'Failed to apply payment.');
        return;
      }

      setSuccess(`Added ${sessions} session credits to ${selectedClient.name}. New balance: ${result.data?.newBalance}`);
      setSelectedClient(null);
      setSessionsToAdd('');
      setPaymentNote('');
      fetchClientsNeedingPayment();
      onApplied?.();
    } catch (err) {
      console.error('Error applying payment:', err);
      setError('Failed to apply payment. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const handleProcessDeductions = async () => {
    setApplying(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to process deductions.');
        return;
      }

      const response = await fetch('/api/sessions/deductions/process', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (!response.ok || result?.success === false) {
        setError(result?.message || 'Failed to process deductions.');
        return;
      }

      setSuccess(result.message || 'Deductions processed successfully.');
      fetchClientsNeedingPayment();
      onApplied?.();
    } catch (err) {
      console.error('Error processing deductions:', err);
      setError('Failed to process deductions. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Apply Payment / Manage Credits"
      size="lg"
      footer={(
        <>
          <OutlinedButton onClick={onClose} disabled={applying}>
            Close
          </OutlinedButton>
          <OutlinedButton onClick={handleProcessDeductions} disabled={applying || loading}>
            {applying ? <Spinner size={16} /> : null}
            Process Auto-Deductions
          </OutlinedButton>
          {selectedClient && (
            <PrimaryButton onClick={handleApplyPayment} disabled={applying || !sessionsToAdd}>
              {applying ? <Spinner size={16} /> : <CreditCard size={16} />}
              Apply Credits
            </PrimaryButton>
          )}
        </>
      )}
    >
      {error && (
        <ErrorText style={{ marginBottom: '1rem' }}>
          {error}
        </ErrorText>
      )}

      {success && (
        <SuccessMessage>
          {success}
        </SuccessMessage>
      )}

      <SectionHeader>
        <AlertTriangle size={18} />
        <SmallText>Clients Needing Payment ({clients.length})</SmallText>
      </SectionHeader>

      {loading ? (
        <FlexBox justify="center" style={{ padding: '2rem' }}>
          <Spinner size={32} />
        </FlexBox>
      ) : clients.length === 0 ? (
        <EmptyState>
          <Caption secondary>No clients with exhausted credits have upcoming sessions.</Caption>
        </EmptyState>
      ) : (
        <ClientList>
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              $selected={selectedClient?.id === client.id}
              onClick={() => setSelectedClient(client)}
            >
              <FlexBox align="center" gap="0.75rem">
                <ClientAvatar>
                  <User size={20} />
                </ClientAvatar>
                <div>
                  <BodyText>{client.name}</BodyText>
                  <Caption secondary>{client.email}</Caption>
                </div>
              </FlexBox>
              <FlexBox gap="1rem" align="center">
                <CreditBadge $negative>
                  {client.availableSessions} credits
                </CreditBadge>
                <SessionBadge>
                  <Calendar size={14} />
                  {client.upcomingSessions} upcoming
                </SessionBadge>
              </FlexBox>
            </ClientCard>
          ))}
        </ClientList>
      )}

      {selectedClient && (
        <ApplySection>
          <SectionHeader>
            <CreditCard size={18} />
            <SmallText>Apply Credits to {selectedClient.name}</SmallText>
          </SectionHeader>

          <FormField>
            <Label htmlFor="sessions-to-add">Sessions to Add</Label>
            <StyledInput
              id="sessions-to-add"
              type="number"
              min={1}
              value={sessionsToAdd}
              onChange={(e) => setSessionsToAdd(e.target.value)}
              placeholder="Number of sessions to credit"
            />
          </FormField>

          <FormField>
            <Label htmlFor="payment-note">Payment Note (optional)</Label>
            <StyledTextarea
              id="payment-note"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              rows={2}
              placeholder="e.g., 10-pack purchased via Stripe"
            />
          </FormField>
        </ApplySection>
      )}
    </Modal>
  );
};

export default ApplyPaymentModal;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
`;

const ClientList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 250px;
  overflow-y: auto;
  margin-bottom: 1rem;
`;

const ClientCard = styled.div<{ $selected?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-radius: 10px;
  background: ${({ $selected }) => $selected ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
  border: 1px solid ${({ $selected }) => $selected ? 'rgba(0, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.08)'};
  cursor: pointer;
  transition: all 150ms ease-out;

  &:hover {
    background: rgba(0, 255, 255, 0.1);
    border-color: rgba(0, 255, 255, 0.3);
  }
`;

const ClientAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00ffff;
`;

const CreditBadge = styled.span<{ $negative?: boolean }>`
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $negative }) => $negative ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'};
  color: ${({ $negative }) => $negative ? '#ef4444' : '#10b981'};
  border: 1px solid ${({ $negative }) => $negative ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'};
`;

const SessionBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.3);
`;

const ApplySection = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
  margin-bottom: 1rem;
`;

const SuccessMessage = styled.div`
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #10b981;
  font-size: 0.9rem;
`;
