/**
 * ============================================================================
 * FILE: supportIssueNotification.mjs
 * PURPOSE: Notify configured Report Room owners without exposing report text.
 * FAILURE MODE: Best effort only; a notification failure never blocks filing.
 * ============================================================================
 */
import { createNotification } from "../../controllers/notificationController.mjs";
import { parseSupportOwnerConfig } from "../../middleware/supportOwnerOnly.mjs";
import { getUser } from "../../models/index.mjs";
import logger from "../../utils/logger.mjs";

export async function notifySupportOwners({
  issue,
  env = process.env,
  User = getUser(),
  notify = createNotification,
} = {}) {
  try {
    const config = parseSupportOwnerConfig(env);
    if (!config.configured || !User) return { attempted: 0, notified: 0 };

    const admins = await User.findAll({
      where: { role: "admin" },
      attributes: ["id", "email", "role"],
    });
    const owners = admins.filter((admin) => {
      const id = Number(admin.id);
      const email = String(admin.email || "").trim().toLowerCase();
      return config.userIds.has(id) || config.emails.has(email);
    });

    const results = await Promise.all(
      owners.map((owner) =>
        notify({
          userId: owner.id,
          title: "New Report Room issue",
          message: `${issue.referenceCode} | ${issue.severity} | ${issue.category}`,
          type: "admin",
          link: "/dashboard/admin/support",
        }),
      ),
    );
    return {
      attempted: owners.length,
      notified: results.filter((result) => result?.success).length,
    };
  } catch {
    logger.warn("[Report Room] owner notification unavailable", {
      referenceCode: issue?.referenceCode,
    });
    return { attempted: 0, notified: 0 };
  }
}

export default notifySupportOwners;
