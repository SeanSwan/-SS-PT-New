import { describe, expect, it } from 'vitest';
import {
  CLIENT_CHALLENGE_CREATION_FEATURE_KEY,
  FEATURE_ACCESS_FEATURES,
} from './featureAccessCatalog';

describe('feature access catalog', () => {
  it('exposes the client challenge creation entitlement for admin grants', () => {
    expect(CLIENT_CHALLENGE_CREATION_FEATURE_KEY).toBe('client_challenge_creation');
    expect(FEATURE_ACCESS_FEATURES).toEqual(expect.arrayContaining([
      { key: 'client_challenge_creation', label: 'Client Challenge Creation' },
    ]));
  });

  it('keeps feature keys unique so toggles cannot alias another product gate', () => {
    const keys = FEATURE_ACCESS_FEATURES.map((feature) => feature.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});