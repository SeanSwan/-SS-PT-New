import React, { ReactNode, forwardRef } from 'react';
import styled from 'styled-components';
import { Card, CardContent, Divider, Typography } from './primitives';
import { alpha } from '../../styles/mui-replacements';

interface MainCardProps {
  border?: boolean;
  boxShadow?: boolean;
  children: ReactNode;
  className?: string;
  contentClass?: string;
  contentSX?: React.CSSProperties;
  darkTitle?: boolean;
  elevation?: number;
  secondary?: ReactNode;
  shadow?: string;
  sx?: React.CSSProperties;
  title?: string | ReactNode;
  codeHighlight?: boolean;
  content?: boolean;
}

const CardHeaderWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
`;

// Enhanced MainCard component specifically styled for fitness/training context
const MainCard = forwardRef<HTMLDivElement, MainCardProps>(
  (
    {
      border = true,
      boxShadow,
      children,
      className = '',
      contentClass = '',
      contentSX = {},
      darkTitle,
      elevation = 8,
      secondary,
      shadow,
      sx = {},
      title,
      content = true,
      ...others
    },
    ref
  ) => {
    const cardStyle: React.CSSProperties = {
      position: 'relative',
      border: border ? `1px solid ${alpha('#90caf9', 0.46)}` : 'none',
      borderRadius: '8px',
      boxShadow:
        boxShadow && !border
          ? shadow || '0px 2px 14px 0px rgb(32 40 45 / 8%)'
          : 'inherit',
      background: 'linear-gradient(to right bottom, #fcfcfc, #f8f9fa)',
      ...sx,
    };

    return (
      <Card elevation={elevation} ref={ref} className={className} style={cardStyle} {...others}>
        {/* card header and action */}
        {!darkTitle && title && (
          <CardHeaderWrapper>
            <Typography variant="h5">{title}</Typography>
            {secondary && <div>{secondary}</div>}
          </CardHeaderWrapper>
        )}
        {darkTitle && title && (
          <CardHeaderWrapper>
            <Typography variant="h4">{title}</Typography>
            {secondary && <div>{secondary}</div>}
          </CardHeaderWrapper>
        )}

        {/* content & header divider */}
        {title && <Divider style={{ opacity: 0.5 }} />}

        {/* card content */}
        {content ? (
          <CardContent className={contentClass || ''} style={{ padding: '20px', ...contentSX }}>
            {children}
          </CardContent>
        ) : (
          children
        )}
      </Card>
    );
  }
);

export default MainCard;
