import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import FrostedPaywall from '../components/Subscription/FrostedPaywall';
import { registerPaywallTrigger, unregisterPaywallTrigger } from '../services/api.service';

interface PaywallData {
  message?: string;
  code?: string;
  tier?: string;
  upgradeUrl?: string;
}

interface PaywallState {
  visible: boolean;
  featureName: string;
  data: PaywallData | null;
}

interface PaywallContextValue {
  showPaywall: (featureName: string, data?: PaywallData) => void;
  hidePaywall: () => void;
}

const PaywallContext = createContext<PaywallContextValue>({
  showPaywall: () => {},
  hidePaywall: () => {},
});

export const usePaywall = () => useContext(PaywallContext);

export const PaywallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PaywallState>({ visible: false, featureName: '', data: null });
  const unlockCallbacksRef = useRef<Set<() => void>>(new Set());

  const showPaywall = useCallback((featureName: string, data?: PaywallData) => {
    setState(prev => {
      if (prev.visible) return prev;
      return { visible: true, featureName, data: data ?? null };
    });
  }, []);

  const hidePaywall = useCallback(() => {
    setState({ visible: false, featureName: '', data: null });
  }, []);

  const handleUnlocked = useCallback(() => {
    unlockCallbacksRef.current.forEach(cb => cb());
    unlockCallbacksRef.current.clear();
    hidePaywall();
  }, [hidePaywall]);

  // Bridge: register the showPaywall callback with the Axios interceptor
  useEffect(() => {
    registerPaywallTrigger(showPaywall);
    return () => unregisterPaywallTrigger();
  }, [showPaywall]);

  return (
    <PaywallContext.Provider value={{ showPaywall, hidePaywall }}>
      {children}
      {state.visible && (
        <FrostedPaywall
          featureName={state.featureName}
          onClose={hidePaywall}
          onUnlocked={handleUnlocked}
        />
      )}
    </PaywallContext.Provider>
  );
};
