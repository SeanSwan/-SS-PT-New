import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_APPEARANCE_PROFILE } from "../../core/style-lens-os";
import { SWAN_STYLE_LENS_REGISTRY } from "../../adapters/style-lens-swan";

const setTheme = vi.fn();
const setMotionEnabled = vi.fn();
const beginPreview = vi.fn();
const cancelPreview = vi.fn();
const commitPreview = vi.fn(async () => true);

vi.mock("./UniversalThemeContext", () => ({
  themes: {
    "crystalline-dark": { name: "Crystalline Dark" },
    "ruby-forge": { name: "Ruby Forge" },
  },
  useUniversalTheme: () => ({
    currentTheme: "crystalline-dark",
    theme: {
      name: "Crystalline Dark",
      background: { primary: "#0A0A0F" },
      colors: { primary: "#60C0F0", accent: "#8B5CF6" },
      text: { primary: "#E0ECF4", muted: "#B8C8D8", accent: "#E0ECF4" },
    },
    setTheme,
    motionEnabled: true,
    setMotionEnabled,
  }),
}));

vi.mock("../../core/style-lens-os", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../core/style-lens-os")>();
  return {
    ...actual,
    useStyleLensAppearance: () => ({
      state: {
        phase: "idle",
        committed: DEFAULT_APPEARANCE_PROFILE,
        preview: null,
        rollbackProfile: null,
        error: null,
      },
      registry: SWAN_STYLE_LENS_REGISTRY,
      beginPreview,
      cancelPreview,
      commitPreview,
    }),
  };
});

vi.mock("./AppearanceStudio/AppearanceStudioPanel", () => ({
  default: (props: {
    onProfileChange: (profile: typeof DEFAULT_APPEARANCE_PROFILE) => void;
    onThemeChange: (id: "ruby-forge") => void;
    onApply: () => void;
    onCancel: () => void;
  }) => (
    <div role="dialog" aria-label="Appearance Studio">
      <button
        type="button"
        onClick={() =>
          props.onProfileChange({
            ...DEFAULT_APPEARANCE_PROFILE,
            styleLensId: "quiet-meridian",
            updatedAt: "2026-07-11T22:45:00.000Z",
          })
        }
      >
        Preview quiet
      </button>
      <button type="button" onClick={() => props.onThemeChange("ruby-forge")}>
        Draft ruby
      </button>
      <button type="button" onClick={props.onApply}>
        Apply draft
      </button>
      <button type="button" onClick={props.onCancel}>
        Cancel draft
      </button>
    </div>
  ),
}));

import UniversalThemeToggle from "./UniversalThemeToggle";

describe("UniversalThemeToggle Appearance Studio integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    commitPreview.mockResolvedValue(true);
  });

  it("previews, commits, applies palette, and restores trigger focus", async () => {
    render(<UniversalThemeToggle />);
    const trigger = screen.getByRole("button", {
      name: /Open Appearance Studio/,
    });

    fireEvent.click(trigger);
    expect(
      (await screen.findByRole("dialog", { name: "Appearance Studio" })).parentElement,
    ).toBe(document.body);

    fireEvent.click(screen.getByRole("button", { name: "Preview quiet" }));
    expect(beginPreview).toHaveBeenCalledWith(
      expect.objectContaining({ styleLensId: "quiet-meridian" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Draft ruby" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply draft" }));

    await waitFor(() => expect(commitPreview).toHaveBeenCalledTimes(1));
    expect(setTheme).toHaveBeenCalledWith("ruby-forge");
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("cancels pending appearance and restores trigger focus", async () => {
    render(<UniversalThemeToggle />);
    const trigger = screen.getByRole("button", {
      name: /Open Appearance Studio/,
    });

    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole("button", { name: "Cancel draft" }));

    expect(cancelPreview).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
