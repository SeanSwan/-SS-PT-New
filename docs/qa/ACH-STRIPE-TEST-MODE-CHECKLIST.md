# ACH Stripe Test-Mode Checklist

## Purpose

This checklist verifies the SwanStudios ACH / eCheck checkout path after code changes that touch `frontend/src/components/Checkout/methods/ACHPayment.tsx`.

Use Stripe test mode only. Do not paste or store real bank account details, routing numbers, Financial Connections account IDs, PaymentIntent client secrets, or webhook payload secrets in this file or in chat.

## Scope

- Store checkout ACH / eCheck method.
- Stripe Financial Connections collection.
- ACH PaymentIntent statuses returned after collection and confirmation.
- User-facing copy for delayed processing and microdeposit verification.

## Required Test Cases

1. Card checkout still completes through the existing card path.
2. ACH checkout blocks submission when the account holder name is missing.
3. ACH checkout opens Stripe Financial Connections after a valid account holder name is present.
4. Closing or canceling Financial Connections shows a recoverable error and allows a retry.
5. A failed or unusable bank account returns recoverable "try another bank account" copy.
6. A `requires_confirmation` PaymentIntent proceeds to `confirmUsBankAccountPayment`.
7. A `processing` PaymentIntent shows pending copy and does not claim instant settlement.
8. A `requires_action` PaymentIntent with `verify_with_microdeposits` explains the microdeposit next step and email/verification timing.
9. The UI does not grant paid assets or imply full fulfillment before backend/webhook confirmation.
10. Browser console, server logs, and UI do not expose bank account numbers, routing numbers, Financial Connections account IDs, PaymentIntent client secrets, or raw Stripe objects.

## Stripe Test References

- Use Stripe's ACH Direct Debit test-mode bank accounts and microdeposit scenarios.
- Confirm the order remains backend/webhook-driven for final fulfillment.
- Confirm retry behavior does not double-submit while Stripe collection or confirmation is pending.
