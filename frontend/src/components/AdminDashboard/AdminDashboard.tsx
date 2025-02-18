// src/components/AdminDashboard/AdminDashboard.tsx
import React, { useState } from "react";
import styled, { ThemeProvider } from "styled-components";
import { AnimatePresence, motion } from "framer-motion";
import Header from "../Header/header";
import Sidebar from "../ClientDashboard/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { Navigate } from "react-router-dom";

// Sample admin mock data (for demonstration)
const adminMockData = {
  clientList: [
    { id: 1, name: "John Doe", progress: 75 },
    { id: 2, name: "Jane Smith", progress: 60 },
    { id: 3, name: "Alice Johnson", progress: 85 },
  ],
  messages: [
    {
      id: 1,
      sender: "Admin",
      text: "Remember to update your progress weekly.",
    },
  ],
};

const theme = {
  colors: {
    neonBlue: "#00FFFF",
    royalPurple: "#6A0DAD",
    grey: "#808080",
    silver: "#C0C0C0",
    background: "#1A1A1A",
    lightBg: "#FFFFFF",
    text: "#333333",
  },
  fonts: {
    main: "'Roboto', sans-serif",
  },
};

// Shared layout components
const DashboardContainer = styled.div`
  display: flex;
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.main};
  min-height: 100vh;
`;

const MainContent = styled.main`
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  background-color: ${({ theme }) => theme.colors.lightBg};
`;

const SectionTitle = styled.h2`
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.neonBlue};
`;

const ClientCard = styled(motion.div)`
  background-color: #fff;
  border: 2px solid ${({ theme }) => theme.colors.royalPurple};
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
`;

const ClientName = styled.h3`
  font-size: 1.2rem;
  color: ${({ theme }) => theme.colors.royalPurple};
`;

const UpdateButton = styled(motion.button)`
  background: ${({ theme }) => theme.colors.neonBlue};
  color: ${({ theme }) => theme.colors.royalPurple};
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.3s ease;
  &:hover {
    background: ${({ theme }) => theme.colors.royalPurple};
  }
`;

const MessagingContainer = styled.div`
  margin-top: 2rem;
`;

const MessageInput = styled.textarea`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid ${({ theme }) => theme.colors.silver};
  border-radius: 5px;
  resize: vertical;
  margin-bottom: 1rem;
`;

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  // If user is not an admin, redirect to the Unauthorized page.
  if (!user || user.role !== "admin") {
    return <Navigate to="/unauthorized" />;
  }

  const [activeSection, setActiveSection] = useState("clients");
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Admin message:", newMessage);
    setNewMessage("");
  };

  return (
    <ThemeProvider theme={theme}>
      <Header />
      <DashboardContainer>
        <Sidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
        />
        <MainContent>
          <AnimatePresence mode="wait">
            {activeSection === "clients" && (
              <motion.div
                key="clients"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SectionTitle>Client Management</SectionTitle>
                {adminMockData.clientList.map((client) => (
                  <ClientCard key={client.id} whileHover={{ scale: 1.02 }}>
                    <ClientName>{client.name}</ClientName>
                    <p>{client.progress}% Progress</p>
                    <UpdateButton
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => alert(`Update ${client.name}'s data`)}
                    >
                      Update
                    </UpdateButton>
                  </ClientCard>
                ))}
              </motion.div>
            )}

            {activeSection === "messages" && (
              <motion.div
                key="messages"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SectionTitle>Admin Messaging</SectionTitle>
                <MessagingContainer>
                  {adminMockData.messages.map((msg) => (
                    <ClientCard key={msg.id} whileHover={{ scale: 1.02 }}>
                      <ClientName>{msg.sender}</ClientName>
                      <p>{msg.text}</p>
                    </ClientCard>
                  ))}
                </MessagingContainer>
                <form onSubmit={handleSendMessage}>
                  <MessageInput
                    placeholder="Type your message here..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    required
                  />
                  <UpdateButton
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Send Message
                  </UpdateButton>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </MainContent>
      </DashboardContainer>
    </ThemeProvider>
  );
};

export default AdminDashboard;
