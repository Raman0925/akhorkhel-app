import { render, screen } from '@testing-library/react-native';
import React from 'react';

import App from '@/app/App';

it('renders the first-launch screen', async () => {
  await render(<App />);
  expect(await screen.findByTestId('screen-Onboarding')).toBeTruthy();
});
