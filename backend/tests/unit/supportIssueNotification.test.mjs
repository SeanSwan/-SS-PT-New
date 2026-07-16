/** Owner-only dashboard notification tests for newly filed support issues. */
import { describe, expect, it, vi } from "vitest";

import { notifySupportOwners } from "../../services/support/supportIssueNotification.mjs";
import logger from "../../utils/logger.mjs";

describe("notifySupportOwners", () => {
  it("notifies only configured owner accounts with a PII-free dashboard link", async () => {
    const User = {
      findAll: vi.fn().mockResolvedValue([
        { id: 7, role: "admin", email: "owner@example.com" },
        { id: 8, role: "admin", email: "other-admin@example.com" },
      ]),
    };
    const notify = vi.fn().mockResolvedValue({ success: true });

    const result = await notifySupportOwners({
      issue: {
        referenceCode: "SWR-20260716-A1B2C3D4",
        severity: "high",
        category: "workout",
        title: "Private client title must not be copied",
      },
      env: { SUPPORT_OWNER_EMAILS: "owner@example.com" },
      User,
      notify,
    });

    expect(result).toEqual({ attempted: 1, notified: 1 });
    expect(notify).toHaveBeenCalledWith({
      userId: 7,
      title: "New Report Room issue",
      message: "SWR-20260716-A1B2C3D4 | high | workout",
      type: "admin",
      link: "/dashboard/admin/support",
    });
    expect(JSON.stringify(notify.mock.calls)).not.toContain("Private client title");
  });

  it("fails quietly without logging provider details when delivery is unavailable", async () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const result = await notifySupportOwners({
      issue: { referenceCode: "SWR-1", severity: "low", category: "other" },
      env: { SUPPORT_OWNER_USER_IDS: "7" },
      User: { findAll: vi.fn().mockRejectedValue(new Error("db unavailable")) },
      notify: vi.fn(),
    });

    expect(result).toEqual({ attempted: 0, notified: 0 });
    expect(warn).toHaveBeenCalledWith(
      "[Report Room] owner notification unavailable",
      { referenceCode: "SWR-1" },
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain("db unavailable");
    warn.mockRestore();
  });
});
