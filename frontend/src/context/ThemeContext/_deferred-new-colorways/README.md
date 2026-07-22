# Deferred: new colorway batch (2026-07-22)

Sean chose to ship the real Swan Lens fixes (unlock 38 hidden colors, scroll,
contrast fix, style differentiation) FIRST and add NEW colorways as a later
finishing pass. These files are the WIP + the working color-science audit test.

The colorway HEX values here did NOT yet pass the distinctness gate (the crowded
hue wheel makes 8 truly-distinct + beautiful primaries hard — see Kimi rounds 3-5).
colorScience.ts (kept in the parent dir) is the reusable, verified color-math module.

To resume: design fewer/deeper primaries per Kimi round-5 direction, run the audit
test until green, then wire NEW_COLORWAY_SPECS into premiumThemeAdditions.
