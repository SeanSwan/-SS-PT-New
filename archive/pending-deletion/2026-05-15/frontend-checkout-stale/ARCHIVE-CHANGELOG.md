# Frontend Checkout Stale Archive

Archived during the 2026-05-15 cleanup pass.

## Why These Files Moved

This removed checkout component remained under active frontend source with a `.removed` suffix. It was not referenced by the active route tree and could confuse future checkout work.

## Files

- `MockCheckout.jsx.removed`

## Restore Rule

Restore only for historical diffing. Active checkout work should use the current Stripe checkout surfaces.
