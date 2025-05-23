// backend/services/mockCheckoutService.mjs
import logger from '../utils/logger.mjs';

/**
 * Mock Checkout Service
 * 
 * This service provides a fallback implementation when Stripe is not available.
 * It simulates the checkout process without requiring any external services.
 */
class MockCheckoutService {
  /**
   * Create a mock checkout session
   * @param {Object} options - Session creation options
   * @param {Array} options.lineItems - Items to be purchased
   * @param {string} options.successUrl - URL to redirect on success
   * @param {string} options.cancelUrl - URL to redirect on cancel
   * @param {string} options.clientReferenceId - User ID reference
   * @param {Object} options.metadata - Additional data
   * @returns {Object} Mock session object with checkout URL
   */
  createSession(options) {
    logger.info('Creating mock checkout session', { userId: options.clientReferenceId });
    
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const mockSessionId = 'mock_' + Math.random().toString(36).substring(2, 15);
    
    // Build query parameters for the success URL
    const successParams = new URLSearchParams({
      session_id: mockSessionId,
      mock: 'true'
    });
    
    // Create a mock checkout URL that will redirect to success
    // This simulates going through the Stripe checkout flow
    return {
      id: mockSessionId,
      url: `${baseUrl}/checkout/mock?${successParams.toString()}&redirect=${encodeURIComponent(options.successUrl)}`,
      paymentStatus: 'unpaid',
      status: 'created'
    };
  }
  
  /**
   * Complete a mock payment (simulates webhook)
   * @param {string} sessionId - The mock session ID to complete
   * @returns {Object} Payment result
   */
  completePayment(sessionId) {
    logger.info('Completing mock payment', { sessionId });
    
    return {
      id: sessionId,
      paymentStatus: 'paid',
      status: 'complete'
    };
  }
}

export default new MockCheckoutService();