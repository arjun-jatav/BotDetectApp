import React from 'react';
import Svg, { Path, Line } from 'react-native-svg';

interface WifiOffIconProps {
  size?: number;
  color?: string;
}

export function WifiOffIcon({ size = 24, color = '#EF4444' }: WifiOffIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line
        x1="2"
        y1="2"
        x2="22"
        y2="22"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M8.5 16.5a5 5 0 017 0"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 12.5a10 10 0 015.3-2.6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19 12.5a10 10 0 00-3.3-2.1"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M1.5 8.5a15 15 0 016-3.2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22.5 8.5a15 15 0 00-8.5-4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1="12"
        y1="20"
        x2="12.01"
        y2="20"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}
