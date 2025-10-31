/**
 * Enhanced Notification Section Wrapper
 * 
 * This is a wrapper component that provides default state for the
 * EnhancedNotificationSection component when the notifications state
 * is not properly initialized in Redux.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import EnhancedNotificationSection from './EnhancedNotificationSection';

// A simplified version of the notification section with default empty state
// This prevents errors when the Redux store is not properly initialized
const FallbackNotificationSection = () => {
  return (
    <div style={{ position: 'relative' }}>
      <button
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          padding: '8px'
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
        </svg>
      </button>
    </div>
  );
};

// This wrapper component checks if notifications state exists
// and provides defaults when needed
const EnhancedNotificationSectionWrapper = () => {
  // Try to get the notifications state from Redux
  const notificationsState = useSelector((state: any) => state.notifications);

  // Guard against undefined component imports (React error #306)
  const isValidComponent = typeof EnhancedNotificationSection === 'function';

  // If the notifications state is undefined, component is invalid, or temporarily disabled
  if (!notificationsState || !isValidComponent) {
    const reason = !notificationsState ? 'Redux state not found' :
                   !isValidComponent ? 'Component import failed' : 'Unknown';
    console.warn(`Notifications disabled: ${reason}, using fallback`);

    // Return a version with default props to prevent errors
    return <FallbackNotificationSection />;
  }

  // TEMPORARILY DISABLED: Persistent React error #306 despite all fixes
  // TODO: Re-enable after complete MUI elimination and production testing
  console.warn('Notifications temporarily disabled due to persistent React error #306');
  return <FallbackNotificationSection />;
};

export default EnhancedNotificationSectionWrapper;
