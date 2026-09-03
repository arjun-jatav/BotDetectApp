import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SplashScreen } from '../src/shared/components/SplashScreen';

describe('SplashScreen', () => {
  it('renders splash screen elements correctly', () => {
    let component: ReactTestRenderer.ReactTestRenderer | null = null;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(<SplashScreen />);
    });

    expect(component).toBeTruthy();
  });
});
