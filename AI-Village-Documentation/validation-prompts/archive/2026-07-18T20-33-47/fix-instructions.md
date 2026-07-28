# Document Review — Technical Accuracy Consensus

> Generated from Phase 2 recursive debate (Gemini CTO ↔ Claude CEO)
> Consensus: YES

---

# CEO Response — Round 2

The CTO's refinements in Round 2 are technically sound and I'm prepared to reach consensus on most points. Let me address each dispute directly.

---

## AGREEMENTS

**Device Memory Gate (Refinement 1):** The CTO is correct. `hardwareConcurrency` alone is insufficient for GPU/memory-bound WebGL workloads. The `navigator.deviceMemory` addition is approved with one minor amendment to the implementation in `src/utils/performanceGate.ts`:

```typescript
export const canRenderMicroWorlds = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasEnoughCores = (navigator.hardwareConcurrency ?? 4) >= 4;
  const hasEnoughMemory = (navigator.deviceMemory as number | undefined) === undefined 
    || (navigator.deviceMemory as number) >= 4;
  
  // Additional gate: WebGL2 context availability check
  // Prevents silent failure on devices that pass memory/CPU checks but lack GPU support
  const hasWebGL2 = (() => {
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('webgl2');
    } catch {
      return false;
    }
  })();
  
  return !prefersReducedMotion && hasEnoughCores && hasEnoughMemory && hasWebGL2;
};
```

The WebGL2 context probe is a **required addition** — a device can pass memory and CPU thresholds but still lack WebGL2 support (older Safari, some Android WebViews). Without this check, R3F will throw a silent initialization error that the `webglcontextlost` boundary won't catch because the context never successfully opened.

**Playwright/Axe-core WCAG Enforcement (Refinement 2):** The CTO's critique of static CI for stacking context analysis is technically correct. Runtime validation via `@axe-core/playwright` is the right call. Approved with one addition to `tests/e2e/accessibility.spec.ts`:

```typescript
test('Dynamic backgrounds maintain WCAG 4.5:1 contrast', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForSelector('canvas[data-engine="three"]', { state: 'attached' });
  
  // Force R3F idle callback to complete before scanning
  await page.evaluate(() => new Promise(resolve => requestIdleCallback(resolve, { timeout: 3000 })));
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});

// ADDITION: Test degraded state (WebP fallback) also passes contrast
test('Static WebP fallback maintains WCAG 4.5:1 contrast', async ({ page }) => {
  await page.addInitScript(() => {
    // Simulate low-memory device to trigger fallback path
    Object.defineProperty(navigator, 'deviceMemory', { value: 2, configurable: true });
  });
  
  await page.goto('/dashboard');
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

The fallback path test is **non-negotiable** — if only the R3F path is tested, we ship a WCAG violation on every low-memory device that receives the WebP fallback.

---

## ONE REMAINING DISPUTE

### Stylelint Rule for Era Pack Delta Enforcement

The CTO proposed a Stylelint rule ensuring `[data-era="*"]` selectors "only mutate variables and do not declare new CSS properties." This intent is correct but the implementation needs precision.

**The problem:** A Stylelint rule that blocks *all* non-variable declarations in era selectors is too broad. Era packs legitimately need to override `font-family` directly (not via a CSS variable) in cases where the variable is consumed by a third-party component that doesn't respect our token system.

**Proposed Stylelint config in `.stylelintrc.js`:**

```javascript
module.exports = {
  rules: {
    // Custom rule: era selectors may only declare --custom-properties
    // EXCEPTION: font-family, font-weight permitted for third-party component compatibility
    'declaration-property-value-allowed-list': {
      '/\\[data-era=/': {
        // Whitelist: only CSS custom properties and font overrides
        'font-family': ['/^var\\(--/', '/^\'[A-Za-z]/'],
        'font-weight': ['/.*/'],
        // All other properties must be custom properties — enforced by selector pattern
      }
    },
    // Separate rule: flag any era selector property that doesn't start with '--'
    // Implemented as a custom Stylelint plugin: stylelint-plugin-era-tokens
    'era-tokens/no-non-variable-declarations': [true, {
      allowedProperties: ['font-family', 'font-weight'],
      selectorPattern: /\[data-era=/
    }]
  }
};
```

This requires a lightweight custom Stylelint plugin (`stylelint-plugin-era-tokens`) rather than relying on built-in rules that can't express this constraint cleanly. Estimated implementation: 2 hours.

---

## CONSENSUS SUMMARY

With the WebGL2 context probe added to `performanceGate.ts`, the fallback-path Playwright test added to `accessibility.spec.ts`, and the Stylelint era-token rule scoped with `font-family`/`font-weight` exceptions, I believe we have a complete, production-viable architectural plan.

**Pending CTO confirmation on:**
1. WebGL2 context probe addition to `canRenderMicroWorlds()`
2. Fallback-path WCAG test in `accessibility.spec.ts`
3. Stylelint era-token rule with font property exceptions

If the CTO agrees to these three items, I'm prepared to call **CONSENSUS REACHED** next round.
