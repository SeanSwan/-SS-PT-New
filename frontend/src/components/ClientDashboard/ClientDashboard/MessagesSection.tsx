import React, { useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

// -----------------------------
// Styled Components
// -----------------------------

// Section title styled with your primary theme color.
const SectionTitle = styled.h2`
  color: ${({ theme }) => theme.colors.neonBlue};
  font-size: 2rem;
  text-align: center;
  margin-bottom: 1.5rem;
`;

// Container for the messages (scrollable conversation view).
const MessagesWrapper = styled.div`
  max-height: 400px;
  overflow-y: auto;
  padding: 1rem;
  margin-bottom: 1.5rem;
  background-color: ${({ theme }) => theme.colors.lightBg};
  border: 1px solid ${({ theme }) => theme.colors.silver};
  border-radius: 8px;
`;

// A message bubble. Trainer messages align left; client messages align right.
const MessageBubble = styled(motion.div)<{ sender: string }>`
  background-color: ${({ theme, sender }) =>
    sender === "Trainer" ? theme.colors.royalPurple : theme.colors.neonBlue};
  color: ${({ theme }) => theme.colors.lightBg};
  padding: 1rem;
  border-radius: 15px;
  margin: 0.5rem 0;
  max-width: 80%;
  align-self: ${({ sender }) => (sender === "Trainer" ? "flex-start" : "flex-end")};
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
`;

// Header inside a message bubble (shows sender's name).
const MessageHeader = styled.div`
  font-weight: bold;
  margin-bottom: 0.5rem;
`;

// Body of the message.
const MessageText = styled.div`
  font-size: 1rem;
  line-height: 1.4;
`;

// Gamification badge (e.g., for XP earned per message).
const XPBadge = styled.span`
  background-color: ${({ theme }) => theme.colors.silver};
  color: ${({ theme }) => theme.colors.background};
  padding: 0.25rem 0.5rem;
  border-radius: 5px;
  font-size: 0.8rem;
  margin-top: 0.5rem;
  align-self: flex-start;
`;

// Message form container.
const MessageForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 600px;
  margin: 0 auto;
`;

// Textarea for message input.
const MessageInput = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.silver};
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.lightBg};
  color: ${({ theme }) => theme.colors.text};
  resize: vertical;
`;

// Button for sending the message.
const SendButton = styled(motion.button)`
  background-color: ${({ theme }) => theme.colors.neonBlue};
  color: ${({ theme }) => theme.colors.royalPurple};
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s ease;
  &:hover {
    background-color: ${({ theme }) => theme.colors.royalPurple};
    color: ${({ theme }) => theme.colors.neonBlue};
  }
`;

// -----------------------------
// MessagesSection Component
// -----------------------------
/**
 * MessagesSection Component
 *
 * Displays a list of messages in a conversation style with gamified badges and a form to send new messages.
 */
const MessagesSection: React.FC = () => {
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    // Replace with actual API call or Redux action.
    console.log("New message:", newMessage);
    setNewMessage("");
  };

  // Mock messages data. In a real implementation, these would be fetched from your API.
  const messages = [
    { id: 1, sender: "Trainer", text: "Great job on your last session!" },
    { id: 2, sender: "Trainer", text: "Remember to stay hydrated and stretch properly." },
    { id: 3, sender: "Client", text: "Thank you! I feel much better." },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <SectionTitle>Connect & Compete</SectionTitle>
      <MessagesWrapper>
        {messages.map((msg) => (
          <MessageBubble key={msg.id} sender={msg.sender} whileHover={{ scale: 1.02 }}>
            <MessageHeader>{msg.sender}</MessageHeader>
            <MessageText>{msg.text}</MessageText>
            {/* Example XP badge for gamification */}
            <XPBadge>+10 XP</XPBadge>
          </MessageBubble>
        ))}
      </MessagesWrapper>
      <MessageForm onSubmit={handleSendMessage}>
        <MessageInput
          placeholder="Type your message here..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          required
        />
        <SendButton type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          Send Message
        </SendButton>
      </MessageForm>
    </motion.div>
  );
};

export default MessagesSection;
