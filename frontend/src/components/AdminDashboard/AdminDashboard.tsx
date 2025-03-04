// /**
//  * AdminDashboard.tsx
//  * Provides an admin interface for managing clients, messages, schedules, and session prices.
//  * Uses a unified calendar component (react-big-calendar based) for scheduling.
//  */

// import React, { useState, useEffect } from "react";
// import styled, { ThemeProvider } from "styled-components";
// import { AnimatePresence, motion } from "framer-motion";
// import Header from "../Header/header";
// import { useAuth } from "../../context/AuthContext";
// import { Navigate } from "react-router-dom";
// import "react-big-calendar/lib/css/react-big-calendar.css";
// import CalendarComponent from "../CalendarComponent/CalendarComponent";
// import axios from "axios";

// // Adjust this to your actual admin routes base
// const ADMIN_BASE_URL = import.meta.env.VITE_ADMIN_API_URL || "http://localhost:5000/api/admin";

// const theme = {
//   colors: {
//     neonBlue: "#00FFFF",
//     royalPurple: "#6A0DAD",
//     grey: "#808080",
//     silver: "#C0C0C0",
//     background: "#1A1A1A",                             
//     lightBg: "#FFFFFF",
//     text: "#333333",
//   },
//   fonts: {
//     main: "'Roboto', sans-serif",
//   },
// };

// const DashboardContainer = styled.div`
//   display: flex;
//   background-color: ${({ theme }) => theme.colors.background};
//   color: ${({ theme }) => theme.colors.text};
//   font-family: ${({ theme }) => theme.fonts.main};
//   min-height: 100vh;
// `;

// const MainContent = styled.main`
//   flex: 1;
//   padding: 2rem;
//   overflow-y: auto;
//   background-color: ${({ theme }) => theme.colors.lightBg};
// `;

// const SidebarContainer = styled.nav`
//   width: 250px;
//   background-color: ${({ theme }) => theme.colors.royalPurple};
//   padding: 2rem 1rem;
//   display: flex;
//   flex-direction: column;
//   gap: 1rem;

//   @media (max-width: 768px) {
//     width: 100%;
//     position: fixed;
//     bottom: 0;
//     left: 0;
//     flex-direction: row;
//     justify-content: space-around;
//     padding: 0.5rem;
//   }
// `;

// const SidebarButton = styled(motion.button)<{ isActive: boolean }>`
//   background-color: ${({ isActive, theme }) =>
//     isActive ? theme.colors.neonBlue : "transparent"};
//   color: ${({ isActive, theme }) =>
//     isActive ? theme.colors.royalPurple : theme.colors.lightBg};
//   border: none;
//   padding: 0.75rem 1rem;
//   border-radius: 8px;
//   cursor: pointer;
//   transition: background 0.3s, color 0.3s;

//   &:hover {
//     background-color: ${({ theme }) => theme.colors.neonBlue};
//     color: ${({ theme }) => theme.colors.royalPurple};
//   }
// `;

// const SectionTitle = styled.h2`
//   text-align: center;
//   margin-bottom: 1.5rem;
//   font-size: 2rem;
//   color: ${({ theme }) => theme.colors.neonBlue};
// `;

// const PrimaryButton = styled.button`
//   margin-top: 1rem;
//   padding: 0.75rem 1.5rem;
//   background: ${({ theme }) => theme.colors.neonBlue};
//   border: none;
//   border-radius: 5px;
//   cursor: pointer;
//   color: ${({ theme }) => theme.colors.royalPurple};
//   transition: background 0.3s, color 0.3s;

//   &:hover {
//     opacity: 0.9;
//   }
// `;

// const AdminDashboard: React.FC = () => {
//   const { user } = useAuth();
//   const [activeSection, setActiveSection] = useState("clients");
//   const [clientList, setClientList] = useState([]);
//   const [messages, setMessages] = useState([]);
//   const [prices, setPrices] = useState({
//     gold: 175,
//     platinum: 165,
//     rhodium: 150,
//   });

//   // Only allow access for admin users
//   if (!user || user.role !== "admin") {
//     return <Navigate to="/unauthorized" />;
//   }

//   // Fetch admin data on mount
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     const headers = { Authorization: `Bearer ${token}` };

//     // Fetch clients
//     axios
//       .get(`${ADMIN_BASE_URL}/clients`, { headers })
//       .then((res) => setClientList(res.data))
//       .catch((err) => console.error("Error fetching clients:", err));

//     // Fetch messages
//     axios
//       .get(`${ADMIN_BASE_URL}/messages`, { headers })
//       .then((res) => setMessages(res.data))
//       .catch((err) => console.error("Error fetching messages:", err));

//     // In real scenario, you might fetch prices from the DB
//   }, []);

//   // Example function to update prices
//   const handleUpdatePrices = async () => {
//     const token = localStorage.getItem("token");
//     const headers = { Authorization: `Bearer ${token}` };
//     try {
//       const res = await axios.put(
//         `${ADMIN_BASE_URL}/update-prices`,
//         prices,
//         { headers }
//       );
//       alert(res.data.message);
//     } catch (err) {
//       console.error("Error updating prices:", err);
//     }
//   };

//   return (
//     <ThemeProvider theme={theme}>
//       <Header />
//       <DashboardContainer>
//         <SidebarContainer>
//           <SidebarButton
//             isActive={activeSection === "clients"}
//             onClick={() => setActiveSection("clients")}
//             whileTap={{ scale: 0.95 }}
//           >
//             Clients
//           </SidebarButton>
//           <SidebarButton
//             isActive={activeSection === "messages"}
//             onClick={() => setActiveSection("messages")}
//             whileTap={{ scale: 0.95 }}
//           >
//             Messages
//           </SidebarButton>
//           <SidebarButton
//             isActive={activeSection === "schedule"}
//             onClick={() => setActiveSection("schedule")}
//             whileTap={{ scale: 0.95 }}
//           >
//             Schedule
//           </SidebarButton>
//           <SidebarButton
//             isActive={activeSection === "prices"}
//             onClick={() => setActiveSection("prices")}
//             whileTap={{ scale: 0.95 }}
//           >
//             Prices
//           </SidebarButton>
//         </SidebarContainer>

//         <MainContent>
//           <AnimatePresence mode="wait">
//             {activeSection === "clients" && (
//               <motion.div
//                 key="clients"
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0, y: -20 }}
//                 transition={{ duration: 0.3 }}
//               >
//                 <SectionTitle>Client Management</SectionTitle>
//                 {clientList.map((client: any) => (
//                   <motion.div
//                     key={client.id}
//                     style={{
//                       backgroundColor: "#fff",
//                       border: `2px solid ${theme.colors.royalPurple}`,
//                       borderRadius: "10px",
//                       padding: "1rem",
//                       marginBottom: "1rem",
//                       display: "flex",
//                       justifyContent: "space-between",
//                       alignItems: "center",
//                       boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
//                     }}
//                     whileHover={{ scale: 1.02 }}
//                   >
//                     <div>
//                       <h3
//                         style={{
//                           fontSize: "1.2rem",
//                           color: theme.colors.royalPurple,
//                         }}
//                       >
//                         {client.name}
//                       </h3>
//                       <p>{client.progress}% Progress</p>
//                     </div>
//                     <PrimaryButton
//                       onClick={() => alert(`Update ${client.name}'s data`)}
//                     >
//                       Update
//                     </PrimaryButton>
//                   </motion.div>
//                 ))}
//               </motion.div>
//             )}

//             {activeSection === "messages" && (
//               <motion.div
//                 key="messages"
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0, y: -20 }}
//                 transition={{ duration: 0.3 }}
//               >
//                 <SectionTitle>Admin Messaging</SectionTitle>
//                 {messages.map((msg: any) => (
//                   <motion.div
//                     key={msg.id}
//                     style={{
//                       backgroundColor: "#fff",
//                       border: `2px solid ${theme.colors.royalPurple}`,
//                       borderRadius: "10px",
//                       padding: "1rem",
//                       marginBottom: "1rem",
//                       boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
//                     }}
//                     whileHover={{ scale: 1.02 }}
//                   >
//                     <h3
//                       style={{
//                         fontSize: "1.2rem",
//                         color: theme.colors.royalPurple,
//                       }}
//                     >
//                       {msg.sender}
//                     </h3>
//                     <p>{msg.text}</p>
//                   </motion.div>
//                 ))}
//               </motion.div>
//             )}

//             {activeSection === "schedule" && (
//               <motion.div
//                 key="schedule"
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0, y: -20 }}
//                 transition={{ duration: 0.3 }}
//               >
//                 <SectionTitle>Schedule Availability</SectionTitle>
//                 <CalendarComponent />
//               </motion.div>
//             )}

//             {activeSection === "prices" && (
//               <motion.div
//                 key="prices"
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0, y: -20 }}
//                 transition={{ duration: 0.3 }}
//               >
//                 <SectionTitle>Session Price Management</SectionTitle>
//                 <div
//                   style={{
//                     backgroundColor: "#fff",
//                     padding: "1rem",
//                     borderRadius: "10px",
//                     boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
//                   }}
//                 >
//                   <p>
//                     <strong>Gold Package:</strong> ${prices.gold}
//                   </p>
//                   <p>
//                     <strong>Platinum Package:</strong> ${prices.platinum}
//                   </p>
//                   <p>
//                     <strong>Rhodium Package:</strong> ${prices.rhodium}
//                   </p>
//                   <PrimaryButton onClick={handleUpdatePrices}>
//                     Update Prices
//                   </PrimaryButton>
//                 </div>
//               </motion.div>
//             )}
//           </AnimatePresence>
//         </MainContent>
//       </DashboardContainer>
//     </ThemeProvider>
//   );
// };

// export default AdminDashboard;
