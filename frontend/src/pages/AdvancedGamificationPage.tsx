/**
 * 🎮 ADVANCED GAMIFICATION PAGE - PHASE 4 ENHANCEMENT
 * =================================================
 * 
 * Main page component that showcases the revolutionary Advanced Gamification Hub
 * with seamless integration into SwanStudios ecosystem and professional UX.
 */

import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { RootState } from '../../redux/store';
import { AdvancedGamificationHub } from '../../components/AdvancedGamification';
import { useToast } from '../../context/ToastContext';

interface AdvancedGamificationPageProps {
  className?: string;
}

const AdvancedGamificationPage: React.FC<AdvancedGamificationPageProps> = ({ className }) => {
  // Redux state
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { addToast } = useToast();

  // Welcome toast for first-time visitors
  useEffect(() => {
    if (isAuthenticated && user) {
      const hasVisitedGamification = localStorage.getItem(`gamification_visited_${user.id}`);
      
      if (!hasVisitedGamification) {
        setTimeout(() => {
          addToast({
            type: 'success',
            title: '🎮 Welcome to Gamification Hub!',
            message: 'Transform your fitness journey into an epic adventure with achievements, challenges, and social competitions.',
            duration: 5000
          });
        }, 1000);
        
        localStorage.setItem(`gamification_visited_${user.id}`, 'true');
      }
    }
  }, [isAuthenticated, user, addToast]);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Gamification Hub - SwanStudios</title>
        <meta 
          name="description" 
          content="Transform your fitness journey into an epic adventure with achievements, challenges, and social competitions. Level up your workouts with SwanStudios Gamification Hub." 
        />
        <meta name="keywords" content="fitness gamification, workout achievements, fitness challenges, social fitness, fitness leaderboard" />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:title" content="Gamification Hub - SwanStudios" />
        <meta property="og:description" content="Transform your fitness journey into an epic adventure with achievements and challenges." />
        <meta property="og:type" content="website" />
        
        {/* Additional Meta Tags */}
        <meta name="theme-color" content="#00ffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </Helmet>

      <motion.div
        className={className}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          minHeight: '100vh',
          width: '100%'
        }}
      >
        <AdvancedGamificationHub 
          userId={user?.id || 'guest'} 
        />
      </motion.div>
    </>
  );
};

export default AdvancedGamificationPage;
