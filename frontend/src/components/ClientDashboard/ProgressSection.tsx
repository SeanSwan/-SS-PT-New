import React, { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import SafeMainContent, { 
  Card, 
  CardContent,
  Flex,
  Button
} from "./SafeMainContent";

// Import the new ClientProgressCharts component (FIXED: Build error resolution)
import ClientProgressCharts from "../ClientProgressCharts";
import SyncStatus from "../FitnessStats/SyncStatus";

// Import custom hooks for MCP integration
import useClientDashboardMcp from "../../hooks/useClientDashboardMcp";

/**
 * ProgressSection Component
 * 
 * Displays the client's fitness and wellness progress data, including:
 * - Workout and training progress
 * - Body measurements and composition
 * - NASM protocol progress
 * - Performance metrics
 * - Achievements and gamification elements
 * 
 * This component is connected to both the workout and gamification MCP servers
 * to retrieve and synchronize comprehensive progress data and achievements across
 * the client and admin dashboards.
 * 
 * @component
 */
const ProgressSection: React.FC = () => {
  // Use the client dashboard MCP hook to access progress data
  const { progress, gamification, loading, error, refreshAll, refreshProgress } = useClientDashboardMcp();

  // On component mount, ensure we have fresh data from both MCP services
  useEffect(() => {
    // Fetch all data from both workout and gamification MCP servers
    refreshAll();
    
    // Set up periodic refresh to ensure data stays in sync with admin dashboard
    const refreshInterval = setInterval(() => {
      refreshAll();
    }, 300000); // Refresh every 5 minutes
    
    return () => clearInterval(refreshInterval);
  }, [refreshAll]);

  return (
    <SafeMainContent title="Progress Tracking">
      {/* Display sync status at the top */}
      <SyncStatus />
      
      {error ? (
        <Card>
          <CardContent>
            <Flex direction="column" align="center" style={{ padding: '2rem', textAlign: 'center' }}>
              <AlertCircle size={48} color="#FF6B6B" style={{ marginBottom: '1rem' }} />
              <h3 style={{ margin: '0 0 1rem', color: '#FFFFFF' }}>Error Loading Progress Data</h3>
              <p style={{ maxWidth: '500px', marginBottom: '1.5rem', color: '#CDCDCD' }}>
                {error}
              </p>
              <Button 
                variant="primary"
                onClick={() => refreshAll()}
                icon={<RefreshCw size={16} />}
              >
                Retry
              </Button>
            </Flex>
          </CardContent>
        </Card>
      ) : (
        /* Render the ClientProgressCharts component which handles loading state */
        <ClientProgressCharts />
      )}
    </SafeMainContent>
  );
};

export default ProgressSection;