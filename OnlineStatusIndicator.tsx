import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../hooks/useAuth';
import api from '../../utils/api';

interface Friend {
  id: number;
  firstName: string;
  lastName: string;
  photo?: string;
}

const OnlineStatusIndicator: React.FC = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [onlineFriends, setOnlineFriends] = useState<Friend[]>([]);

  // 1. Fetch the user's friends list
  const { data: friends = [] } = useQuery<Friend[]>({
    queryKey: ['friends', user?.id],
    queryFn: async () => {
      const response = await api.get('/api/social/friends'); // Assuming this endpoint exists
      return response.data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!socket || !isConnected || friends.length === 0) return;

    // 2. Query for the initial online status of friends
    const friendIds = friends.map(f => f.id);
    socket.emit('query_online_status', friendIds, (statuses: Record<string, boolean>) => {
      const online = friends.filter(f => statuses[f.id]);
      setOnlineFriends(online);
    });

    // 3. Listen for real-time presence updates
    const handleUserOnline = ({ userId }: { userId: number }) => {
      const friend = friends.find(f => f.id === userId);
      if (friend) {
        setOnlineFriends(prev => {
          if (!prev.some(f => f.id === userId)) {
            return [...prev, friend];
          }
          return prev;
        });
      }
    };

    const handleUserOffline = ({ userId }: { userId: number }) => {
      setOnlineFriends(prev => prev.filter(f => f.id !== userId));
    };

    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);

    return () => {
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
    };
  }, [socket, isConnected, friends]);

  return (
    <IndicatorContainer>
      <IconWrapper>
        <Users size={20} />
        {onlineFriends.length > 0 && <OnlineDot />}
      </IconWrapper>
      <Count>{onlineFriends.length}</Count>
      <Tooltip>
        <TooltipHeader>{onlineFriends.length} Friends Online</TooltipHeader>
        {onlineFriends.length > 0 ? (
          <FriendsList>
            {onlineFriends.map(friend => (
              <FriendItem key={friend.id}>
                <FriendAvatar src={friend.photo} />
                <span>{friend.firstName} {friend.lastName}</span>
              </FriendItem>
            ))}
          </FriendsList>
        ) : (
          <NoFriendsOnline>No friends are currently online.</NoFriendsOnline>
        )}
      </Tooltip>
    </IndicatorContainer>
  );
};

const Tooltip = styled.div`
  visibility: hidden;
  opacity: 0;
  position: absolute;
  top: 120%;
  right: 0;
  width: 250px;
  background: var(--dark-bg, #0a0e1a);
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 12px;
  padding: 12px;
  z-index: 10;
  transition: opacity 0.2s, visibility 0.2s;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  backdrop-filter: blur(10px);
`;

const IndicatorContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 20px;
  background: var(--glass-bg, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
  cursor: pointer;
  color: var(--text-secondary, #B8B8B8);

  &:hover ${Tooltip} {
    visibility: visible;
    opacity: 1;
  }
`;

const IconWrapper = styled.div`
  position: relative;
`;

const OnlineDot = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 8px;
  height: 8px;
  background-color: #28a745;
  border-radius: 50%;
  border: 2px solid var(--dark-bg, #0a0e1a);
`;

const Count = styled.span`
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary, #FFFFFF);
`;

const TooltipHeader = styled.h4`
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-primary, #FFFFFF);
  border-bottom: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
  padding-bottom: 8px;
`;

const FriendsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
`;

const FriendItem = styled.li`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  font-size: 14px;
`;

const FriendAvatar = styled.div<{ src?: string }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: var(--glass-bg);
  background-image: url(${props => props.src});
  background-size: cover;
`;

const NoFriendsOnline = styled.p`
  font-size: 14px;
  color: var(--text-secondary, #B8B8B8);
  margin: 0;
  padding: 10px 0;
`;

export default OnlineStatusIndicator;