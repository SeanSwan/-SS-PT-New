import React, { ReactNode, forwardRef } from 'react';
import { Card, CardHeader, CardContent, Typography, Divider } from '@mui/material';

interface MainCardProps {
  border?: boolean;
  boxShadow?: boolean;
  children: ReactNode;
  className?: string;
  contentClass?: string;
  contentSX?: object;
  darkTitle?: boolean;
  elevation?: number;
  secondary?: ReactNode;
  shadow?: string;
  sx?: object;
  title?: string | ReactNode;
  codeHighlight?: boolean;
  // Add this new property to control whether content is wrapped in CardContent
  content?: boolean;
}

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
    return (
      <Card
        elevation={elevation}
        ref={ref}
        {...others}
        className={className}
        sx={{
          position: 'relative',
          border: border ? '1px solid rgba(144, 202, 249, 0.46)' : 'none',
          borderRadius: 2,
          boxShadow:
            boxShadow && !border
              ? shadow || '0px 2px 14px 0px rgb(32 40 45 / 8%)'
              : 'inherit',
          ':hover': {
            boxShadow: boxShadow ? shadow || '0px 2px 14px 0px rgb(32 40 45 / 12%)' : 'inherit'
          },
          '& pre': {
            m: 0,
            p: '12px !important',
            fontFamily: 'inherit',
            fontSize: '0.75rem'
          },
          // Training app specific styling 
          background: 'linear-gradient(to right bottom, #fcfcfc, #f8f9fa)',
          ...sx
        }}
      >
        {/* card header and action */}
        {!darkTitle && title && (
          <CardHeader
            sx={{ p: 2.5 }}
            title={<Typography variant="h5">{title}</Typography>}
            action={secondary}
          />
        )}
        {darkTitle && title && (
          <CardHeader
            sx={{ p: 2.5 }}
            title={<Typography variant="h4">{title}</Typography>}
            action={secondary}
          />
        )}

        {/* content & header divider */}
        {title && <Divider sx={{ opacity: 0.5 }} />}

        {/* card content */}
        {content ? (
          <CardContent
            sx={{
              p: 2.5,
              ...contentSX
            }}
            className={contentClass || ''}
          >
            {children}
          </CardContent>
        ) : (
          // Render children directly without CardContent wrapper
          children
        )}
      </Card>
    );
  }
);

export default MainCard;