/**
 * HTTP adapter for owner-gated admin account commands.
 * The service owns authorization, state changes, and audit requirements.
 */
import {
  AdminAccountCommandError,
  blockAccount,
  deactivateAccount,
  forceLogoutAccount,
  listAccountCommandTargets,
  reactivateAccount,
} from '../services/admin/adminAccountCommandService.mjs';
import { AdminOwnerGateError, getOwnerAdminAccess } from '../services/admin/adminOwnerGate.mjs';
import {
  AdminPasswordSetupLinkError,
  createPasswordSetupLink,
} from '../services/admin/adminPasswordSetupLinkService.mjs';
import logger from '../utils/logger.mjs';

const COMMANDS = {
  block: blockAccount,
  deactivate: deactivateAccount,
  reactivate: reactivateAccount,
  'force-logout': forceLogoutAccount,
};

const buildAccountControlAccess = (access) => {
  const ownerAllowed = access.ownerAdmin === true;
  return {
    configured: access.configured === true,
    ownerAllowed,
    canListTargets: ownerAllowed,
    canRunCommands: ownerAllowed,
    code: access.code,
  };
};

const sendError = (res, error) => {
  const isKnown = error instanceof AdminAccountCommandError || error instanceof AdminOwnerGateError;
  const statusCode = isKnown ? error.statusCode || 400 : 500;
  return res.status(statusCode).json({
    success: false,
    code: isKnown ? error.code : 'ACCOUNT_COMMAND_SERVER_ERROR',
    message: isKnown ? error.message : 'Unable to complete account command.',
  });
};

export const getAdminAccountCommandAccess = (req, res) => {
  const access = getOwnerAdminAccess(req.user);
  return res.status(200).json({
    success: true,
    accountControl: buildAccountControlAccess(access),
  });
};

export const getAdminAccountCommandTargets = async (req, res) => {
  try {
    const result = await listAccountCommandTargets({
      actor: req.user,
      query: req.query,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof AdminOwnerGateError && error.code === 'OWNER_GATE_NOT_CONFIGURED') {
      return res.status(200).json({
        success: true,
        targets: [],
        accountControl: buildAccountControlAccess(getOwnerAdminAccess(req.user)),
      });
    }

    logger.warn('[adminAccountCommand] list_failed', {
      actorId: req.user?.id,
      code: error.code,
    });
    return sendError(res, error);
  }
};
export const runAdminAccountCommand = async (req, res) => {
  const command = String(req.params.command || '').trim();
  const runCommand = COMMANDS[command];
  if (!runCommand) {
    return res.status(404).json({
      success: false,
      code: 'ACCOUNT_COMMAND_NOT_FOUND',
      message: 'Unknown account command.',
    });
  }

  try {
    const result = await runCommand({
      actor: req.user,
      targetUserId: req.params.targetUserId,
      reason: req.body?.reason,
      metadata: {
        source: 'admin_http',
        requestId: req.headers?.['x-request-id'] || null,
      },
    });
    logger.info('[adminAccountCommand] success', {
      actorId: req.user?.id,
      targetUserId: result.account?.id,
      action: result.action,
    });
    return res.status(200).json(result);
  } catch (error) {
    logger.warn('[adminAccountCommand] failed', {
      actorId: req.user?.id,
      targetUserId: req.params.targetUserId,
      command,
      code: error.code,
    });
    return sendError(res, error);
  }
};

export const createAdminPasswordSetupLink = async (req, res) => {
  try {
    const result = await createPasswordSetupLink({
      actor: req.user,
      targetUserId: req.body?.userId,
    });
    // SECURITY: never log the link/token — response-only.
    logger.info('[adminPasswordSetupLink] issued', {
      actorId: req.user?.id,
      targetUserId: req.body?.userId,
    });
    return res.status(200).json(result);
  } catch (error) {
    const isKnown = error instanceof AdminPasswordSetupLinkError || error instanceof AdminOwnerGateError;
    logger.warn('[adminPasswordSetupLink] failed', {
      actorId: req.user?.id,
      targetUserId: req.body?.userId,
      code: isKnown ? error.code : 'PASSWORD_SETUP_SERVER_ERROR',
    });
    return res.status(isKnown ? error.statusCode || 400 : 500).json({
      success: false,
      code: isKnown ? error.code : 'PASSWORD_SETUP_SERVER_ERROR',
      message: isKnown ? error.message : 'Unable to generate password setup link.',
    });
  }
};

export default {
  getAdminAccountCommandAccess,
  getAdminAccountCommandTargets,
  runAdminAccountCommand,
  createAdminPasswordSetupLink,
};
