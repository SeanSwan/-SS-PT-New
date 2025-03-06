/**
 * App.tsx
 * Main entry point for the React application.
 * Wraps the application in Redux, Auth, Toast, Theme, Helmet, Router, and Error boundaries.
 */

import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { Helmet, HelmetProvider } from "react-helmet-async";

// Redux Provider
import { Provider } from "react-redux";
import { store } from "./store";

// MUI
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";

// Global Style & Theme (using your chosen theme)
import GlobalStyle from "./styles/GlobalStyle";
import berryDarkTheme from "./BerryAdmin/themes/berryDarkTheme";

// Context Providers
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";

// Components
import ErrorBoundary from "./components/ErrorBoundary/error-boundry.component";
import Header from "./components/Header/header";
import Footer from "./components/Footer/Footer";
import Schedule from "./components/Schedule/schedule";

// Pages (non-modal routes)
import HomePage from "./pages/HomePage.component";
import About from "./pages/about/About";
import ContactPage from "./pages/contactpage/ContactPage";
import UnauthorizedPage from "./pages/UnauthorizedPage.component";
import ClientDashboard from "./components/ClientDashboard/ClientDashboard";
import StoreFront from "./pages/shop/StoreFront.component";

// Modal Components
import LoginModal from "./pages/LoginModal.component";
import SignupModal from "./pages/SignupModal.component";

// Berry Admin (the new dashboard)
import Berry from "./BerryAdmin/berryIndex"; // Import Berry index instead of BerryApp directly

// Protected route component for admin routes
const AdminRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  // While authentication is being verified, show a loading indicator
  if (isLoading) return <div>Loading...</div>;

  // If user is not found or does not have admin privileges, redirect
  if (!user || user.role !== "admin") {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
};

// Component that defines our routes
const AppRoutes: React.FC = () => {
  const location = useLocation();
  const state = location.state as { backgroundLocation?: Location };

  return (
    <>
      <Routes location={state?.backgroundLocation || location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<About />} />
        <Route path="/store" element={<StoreFront />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/client-dashboard" element={<ClientDashboard />} />

        {/* Protected Admin Dashboard route - Use the admin-dashboard/* pattern */}
        <Route
          path="/admin-dashboard/*"
          element={
            <AdminRoute>
              <Berry />
            </AdminRoute>
          }
        />

        <Route path="/schedule" element={<Schedule />} />
        {/* Catch-all route */}
        <Route path="*" element={<UnauthorizedPage />} />
      </Routes>

      {/* Modal Routes rendered on top of the background */}
      {state?.backgroundLocation && (
        <Routes>
          <Route path="/login" element={<LoginModal />} />
          <Route path="/signup" element={<SignupModal />} />
        </Routes>
      )}
    </>
  );
};

function App() {
  return (
    <Provider store={store}>
      <HelmetProvider>
        <AuthProvider>
          <ToastProvider>
            <ThemeProvider theme={berryDarkTheme}>
              <CssBaseline />
              <GlobalStyle />
              <Router>
                <ErrorBoundary>
                  <div className="App">
                    {/* Header will be conditionally rendered inside each route */}
                    <Header />
                    <main>
                      <Helmet>
                        <title>SwanStudios | AI-Enhanced Functional Training</title>
                        <meta
                          name="description"
                          content="SwanStudios combines functional training with AI to enhance results. Join our community hub for workouts, health events, and client monitoring."
                        />
                      </Helmet>
                      <AppRoutes />
                    </main>
                    <Footer />
                  </div>
                </ErrorBoundary>
              </Router>
            </ThemeProvider>
          </ToastProvider>
        </AuthProvider>
      </HelmetProvider>
    </Provider>
  );
}

export default App;