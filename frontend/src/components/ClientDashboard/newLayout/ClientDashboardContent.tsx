import React from 'react';
import { Box } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';

// Direct imports for all sections
// First try from outer folder, then from inner folder if needed
import OverviewSection from '../OverviewSection';
import ProgressSection from '../ProgressSection';

// Import section components from the sections folder
import MyWorkoutsSection from '../sections/MyWorkoutsSection';
import GamificationSection from '../sections/GamificationSection';
import CreativeHubSection from '../sections/CreativeHubSection';
import CommunitySection from '../sections/CommunitySection';
import ProfileSection from '../sections/ProfileSection';
import SettingsSection from '../sections/SettingsSection';

// DummyTester component removed - using simple fallback instead

// Import specialized components from newLayout
import EnhancedMessagingSection from './EnhancedMessagingSection';
import SocialProfileSection from './SocialProfileSection';

// Import schedule components
import ScheduleContainer from '../../Schedule';
import ClientScheduleTab from '../../DashBoard/Pages/client-dashboard/schedule';

// Add an error boundary component to catch render errors
const ErrorFallback = ({ componentName, error }: { componentName: string, error?: Error }) => (
  <Box sx={{ p: 3, border: '1px dashed #ff4569', borderRadius: 2, bgcolor: 'rgba(255,69,105,0.05)' }}>
    <h3>Error loading {componentName}</h3>
    <p>There was a problem loading this component. Please try refreshing the page.</p>
    {error && (
      <details>
        <summary>Error details (for developers)</summary>
        <pre>{error.message}</pre>
      </details>
    )}
  </Box>
);

// Utility function to safely render a component with error handling
const SafeRender = ({ component, fallback }: { component: React.ReactNode, fallback: string }) => {
  try {
    return <>{component}</>;
  } catch (error) {
    console.error(`Error rendering ${fallback}:`, error);
    return <ErrorFallback componentName={fallback} error={error as Error} />;
  }
};
const variants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2
    }
  }
};

interface ClientDashboardContentProps {
  activeSection: string;
}

/**
 * ClientDashboardContent Component
 * 
 * Renders the appropriate content based on the active section.
 * Uses AnimatePresence for smooth transitions between sections.
 */
const ClientDashboardContent: React.FC<ClientDashboardContentProps> = ({ activeSection }) => {
  const renderContent = () => {
    try {
      // Attempt to render the appropriate section with error handling
      switch (activeSection) {
        case 'overview':
          return (
            <SafeRender 
              component={
                <OverviewSection 
                  currentLevel={5}
                  currentPoints={450}
                  nextLevelPoints={1000}
                  badges={[]}
                  trophies={[]} 
                />
              }
              fallback="Overview Section"
            />
          );
        case 'schedule':
          return (
            <SafeRender 
              component={<ScheduleContainer />} 
              fallback="Schedule Section" 
            />
          );
        case 'workouts':
          return <SafeRender component={<MyWorkoutsSection />} fallback="My Workouts Section" />;
        case 'progress':
          return <SafeRender component={<ProgressSection data={{}} />} fallback="Progress Section" />;
        case 'gamification':
          return <SafeRender component={<GamificationSection />} fallback="Gamification Section" />;
        case 'creative':
          return <SafeRender component={<CreativeHubSection />} fallback="Creative Hub Section" />;
        case 'community':
          return <SafeRender component={<CommunitySection />} fallback="Community Section" />;
        case 'messages':
          return <SafeRender component={<EnhancedMessagingSection />} fallback="Messages Section" />;
        case 'profile':
          return <SafeRender component={<SocialProfileSection />} fallback="Profile Section" />;
        case 'settings':
          return <SafeRender component={<SettingsSection />} fallback="Settings Section" />;
        default:
          return <div>Select a section from the sidebar</div>;
      }
    } catch (error) {
      console.error('Global error in renderContent:', error);
      // If everything fails, show a simple fallback
      return (
        <>
          <ErrorFallback componentName="Section Content" error={error as Error} />
          <Box sx={{ mt: 4, p: 3, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 2 }}>
            <h3>🚧 Dashboard Section Under Development</h3>
            <p>This section is currently being built. Please try another section or refresh the page.</p>
          </Box>
        </>
      );
    }
  };


  return (
    <Box sx={{ width: '100%', height: 'calc(100vh - 120px)' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ height: '100%' }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </Box>
  );
};

export default ClientDashboardContent;