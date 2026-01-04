import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { AlertTriangle, Check, User } from 'lucide-react';
import apiService from '../../../../../services/api.service';
import WidgetSkeleton from './WidgetSkeleton';
import { useToast } from '../../../../../hooks/use-toast';
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
    background-color: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.4);
    color: #7dd3fc;
    &:hover {
      background-color: rgba(59, 130, 246, 0.25);
      color: #e0f2fe;
    }
  }

  &.profile {
    background-color: rgba(16, 185, 129, 0.1);
    border-color: rgba(16, 185, 129, 0.3);
    color: #10b981;
    &:hover {
      background-color: rgba(16, 185, 129, 0.2);
      color: #34d399;
    }
  }
`;

const ContactedBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #10b981;
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
  const navigate = useNavigate();

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

  const handleViewProfile = (clientId: string) => {
    navigate(`/dashboard/admin/users/${clientId}`); // Assuming this is the route structure
  };

  return (
    <CommandCard style={{ padding: '2rem', height: '100%' }}>
      <h3 style={{ color: '#f59e0b', margin: '0 0 1rem 0', fontSize: '1.25rem' }}>
        Low Compliance Clients 
      </h3>
      {loading ? ( <WidgetSkeleton count={3} /> ) : (
        <ClientList>
          {clients.map((client, index) => (
            <ClientItem
              key={client.id}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: index * 0.1 }}
              style={{ opacity: contactedClients.includes(client.id) ? 0.5 : 1 }}
            >
              <AlertTriangle size={24} color="#f59e0b" />
              <ClientInfo>
                <ClientName>{client.name}</ClientName>
                <ClientDetails>{client.details}</ClientDetails>
              </ClientInfo>
              <ComplianceScore>{client.compliance}%</ComplianceScore>
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
                <ActionButton className="profile" onClick={() => handleViewProfile(client.id)}>
                  <User size={14} /> View Profile
                </ActionButton>
              </Actions>
            </ClientItem>
          ))}
        </ClientList>
      )}
    </CommandCard>
  );
};
import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../context/AuthContext';

// Icons
import { MessageSquare, User, TrendingUp, Award, Plus } from 'lucide-react';

// Placeholder Components (to be built out in subsequent phases)
const ActivityFeedPlaceholder = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 2rem;
  min-height: 800px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
`;

const GamificationSidebarPlaceholder = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 2rem;
  height: 600px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
`;

const PostComposerPlaceholder = styled.div`
  background: rgba(30, 41, 59, 0.8);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(59, 130, 246, 0.3);
`;

// Main Layout
const DashboardContainer = styled(motion.div)`
  padding: 2rem;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  min-height: 100vh;
  color: white;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const PageTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #ffffff, #00ffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const MainLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;

  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }

  @media (min-width: 1280px) {
    grid-template-columns: 240px 1fr 320px;
    gap: 2rem;
  }
`;

const MainContent = styled.main`
  grid-column: 1 / -1;

  @media (min-width: 1024px) {
    grid-column: 1 / 2;
  }

  @media (min-width: 1280px) {
    grid-column: 2 / 3;
  }
`;

const LeftSidebar = styled.aside`
  display: none;

  @media (min-width: 1280px) {
    display: block;
    grid-column: 1 / 2;
    grid-row: 1 / 2;
  }
`;

const RightSidebar = styled.aside`
  display: none;

  @media (min-width: 1024px) {
    display: block;
    grid-column: 2 / 3;
    grid-row: 1 / 2;
  }

  @media (min-width: 1280px) {
    grid-column: 3 / 4;
  }
`;

const NavMenu = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 1rem;
  border-radius: 16px;
`;

const NavItem = styled.a`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(59, 130, 246, 0.2);
  }
`;

const SocialClientDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <DashboardContainer>
      <Header>
        <PageTitle>Activity Feed</PageTitle>
      </Header>

      <MainLayout>
        <LeftSidebar>
          <NavMenu>
            <NavItem href={`/profile/${user?.id}`}><User size={20} /> My Profile</NavItem>
            <NavItem href="/client/progress"><TrendingUp size={20} /> My Progress</NavItem>
            <NavItem href="/client/achievements"><Award size={20} /> Achievements</NavItem>
            <NavItem href="/client/goals"><Target size={20} /> My Goals</NavItem>
          </NavMenu>
        </LeftSidebar>

        <MainContent>
          <PostComposerPlaceholder>
            <Plus /> Create a new post...
          </PostComposerPlaceholder>
          <ActivityFeedPlaceholder>
            <MessageSquare /> Activity Feed will be here.
          </ActivityFeedPlaceholder>
        </MainContent>

        <RightSidebar>
          <GamificationSidebarPlaceholder>
            <Trophy /> Gamification & Stats Sidebar
          </GamificationSidebarPlaceholder>
        </RightSidebar>
      </MainLayout>
    </DashboardContainer>
  );
};

export default SocialClientDashboard;
```

### 3. Update `HighRiskClientsWidget`

Finally, here is the requested change to add a "View Profile" button to the `HighRiskClientsWidget`. This makes the widget more actionable by allowing admins to quickly navigate to a client's profile.

```diff
--- a/c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/frontend/src/components/DashBoard/Pages/admin-dashboard/components/HighRiskClientsWidget.tsx
+++ b/c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/frontend/src/components/DashBoard/Pages/admin-dashboard/components/HighRiskClientsWidget.tsx

export default HighRiskClientsWidget;
