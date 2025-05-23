/**
 * Custom Window Properties - TypeScript Declaration
 * 
 * This file adds custom properties to the Window interface
 * to support our application's global state flags and references.
 */

interface Window {
  /**
   * Flag indicating that the Redux store has been initialized
   */
  __REDUX_ALREADY_INITIALIZED__?: boolean;
  
  /**
   * Flag indicating that router context is available
   */
  __ROUTER_CONTEXT_AVAILABLE__?: boolean;
  
  /**
   * Flag for mock WebSocket mode
   */
  REACT_APP_FORCE_MOCK_WEBSOCKET?: string;
  
  /**
   * Flag for mock WebSocket mode
   */
  REACT_APP_MOCK_WEBSOCKET?: string;
}
