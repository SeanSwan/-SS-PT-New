/**
 * Nutrition serving-size validation.
 *
 * HTTP routes receive JSON values, so serving sizes use the shared strict
 * numeric parser to reject coercions and partial parses.
 */
import { parsePlainDecimalNumber } from './numericInputValidation.mjs';

export const parseServingSizeGrams = (value) => parsePlainDecimalNumber(value);
