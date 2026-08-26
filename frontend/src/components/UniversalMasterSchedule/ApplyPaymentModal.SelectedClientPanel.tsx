import React from 'react';
import { AlertTriangle, CreditCard, DollarSign, Package } from 'lucide-react';
import ForgeButton from '../ui/forge/ForgeButton'; // Forge strangler (was GlowButton)
import {
  BodyText,
  Caption,
  FormField,
  Label,
  OutlinedButton,
  SmallText,
  Spinner,
  StyledInput,
  StyledTextarea,
} from './ui';
import type { useApplyPaymentModalController } from './ApplyPaymentModal.controller';
import { PAYMENT_METHOD_CONFIG, PAYMENT_METHODS } from './ApplyPaymentModal.config';
import {
  ApplyHeaderRow,
  ApplySection,
  CenteredPad,
  EmptyState,
  ForceOverrideActions,
  InlineSectionHeader,
  ModeButton,
  ModeToggle,
} from './ApplyPaymentModal.baseStyles';
import {
  CapitalizedBodyText,
  InstructionCaption,
  LastBadge,
  LastPackageBanner,
  PackageCard,
  PackageGrid,
  PackageName,
  PackagePrice,
  PackageSessions,
  PaymentMethodButton,
  PaymentMethodGrid,
  PositiveBodyText,
  SpacedFormField,
  SummaryCard,
  SummaryRow,
  ValidationCaption,
} from './ApplyPaymentModal.packageStyles';
import {
  CardGrid,
  CardOption,
  ConfirmationBanner,
  ConfirmationHeader,
  NoCardsMessage,
  StripeCardSection,
  TestCardButton,
} from './ApplyPaymentModal.paymentStyles';

type PaymentController = ReturnType<typeof useApplyPaymentModalController>;

interface SelectedClientPanelProps {
  controller: PaymentController;
}

export const ApplyPaymentSelectedClientPanel: React.FC<SelectedClientPanelProps> = ({ controller }) => {
  const { adminNotes, attachingTestCard, cardsLoading, handleApplyPackage, handleAttachTestCard, handlePaymentMethodChange, lastPackage, modalMode, packages, packagesLoading, paymentMethod, paymentReference, paymentNote, pkgPrice, pkgSessions, savedCards, selectedCardId, selectedClient, selectedPackageId, selectedPkg, sessionsToAdd, showPaymentConfirmation, setAdminNotes, setModalMode, setPaymentReference, setPaymentNote, setSelectedCardId, setSelectedPackageId, setSessionsToAdd, setShowPaymentConfirmation } = controller;

  if (!selectedClient) return null;

  return (
    <ApplySection>
      <ApplyHeaderRow>
        <InlineSectionHeader>
          <CreditCard size={18} />
          <SmallText>Apply Credits to {selectedClient.name}</SmallText>
        </InlineSectionHeader>
        <ModeToggle>
          <ModeButton $active={modalMode === 'package'} onClick={() => setModalMode('package')} type="button">
            <Package size={14} /> Package
          </ModeButton>
          <ModeButton $active={modalMode === 'manual'} onClick={() => setModalMode('manual')} type="button">
            <DollarSign size={14} /> Manual
          </ModeButton>
        </ModeToggle>
      </ApplyHeaderRow>

      {modalMode === 'package' ? (
        <>
          {lastPackage && (
            <LastPackageBanner>
              <Caption secondary>Last purchased:</Caption>
              <SmallText>{lastPackage.packageName} ({lastPackage.sessions} sessions - ${lastPackage.price})</SmallText>
            </LastPackageBanner>
          )}
          <Label>Select Package</Label>
          {packagesLoading ? (
            <CenteredPad><Spinner size={24} /></CenteredPad>
          ) : packages.length === 0 ? (
            <EmptyState><Caption secondary>No packages found in storefront.</Caption></EmptyState>
          ) : (
            <PackageGrid>
              {packages.map((packageItem) => {
                const sessions = packageItem.sessions || packageItem.totalSessions || 0;
                const price = parseFloat(String(packageItem.totalCost || packageItem.price || 0));
                const isLast = lastPackage?.packageId === packageItem.id;
                return (
                  <PackageCard key={packageItem.id} type="button" $selected={selectedPackageId === packageItem.id} $isLast={isLast} onClick={() => setSelectedPackageId(packageItem.id)}>
                    {isLast && <LastBadge>Last Purchased</LastBadge>}
                    <PackageName>{packageItem.name}</PackageName>
                    <PackageSessions>{sessions} sessions</PackageSessions>
                    <PackagePrice>${price.toFixed(2)}</PackagePrice>
                    <Caption secondary>${parseFloat(String(packageItem.pricePerSession || 0)).toFixed(2)}/session</Caption>
                  </PackageCard>
                );
              })}
            </PackageGrid>
          )}

          <SpacedFormField>
            <Label>Payment Method</Label>
            <PaymentMethodGrid>
              {PAYMENT_METHODS.map((method) => (
                <PaymentMethodButton key={method.value} $selected={paymentMethod === method.value} onClick={() => handlePaymentMethodChange(method.value)} type="button">
                  {method.label}
                </PaymentMethodButton>
              ))}
            </PaymentMethodGrid>
          </SpacedFormField>

          {paymentMethod === 'stripe' && (
            <StripeCardSection>
              {cardsLoading ? (
                <CenteredPad><Spinner size={24} /></CenteredPad>
              ) : savedCards.length > 0 ? (
                <>
                  <Label>Select Card</Label>
                  <CardGrid>
                    {savedCards.map((card) => (
                      <CardOption key={card.id} type="button" $selected={selectedCardId === card.id} onClick={() => setSelectedCardId(card.id)}>
                        <CreditCard size={16} />
                        <CapitalizedBodyText as="span">{card.brand}</CapitalizedBodyText>
                        <span>****{card.last4}</span>
                        <Caption secondary>{card.expMonth}/{card.expYear}</Caption>
                      </CardOption>
                    ))}
                  </CardGrid>
                </>
              ) : (
                <NoCardsMessage><Caption secondary>No cards on file for this client.</Caption></NoCardsMessage>
              )}
              <TestCardButton type="button" onClick={handleAttachTestCard} disabled={attachingTestCard}>
                {attachingTestCard ? <Spinner size={14} /> : <CreditCard size={14} />}
                Attach Test Card (Visa ****4242)
              </TestCardButton>
            </StripeCardSection>
          )}

          {paymentMethod !== 'stripe' && (
            <FormField>
              <Label htmlFor="payment-ref">
                {PAYMENT_METHOD_CONFIG[paymentMethod]?.label || 'Payment Reference'} {['venmo', 'zelle', 'check'].includes(paymentMethod) ? '(required)' : '(optional)'}
              </Label>
              <StyledInput id="payment-ref" type="text" value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder={PAYMENT_METHOD_CONFIG[paymentMethod]?.placeholder || 'Payment reference'} />
              {PAYMENT_METHOD_CONFIG[paymentMethod]?.validationMsg && paymentReference && (() => {
                const config = PAYMENT_METHOD_CONFIG[paymentMethod];
                return config?.validation && !config.validation.test(paymentReference.trim()) ? <ValidationCaption>{config.validationMsg}</ValidationCaption> : null;
              })()}
              {PAYMENT_METHOD_CONFIG[paymentMethod]?.instructions && (
                <InstructionCaption secondary>{PAYMENT_METHOD_CONFIG[paymentMethod].instructions}</InstructionCaption>
              )}
            </FormField>
          )}

          {showPaymentConfirmation && ['venmo', 'zelle'].includes(paymentMethod) && (
            <ConfirmationBanner>
              <ConfirmationHeader>
                <AlertTriangle size={16} />
                Confirm Payment Received
              </ConfirmationHeader>
              <Caption secondary>
                Please confirm you have received the {paymentMethod === 'venmo' ? 'Venmo' : 'Zelle'} payment from {selectedClient.name} before applying credits.
              </Caption>
              <ForceOverrideActions>
                <OutlinedButton onClick={() => setShowPaymentConfirmation(false)}>Cancel</OutlinedButton>
                <ForgeButton variant="primary" size="small" onClick={() => { setShowPaymentConfirmation(false); handleApplyPackage(); }}>
                  Confirm & Apply
                </ForgeButton>
              </ForceOverrideActions>
            </ConfirmationBanner>
          )}

          <FormField>
            <Label htmlFor="admin-notes">Admin Notes (optional)</Label>
            <StyledTextarea id="admin-notes" value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} rows={2} placeholder="Internal notes about this payment" />
          </FormField>

          {selectedPackageId && (
            <SummaryCard>
              <SummaryRow><Caption secondary>Package</Caption><BodyText>{selectedPkg?.name}</BodyText></SummaryRow>
              <SummaryRow><Caption secondary>Sessions</Caption><BodyText>{pkgSessions}</BodyText></SummaryRow>
              <SummaryRow><Caption secondary>Amount</Caption><BodyText>${pkgPrice.toFixed(2)}</BodyText></SummaryRow>
              <SummaryRow><Caption secondary>Payment</Caption><CapitalizedBodyText>{paymentMethod === 'stripe' ? 'Card on File' : paymentMethod}</CapitalizedBodyText></SummaryRow>
              <SummaryRow><Caption secondary>New Balance</Caption><PositiveBodyText>{(selectedClient.availableSessions || 0) + pkgSessions} credits</PositiveBodyText></SummaryRow>
            </SummaryCard>
          )}
        </>
      ) : (
        <>
          <FormField>
            <Label htmlFor="sessions-to-add">Sessions to Add</Label>
            <StyledInput id="sessions-to-add" type="number" min={1} value={sessionsToAdd} onChange={(event) => setSessionsToAdd(event.target.value)} placeholder="Number of sessions to credit" />
          </FormField>
          <FormField>
            <Label htmlFor="payment-note">Payment Note (optional)</Label>
            <StyledTextarea id="payment-note" value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} rows={2} placeholder="e.g., 10-pack purchased via Stripe" />
          </FormField>
        </>
      )}
    </ApplySection>
  );
};
