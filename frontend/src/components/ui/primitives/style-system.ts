import type React from 'react';

export type Space = number | string;

export interface StyleSystemProps {
  sx?: React.CSSProperties;
  m?: Space;
  mt?: Space;
  mr?: Space;
  mb?: Space;
  ml?: Space;
  mx?: Space;
  my?: Space;
  p?: Space;
  pt?: Space;
  pr?: Space;
  pb?: Space;
  pl?: Space;
  px?: Space;
  py?: Space;
  display?: React.CSSProperties['display'];
  flexDirection?: React.CSSProperties['flexDirection'];
  alignItems?: React.CSSProperties['alignItems'];
  justifyContent?: React.CSSProperties['justifyContent'];
  flexWrap?: React.CSSProperties['flexWrap'];
  gap?: Space;
  width?: React.CSSProperties['width'];
  height?: React.CSSProperties['height'];
  minWidth?: React.CSSProperties['minWidth'];
  minHeight?: React.CSSProperties['minHeight'];
  maxWidth?: React.CSSProperties['maxWidth'];
  maxHeight?: React.CSSProperties['maxHeight'];
}

export const toSpace = (value?: Space): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  return typeof value === 'number' ? `${value * 8}px` : value;
};

export const getSystemStyles = (props: StyleSystemProps): React.CSSProperties => ({
  margin: toSpace(props.m),
  marginTop: toSpace(props.mt ?? props.my),
  marginRight: toSpace(props.mr ?? props.mx),
  marginBottom: toSpace(props.mb ?? props.my),
  marginLeft: toSpace(props.ml ?? props.mx),
  padding: toSpace(props.p),
  paddingTop: toSpace(props.pt ?? props.py),
  paddingRight: toSpace(props.pr ?? props.px),
  paddingBottom: toSpace(props.pb ?? props.py),
  paddingLeft: toSpace(props.pl ?? props.px),
  display: props.display,
  flexDirection: props.flexDirection,
  alignItems: props.alignItems,
  justifyContent: props.justifyContent,
  flexWrap: props.flexWrap,
  gap: toSpace(props.gap),
  width: props.width,
  height: props.height,
  minWidth: props.minWidth,
  minHeight: props.minHeight,
  maxWidth: props.maxWidth,
  maxHeight: props.maxHeight,
});

export const mergeStyle = (
  style: React.CSSProperties | undefined,
  sx: React.CSSProperties | undefined,
  system: React.CSSProperties
): React.CSSProperties => ({
  ...system,
  ...sx,
  ...style,
});
