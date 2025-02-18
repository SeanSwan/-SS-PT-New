// src/App.tsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Helmet, HelmetProvider } from "react-helmet-async";
import "./App.scss";

// Context Providers
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";

// Components
import Header from "./components/Header/header";
import Footer from "./components/Footer/Footer";
import ErrorBoundary from "./components/ErrorBoundary/error-boundry.component";

// Pages (non‑modal routes)
import HomePage from "./pages/HomePage.component";
import About from "./pages/about/About";
import ContactPage from "./pages/contactpage/ContactPage";
import UnauthorizedPage from "./pages/UnauthorizedPage.component";
import Dashboard from "./pages/DashboardPage.component";
import SchedulePage from "./pages/SchedulePage.component";

// Feature Components
import ObjectDetection from "./components/ObjectDetection/ObjectDetection.component";
import ClientDashboard from "./components/ClientDashboard/ClientDashboard";
import AdminDashboard from "./components/AdminDashboard/AdminDashboard";
import ForgotPasswordModal from "./components/AdminDashboard/AdminDashboard";

// Modal Components (full‑screen login and signup)
import LoginModal from "./pages/LoginModal.component";
import SignupModal from "./pages/SignupModal.component";

// StoreFront Component
import StoreFront from "./pages/store/StoreFront.component";

// --------------------------------------------------------
// AppRoutes: Uses the background location technique for modal routes.
const AppRoutes = () => {
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
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/client-dashboard" element={<ClientDashboard />} />
        <Route path="/forgot-password" element={<ForgotPasswordModal />} />

        {/* Admin Dashboard Route */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        {/* Catch-all */}
        <Route path="*" element={<UnauthorizedPage />} />
      </Routes>

      {/* Modal Routes – rendered on top of the background */}
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
