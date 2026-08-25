import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import apiService from '../../../services/api.service';

const DEFAULT_FULL_CHARGE = 175;
const DEFAULT_LATE_FEE = 88;

interface UseSessionPackagePricingInput {
  open: boolean;
  sessionId?: number | string | null;
  canManage: boolean;
}

interface SessionPackagePricingState {
  packagePrice: number | null;
  packageName: string | null;
  defaultFullCharge: number;
  defaultLateFee: number;
  /**
   * True whenever the numeric defaults above are NOT derived from this client's
   * package. Consumers must gate every package-derived charge affordance on this
   * flag - the fallback figures are placeholders, not this client's real prices.
   */
  pricingUnavailable: boolean;
}

const createDefaultPricingState = (): SessionPackagePricingState => ({
  packagePrice: null,
  packageName: null,
  defaultFullCharge: DEFAULT_FULL_CHARGE,
  defaultLateFee: DEFAULT_LATE_FEE,
  pricingUnavailable: true,
});

export const useSessionPackagePricing = ({
  open,
  sessionId,
  canManage,
}: UseSessionPackagePricingInput): SessionPackagePricingState => {
  const [pricing, setPricing] = useState<SessionPackagePricingState>(
    createDefaultPricingState
  );

  useEffect(() => {
    if (!open || !sessionId || !canManage) {
      setPricing(createDefaultPricingState());
      return;
    }

    let isActive = true;
    setPricing(createDefaultPricingState());

    const fetchPackagePrice = async () => {
      try {
        const response = await apiService.get(
          `/api/sessions/${sessionId}/client-package-price`
        );
        const result = response.data;

        if (!isActive) {
          return;
        }

        if (result.success && result.data) {
          const data = result.data;
          const fullCharge = data.pricePerSession || data.defaultChargeAmount || DEFAULT_FULL_CHARGE;
          const lateFee = data.lateFeeAmount || Math.round(fullCharge * 0.5);

          setPricing({
            packagePrice: data.pricePerSession ?? null,
            packageName: data.packageName ?? null,
            defaultFullCharge: fullCharge,
            defaultLateFee: lateFee,
            pricingUnavailable: false,
          });
          return;
        }

        setPricing(createDefaultPricingState());
      } catch (error) {
        if (!isActive) {
          return;
        }

        logger.warn('Could not fetch package price:', error);
        setPricing(createDefaultPricingState());
      }
    };

    fetchPackagePrice();

    return () => {
      isActive = false;
    };
  }, [open, sessionId, canManage]);

  return pricing;
};
