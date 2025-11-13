import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminVideoLibrary from './AdminVideoLibrary';

/**
 * Test wrapper for AdminVideoLibrary component
 *
 * This allows you to test the Video Library UI without needing
 * to navigate through the full admin dashboard.
 *
 * To test, add this route temporarily to main-routes.tsx:
 *
 * {
 *   path: '/admin/test-video-library',
 *   element: <VideoLibraryTest />
 * }
 *
 * Then visit: http://localhost:5173/admin/test-video-library
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const VideoLibraryTest: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{
        background: 'linear-gradient(135deg, #0a0e1a, #1e1e3f)',
        minHeight: '100vh',
        padding: '20px'
      }}>
        <AdminVideoLibrary />
      </div>
    </QueryClientProvider>
  );
};

export default VideoLibraryTest;
