#!/usr/bin/env node
/**
 * FILE: scripts/verify-until-dry/config.mjs
 * PURPOSE: Validate verifier policy before any evidence or provider call occurs.
 * FAILURE MODE: Invalid policy fails closed and must never fall back to defaults.
 */

const APPROVAL_MODES = new Set(['disabled', 'exact-run', 'standing']);

export function validateConfig(config) {
  const errors = [];
  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['config must be an object'] };
  }
  if (config.version !== 1) errors.push('version must equal 1');
  if (!config.risk || typeof config.risk !== 'object') errors.push('risk policy is required');
  if (!config.kimi || typeof config.kimi !== 'object') {
    errors.push('kimi policy is required');
  } else {
    if (config.kimi.model !== 'moonshotai/kimi-k3') {
      errors.push('kimi.model must equal moonshotai/kimi-k3');
    }
    if (config.kimi.maxTokens !== 60_000) {
      errors.push('kimi.maxTokens must equal the 60000-token invariant');
    }
    if (!Number.isFinite(config.kimi.maxUsdPerCall)
      || config.kimi.maxUsdPerCall <= 0 || config.kimi.maxUsdPerCall > 1) {
      errors.push('kimi.maxUsdPerCall must be positive and at most 1');
    }
    if (!Number.isInteger(config.kimi.maxCallsPerRun)
      || config.kimi.maxCallsPerRun < 1 || config.kimi.maxCallsPerRun > 2) {
      errors.push('kimi.maxCallsPerRun must be 1 or 2');
    }
    if (!APPROVAL_MODES.has(config.kimi.approvalMode)) {
      errors.push('kimi.approvalMode must be disabled, exact-run, or standing');
    }
    const maximum = config.kimi.maxUsdPerCall * config.kimi.maxCallsPerRun;
    if (!Number.isFinite(config.kimi.maxUsdPerRun)
      || config.kimi.maxUsdPerRun <= 0 || config.kimi.maxUsdPerRun > maximum) {
      errors.push('kimi.maxUsdPerRun exceeds bounded call allocation');
    }
  }
  if (!config.convergence || typeof config.convergence !== 'object') {
    errors.push('convergence policy is required');
  }
  if (!config.fixer || typeof config.fixer !== 'object') errors.push('fixer policy is required');
  return { valid: errors.length === 0, errors };
}

export function assertValidConfig(config) {
  const result = validateConfig(config);
  if (!result.valid) throw new Error(`invalid verify-until-dry config:\n${result.errors.join('\n')}`);
  return config;
}
