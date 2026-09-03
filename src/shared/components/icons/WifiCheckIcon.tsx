import React from 'react';
import Svg, { Path, Line } from 'react-native-svg';

interface WifiCheckIconProps {
  size?: number;
  color?: string;
}

export function WifiCheckIcon({ size = 24, color = '#10B981' }: WifiCheckIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1.42 9a16 16 0 0 1 21.16 0"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 12.55a11 11 0 0 1 14.08 0"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.53 16.11a6 6 0 0 1 6.95 0"
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
