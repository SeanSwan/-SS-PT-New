import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import Message from './Message';
import MessageSkeleton from './MessageSkeleton';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../hooks/useAuth';

interface ChatWindowProps {
  conversationId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversationId }) => {
  const fetchMessages = async ({ pageParam }: { pageParam?: string }) => {
    const res = await api.get(`/api/messaging/conversations/${conversationId}/messages`, {
      params: { before: pageParam, limit: 50 },
    });
    return {
      messages: res.data,
      nextCursor: res.data.length === 50 ? res.data[0].id : undefined,
    };
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['messages', { conversationId }], // queryKey must be an array
    queryFn: fetchMessages,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
  });

  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = (content: string) => {
    if (socket && isConnected) {
      socket.emit('send_message', { conversationId, content });
    }
  };

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [data]);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (newMessage: any) => {
        // Only update if the message belongs to the current conversation
        if (newMessage.conversation_id === conversationId) {
          queryClient.setQueryData(['messages', { conversationId }], (oldData: any) => {
            // Mark as read immediately
            if (socket && isConnected) {
              socket.emit('mark_as_read', { conversationId, lastMessageId: newMessage.id });
            }

            if (!oldData) return oldData;
            const newPages = [...oldData.pages];
            newPages[newPages.length - 1].messages.push(newMessage);
            return { ...oldData, pages: newPages };
          });
        }
      };

      const handleUserTyping = ({ conversationId: convId, userName }: { conversationId: string; userName: string; userId: number }) => {
        if (convId === conversationId) {
          if (user && userName === user.firstName) return; // Don't show own typing
          setTypingUsers(prev => [...new Set([...prev, userName])]);
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(name => name !== userName));
          }, 3000); // Remove after 3 seconds
        }
      };

      const handleMessagesRead = ({ conversationId: convId, userId: readerId, userName, readMessageIds }: { conversationId: string; userId: number; userName: string; readMessageIds: string[] }) => {
        if (convId === conversationId) {
          queryClient.setQueryData(['messages', { conversationId }], (oldData: any) => {
            if (!oldData) return oldData;
            const newPages = oldData.pages.map((page: any) => ({
              ...page,
              messages: page.messages.map((msg: any) => {
                if (readMessageIds.includes(msg.id)) {
                  const alreadyRead = msg.readBy?.some((r: any) => r.userId === readerId);
                  if (!alreadyRead) {
                    return { ...msg, readBy: [...(msg.readBy || []), { userId: readerId, userName }] };
                  }
                }
                return msg;
              }),
            }));
            return { ...oldData, pages: newPages };
          });
        }
      };

      socket.on('new_message', handleNewMessage);
      socket.on('user_typing', handleUserTyping);
      socket.on('messages_read', handleMessagesRead);

      return () => {
        socket.off('new_message', handleNewMessage);
        socket.off('user_typing', handleUserTyping);
        socket.off('messages_read', handleMessagesRead);
      };
    }
  }, [socket, conversationId, queryClient, user?.id]);

  // Effect to mark messages as read when the window is active
  useEffect(() => {
    if (!socket || !isConnected || !data?.pages.length) return;

    const markAsRead = () => {
      const allMessages = data.pages.flatMap(page => page.messages);
      if (allMessages.length > 0) {
        const lastMessage = allMessages[allMessages.length - 1];
        // Check if the last message was not sent by the current user and not yet read
        const isReadByCurrentUser = lastMessage.readBy?.some((r: any) => r.userId === user?.id);
        if (lastMessage.sender_id !== user?.id && !isReadByCurrentUser) {
          socket.emit('mark_as_read', { conversationId, lastMessageId: lastMessage.id });
        }
      }
    };

    // Mark as read when component mounts/updates or window is focused
    markAsRead();
    window.addEventListener('focus', markAsRead);
    return () => window.removeEventListener('focus', markAsRead);
  }, [socket, isConnected, conversationId, data, user?.id]);

  const handleTyping = () => {
    if (socket && isConnected) {
      if (!typingTimeoutRef.current) {
        socket.emit('is_typing', { conversationId });
        typingTimeoutRef.current = setTimeout(() => {
          typingTimeoutRef.current = null;
        }, 2000); // Can emit typing every 2 seconds
      }
    }
  };

  return (
    <Container>
      <ChatHeader conversationId={conversationId} />
      <MessageList ref={messageListRef}>
        {isLoading && (
          <>
            <MessageSkeleton />
            <MessageSkeleton isCurrentUser />
            <MessageSkeleton />
            <MessageSkeleton />
          </>
        )}
        {hasNextPage && (
          <LoadMoreButton onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Loading...' : 'Load More'}
          </LoadMoreButton>
        )}
        {data?.pages.map((page, i) => (
          <React.Fragment key={i}>
            {page.messages.map((message: any) => (
              <Message key={message.id} message={message} />
            ))}
          </React.Fragment>
        ))}
      </MessageList>
      <TypingIndicator>
        {typingUsers.length > 0 &&
          `${typingUsers.join(', ')} ${typingUsers.length > 1 ? 'are' : 'is'} typing...`
        }
      </TypingIndicator>
      <MessageInput onSendMessage={handleSendMessage} onTyping={handleTyping} disabled={!isConnected} />
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const MessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column-reverse; /* To show latest messages at the bottom */
`;

const LoadMoreButton = styled.button`
  background: var(--glass-bg, rgba(0, 206, 209, 0.1));
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  color: var(--primary-cyan, #00CED1);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  margin: 1rem auto;
  
  &:hover {
    background: var(--glass-bg, rgba(0, 206, 209, 0.2));
  }
`;

const TypingIndicator = styled.div`
  height: 20px;
  padding: 0 16px;
  font-size: 12px;
  color: var(--text-secondary);
`;

export default ChatWindow;