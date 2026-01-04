import React from 'react';
import styled from 'styled-components';
import { User as UserIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const UserProfileCard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    // Render a loading state or null if user is not available
    return (
      <CardContainer>
        <AvatarPlaceholder>
          <UserIcon size={24} />
        </AvatarPlaceholder>
        <UserInfo>
          <UserName>Loading...</UserName>
          <UserEmail>Please wait</UserEmail>
        </UserInfo>
      </CardContainer>
    );
  }

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;

  return (
    <CardContainer>
      <Avatar src={user.photo || undefined} alt={fullName}>
        {!user.photo && <UserIcon size={24} />}
      </Avatar>
      <UserInfo>
        <UserName>{fullName}</UserName>
        <UserEmail>{user.email}</UserEmail>
      </UserInfo>
    </CardContainer>
  );
};

// Styled components following Galaxy-Swan theme
const CardContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--glass-bg, rgba(10, 14, 26, 0.7));
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 999px; // Pill shape
  padding: 6px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  max-width: 250px;

  &:hover {
    border-color: var(--primary-cyan, #00CED1);
    box-shadow: 0 0 15px rgba(0, 206, 209, 0.3);
  }
`;

const Avatar = styled.div<{ src?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--dark-bg, #0a0e1a);
  background-image: url(${props => props.src});
  background-size: cover;
  background-position: center;
  border: 2px solid var(--primary-cyan, #00CED1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #B8B8B8);
  flex-shrink: 0;
`;

const AvatarPlaceholder = styled(Avatar)``;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-right: 12px;
`;

const UserName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #FFFFFF);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserEmail = styled.div`
  font-size: 12px;
  color: var(--text-secondary, #B8B8B8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export default UserProfileCard;