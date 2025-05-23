/**
 * Global TypeScript declarations for the application
 */

// Extend the Window interface with our custom properties
interface Window {
  // React Router context flags
  __ROUTER_CONTEXT_AVAILABLE__?: boolean;
  __WARNED_ABOUT_ROUTER__?: boolean;
  
  // WebSocket mock flags
  REACT_APP_MOCK_WEBSOCKET?: string;
  REACT_APP_FORCE_MOCK_WEBSOCKET?: string;
  
  // API mock flags
  REACT_APP_FORCE_MOCK_API?: string; 
  REACT_APP_SKIP_API_RETRIES?: string;
  
  // File system utilities for artifacts
  fs?: {
    readFile: (path: string, options?: { encoding?: string }) => Promise<any>;
  }
}

// Declare global vite env variables
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
