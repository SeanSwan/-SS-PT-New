/**
 * Gallery vNext — post-enhancement thank-you sheet. PARITY with the shipped support section
 * (GalleryPage.tsx:2040-2058): confirms the enhancement request, then offers the two support chains —
 * refer a friend (→ referral modal) and leave a tip (→ donation modal) — plus an explicit dismiss.
 * All three are >=48px real buttons; the sheet is a polite status region, never blocking.
 */
import styled from 'styled-components';

const Sheet = styled.section`
  margin: 24px 0;
  padding: 20px;
  border-radius: var(--gallery-r-panel, 16px);
  background: var(--gallery-surface-1);
  border: 1px solid var(--gallery-chrome-edge);
  box-shadow: var(--gallery-elev-2);
`;

const Title = styled.h2`
  margin: 0 0 6px;
  font-family: var(--gallery-font-display);
  font-size: 1.2rem;
  color: var(--gallery-ink);
`;

const Text = styled.p`
  margin: 0 0 14px;
  color: var(--gallery-ink-2);
  font-size: 0.95rem;
  line-height: 1.5;
`;

const Buttons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const Btn = styled.button<{ $variant: 'primary' | 'secondary' | 'ghost' }>`
  min-height: var(--gallery-target, 48px);
  padding: 0 16px;
  border-radius: var(--gallery-r-card, 12px);
  font-size: 0.92rem;
  cursor: pointer;
  border: 1px solid
    ${(p) => (p.$variant === 'ghost' ? 'transparent' : 'var(--gallery-line)')};
  background: ${(p) =>
    p.$variant === 'primary' ? 'var(--gallery-surface-2)' : 'transparent'};
  color: ${(p) => (p.$variant === 'ghost' ? 'var(--gallery-ink-2)' : 'var(--gallery-ink)')};
  box-shadow: ${(p) =>
    p.$variant === 'primary'
      ? '0 0 0 1px var(--gallery-chrome-edge), 0 8px 24px var(--gallery-wing-22)'
      : 'none'};
`;

export interface SupportSheetProps {
  /** support chain: dismiss this sheet, open the referral modal (truth-locked flow) */
  onRefer(): void;
  /** support chain: dismiss this sheet, open the donation modal (truth-locked flow) */
  onTip(): void;
  onDismiss(): void;
}

export function SupportSheet({ onRefer, onTip, onDismiss }: SupportSheetProps) {
  return (
    <Sheet role="status" data-testid="gallery-support-sheet">
      <Title>Enhancement Request Submitted!</Title>
      <Text>
        Your enhanced photos will be delivered to your email. Love what we do? Here are ways to
        support SwanStudios:
      </Text>
      <Buttons>
        <Btn type="button" $variant="primary" onClick={onRefer}>
          Refer a Friend for Training
        </Btn>
        <Btn type="button" $variant="secondary" onClick={onTip}>
          Leave a Tip
        </Btn>
        <Btn type="button" $variant="ghost" onClick={onDismiss}>
          No thanks, just send my photos!
        </Btn>
      </Buttons>
    </Sheet>
  );
}

export default SupportSheet;
