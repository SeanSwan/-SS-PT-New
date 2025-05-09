import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Box, Typography, Avatar, TextField, Tab, Tabs, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import AdminIcon from '@mui/icons-material/AdminPanelSettings';
import TrainerIcon from '@mui/icons-material/FitnessCenter';
import SendIcon from '@mui/icons-material/Send';

// Import GlowButton to replace regular button
import GlowButton from '../../ui/GlowButton';

// Define interfaces for type safety
interface Message {
  id: number;
  sender: {
    id: string;
    name: string;
    type: 'client' | 'trainer' | 'admin';
    avatar?: string;
  };
  recipient: {
    id: string;
    type: 'client' | 'trainer' | 'admin';
  };
  text: string;
  timestamp: Date;
  read: boolean;
}

// Styling for the messaging interface
const MessagingContainer = styled(Paper)`
  padding: 1.5rem;
  border-radius: 12px;
  background-color: rgba(20, 20, 40, 0.7);
  height: calc(100vh - 180px);
  display: flex;
  flex-direction: column;
`;

const TabPanel = styled(Box)`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const MessagesWrapper = styled(Box)`
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0.5rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const MessageBubble = styled(motion.div)<{ $isOwnMessage: boolean }>`
  display: flex;
  flex-direction: column;
  max-width: 70%;
  padding: 1rem;
  border-radius: 12px;
  background-color: ${({ $isOwnMessage }) => 
    $isOwnMessage ? 'rgba(0, 255, 255, 0.2)' : 'rgba(120, 81, 169, 0.2)'};
  align-self: ${({ $isOwnMessage }) => 
    $isOwnMessage ? 'flex-end' : 'flex-start'};
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  
  &:after {
    content: '';
    position: absolute;
    bottom: -8px;
    ${({ $isOwnMessage }) => 
      $isOwnMessage ? 'right: 15px;' : 'left: 15px;'}
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid ${({ $isOwnMessage }) => 
      $isOwnMessage ? 'rgba(0, 255, 255, 0.2)' : 'rgba(120, 81, 169, 0.2)'};
  }
`;

const MessageHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 0.5rem;
`;

const MessageTime = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  margin-left: auto;
`;

const MessageText = styled.div`
  font-size: 1rem;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.9);
  word-break: break-word;
`;

const InputContainer = styled.form`
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-top: 1rem;
`;

const RecipientInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.5rem 1rem;
  background-color: rgba(30, 30, 60, 0.5);
  border-radius: 8px;
`;

/**
 * EnhancedMessagingSection Component
 * 
 * A messaging interface that allows clients to communicate with both
 * trainers and admin staff individually. Features separate tabs for
 * different conversation types.
 */
const EnhancedMessagingSection: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [newMessage, setNewMessage] = useState('');
  const [adminMessages, setAdminMessages] = useState<Message[]>([]);
  const [trainerMessages, setTrainerMessages] = useState<Message[]>([]);
  
  // Mock client ID - in a real app, this would come from auth
  const clientId = 'client123';
  const clientName = 'Sarah Johnson';
  
  // Mock users/contacts
  const admin = {
    id: 'admin456',
    name: 'Admin Support',
    type: 'admin' as const,
    avatar: undefined
  };
  
  const trainer = {
    id: 'trainer789',
    name: 'Jason Miller',
    type: 'trainer' as const,
    avatar: undefined
  };
  
  // Mock initial messages (in a real app, these would be fetched from API)
  useEffect(() => {
    // Simulate loading message history
    setAdminMessages([
      {
        id: 1,
        sender: admin,
        recipient: { id: clientId, type: 'client' },
        text: 'Welcome to Swan Studios! How can I help you today?',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        read: true
      },
      {
        id: 2,
        sender: { id: clientId, name: clientName, type: 'client' },
        recipient: { id: admin.id, type: 'admin' },
        text: 'I have a question about my subscription.',
        timestamp: new Date(Date.now() - 82800000), // 23 hours ago
        read: true
      },
      {
        id: 3,
        sender: admin,
        recipient: { id: clientId, type: 'client' },
        text: 'Of course! What would you like to know about your subscription?',
        timestamp: new Date(Date.now() - 79200000), // 22 hours ago
        read: true
      }
    ]);
    
    setTrainerMessages([
      {
        id: 101,
        sender: trainer,
        recipient: { id: clientId, type: 'client' },
        text: 'Great job on yesterday\'s workout! How are you feeling today?',
        timestamp: new Date(Date.now() - 43200000), // 12 hours ago
        read: true
      },
      {
        id: 102,
        sender: { id: clientId, name: clientName, type: 'client' },
        recipient: { id: trainer.id, type: 'trainer' },
        text: 'Thanks! I\'m feeling good but a little sore in my shoulders.',
        timestamp: new Date(Date.now() - 39600000), // 11 hours ago
        read: true
      },
      {
        id: 103,
        sender: trainer,
        recipient: { id: clientId, type: 'client' },
        text: 'That\'s normal after the exercises we did. Make sure to stretch and I\'ll adjust our next session to focus more on recovery.',
        timestamp: new Date(Date.now() - 36000000), // 10 hours ago
        read: true
      }
    ]);
  }, []);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };
  
  // Send message handler
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    const currentTime = new Date();
    const newMessageObj: Message = {
      id: Math.floor(Math.random() * 10000), // Generate random ID for demo
      sender: { id: clientId, name: clientName, type: 'client' },
      recipient: currentTab === 0 
        ? { id: admin.id, type: 'admin' }
        : { id: trainer.id, type: 'trainer' },
      text: newMessage,
      timestamp: currentTime,
      read: false
    };
    
    // Add message to the appropriate conversation
    if (currentTab === 0) {
      setAdminMessages(prev => [...prev, newMessageObj]);
      
      // Simulate admin response after a delay (in a real app, this would be from the server)
      setTimeout(() => {
        const adminResponse: Message = {
          id: Math.floor(Math.random() * 10000),
          sender: admin,
          recipient: { id: clientId, type: 'client' },
          text: 'Thanks for your message! An admin will respond shortly.',
          timestamp: new Date(),
          read: false
        };
        setAdminMessages(prev => [...prev, adminResponse]);
      }, 1000);
    } else {
      setTrainerMessages(prev => [...prev, newMessageObj]);
      
      // Simulate trainer response after a delay
      setTimeout(() => {
        const trainerResponse: Message = {
          id: Math.floor(Math.random() * 10000),
          sender: trainer,
          recipient: { id: clientId, type: 'client' },
          text: 'I\'ve received your message and will get back to you soon!',
          timestamp: new Date(),
          read: false
        };
        setTrainerMessages(prev => [...prev, trainerResponse]);
      }, 1000);
    }
    
    // Clear input
    setNewMessage('');
  };
  
  // Format timestamp for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <MessagingContainer elevation={3}>
      <Tabs 
        value={currentTab} 
        onChange={handleTabChange}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        centered
      >
        <Tab 
          label="Admin Support" 
          icon={<AdminIcon />} 
          iconPosition="start"
          sx={{ color: 'white' }}
        />
        <Tab 
          label="My Trainer" 
          icon={<TrainerIcon />} 
          iconPosition="start"
          sx={{ color: 'white' }}
        />
      </Tabs>
      
      {currentTab === 0 && (
        <TabPanel>
          <RecipientInfo>
            <Avatar sx={{ bgcolor: 'secondary.main' }}>
              <AdminIcon />
            </Avatar>
            <Typography variant="subtitle1">{admin.name}</Typography>
          </RecipientInfo>
          
          <MessagesWrapper>
            {adminMessages.map((message) => (
              <MessageBubble 
                key={message.id}
                $isOwnMessage={message.sender.id === clientId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <MessageHeader>
                  <Typography variant="subtitle2" component="span">
                    {message.sender.name}
                  </Typography>
                  <MessageTime>{formatTime(message.timestamp)}</MessageTime>
                </MessageHeader>
                <MessageText>{message.text}</MessageText>
              </MessageBubble>
            ))}
          </MessagesWrapper>
          
          <InputContainer onSubmit={handleSendMessage}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type your message to admin..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              InputProps={{
                sx: { 
                  borderRadius: '8px',
                  backgroundColor: 'rgba(30, 30, 60, 0.3)',
                  color: 'white'
                }
              }}
            />
            <GlowButton 
              type="submit"
              variant="primary"
              disabled={!newMessage.trim()}
              aria-label="Send message"
            >
              <SendIcon />
            </GlowButton>
          </InputContainer>
        </TabPanel>
      )}
      
      {currentTab === 1 && (
        <TabPanel>
          <RecipientInfo>
            <Avatar sx={{ bgcolor: 'secondary.main' }}>
              <TrainerIcon />
            </Avatar>
            <Typography variant="subtitle1">{trainer.name}</Typography>
          </RecipientInfo>
          
          <MessagesWrapper>
            {trainerMessages.map((message) => (
              <MessageBubble 
                key={message.id}
                $isOwnMessage={message.sender.id === clientId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <MessageHeader>
                  <Typography variant="subtitle2" component="span">
                    {message.sender.name}
                  </Typography>
                  <MessageTime>{formatTime(message.timestamp)}</MessageTime>
                </MessageHeader>
                <MessageText>{message.text}</MessageText>
              </MessageBubble>
            ))}
          </MessagesWrapper>
          
          <InputContainer onSubmit={handleSendMessage}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type your message to trainer..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              InputProps={{
                sx: { 
                  borderRadius: '8px',
                  backgroundColor: 'rgba(30, 30, 60, 0.3)',
                  color: 'white'
                }
              }}
            />
            <GlowButton 
              type="submit"
              variant="primary"
              disabled={!newMessage.trim()}
              aria-label="Send message"
            >
              <SendIcon />
            </GlowButton>
          </InputContainer>
        </TabPanel>
      )}
    </MessagingContainer>
  );
};

export default EnhancedMessagingSection;