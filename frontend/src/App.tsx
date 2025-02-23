/**
 * App.tsx
 * Main entry point for the React application.
 * Wraps the application in various context providers, error boundaries, and routing.
 */

import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Helmet, HelmetProvider } from "react-helmet-async";
import "./App.scss";

// Context Providers for authentication and toast notifications
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";

// Components
import Header from "./components/Header/header";
import Footer from "./components/Footer/Footer";
import ErrorBoundary from "./components/ErrorBoundary/error-boundry.component";

// Page Components (non‑modal routes)
import HomePage from "./pages/HomePage.component";
import About from "./pages/about/About";
import ContactPage from "./pages/contactpage/ContactPage";
import UnauthorizedPage from "./pages/UnauthorizedPage.component";

// Feature Components
import ObjectDetection from "./components/ObjectDetection/ObjectDetection.component";
import ClientDashboard from "./components/ClientDashboard/ClientDashboard";
import AdminDashboard from "./components/AdminDashboard/AdminDashboard";
import ForgotPasswordModal from "./components/AdminDashboard/AdminDashboard"; // Consider refactoring if duplicate

// Modal Components (full‑screen login and signup)
import LoginModal from "./pages/LoginModal.component";
import SignupModal from "./pages/SignupModal.component";

// StoreFront Component
import StoreFront from "./pages/store/StoreFront.component";

/**
 * AppRoutes Component
 * Implements the background location technique for modal routes.
 */
const AppRoutes: React.FC = () => {
  const location = useLocation();
  const state = location.state as { backgroundLocation?: Location };

  return (
    <>
      {/* Main Routes */}
      <Routes location={state?.backgroundLocation || location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<About />} />
        <Route path="/store" element={<StoreFront />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/object-detection" element={<ObjectDetection />} />
        <Route path="/client-dashboard" element={<ClientDashboard />} />
        <Route path="/forgot-password" element={<ForgotPasswordModal />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
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

/**
 * Main App Component
 */
function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <ErrorBoundary>
              <div className="App">
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
        </ToastProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
