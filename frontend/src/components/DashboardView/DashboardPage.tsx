import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  color: #fff;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
  background: linear-gradient(90deg, #00ffff, #7851a9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Description = styled.p`
  font-size: 1.1rem;
  margin-bottom: 3rem;
  text-align: center;
  max-width: 800px;
  line-height: 1.6;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  width: 100%;
`;

const DashboardCard = styled.div`
  position: relative;
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 2rem;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0, 255, 255, 0.1);
    border-color: rgba(0, 255, 255, 0.3);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 12px;
    padding: 2px;
    background: linear-gradient(90deg, #00ffff, #7851a9);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover::before {
    opacity: 1;
  }
`;

const CardIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  background: rgba(0, 255, 255, 0.1);
  color: #00ffff;
  font-size: 2.5rem;
`;

const CardTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #ffffff;
`;

const CardDescription = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  margin-bottom: 1.5rem;
`;

const Badge = styled.span`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  background: rgba(0, 255, 255, 0.1);
  color: #00ffff;
`;

/**
 * DashboardPage Component
 * 
 * A unified dashboard page that displays available dashboard options
 * based on the user's role and provides easy navigation.
 */
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Navigate to the selected dashboard
  const goToDashboard = (path: string) => {
    navigate(path);
  };
  
  // Determine which dashboards are available based on user role
  const getAvailableDashboards = () => {
    const dashboards = [];
    
    // All logged in users can access client dashboard
    dashboards.push({
      id: 'client',
      title: 'Client Dashboard',
      description: 'Track your fitness progress, workouts, and achievements',
      path: '/client/dashboard',
      icon: '👤',
      badge: 'For all users'
    });
    
    // Trainers and admins can access trainer dashboard
    if (user?.role === 'trainer' || user?.role === 'admin') {
      dashboards.push({
        id: 'trainer',
        title: 'Trainer Dashboard',
        description: 'Manage clients, create workout plans, and track client progress',
        path: '/trainer/dashboard',
        icon: '👥',
        badge: 'For trainers'
      });
    }
    
    // Only admins can access admin dashboard
    if (user?.role === 'admin') {
      dashboards.push({
        id: 'admin',
        title: 'Admin Dashboard',
        description: 'Manage users, content, and system settings',
        path: '/dashboard/default',
        icon: '⚙️',
        badge: 'Admin only'
      });
    }
    
    return dashboards;
  };
  
  const availableDashboards = getAvailableDashboards();
  
  return (
    <Container>
      <Title>Welcome to SwanStudios Dashboards</Title>
      <Description>
        Access your personalized dashboards based on your role. Each dashboard provides
        unique features to help you manage your fitness journey or professional responsibilities.
      </Description>
      
      <Grid>
        {availableDashboards.map((dashboard) => (
          <DashboardCard 
            key={dashboard.id}
            onClick={() => goToDashboard(dashboard.path)}
          >
            <CardIcon>{dashboard.icon}</CardIcon>
            <CardTitle>{dashboard.title}</CardTitle>
            <CardDescription>{dashboard.description}</CardDescription>
            <Badge>{dashboard.badge}</Badge>
          </DashboardCard>
        ))}
      </Grid>
    </Container>
  );
};

export default DashboardPage;