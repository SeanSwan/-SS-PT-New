/**
 * ============================================================================
 * FILE: supportOwnerAccess.test.mjs
 * PURPOSE: Prove Report Room owner access fails closed and never equates admin
 *          access with Sean-only access.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * ============================================================================
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  parseSupportOwnerConfig,
  requireSupportOwner,
} from "../../middleware/supportOwnerOnly.mjs";

const ORIGINAL_ENV = {
  SUPPORT_OWNER_EMAILS: process.env.SUPPORT_OWNER_EMAILS,
  SUPPORT_OWNER_USER_IDS: process.env.SUPPORT_OWNER_USER_IDS,
  OWNER_EMAIL: process.env.OWNER_EMAIL,
};

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function makeResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
}

afterEach(() => {
  restoreEnv("SUPPORT_OWNER_EMAILS", ORIGINAL_ENV.SUPPORT_OWNER_EMAILS);
  restoreEnv("SUPPORT_OWNER_USER_IDS", ORIGINAL_ENV.SUPPORT_OWNER_USER_IDS);
  restoreEnv("OWNER_EMAIL", ORIGINAL_ENV.OWNER_EMAIL);
});

describe("parseSupportOwnerConfig", () => {
  it("normalizes configured emails and accepts only positive integer user ids", () => {
    const config = parseSupportOwnerConfig({
      SUPPORT_OWNER_EMAILS: " Sean@Example.com, owner2@example.com ",
      SUPPORT_OWNER_USER_IDS: "7, 09, nope, -2, 0",
      OWNER_EMAIL: "fallback@example.com",
    });

    expect([...config.emails]).toEqual([
      "sean@example.com",
      "owner2@example.com",
    ]);
    expect([...config.userIds]).toEqual([7, 9]);
    expect(config.configured).toBe(true);
  });

  it("uses OWNER_EMAIL only when the dedicated support list is empty", () => {
    const config = parseSupportOwnerConfig({
      OWNER_EMAIL: "Owner@Example.com",
    });

    expect([...config.emails]).toEqual(["owner@example.com"]);
    expect(config.configured).toBe(true);
  });
});

describe("requireSupportOwner", () => {
  it("fails closed for an authenticated admin when no owner identity is configured", () => {
    delete process.env.SUPPORT_OWNER_EMAILS;
    delete process.env.SUPPORT_OWNER_USER_IDS;
    delete process.env.OWNER_EMAIL;
    const response = makeResponse();
    const next = vi.fn();

    requireSupportOwner(
      { user: { id: 7, role: "admin", email: "admin@example.com" } },
      response,
      next,
    );

    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: "SUPPORT_OWNER_NOT_CONFIGURED",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects ordinary admins who do not match the configured owner identity", () => {
    process.env.SUPPORT_OWNER_EMAILS = "owner@example.com";
    const response = makeResponse();
    const next = vi.fn();

    requireSupportOwner(
      { user: { id: 7, role: "admin", email: "other-admin@example.com" } },
      response,
      next,
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects matching non-admin users and accepts the configured admin owner", () => {
    process.env.SUPPORT_OWNER_USER_IDS = "7";
    const deniedResponse = makeResponse();
    const deniedNext = vi.fn();

    requireSupportOwner(
      { user: { id: 7, role: "client", email: "owner@example.com" } },
      deniedResponse,
      deniedNext,
    );
    expect(deniedResponse.status).toHaveBeenCalledWith(403);
    expect(deniedNext).not.toHaveBeenCalled();

    const allowedResponse = makeResponse();
    const allowedNext = vi.fn();
    requireSupportOwner(
      { user: { id: 7, role: "admin", email: "owner@example.com" } },
      allowedResponse,
      allowedNext,
    );
    expect(allowedNext).toHaveBeenCalledOnce();
    expect(allowedResponse.status).not.toHaveBeenCalled();
  });
});
