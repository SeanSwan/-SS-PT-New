/**
 * ScreenReaderAnnouncements.tsx
 * 
 * Provides utilities for creating accessible screen reader announcements
 * Adds ARIA live regions for important status updates
 */

import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

// Styles for visually hidden elements that are still accessible to screen readers
const SROnly = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
`;

// Live region for polite announcements
const PoliteAnnouncement = styled(SROnly)`
  &:not(:empty) {
    position: absolute;
  }
`;

// Live region for assertive/urgent announcements
const AssertiveAnnouncement = styled(SROnly)`
  &:not(:empty) {
    position: absolute;
  }
`;

interface ScreenReaderAnnouncementsProps {
  id?: string;
}

// Component that creates the live regions
const ScreenReaderAnnouncements: React.FC<ScreenReaderAnnouncementsProps> = ({ id = 'sr-announcer' }) => {
  return (
    <>
      <PoliteAnnouncement 
        id={`${id}-polite`}
        aria-live="polite" 
        aria-atomic="true"
      />
      <AssertiveAnnouncement 
        id={`${id}-assertive`}
        aria-live="assertive"
        aria-atomic="true" 
      />
    </>
  );
};

// Hook for making announcements
export const useScreenReaderAnnouncement = (id = 'sr-announcer') => {
  const politeTimeoutRef = useRef<number | null>(null);
  const assertiveTimeoutRef = useRef<number | null>(null);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (politeTimeoutRef.current) {
        window.clearTimeout(politeTimeoutRef.current);
      }
      if (assertiveTimeoutRef.current) {
        window.clearTimeout(assertiveTimeoutRef.current);
      }
    };
  }, []);

  // Function to announce a message to screen readers politely (non-interrupting)
  const announce = (message: string, options = { assertive: false }) => {
    const elementId = options.assertive 
      ? `${id}-assertive` 
      : `${id}-polite`;
    
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Screen reader announcement element with id "${elementId}" not found`);
      return;
    }

    // Clear any existing announcement
    element.textContent = '';
    
    // Brief delay to ensure the clearing takes effect
    window.setTimeout(() => {
      element.textContent = message;
      
      // Clear the announcement after a delay to prevent stale announcements
      if (options.assertive) {
        if (assertiveTimeoutRef.current) {
          window.clearTimeout(assertiveTimeoutRef.current);
        }
        assertiveTimeoutRef.current = window.setTimeout(() => {
          element.textContent = '';
          assertiveTimeoutRef.current = null;
        }, 5000);
      } else {
        if (politeTimeoutRef.current) {
          window.clearTimeout(politeTimeoutRef.current);
        }
        politeTimeoutRef.current = window.setTimeout(() => {
          element.textContent = '';
          politeTimeoutRef.current = null;
        }, 3000);
      }
    }, 50);
  };

  return { announce };
};

// Utility function to add screen reader only text to any element
export const SRText: React.FC<React.PropsWithChildren> = ({ children }) => {
  return <SROnly>{children}</SROnly>;
};

export default ScreenReaderAnnouncements;
