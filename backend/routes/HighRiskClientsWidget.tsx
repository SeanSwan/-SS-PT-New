import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { AlertTriangle } from 'lucide-react';
import apiService from '../../../../../services/api.service';
import { CommandCard } from '../admin-dashboard-view';

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
  color: #fff;
  margin-bottom: 0.25rem;
`;

const ClientDetails = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
`;

const ComplianceScore = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: #ef4444;
`;

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

const HighRiskClientsWidget: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await apiService.get('/api/admin/reports/compliance');
        setClients(response.data);
      } catch (error) {
        console.error("Failed to fetch high-risk clients", error);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  return (
    <CommandCard style={{ padding: '2rem', height: '100%' }}>
      <h3 style={{ color: '#f59e0b', margin: '0 0 1rem 0', fontSize: '1.25rem' }}>
        Low Compliance Clients
      </h3>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <ClientList>
          {clients.map((client, index) => (
            <ClientItem
              key={client.id}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: index * 0.1 }}
            >
              <AlertTriangle size={24} color="#f59e0b" />
              <ClientInfo>
                <ClientName>{client.name}</ClientName>
                <ClientDetails>{client.details}</ClientDetails>
              </ClientInfo>
              <ComplianceScore>{client.compliance}%</ComplianceScore>
            </ClientItem>
          ))}
        </ClientList>
      )}
    </CommandCard>
  );
};

export default HighRiskClientsWidget;