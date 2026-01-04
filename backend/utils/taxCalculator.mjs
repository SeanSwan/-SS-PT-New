/**
 * Tax Calculator Utility
 * Handles tax calculations for purchases with state-specific tax rates
 *
 * Features:
 * - Forward tax calculation (tax added on top)
 * - Reverse tax calculation (absorb tax to hit target price)
 * - State-based tax rate lookup
 */

import TaxConfig from '../models/TaxConfig.mjs';

/**
 * Get tax rate for a state
 * @param {string} stateCode - Two-letter state code (e.g., 'CA', 'TX')
 * @returns {Promise<number>} Tax rate as decimal (e.g., 0.0725 for 7.25%)
 */
export async function getTaxRate(stateCode) {
  if (!stateCode || typeof stateCode !== 'string' || stateCode.length !== 2) {
    return 0; // No tax if invalid state
  }

  try {
    const taxConfig = await TaxConfig.findOne({
      where: {
        stateCode: stateCode.toUpperCase(),
        isActive: true
      }
    });

    if (!taxConfig) {
      console.warn(`No active tax config found for state: ${stateCode}`);
      return 0;
    }

    return parseFloat(taxConfig.taxRate);
  } catch (error) {
    console.error(`Error fetching tax rate for ${stateCode}:`, error.message);
    return 0;
  }
}

/**
 * Calculate tax (forward mode: tax added on top of price)
 * @param {number} grossAmount - Pre-tax amount
 * @param {number} taxRate - Tax rate as decimal (e.g., 0.0725)
 * @returns {Object} Tax calculation details
 */
export function calculateForwardTax(grossAmount, taxRate) {
  if (typeof grossAmount !== 'number' || grossAmount < 0) {
    throw new Error(`Invalid gross amount: ${grossAmount}`);
  }

  if (typeof taxRate !== 'number' || taxRate < 0 || taxRate > 1) {
    throw new Error(`Invalid tax rate: ${taxRate}. Must be between 0 and 1.`);
  }

  const taxAmount = parseFloat((grossAmount * taxRate).toFixed(2));
  const netAfterTax = parseFloat((grossAmount + taxAmount).toFixed(2));

  return {
    grossAmount: parseFloat(grossAmount.toFixed(2)),
    taxRate: parseFloat(taxRate.toFixed(4)),
    taxAmount,
    netAfterTax,
    taxChargedToClient: true
  };
}

/**
 * Calculate tax (reverse mode: adjust pre-tax to hit target final price)
 * Example: Want final price of $175, with 7.25% tax
 * Formula: preTax = final / (1 + taxRate)
 * @param {number} targetFinalPrice - Desired final price (including tax)
 * @param {number} taxRate - Tax rate as decimal (e.g., 0.0725)
 * @returns {Object} Tax calculation details
 */
export function calculateReverseTax(targetFinalPrice, taxRate) {
  if (typeof targetFinalPrice !== 'number' || targetFinalPrice < 0) {
    throw new Error(`Invalid target final price: ${targetFinalPrice}`);
  }

  if (typeof taxRate !== 'number' || taxRate < 0 || taxRate > 1) {
    throw new Error(`Invalid tax rate: ${taxRate}. Must be between 0 and 1.`);
  }

  const grossAmount = parseFloat((targetFinalPrice / (1 + taxRate)).toFixed(2));
  const taxAmount = parseFloat((targetFinalPrice - grossAmount).toFixed(2));

  return {
    grossAmount,
    taxRate: parseFloat(taxRate.toFixed(4)),
    taxAmount,
    netAfterTax: parseFloat(targetFinalPrice.toFixed(2)),
    taxChargedToClient: false // Business absorbs tax
  };
}

/**
 * Main tax calculation function
 * @param {number} amount - Package cost (or target final price if absorbing tax)
 * @param {string} clientState - Two-letter state code
 * @param {boolean} absorbTax - If true, use reverse calculation
 * @returns {Promise<Object>} Tax calculation details
 */
export async function calculateTax(amount, clientState, absorbTax = false) {
  if (typeof amount !== 'number' || amount < 0) {
    throw new Error(`Invalid amount: ${amount}`);
  }

  // Get tax rate for state
  const taxRate = await getTaxRate(clientState);

  if (taxRate === 0) {
    // No tax
    return {
      grossAmount: parseFloat(amount.toFixed(2)),
      taxRate: 0,
      taxAmount: 0,
      netAfterTax: parseFloat(amount.toFixed(2)),
      taxChargedToClient: true,
      clientState: clientState || null
    };
  }

  // Calculate tax based on mode
  const taxCalc = absorbTax
    ? calculateReverseTax(amount, taxRate)
    : calculateForwardTax(amount, taxRate);

  return {
    ...taxCalc,
    clientState: clientState || null
  };
}

/**
 * Calculate tax liability report
 * @param {Array} orders - Array of orders with tax data
 * @returns {Object} Tax liability summary
 */
export function calculateTaxLiability(orders) {
  if (!Array.isArray(orders)) {
    throw new Error('Orders must be an array');
  }

  let totalTaxCharged = 0;
  let totalTaxAbsorbed = 0;
  let totalTaxAmount = 0;

  const byState = {};

  for (const order of orders) {
    const {taxAmount, taxChargedToClient, clientState} = order;

    if (typeof taxAmount === 'number' && taxAmount > 0) {
      totalTaxAmount += taxAmount;

      if (taxChargedToClient) {
        totalTaxCharged += taxAmount;
      } else {
        totalTaxAbsorbed += taxAmount;
      }

      if (clientState) {
        if (!byState[clientState]) {
          byState[clientState] = {
            totalTax: 0,
            charged: 0,
            absorbed: 0,
            orderCount: 0
          };
        }

        byState[clientState].totalTax += taxAmount;
        byState[clientState].orderCount += 1;

        if (taxChargedToClient) {
          byState[clientState].charged += taxAmount;
        } else {
          byState[clientState].absorbed += taxAmount;
        }
      }
    }
  }

  return {
    totalTaxAmount: parseFloat(totalTaxAmount.toFixed(2)),
    totalTaxCharged: parseFloat(totalTaxCharged.toFixed(2)),
    totalTaxAbsorbed: parseFloat(totalTaxAbsorbed.toFixed(2)),
    byState: Object.keys(byState).reduce((acc, state) => {
      acc[state] = {
        totalTax: parseFloat(byState[state].totalTax.toFixed(2)),
        charged: parseFloat(byState[state].charged.toFixed(2)),
        absorbed: parseFloat(byState[state].absorbed.toFixed(2)),
        orderCount: byState[state].orderCount
      };
      return acc;
    }, {})
  };
}

export default {
  getTaxRate,
  calculateForwardTax,
  calculateReverseTax,
  calculateTax,
  calculateTaxLiability
};
