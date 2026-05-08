import apiService, {
  ProductionApiService,
  ProductionTokenManager,
  registerPaywallTrigger,
  unregisterPaywallTrigger,
} from './api.service';

describe('api.service split exports', () => {
  it('keeps the singleton service and compatibility exports importable', () => {
    expect(apiService).toBeInstanceOf(ProductionApiService);
    expect(typeof apiService.get).toBe('function');
    expect(typeof ProductionTokenManager.getToken).toBe('function');
    expect(typeof registerPaywallTrigger).toBe('function');
    expect(typeof unregisterPaywallTrigger).toBe('function');
  });
});
