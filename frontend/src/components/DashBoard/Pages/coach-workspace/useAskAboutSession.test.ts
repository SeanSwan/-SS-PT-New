import { describe, expect, it } from 'vitest';
import { planSessionAsk } from './useAskAboutSession';

describe('planSessionAsk (review #8: Ask never preps the wrong client)', () => {
  it('pins a known slot client', () => {
    expect(planSessionAsk({ slotClientId: 12, known: true, pinnedClientId: null, clientMode: false })).toEqual({ kind: 'pin', clientId: 12 });
    expect(planSessionAsk({ slotClientId: 12, known: true, pinnedClientId: 14, clientMode: false })).toEqual({ kind: 'pin', clientId: 12 });
  });

  it('an unknown slot client while ANOTHER client is pinned returns the chat to general scope', () => {
    expect(planSessionAsk({ slotClientId: 99, known: false, pinnedClientId: 14, clientMode: false })).toEqual({ kind: 'pin', clientId: null });
  });

  it('CONTROL: already scoped right, general with an unknown client, or a client user → keep', () => {
    expect(planSessionAsk({ slotClientId: 12, known: true, pinnedClientId: 12, clientMode: false })).toEqual({ kind: 'keep' });
    expect(planSessionAsk({ slotClientId: 99, known: false, pinnedClientId: null, clientMode: false })).toEqual({ kind: 'keep' });
    expect(planSessionAsk({ slotClientId: 7, known: false, pinnedClientId: null, clientMode: true })).toEqual({ kind: 'keep' });
  });
});
