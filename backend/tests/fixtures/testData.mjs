/**
 * Test Data Fixtures
 * Phase 3: Operations-Ready Test Suite
 *
 * Centralized mock data for consistent testing
 */

// === USER FIXTURES ===
export const testUsers = {
  admin: {
    id: 1,
    firstName: 'Test',
    lastName: 'Admin',
    email: 'admin@test.com',
    password: 'TestAdmin123!',
    role: 'admin',
    isActive: true,
    availableSessions: 0,
  },
  trainer: {
    id: 2,
    firstName: 'Test',
    lastName: 'Trainer',
    email: 'trainer@test.com',
    password: 'TestTrainer123!',
    role: 'trainer',
    isActive: true,
    availableSessions: 0,
  },
  clientWithSessions: {
    id: 3,
    firstName: 'Test',
    lastName: 'Client',
    email: 'client@test.com',
    password: 'TestClient123!',
    role: 'client',
    isActive: true,
    availableSessions: 10,
  },
  clientNoSessions: {
    id: 4,
    firstName: 'New',
    lastName: 'Client',
    email: 'newclient@test.com',
    password: 'NewClient123!',
    role: 'client',
    isActive: true,
    availableSessions: 0,
  },
};

// === SESSION FIXTURES ===
export const testSessions = {
  scheduled: {
    id: 1,
    userId: 3,
    trainerId: 2,
    sessionDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    sessionType: 'personal_training',
    status: 'scheduled',
    duration: 60,
    notes: 'Test scheduled session',
  },
  completed: {
    id: 2,
    userId: 3,
    trainerId: 2,
    sessionDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    sessionType: 'personal_training',
    status: 'completed',
    duration: 60,
    notes: 'Test completed session',
  },
  cancelled: {
    id: 3,
    userId: 3,
    trainerId: 2,
    sessionDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    sessionType: 'personal_training',
    status: 'cancelled',
    duration: 60,
    notes: 'Test cancelled session',
  },
};

// === PACKAGE FIXTURES ===
export const testPackages = {
  tenPack: {
    id: 1,
    name: '10-Pack Training Sessions',
    description: 'Get 10 personal training sessions',
    price: 1750.00,
    sessions: 10,
    itemType: 'TRAINING_PACKAGE_FIXED',
    isActive: true,
    displayOrder: 1,
  },
  twentyFourPack: {
    id: 2,
    name: '24-Pack Training Sessions',
    description: 'Get 24 personal training sessions + 3 bonus',
    price: 4200.00,
    sessions: 27,
    itemType: 'TRAINING_PACKAGE_FIXED',
    isActive: true,
    displayOrder: 2,
  },
};

// === CART FIXTURES ===
export const testCarts = {
  active: {
    id: 1,
    userId: 3,
    status: 'active',
    total: 0,
    sessionsGranted: false,
  },
  pendingPayment: {
    id: 2,
    userId: 3,
    status: 'pending_payment',
    total: 1750.00,
    checkoutSessionId: 'cs_test_123',
    sessionsGranted: false,
  },
  completed: {
    id: 3,
    userId: 3,
    status: 'completed',
    total: 1750.00,
    checkoutSessionId: 'cs_test_456',
    sessionsGranted: true,
    paymentStatus: 'paid',
    completedAt: new Date().toISOString(),
  },
};

// === ASSIGNMENT FIXTURES ===
export const testAssignments = {
  active: {
    id: 1,
    clientId: 3,
    trainerId: 2,
    assignedBy: 1,
    status: 'active',
    notes: 'Test active assignment',
  },
  inactive: {
    id: 2,
    clientId: 4,
    trainerId: 2,
    assignedBy: 1,
    status: 'inactive',
    notes: 'Test inactive assignment',
  },
};

// === HELPER FUNCTIONS ===

/**
 * Create a mock request object
 */
export function createMockRequest(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides,
  };
}

/**
 * Create a mock response object
 */
export function createMockResponse() {
  const res = {
    statusCode: 200,
    jsonData: null,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.jsonData = data;
      return this;
    },
    send: function(data) {
      this.jsonData = data;
      return this;
    },
  };
  return res;
}

/**
 * Create a mock next function
 */
export function createMockNext() {
  return vi.fn();
}

export default {
  testUsers,
  testSessions,
  testPackages,
  testCarts,
  testAssignments,
  createMockRequest,
  createMockResponse,
  createMockNext,
};
