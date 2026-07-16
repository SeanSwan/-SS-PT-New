import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { AlertTriangle, Check } from 'lucide-react';
import apiService from '../../../../../services/api.service';
import WidgetSkeleton from './WidgetSkeleton';
import { useToast } from '../../../../../hooks/use-toast';
import { CommandCard } from '../AdminDashboardCards';
import { StyledBox } from '@/components/ui/StyledBox';

const ClientList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 350px;
  overflow-y: auto;
`;

const ClientItem = styled(motion.li)`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(245, 158, 11, 0.1);

  &:last-child {
    border-bottom: none;
  }
`;

const ClientInfo = styled.div`
  flex: 1;
`;

const ClientName = styled.div`
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 0.25rem;
`;

const ClientDetails = styled.div`
  font-size: 0.8rem;
  color: var(--text-muted, #94a3b8);
`;

const ComplianceScore = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 1.5rem;
  font-weight: 700;
  color: #D946EF;
  text-shadow: 0 0 14px rgba(217, 70, 239, 0.4);
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
  min-width: 140px;
  text-align: right;
`;

const ActionButton = styled(motion.button)`
  padding: 0.5rem 0.75rem;
  min-height: 44px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.2s ease-in-out;

  &.contact {
    background-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
    color: var(--accent-primary, #60C0F0);
    &:hover {
      background-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
      color: var(--text-primary, #E0ECF4);
    }
  }

  &.profile {
    background-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent);
    color: var(--accent-secondary, #8B5CF6);
    &:hover {
      background-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent);
      color: var(--text-primary, #E0ECF4);
    }
  }
`;

const ContactedBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
`;

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

const HighRiskClientsWidget: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactedClients, setContactedClients] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchClients = useCallback(async () => {
    setLoading(true);
      try {
        const response = await apiService.get('/api/admin/reports/compliance');
        setClients(response.data);
      } catch (error) {
        console.error("Failed to fetch high-risk clients", error);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleMarkAsContacted = useCallback((clientId: string, clientName: string) => {
    // In a real application, you would make an API call here.
    // e.g., await apiService.post(`/api/admin/reports/compliance/${clientId}/contacted`);
    
    setContactedClients(prev => [...prev, clientId]);
    toast({
      title: "Client Contacted",
      description: `${clientName} has been marked as contacted.`,
    });
  }, [toast]);

  return (
    <StyledBox as={CommandCard} $style={{ padding: '2rem', height: '100%' }}>
      <StyledBox as="h3" $style={{ color: 'var(--accent-gold, #C6A84B)', margin: '0 0 1rem 0', fontSize: '1.25rem' }}>
        Low Compliance Clients
      </StyledBox>
      {loading ? ( <WidgetSkeleton count={3} /> ) : (
        <ClientList>
          {clients.map((client, index) => (
            <StyledBox as={ClientItem}
              key={client.id}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: index * 0.1 }}
              $style={{ opacity: contactedClients.includes(client.id) ? 0.5 : 1 }}
            >
              <AlertTriangle size={24} color="var(--accent-gold, #C6A84B)" />
              <ClientInfo>
                <ClientName>{client.name}</ClientName>
                <ClientDetails>{client.details}</ClientDetails>
              </ClientInfo>
              <div aria-live="polite" aria-atomic="true" aria-label="Compliance score">
                <ComplianceScore>{client.compliance}%</ComplianceScore>
              </div>
              <Actions>
                {contactedClients.includes(client.id) ? (
                  <ContactedBadge>
                    <Check size={16} />
                    Contacted
                  </ContactedBadge>
                ) : (
                  <ActionButton className="contact" onClick={() => handleMarkAsContacted(client.id, client.name)}>
                    Mark as Contacted
                  </ActionButton>
                )}
                <ActionButton
                  className="profile"
                  onClick={() => { window.location.href = `/admin/clients/${client.id}`; }}
                >
                  View Profile
                </ActionButton>
              </Actions>
            </StyledBox>
          ))}
        </ClientList>
      )}
    </StyledBox>
  );
};

export default HighRiskClientsWidget;
