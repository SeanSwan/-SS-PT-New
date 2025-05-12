/**
 * UserSwitcher.tsx
 * Development component to quickly switch between different user types
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import { X, User, Users, Settings, Crown } from 'lucide-react';

const Container = styled.div<{ $visible: boolean }>`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  display: ${(props) => props.$visible ? 'block' : 'none'};
`;

const Toggle = styled.button`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 10000;
  background: #00ffff;
  border: none;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 255, 255, 0.3);
  transition: all 0.3s ease;
  
  &:hover {
    background: #00e6e6;
    transform: scale(1.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  svg {
    color: #0a0a1a;
  }
`;

const Panel = styled.div`
  background: rgba(26, 26, 46, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  width: 300px;
  color: white;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`;

const Title = styled.h3`
  margin: 0 0 20px 0;
  color: #00ffff;
  font-size: 18px;
  font-weight: 600;
`;

const UserButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  margin-bottom: 8px;
  background: ${(props) => 
    props.$active ? 'rgba(0, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'
  };
  border: ${(props) => 
    props.$active ? '1px solid #00ffff' : '1px solid rgba(255, 255, 255, 0.1)'
  };
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(0, 255, 255, 0.05);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const UserName = styled.span`
  font-weight: 500;
  font-size: 14px;
`;

const UserRole = styled.span`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }
`;

const CurrentUser = styled.div`
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
`;

const UserSwitcher: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { user, login, logout } = useAuth();
  
  // Don't render in production
  if (import.meta.env.PROD) {
    return null;
  }
  
  const users = [
    {
      username: 'admin',
      name: 'Admin User',
      role: 'admin',
      icon: Crown,
      color: '#00ffff'
    },
    {
      username: 'trainer',
      name: 'John Trainer',
      role: 'trainer',
      icon: Users,
      color: '#7851a9'
    },
    {
      username: 'client',
      name: 'Demo Client',
      role: 'client',
      icon: User,
      color: '#FF6B6B'
    },
    {
      username: 'user',
      name: 'Jane User',
      role: 'user',
      icon: Settings,
      color: '#32CD32'
    }
  ];
  
  const handleUserSwitch = async (username: string) => {
    try {
      await login(username, 'password');
      console.log(`Switched to ${username}`);
    } catch (error) {
      console.error('Error switching user:', error);
    }
  };
  
  return (
    <>
      <Toggle onClick={() => setIsVisible(!isVisible)}>
        {isVisible ? <X size={24} /> : <User size={24} />}
      </Toggle>
      
      <Container $visible={isVisible}>
        <Panel>
          <CloseButton onClick={() => setIsVisible(false)}>
            <X size={16} />
          </CloseButton>
          
          <Title>User Switcher</Title>
          
          {user && (
            <CurrentUser>
              <UserName>Current: {user.firstName} {user.lastName}</UserName>
              <UserRole>{user.role}</UserRole>
            </CurrentUser>
          )}
          
          {users.map((userType) => {
            const Icon = userType.icon;
            const isActive = user?.role === userType.role;
            
            return (
              <UserButton
                key={userType.username}
                $active={isActive}
                onClick={() => handleUserSwitch(userType.username)}
              >
                <Icon size={20} style={{ color: userType.color }} />
                <UserInfo>
                  <UserName>{userType.name}</UserName>
                  <UserRole>{userType.role}</UserRole>
                </UserInfo>
              </UserButton>
            );
          })}
          
          <UserButton onClick={logout}>
            <X size={20} style={{ color: '#ff4444' }} />
            <UserInfo>
              <UserName>Logout</UserName>
              <UserRole>Clear Session</UserRole>
            </UserInfo>
          </UserButton>
        </Panel>
      </Container>
    </>
  );
};

export default UserSwitcher;