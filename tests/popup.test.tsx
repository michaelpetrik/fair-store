import { render } from '@testing-library/preact';
import { expect, it, describe } from 'vitest';
import { Popup } from '../src/popup'; // Assuming default export or named export

describe('Popup', () => {
  it('should render the Fair Store welcome message', () => {
    const { getByText } = render(<Popup />);
    expect(getByText('Fair Store')).toBeDefined();
    expect(getByText('Welcome to Fair Store extension! 🎉')).toBeDefined();
  });

  // Add more tests here if the Popup component grows in complexity
  // For example, testing interactions, state changes, or prop handling.
});