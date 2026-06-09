/**
 * MasterDetailIdentityStyles.ts
 * =============================
 * Compact selected-client identity metadata for the Client Hub detail pane.
 * Keeps long email values from breaking mid-domain on phone while status and
 * tier remain visible.
 */
import styled from 'styled-components';

export const DetailSubtext = styled.p`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 0;
  min-width: 0;
  margin: 4px 0 0;
  color: var(--text-secondary, #4070C0);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  line-height: 1.45;

  > span {
    min-width: 0;
  }

  > span + span::before {
    content: '/';
    margin: 0 8px;
    color: var(--text-muted, rgba(224, 236, 244, 0.62));
  }

  > span[data-swan-detail-email='true'] {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 520px) {
    gap: 3px 0;
    font-size: 12px;
    line-height: 1.25;

    > span + span::before {
      margin: 0 6px;
    }

    > span[data-swan-detail-email='true'] {
      flex: 0 1 100%;
    }

    > span[data-swan-detail-email='true'] + span::before {
      content: '';
      margin: 0;
    }
  }
`;
