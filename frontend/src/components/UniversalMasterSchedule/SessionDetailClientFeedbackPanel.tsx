import React from 'react';
import { PartyPopper, Star } from 'lucide-react';
import {
  BodyText,
  Caption,
  Label,
  StyledTextarea,
} from './ui';
import { FormFieldTopSpaced } from './SessionDetailModal.baseStyles';
import {
  CelebrationIcon,
  ClientFeedbackPanel,
  FeedbackHeader,
  FeedbackIntro,
  FeedbackSubmitButton,
  FeedbackSubmittedBadge,
  FeedbackThankYou,
  RatingValue,
  StarButton,
  StarRatingContainer,
} from './SessionDetailModal.feedbackStyles';

interface SessionDetailClientFeedbackPanelProps {
  clientRating: number;
  clientComment: string;
  feedbackSubmitted: boolean;
  feedbackLoading: boolean;
  onRatingChange: (rating: number) => void;
  onCommentChange: (comment: string) => void;
  onSubmit: () => void;
}

const ratingOptions = [1, 2, 3, 4, 5];

const SessionDetailClientFeedbackPanel: React.FC<SessionDetailClientFeedbackPanelProps> = ({
  clientRating,
  clientComment,
  feedbackSubmitted,
  feedbackLoading,
  onRatingChange,
  onCommentChange,
  onSubmit,
}) => (
  <ClientFeedbackPanel>
    <FeedbackHeader>
      <h3>Rate Your Session</h3>
      {feedbackSubmitted && (
        <FeedbackSubmittedBadge>Feedback Submitted</FeedbackSubmittedBadge>
      )}
    </FeedbackHeader>

    {!feedbackSubmitted ? (
      <>
        <FeedbackIntro secondary>
          How was your training session? Your feedback helps us improve.
        </FeedbackIntro>

        <StarRatingContainer>
          {ratingOptions.map((star) => (
            <StarButton
              key={star}
              $active={star <= clientRating}
              aria-label={`Rate ${star} out of 5`}
              aria-pressed={star <= clientRating}
              onClick={() => onRatingChange(star)}
              type="button"
            >
              <Star
                size={18}
                fill={star <= clientRating ? 'currentColor' : 'none'}
                strokeWidth={2}
                aria-hidden="true"
              />
            </StarButton>
          ))}
          {clientRating > 0 && (
            <RatingValue>
              {clientRating} / 5
            </RatingValue>
          )}
        </StarRatingContainer>

        <FormFieldTopSpaced>
          <Label htmlFor="client-feedback-comment">Comments (optional)</Label>
          <StyledTextarea
            id="client-feedback-comment"
            value={clientComment}
            onChange={(event) => onCommentChange(event.target.value)}
            rows={3}
            placeholder="Share your thoughts about the session..."
          />
        </FormFieldTopSpaced>

        <FeedbackSubmitButton
          variant="primary"
          size="medium"
          onClick={onSubmit}
          disabled={feedbackLoading || clientRating === 0}
          isLoading={feedbackLoading}
        >
          {feedbackLoading ? 'Submitting...' : 'Submit Feedback'}
        </FeedbackSubmitButton>
      </>
    ) : (
      <FeedbackThankYou>
        <CelebrationIcon>
          <PartyPopper size={18} aria-hidden="true" />
        </CelebrationIcon>
        <BodyText>Thank you for your feedback!</BodyText>
        <Caption secondary>
          Your rating: {clientRating} / 5 stars
        </Caption>
      </FeedbackThankYou>
    )}
  </ClientFeedbackPanel>
);

export default SessionDetailClientFeedbackPanel;
