/**
 * Test Utilities for Express Controllers
 * =======================================
 * 
 * Provides mock request/response objects for controller testing
 */

export const mockRequest = (overrides = {}) => {
  const req = {
    body: {},
    params: {},
    query: {},
    user: { id: 1, role: 'admin' },
    ...overrides
  };
  return req;
};

export const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.end = jest.fn();
  return res;
};

export const mockSequelize = {
  query: jest.fn(),
  transaction: jest.fn(() => ({
    commit: jest.fn(),
    rollback: jest.fn()
  }))
};