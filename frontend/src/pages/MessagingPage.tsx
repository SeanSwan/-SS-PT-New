import React, { useState } from 'react';
import styled from 'styled-components';
import ConversationList from '../components/Messaging/ConversationList';
import ChatWindow from '../components/Messaging/ChatWindow';
import { motion, AnimatePresence } from 'framer-motion';

const MessagingPage: React.FC = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <PageContainer>
      <MessagingLayout>
        <ConversationPanel
          as={motion.aside}
          initial={{ x: -350, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <ConversationList
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
          />
        </ConversationPanel>
        <ChatPanel as={motion.main} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <AnimatePresence mode="wait">
            {selectedConversationId ? (
              <motion.div
                key={selectedConversationId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <ChatWindow conversationId={selectedConversationId} />
              </motion.div>
            ) : (
              <NoConversationSelected
                key="no-selection"
                as={motion.div}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <h2>Select a conversation to start chatting</h2>
                <p>Your recent conversations will appear here.</p>
              </NoConversationSelected>
            )}
          </AnimatePresence>
        </ChatPanel>
      </MessagingLayout>
    </PageContainer>
  );
};

const PageContainer = styled.div`
  height: calc(100vh - 80px); /* Adjust based on header height */
  padding: 0;
  background: var(--dark-bg, #0a0e1a);
  overflow: hidden; /* Prevent scrollbars from layout shifts */
`;

const MessagingLayout = styled.div`
  display: grid;
  grid-template-columns: 350px 1fr;
  height: 100%;
  border-top: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
`;

const ConversationPanel = styled.aside`
  border-right: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const ChatPanel = styled.main`
  display: flex;
  flex-direction: column;
  position: relative; /* For AnimatePresence */
`;

const NoConversationSelected = styled.div`
  display: flex;
  flex-direction: column; /* Stack text vertically */
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary, #B8B8B8);
  text-align: center;
  h2 {
    margin-bottom: 8px;
  }
  p {
    color: var(--text-secondary, #B8B8B8);
    opacity: 0.7;
  }
`;

export default MessagingPage;