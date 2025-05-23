import React from 'react';
import styled from 'styled-components';

const ProgressContainer = styled.div`
  width: 100%;
  margin: 1.5rem 0;
`;

const ProgressBarWrapper = styled.div`
  width: 100%;
  height: 4px;
  background: rgba(120, 81, 169, 0.3);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
`;

// Fixed: Using data-* attribute instead of camelCase prop
const ProgressBarFill = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(
    to right,
    #00ffff,
    #7851a9
  );
  width: ${props => props['data-percent'] || '0%'};
  transition: width 0.5s ease;
`;

const ProgressText = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  text-align: right;
  margin-top: 0.5rem;
`;

const ProgressBar = ({ percent }) => {
  return (
    <ProgressContainer>
      <ProgressBarWrapper>
        {/* Fixed: Using data-percent instead of percentComplete */}
        <ProgressBarFill data-percent={`${percent}%`} />
      </ProgressBarWrapper>
      <ProgressText>Profile Completion: {percent}%</ProgressText>
    </ProgressContainer>
  );
};

export default ProgressBar;