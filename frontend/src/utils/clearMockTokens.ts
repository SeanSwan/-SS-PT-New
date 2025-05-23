/**
 * Clear Mock Tokens Utility
 * Detects and removes any mock tokens created by DevTools
 */

const clearMockTokens = () => {
  // Get current token from localStorage
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('user_role');
  
  if (token && token.startsWith('dev_')) {
    console.log('🧹 Detected mock token, clearing...');
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user');
    
    // Clear any other mock-related items
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('mock_') || key.startsWith('dev_')) {
        localStorage.removeItem(key);
      }
    });
    
    return true;
  }
  
  // Also check if we have a valid JWT token structure
  if (token && !token.includes('.')) {
    console.log('🧹 Detected invalid token format, clearing...');
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user');
    return true;
  }
  
  return false;
};

export default clearMockTokens;
