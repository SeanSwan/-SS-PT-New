
import { render, screen } from '@testing-library/react';
import styled from 'styled-components';
import { describe, expect, it } from 'vitest';
import { StyledBox } from './StyledBox';

const ConflictingBase = styled.div`margin-top: 2px;`;

describe('StyledBox', () => {
  it('converts a style object into a generated class instead of a DOM style attribute', () => {
    render(
      <StyledBox data-testid="styled-box" $style={{ marginTop: 12, opacity: 0.5 }}>
        Styled content
      </StyledBox>
    );

    const element = screen.getByTestId('styled-box');
    expect(element).not.toHaveAttribute('style');
    expect(element).toHaveStyle({ marginTop: '12px', opacity: '0.5' });
  });

  it('preserves intrinsic element semantics through the polymorphic as prop', () => {
    render(<StyledBox as="p">Paragraph content</StyledBox>);
    expect(screen.getByText('Paragraph content').tagName).toBe('P');
  });

  it('keeps migrated override styles stronger than the target styled component', () => {
    render(
      <StyledBox as={ConflictingBase} data-testid="styled-override" $style={{ marginTop: 12 }} />
    );

    const override = screen.getByTestId('styled-override');
    const generatedCss = document.head.textContent ?? '';
    const doubledOverrideClass = override.className
      .split(' ')
      .find((className) => generatedCss.includes(`.${className}.${className}{margin-top:12px;}`));

    expect(doubledOverrideClass).toBeTruthy();
  });
});
