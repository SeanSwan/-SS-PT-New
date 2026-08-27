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

        // isFallback is the server telling us it could NOT find this client's
        // package and is returning its own hardcoded figure. A 200 carrying a
        // placeholder is not pricing data - treating it as such is how the
        // original defect reached the panel in the first place.
        if (result.success && result.data && result.data.isFallback !== true) {
          const data = result.data;
          // ?? not ||, and no app-side constant. || swallowed a legitimate 0 (a
          // waived fee) and substituted half-charge - the same bug fixed in
          // mapLateCancelWarning, left standing in its sibling. And falling through
          // to DEFAULT_FULL_CHARGE would reintroduce the invented number this whole
          // gate exists to stop: a payload that claims not to be a fallback but
          // carries no price is incoherent, so treat it as unavailable.
          const fullCharge = data.pricePerSession ?? data.defaultChargeAmount ?? null;
          if (fullCharge === null) {
            setPricing(createDefaultPricingState());
            return;
          }
          const lateFee = data.lateFeeAmount ?? Math.round(fullCharge * 0.5);

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
