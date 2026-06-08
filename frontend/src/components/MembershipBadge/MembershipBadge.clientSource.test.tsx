import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MembershipBadge from './MembershipBadge';

describe('MembershipBadge client source normalization', () => {
  it('renders human-formatted Move Fitness source values as Move Fitness', () => {
    render(<MembershipBadge clientSource=" Move Fitness " />);

    expect(screen.getByTitle('Move Fitness Member')).toBeInTheDocument();
    expect(screen.getByText('Move Fitness')).toBeInTheDocument();
  });

  it('hides human-formatted external source values when labels are suppressed', () => {
    const { container } = render(<MembershipBadge clientSource=" External " showLabel={false} />);

    expect(container).toBeEmptyDOMElement();
  });
});
