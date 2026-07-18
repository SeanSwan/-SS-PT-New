/**
 * SwanStyleLensGlobalStyles — RE-EXPORT SHELL (S1-C monolith split, KIMI-SWAN-LENS-S1C §6).
 *
 * The ~28-lens monolith is now split into always-present core (./styles/lensCoreStyles.ts) +
 * active-only per-lens files (./styles/lenses/*), injected by ./styles/activeLensStyles. This
 * shell preserves the exact named export consumed at App.tsx:246 and asserted by
 * swanStyleLensRuntime.contract.test.ts — same file path, same specifier, App.tsx untouched.
 * The pre-split CSS is preserved verbatim in styles/__tests__/fixtures/swanStyleLensMonolith.legacy.css
 * (the behavior-identical reference proven by AT-4i). Do not rename; do not add side effects.
 */
export { ActiveLensGlobalStyles as SwanStyleLensGlobalStyles } from './styles/activeLensStyles';
