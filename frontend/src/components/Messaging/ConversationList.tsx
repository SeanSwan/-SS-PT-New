import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { User, Plus, Trash2 } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import NewConversationModal from './NewConversationModal';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

interface Participant {
  id: number;
  name: string;
  photo?: string;
}

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: Participant[];
  lastMessage: {
    content: string;
    timestamp: string;
  };
  unreadCount: number;
}

interface ConversationListProps {
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({ selectedConversationId, onSelectConversation }) => {
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => (await api.get('/api/messaging/conversations')).data,
  });

  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (socket && isConnected && conversations && conversations.length > 0) {
      const conversationIds = conversations.map(c => c.id);
      socket.emit('join_conversations', conversationIds);

      const participantIds = conversations.flatMap(c => c.participants?.map(p => p.id) || []);
      socket.emit('query_online_status', [...new Set(participantIds)], (statuses: Record<string, boolean>) => {
        const onlineIds = Object.keys(statuses)
          .filter(id => statuses[id])
          .map(Number);
        setOnlineUsers(new Set(onlineIds));
      });
    }
  }, [socket, isConnected, conversations]);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (newMessage: any) => {
        queryClient.setQueryData(['conversations'], (oldData: Conversation[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(conv =>
            conv.id === newMessage.conversation_id
              ? {
                  ...conv,
                  lastMessage: { content: newMessage.content, timestamp: newMessage.created_at },
                  unreadCount: (conv.unreadCount || 0) + 1,
                }
              : conv
          ).sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());
        });
      };

      const handleUserOnline = ({ userId }: { userId: number }) => {
        setOnlineUsers(prev => new Set(prev).add(userId));
      };

      const handleUserOffline = ({ userId }: { userId: number }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      };

      socket.on('new_message', handleNewMessage);
      socket.on('user_online', handleUserOnline);
      socket.on('user_offline', handleUserOffline);

      return () => {
        socket.off('new_message', handleNewMessage);
        socket.off('user_online', handleUserOnline);
        socket.off('user_offline', handleUserOffline);
      };
    }
  }, [socket, queryClient, selectedConversationId]);

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation(); // Don't select the conversation
    if (!window.confirm('Delete this conversation? It will be hidden from your view.')) return;

    try {
      await api.delete(`/api/messaging/conversations/${convId}`);
      // Remove from React Query cache
      queryClient.setQueryData(['conversations'], (old: Conversation[] | undefined) =>
        old ? old.filter(c => c.id !== convId) : old
      );
      // If this was the selected conversation, deselect
      if (selectedConversationId === convId) {
        onSelectConversation('');
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const getDisplayName = (conv: Conversation) => {
    if (conv.type === 'group') return conv.name || 'Group Chat';
    return conv.participants?.[0]?.name || 'Unknown User';
  };

  const getDisplayAvatar = (conv: Conversation) => {
    if (conv.type === 'direct') return conv.participants?.[0]?.photo;
    return null; // Group avatar placeholder
  };

  const isOnline = (conv: Conversation) => {
    if (!conv.participants || conv.participants.length === 0) return false;
    if (conv.type === 'direct') {
      return onlineUsers.has(conv.participants[0].id);
    }
    // For group chats, show online if at least one other member is online
    return conv.participants.some(p => onlineUsers.has(p.id));
  };

  return (
    <Container>
      <Header>
        <h2>Conversations</h2>
        <NewConversationButton onClick={() => setIsNewConversationModalOpen(true)}>
          <Plus size={20} />
        </NewConversationButton>
      </Header>
      <ListContainer>
        {isLoading && <p>Loading...</p>}
        <LayoutGroup>
          <AnimatePresence>
            {conversations?.map(conv => (
              <motion.div
                key={conv.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <ConversationItem
                  $active={conv.id === selectedConversationId}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  <Avatar src={getDisplayAvatar(conv)} $isOnline={isOnline(conv)}>
                    {!getDisplayAvatar(conv) && <User size={20} />}
                  </Avatar>
                  <Content>
                    <Name>{getDisplayName(conv)}</Name>
                    <LastMessage>{conv.lastMessage?.content}</LastMessage>
                  </Content>
                  {conv.unreadCount > 0 && <UnreadBadge>{conv.unreadCount}</UnreadBadge>}
                  <DeleteButton
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    title="Delete conversation"
                  >
                    <Trash2 size={16} />
                  </DeleteButton>
                </ConversationItem>
              </motion.div>
            ))}
          </AnimatePresence>
        </LayoutGroup>
      </ListContainer>
      {isNewConversationModalOpen && (
        <NewConversationModal
          onClose={() => setIsNewConversationModalOpen(false)}
          onConversationCreated={(conversationId) => {
            onSelectConversation(conversationId);
          }}
        />
      )}
    </Container>
  );
};

const Container = styled.div`
  color: var(--text-primary, #FFFFFF);
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const ListContainer = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const Header = styled.h2`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.2rem;
  padding: 1.5rem;
  margin: 0;
  border-bottom: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  h2 {
    margin: 0;
    font-size: 1.2rem;
  }
`;

const ConversationItem = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  cursor: pointer;
  position: relative;
  background: ${props => props.$active ? 'var(--glass-bg, rgba(0, 206, 209, 0.1))' : 'transparent'};
  border-left: 3px solid ${props => props.$active ? 'var(--primary-cyan, #00CED1)' : 'transparent'};
  transition: background 0.2s;

  &:hover {
    background: var(--glass-bg, rgba(0, 206, 209, 0.05));
  }

  &:hover > button:last-child {
    opacity: 1;
  }
`;

const Avatar = styled.div<{ src?: string | null; $isOnline?: boolean }>`
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin-right: 12px;
  background-color: var(--dark-bg, #0a0e1a);
  background-image: url(${props => props.src});
  background-size: cover;
  background-position: center;
  border: 2px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    content: '';
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: ${props => props.$isOnline ? '#28a745' : '#6c757d'};
    border: 2px solid var(--dark-bg, #0a0e1a);
    transition: background-color 0.3s;
    opacity: ${props => props.$isOnline ? 1 : 0.5};
  }
`;

const Content = styled.div`
  flex: 1;
  overflow: hidden;
`;

const Name = styled.div`
  font-weight: 600;
`;

const LastMessage = styled.p`
  margin: 4px 0 0;
  font-size: 0.9rem;
  color: var(--text-secondary, #B8B8B8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UnreadBadge = styled.div`
  background: var(--primary-cyan, #00CED1);
  color: var(--dark-bg, #0a0e1a);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
`;

const DeleteButton = styled.button`
  opacity: 0;
  background: transparent;
  border: none;
  color: var(--text-secondary, #B8B8B8);
  cursor: pointer;
  padding: 0;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: opacity 0.2s, color 0.2s, background 0.2s;
  flex-shrink: 0;

  &:hover {
    color: #ff4d4f;
    background: rgba(255, 77, 79, 0.1);
  }

  @media (max-width: 768px) {
    opacity: 1;
  }
`;

const NewConversationButton = styled.button`
  background: transparent;
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:hover {
    background: var(--glass-bg);
    color: var(--primary-cyan);
  }
`;

export default ConversationList;