/**
 * COMPONENT: CheckoutFulfillmentSection
 * PURPOSE: Collect real delivery/pickup details before physical-product checkout.
 * OWNER: Codex | LAST VALIDATED: 2026-06-13
 *
 * WIREFRAME:
 * [product fulfillment cards]
 * [delivery/pickup mode segmented controls]
 * [recipient + phone + delivery/pickup fields]
 *
 * DATA FLOW:
 * Props In: checkout fulfillment intent + editable fulfillment details.
 * Events Out: onFulfillmentDetailsChange with sanitized UI state only.
 * Parent: CheckoutReadyView inside the mounted /checkout route.
 */
import React from 'react';
import { MapPin, PackageCheck } from 'lucide-react';
import type { CheckoutFulfillmentDetails, CheckoutFulfillmentIntent } from './CheckoutView.logic';
import {
  CheckoutInfoGrid,
  CheckoutSection,
  InfoCard,
  InfoCardIcon,
  InfoCardTitle,
  InfoCardValue,
  SectionTitle,
} from './CheckoutView.styles';
import {
  FulfillmentFieldGrid,
  FulfillmentHelperText,
  FulfillmentInput,
  FulfillmentInputGroup,
  FulfillmentLabel,
  FulfillmentModeButton,
  FulfillmentModeGrid,
  FulfillmentTextarea,
} from './CheckoutFulfillmentSection.styles';

type FulfillmentSectionProps = {
  fulfillmentDetails: CheckoutFulfillmentDetails;
  fulfillmentIntent: CheckoutFulfillmentIntent;
  onFulfillmentDetailsChange: (details: CheckoutFulfillmentDetails) => void;
};

const FulfillmentSummaryCards: React.FC<{ summary: string }> = ({ summary }) => (
  <CheckoutInfoGrid>
    <InfoCard>
      <InfoCardIcon>
        <MapPin size={20} aria-hidden="true" />
      </InfoCardIcon>
      <InfoCardTitle>Method</InfoCardTitle>
      <InfoCardValue>Local delivery / pickup</InfoCardValue>
    </InfoCard>

    <InfoCard>
      <InfoCardIcon>
        <PackageCheck size={20} aria-hidden="true" />
      </InfoCardIcon>
      <InfoCardTitle>Products</InfoCardTitle>
      <InfoCardValue>{summary}</InfoCardValue>
    </InfoCard>
  </CheckoutInfoGrid>
);

const FulfillmentModeSelector: React.FC<{
  details: CheckoutFulfillmentDetails;
  intent: CheckoutFulfillmentIntent;
  updateDetails: (patch: Partial<CheckoutFulfillmentDetails>) => void;
}> = ({ details, intent, updateDetails }) => {
  const modes = [
    { value: 'local_delivery' as const, label: 'Local Delivery' },
    { value: 'pickup' as const, label: 'Pickup' },
  ].filter(({ value }) => intent.mode === 'local_delivery_or_pickup' || intent.fulfillmentTypes.includes(value));

  return (
    <FulfillmentModeGrid aria-label="Choose delivery or pickup">
      {modes.map(({ value, label }) => (
        <FulfillmentModeButton
          key={value}
          type="button"
          $active={details.mode === value}
          aria-pressed={details.mode === value}
          onClick={() => updateDetails({ mode: value })}
        >
          {label}
        </FulfillmentModeButton>
      ))}
    </FulfillmentModeGrid>
  );
};

const DeliveryFields: React.FC<{
  details: CheckoutFulfillmentDetails;
  updateDetails: (patch: Partial<CheckoutFulfillmentDetails>) => void;
}> = ({ details, updateDetails }) => (
  <>
    <FulfillmentInputGroup $wide>
      <FulfillmentLabel htmlFor="delivery-address">Delivery Address</FulfillmentLabel>
      <FulfillmentInput
        id="delivery-address"
        value={details.streetAddress}
        onChange={(event) => updateDetails({ streetAddress: event.target.value })}
      />
    </FulfillmentInputGroup>
    <FulfillmentInputGroup>
      <FulfillmentLabel htmlFor="delivery-city">City</FulfillmentLabel>
      <FulfillmentInput id="delivery-city" value={details.city} onChange={(event) => updateDetails({ city: event.target.value })} />
    </FulfillmentInputGroup>
    <FulfillmentInputGroup>
      <FulfillmentLabel htmlFor="delivery-state">State</FulfillmentLabel>
      <FulfillmentInput id="delivery-state" value={details.state} onChange={(event) => updateDetails({ state: event.target.value })} />
    </FulfillmentInputGroup>
    <FulfillmentInputGroup>
      <FulfillmentLabel htmlFor="delivery-postal">ZIP</FulfillmentLabel>
      <FulfillmentInput id="delivery-postal" value={details.postalCode} onChange={(event) => updateDetails({ postalCode: event.target.value })} />
    </FulfillmentInputGroup>
  </>
);

const FulfillmentDetailsFields: React.FC<{
  details: CheckoutFulfillmentDetails;
  updateDetails: (patch: Partial<CheckoutFulfillmentDetails>) => void;
}> = ({ details, updateDetails }) => (
  <FulfillmentFieldGrid>
    <FulfillmentInputGroup>
      <FulfillmentLabel htmlFor="fulfillment-recipient">Recipient</FulfillmentLabel>
      <FulfillmentInput id="fulfillment-recipient" value={details.recipientName} onChange={(event) => updateDetails({ recipientName: event.target.value })} />
    </FulfillmentInputGroup>
    <FulfillmentInputGroup>
      <FulfillmentLabel htmlFor="fulfillment-phone">Phone</FulfillmentLabel>
      <FulfillmentInput id="fulfillment-phone" value={details.phone} onChange={(event) => updateDetails({ phone: event.target.value })} />
    </FulfillmentInputGroup>

    {details.mode === 'pickup' ? (
      <FulfillmentInputGroup>
        <FulfillmentLabel htmlFor="pickup-window">Pickup Window</FulfillmentLabel>
        <FulfillmentInput
          id="pickup-window"
          placeholder="Example: Tuesday after 3 PM"
          value={details.pickupWindow}
          onChange={(event) => updateDetails({ pickupWindow: event.target.value })}
        />
      </FulfillmentInputGroup>
    ) : (
      <DeliveryFields details={details} updateDetails={updateDetails} />
    )}

    <FulfillmentInputGroup $wide>
      <FulfillmentLabel htmlFor="fulfillment-notes">Notes</FulfillmentLabel>
      <FulfillmentTextarea id="fulfillment-notes" rows={3} value={details.notes} onChange={(event) => updateDetails({ notes: event.target.value })} />
    </FulfillmentInputGroup>
  </FulfillmentFieldGrid>
);

const CheckoutFulfillmentSection: React.FC<FulfillmentSectionProps> = ({
  fulfillmentDetails,
  fulfillmentIntent,
  onFulfillmentDetailsChange,
}) => {
  if (!fulfillmentIntent.required) return null;
  const supportsDelivery = fulfillmentIntent.fulfillmentTypes.includes('local_delivery')
    || fulfillmentIntent.mode === 'local_delivery_or_pickup';
  const updateDetails = (patch: Partial<CheckoutFulfillmentDetails>) => {
    onFulfillmentDetailsChange({ ...fulfillmentDetails, ...patch });
  };

  return (
    <CheckoutSection
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      <SectionTitle>
        <PackageCheck size={20} aria-hidden="true" />
        Product Fulfillment
      </SectionTitle>

      <FulfillmentSummaryCards summary={fulfillmentIntent.summary} />
      {supportsDelivery
        ? <FulfillmentModeSelector details={fulfillmentDetails} intent={fulfillmentIntent} updateDetails={updateDetails} />
        : null}
      <FulfillmentDetailsFields details={fulfillmentDetails} updateDetails={updateDetails} />
      <FulfillmentHelperText>Used only by SwanStudios staff to coordinate your product handoff.</FulfillmentHelperText>
    </CheckoutSection>
  );
};

export default CheckoutFulfillmentSection;
