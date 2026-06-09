/**
 * SWEAT OUT 브러시 로고 — SVG 인라인 컴포넌트
 * react-native-svg 사용 (Expo 네이티브 + 웹 모두 호환)
 */
import React from 'react';
import { Platform } from 'react-native';
import Svg, { Path, Text as SvgText, G, Line } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
  color?: string;
}

export default function SweatOutLogo({
  width = 220,
  height = 130,
  color = '#1A3352',
}: Props) {
  if (Platform.OS === 'web') {
    // 웹: <img> 태그로 SVG 직접 사용 (가장 선명)
    return (
      <img
        src={require('../../assets/images/sweatout_logo.svg')}
        width={width}
        height={height}
        style={{ objectFit: 'contain' }}
        alt="SWEAT OUT"
      />
    );
  }

  // 네이티브: react-native-svg
  const vw = 520;
  const vh = 310;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${vw} ${vh}`}>
      {/* SWEAT */}
      <G transform="rotate(-4, 260, 120)">
        <SvgText
          x="260" y="140"
          fontSize={148}
          fontWeight="900"
          fill={color}
          textAnchor="middle"
          letterSpacing={-4}
        >SWEAT</SvgText>
      </G>
      {/* OUT */}
      <G transform="rotate(-4, 260, 255)">
        <SvgText
          x="265" y="268"
          fontSize={164}
          fontWeight="900"
          fill={color}
          textAnchor="middle"
          letterSpacing={-6}
        >OUT</SvgText>
      </G>
      {/* 밑줄 */}
      <Path
        d="M 60 288 Q 180 296 300 292 Q 390 288 470 296"
        stroke={color}
        strokeWidth={9}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
