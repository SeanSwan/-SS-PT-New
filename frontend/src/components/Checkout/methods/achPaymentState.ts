export type AchUiStatus =
  | 'idle'
  | 'creating'
  | 'collecting'
  | 'confirming'
  | 'processing'
  | 'microdeposit_verification'
  | 'succeeded'
  | 'error';

export type AchDecisionKind =
  | 'confirm'
  | 'processing'
  | 'succeeded'
  | 'microdeposit_verification'
  | 'retry_payment_method'
  | 'recoverable_error';

export type AchDecisionStage = 'collect' | 'confirm';

export interface AchUserNameSource {
  firstName?: string | null;
  lastName?: string | null;
}

export interface AchAccountHolderNameResult {
  ok: boolean;
  name?: string;
  message?: string;
}

export interface AchPaymentIntentLike {
  status?: string | null;
  next_action?: {
    type?: string | null;
    verify_with_microdeposits?: {
      arrival_date?: number | null;
      hosted_verification_url?: string | null;
      microdeposit_type?: string | null;
    } | null;
  } | null;
}

export interface AchPaymentIntentDecision {
  kind: AchDecisionKind;
  uiStatus: AchUiStatus;
  message: string;
  shouldConfirm: boolean;
  shouldCallSuccess: boolean;
}

const ACCOUNT_HOLDER_NAME_REQUIRED = 'Enter the account holder name before connecting a bank account.';

export function getAchAccountHolderName(user: AchUserNameSource | null | undefined): AchAccountHolderNameResult {
  const name = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.replace(/\s+/g, ' ').trim();
  if (!name) {
    return { ok: false, message: ACCOUNT_HOLDER_NAME_REQUIRED };
  }

  return { ok: true, name };
}

function formatArrivalDate(epochSeconds?: number | null): string {
  if (!epochSeconds) return '';

  try {
    return ` Stripe expects the deposits around ${new Date(epochSeconds * 1000).toLocaleDateString()}.`;
  } catch {
    return '';
  }
}

export function resolveAchPaymentIntentDecision(
  paymentIntent: AchPaymentIntentLike | null | undefined,
  stage: AchDecisionStage,
): AchPaymentIntentDecision {
  const status = paymentIntent?.status;

  if (status === 'requires_confirmation') {
    if (stage === 'collect') {
      return {
        kind: 'confirm',
        uiStatus: 'confirming',
        message: 'Bank account connected. Confirming the ACH authorization now.',
        shouldConfirm: true,
        shouldCallSuccess: false,
      };
    }

    return {
      kind: 'recoverable_error',
      uiStatus: 'error',
      message: 'Stripe needs another bank authorization step. Please try again.',
      shouldConfirm: false,
      shouldCallSuccess: false,
    };
  }

  if (status === 'processing') {
    return {
      kind: 'processing',
      uiStatus: 'processing',
      message: 'ACH payment submitted. Bank transfers are not instant; SwanStudios will finalize access after backend confirmation.',
      shouldConfirm: false,
      shouldCallSuccess: true,
    };
  }

  if (status === 'succeeded') {
    return {
      kind: 'succeeded',
      uiStatus: 'succeeded',
      message: 'ACH payment accepted. SwanStudios will keep backend confirmation as the source of truth for fulfillment.',
      shouldConfirm: false,
      shouldCallSuccess: true,
    };
  }

  if (status === 'requires_action') {
    const nextAction = paymentIntent?.next_action;
    if (nextAction?.type === 'verify_with_microdeposits') {
      const arrivalDateCopy = formatArrivalDate(nextAction.verify_with_microdeposits?.arrival_date);
      return {
        kind: 'microdeposit_verification',
        uiStatus: 'microdeposit_verification',
        message: `Microdeposit verification is required. Stripe will send verification instructions by email when available; deposits usually arrive in 1-2 business days.${arrivalDateCopy}`,
        shouldConfirm: false,
        shouldCallSuccess: false,
      };
    }

    return {
      kind: 'recoverable_error',
      uiStatus: 'error',
      message: 'This bank account needs another verification step. Please check Stripe instructions and try again.',
      shouldConfirm: false,
      shouldCallSuccess: false,
    };
  }

  if (status === 'requires_payment_method') {
    return {
      kind: 'retry_payment_method',
      uiStatus: 'error',
      message: 'That bank account could not be used. Please try another bank account.',
      shouldConfirm: false,
      shouldCallSuccess: false,
    };
  }

  return {
    kind: 'recoverable_error',
    uiStatus: 'error',
    message: 'Stripe returned an unexpected ACH status. No payment access was granted. Please try again or contact support.',
    shouldConfirm: false,
    shouldCallSuccess: false,
  };
}
