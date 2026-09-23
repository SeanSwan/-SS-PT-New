**[PLAN] Visual direction**

Retain the compact picker and registry order. Use an opaque, layered surface, readable names, a clear current-theme line and a small faceted wing. The grid remains dominant.

Two bounded treatments remain available to Sean:

- **Quiet Chrome:** static wing and immediate theme changes; default implementation recommendation.
- **Faceted Wing:** identical layout plus the optional brief raw-Three.js settle after its admission gate.

Neither is a new page or full-screen gallery. Swan design-router guidance applies; no additional aesthetic framework is introduced.

**Exact tokens**

| Role | Consumption |
|---|---|
| Opaque base | `var(--bg-primary, #0A0A0F)` |
| Elevated overlay | `var(--bg-elevated, #002060)` |
| Primary text/focus foreground | `var(--text-primary, #E0ECF4)` |
| Secondary text | `var(--text-secondary, #E0ECF4)` |
| Primary decorative accent | `var(--accent-primary, #60C0F0)` |
| Secondary decorative accent | `var(--accent-secondary, #8B5CF6)` |
| Border | `var(--border-strong, #C6A84B)` |
| Selected check foreground | `var(--text-on-accent, #0A0A0F)` |
| Unsaved decorative indicator | `var(--accent-gold, #C6A84B)` |

Existing palette values win. No global token additions or palette recolouring.

Panel background: elevated colour painted over an opaque primary-colour layer. Remove backdrop blur once the backing is opaque.

Focus treatment: 2px primary-text outline with a 2px opaque primary-background separator. Test both layers against their actual adjacent colours. Forced-colours mode uses system `Canvas`/`CanvasText`.

**Desktop — closed and tooltip**

```text
[Logo]                           [Theme lens] [Cart] [...]
                                      |
                         +-----------------------------+
                         | {description} — click for    |
                         | themes, arrows to cycle      |
                         +-----------------------------+
```

The tooltip appears after 300ms hover/focus, remains hoverable, and dismisses with Escape.

**Desktop — open**

```text
[Logo]                           [Theme lens] [Cart] [...]
                          +----------------------------------+
                          | 28 themes                 [Next] |
                          | [wing] Current: {themeName}       |
                          | Match system (dark)        [OFF] |
                          | Changes apply immediately.       |
                          | {status region, when required}   |
                          |                                  |
                          | [swatch/name] [swatch/name] ...   |
                          | [swatch/name] [swatch/name] ...   |
                          | ...all registered options...     |
                          +----------------------------------+
```

Panel: maximum 420px; 12px padding; 6px grid gap; 66px minimum option width; minimum target 44×44px. Maximum height `min(74dvh, 540px)` with a `vh` fallback. Names wrap.

**375px — closed and tooltip**

```text
+-------------------------------------+
| [Logo]          [Lens] [Cart] [...]  |
|           +-----------------------+ |
|           | {description} — click | |
|           | for themes, arrows    | |
|           | to cycle              | |
|           +-----------------------+ |
+-------------------------------------+
```

Tooltip width ≤260px and constrained to the visual viewport with 16px minimum clearance.

**375px — open**

```text
+-------------------------------------+
| [Logo]          [Lens] [Cart] [...]  |
| +---------------------------------+ |
| | 28 themes                [Next] | |
| | [wing] Current: {themeName}     | |
| | Match system (dark)      [OFF] | |
| | Changes apply immediately.     | |
| | {status region}                | |
| |                               | |
| | [name] [name] [name] [name]    | |
| | [name] [name] [name] [name]    | |
| | ...remaining options scroll...| |
| +---------------------------------+ |
+-------------------------------------+
```

Gutters 8px; top follows the verified header geometry, initially the existing 66px position. Bottom clearance includes safe-area inset. Retain current positioning until browser tests establish whether an amendment is necessary.

**State-specific content — both layouts**

The following rows replace the corresponding slots in both wireframes; no separate screen is introduced.

| State | Desktop content | 375px content |
|---|---|---|
| Manual | `Current: {themeName}` / `Match system (dark)` `[OFF]` | Same; wrap current name |
| Following | `Current: {systemThemeName}` / `Match system (light)` `[ON]` | Same |
| Selection | New checked option and current name immediately | Same; no spinner |
| Saved | Status region absent | Same |
| Denied/partial/mismatched save | `Theme applied for this session. Your preference could not be saved.` `[Save preference]` | Copy wraps; button occupies its own ≥44px row |
| Retry succeeds | Notice clears; polite announcement `Theme preference saved.` | Same |
| Retry fails | Existing notice and button remain | Same |
| External update | Current name and checked state update; focus stays put | Same |
| Optional scene loading | Static wing remains in reserved area | Static wing; mobile scene ineligible |
| Scene failure/context loss | Static wing remains; no technical error copy | Same |
| Reduced motion | Static wing; immediate panel/tooltip presentation | Same |
| Closed after failed save | Small unsaved mark; accessible description `Preference not saved on this device.` | Same |
| Reopen after failed save | Notice and retry appear before grid | Same |

Accessible trigger name remains:

`Theme: {description}. Activate to choose a theme.`

`{description}` comes from `getThemeDescription(currentTheme)`; visible `{themeName}` comes from `themes[currentTheme].name`. Do not substitute one silently for the other.

**Interaction**

- Initial focus: active radio.
- Left/Right wrap by one; Up/Down use actual column count; Home/End select endpoints.
- Arrow selection applies and persists immediately; Escape does not undo it.
- Enter/Space/click select and close.
- Native Tab/Shift+Tab traverse available controls; leaving the panel closes without restoring focus.
- Escape closes once and restores trigger focus.
- Outside pointer dismissal preserves destination focus.
- Tooltip Escape suppression persists until pointer and focus both leave its hover/focus group.
- A pointer bridge covers the tooltip’s 8px gap.
- Trigger glyph uses an opaque 28px primary-background plate with primary-text foreground; outer swatch retains theme identity.
- No focusable canvas or hover-only action.

Empty, remote-loading and no-results states: **N/A — registry is synchronous, non-empty and unfiltered.** Invalid programmatic IDs are rejected without side effects. Authentication denial: **N/A — no protected action.**
