/**
 * ============================================================================
 * FILE: supportOwnerOnly.mjs
 * PURPOSE: Fail-closed owner authorization for full Report Room access.
 * SECURITY: Admin role alone is never sufficient; a configured owner identity
 *           must also match the authenticated server-side user.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * ============================================================================
 */
function parseEmails(value) {
  return new Set(
    String(value || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function parseUserIds(value) {
  return new Set(
    String(value || "")
      .split(",")
      .map((candidate) => candidate.trim())
      .filter((candidate) => /^\d+$/.test(candidate))
      .map(Number)
      .filter((candidate) => Number.isSafeInteger(candidate) && candidate > 0),
  );
}

export function parseSupportOwnerConfig(env = process.env) {
  const dedicatedEmails = parseEmails(env.SUPPORT_OWNER_EMAILS);
  const emails =
    dedicatedEmails.size > 0 ? dedicatedEmails : parseEmails(env.OWNER_EMAIL);
  const userIds = parseUserIds(env.SUPPORT_OWNER_USER_IDS);

  return {
    emails,
    userIds,
    configured: emails.size > 0 || userIds.size > 0,
  };
}

export function requireSupportOwner(req, res, next) {
  const user = req.user;
  if (!user || user.role !== "admin") {
    return res.status(403).json({
      success: false,
      code: "SUPPORT_OWNER_ACCESS_DENIED",
      message: "Owner access is required.",
    });
  }

  const config = parseSupportOwnerConfig();
  if (!config.configured) {
    return res.status(503).json({
      success: false,
      code: "SUPPORT_OWNER_NOT_CONFIGURED",
      message: "The private support inbox is not configured.",
    });
  }

  const email = String(user.email || "")
    .trim()
    .toLowerCase();
  const userId = Number(user.id);
  const isOwner = config.emails.has(email) || config.userIds.has(userId);

  if (!isOwner) {
    return res.status(403).json({
      success: false,
      code: "SUPPORT_OWNER_ACCESS_DENIED",
      message: "Owner access is required.",
    });
  }

  return next();
}

export default requireSupportOwner;
