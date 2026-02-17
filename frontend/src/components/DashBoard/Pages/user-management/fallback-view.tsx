import React from 'react';
import styled from 'styled-components';
import { UserPlus, Settings, Key, CheckCircle } from 'lucide-react';
import MainCard from '../../../../components/ui/MainCard';

const InfoPanel = styled.div`
  padding: 16px;
  margin-bottom: 24px;
  background: rgba(14, 165, 233, 0.1);
  border: 1px solid rgba(14, 165, 233, 0.3);
  border-radius: 8px;
`;

const InfoTitle = styled.h6`
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0 0 8px;
`;

const InfoText = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  line-height: 1.6;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const CardContainer = styled.div`
  border-radius: 12px;
  background: rgba(29, 31, 43, 0.8);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  margin-bottom: 24px;
`;

const CardBody = styled.div`
  padding: 24px;
`;

const CardTitle = styled.h5`
  font-size: 1.5rem;
  font-weight: 600;
  color: white;
  margin: 0 0 8px;
`;

const CardDesc = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 16px;
  line-height: 1.6;
`;

const UserListItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const UserIcon = styled.div`
  color: rgba(0, 255, 255, 0.7);
  display: flex;
`;

const UserDetails = styled.div``;

const UserName = styled.span`
  font-size: 1rem;
  font-weight: 500;
  color: white;
  display: block;
`;

const UserMeta = styled.span`
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.6);
`;

const EditButton = styled.button`
  padding: 6px 16px;
  min-height: 36px;
  border-radius: 6px;
  border: 1px solid rgba(0, 255, 255, 0.4);
  background: transparent;
  color: #00ffff;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.1);
  }
`;

const ListDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 0;
`;

const SideCardTitle = styled.h6`
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0 0 12px;
`;

const FeatureItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);

  svg {
    color: #4caf50;
    flex-shrink: 0;
  }
`;

const ToolButton = styled.button<{ $variant?: string }>`
  width: 100%;
  padding: 10px 16px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid ${props =>
    props.$variant === 'error' ? 'rgba(244, 67, 54, 0.4)' :
    props.$variant === 'secondary' ? 'rgba(120, 81, 169, 0.4)' :
    'rgba(0, 255, 255, 0.4)'
  };
  background: transparent;
  color: ${props =>
    props.$variant === 'error' ? '#f44336' :
    props.$variant === 'secondary' ? '#7851a9' :
    '#00ffff'
  };
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: ${props =>
      props.$variant === 'error' ? 'rgba(244, 67, 54, 0.1)' :
      props.$variant === 'secondary' ? 'rgba(120, 81, 169, 0.1)' :
      'rgba(0, 255, 255, 0.1)'
    };
  }
`;

const SideStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const ToolStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
`;

/**
 * Fallback View for User Management
 */
const UserManagementFallback: React.FC = () => {
  const sampleUsers = [
    { name: 'Admin User', role: 'admin', status: 'Active' },
    { name: 'Trainer User', role: 'trainer', status: 'Active' },
    { name: 'Client User', role: 'client', status: 'Active' },
    { name: 'Regular User', role: 'user', status: 'Active' }
  ];

  return (
    <MainCard title="User Management">
      <InfoPanel>
        <InfoTitle>User Management System</InfoTitle>
        <InfoText>
          This dashboard allows you to manage all users in the system, including clients, trainers, and administrators.
          You can view, edit, and manage permissions for all users from this central location.
        </InfoText>
      </InfoPanel>

      <ContentGrid>
        <div>
          <CardContainer>
            <CardBody>
              <CardTitle>Sample User List</CardTitle>
              <CardDesc>
                Below is a representation of the user management interface. When fully implemented, you'll be able to:
              </CardDesc>

              {sampleUsers.map((user, index) => (
                <React.Fragment key={index}>
                  <UserListItem>
                    <UserInfo>
                      <UserIcon><UserPlus size={20} /></UserIcon>
                      <UserDetails>
                        <UserName>{user.name}</UserName>
                        <UserMeta>Role: {user.role} • Status: {user.status}</UserMeta>
                      </UserDetails>
                    </UserInfo>
                    <EditButton>Edit</EditButton>
                  </UserListItem>
                  {index < sampleUsers.length - 1 && <ListDivider />}
                </React.Fragment>
              ))}
            </CardBody>
          </CardContainer>
        </div>

        <SideStack>
          <CardContainer>
            <CardBody>
              <SideCardTitle>User Management Features</SideCardTitle>
              <FeatureItem><CheckCircle size={16} /> View all users by role</FeatureItem>
              <FeatureItem><CheckCircle size={16} /> Edit user details</FeatureItem>
              <FeatureItem><CheckCircle size={16} /> Promote users to client</FeatureItem>
              <FeatureItem><CheckCircle size={16} /> Manage admin permissions</FeatureItem>
            </CardBody>
          </CardContainer>

          <CardContainer>
            <CardBody>
              <SideCardTitle>Admin Tools</SideCardTitle>
              <ToolStack>
                <ToolButton><UserPlus size={18} /> Add New User</ToolButton>
                <ToolButton $variant="secondary"><Settings size={18} /> User Permissions</ToolButton>
                <ToolButton $variant="error"><Key size={18} /> Security Settings</ToolButton>
              </ToolStack>
            </CardBody>
          </CardContainer>
        </SideStack>
      </ContentGrid>
    </MainCard>
  );
};

export default UserManagementFallback;
