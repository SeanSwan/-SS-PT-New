import { describe, expect, it } from "vitest";

describe("Schedule module load", () => {
  it("imports without unresolved runtime references", async () => {
    await expect(import("./schedule")).resolves.toBeDefined();
  });
});
