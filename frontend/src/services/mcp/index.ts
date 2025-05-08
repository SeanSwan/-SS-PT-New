/**
 * MCP Services Index
 * 
 * Exports all MCP related services for easy import in components.
 */

export { default as workoutMcpApi } from './workoutMcpService';
export { default as gamificationMcpApi } from './gamificationMcpService';

// Helper for checking MCP servers connectivity
export const checkMcpServersStatus = async () => {
  const results = {
    workout: false,
    gamification: false
  };
  
  try {
    const workoutResult = await import('./workoutMcpService').then(module => 
      module.default.checkServerStatus()
        .then(() => true)
        .catch(() => false)
    );
    results.workout = workoutResult;
  } catch (error) {
    console.error('Error checking workout MCP server', error);
  }
  
  try {
    const gamificationResult = await import('./gamificationMcpService').then(module => 
      module.default.checkServerStatus()
        .then(() => true)
        .catch(() => false)
    );
    results.gamification = gamificationResult;
  } catch (error) {
    console.error('Error checking gamification MCP server', error);
  }
  
  return results;
};