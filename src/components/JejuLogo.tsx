/**
 * 제주대학교 로고 — SVG 인라인 컴포넌트
 */
import React from 'react';
import { Platform } from 'react-native';
import Svg, {
  Rect, Path, Text as SvgText, G, Ellipse, Line, Circle,
} from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
  color?: string;
}

export default function JejuLogo({
  width = 60,
  height = 75,
  color = '#1A3175',
}: Props) {
  if (Platform.OS === 'web') {
    return (
      <img
        src={require('../../assets/images/jeju_logo.svg')}
        width={width}
        height={height}
        style={{ objectFit: 'contain' }}
        alt="제주대학교"
      />
    );
  }

  // 네이티브: react-native-svg
  return (
    <Svg width={width} height={height} viewBox="0 0 320 400">
      {/* J 세로 막대 */}
      <Rect x="218" y="0" width="68" height="310" rx="4" fill={color} />
      {/* J 곡선 */}
      <Path
        d="M 286 280 Q 286 370 210 380 Q 140 390 110 345 Q 90 315 100 285 L 140 285 Q 134 310 155 330 Q 185 355 220 338 Q 250 320 250 285 L 286 280 Z"
        fill={color}
      />
      {/* 불꽃 1 */}
      <Path d="M 185 290 Q 195 230 180 175 Q 168 130 178 70 Q 182 35 195 10 Q 200 0 205 5 Q 195 35 200 80 Q 208 140 196 195 Q 186 245 200 295 Z" fill={color} />
      {/* 불꽃 2 */}
      <Path d="M 155 285 Q 165 220 148 162 Q 134 112 146 52 Q 150 18 163 -2 Q 168 -10 172 -2 Q 162 28 168 75 Q 176 138 162 192 Q 150 244 164 288 Z" fill={color} />
      {/* 불꽃 3 */}
      <Path d="M 124 278 Q 134 210 116 150 Q 101 98 114 38 Q 118 5 132 -16 Q 137 -24 141 -16 Q 130 16 136 65 Q 144 128 129 182 Q 116 234 132 280 Z" fill={color} />
      {/* 불꽃 4 */}
      <Path d="M 93 268 Q 103 198 84 136 Q 68 82 82 20 Q 86 -14 101 -36 Q 106 -44 110 -36 Q 98 -4 105 46 Q 113 110 97 165 Q 83 218 100 268 Z" fill={color} />
      {/* 책 테두리 */}
      <Rect x="110" y="216" width="100" height="72" rx="3" fill={color} />
      <Rect x="114" y="220" width="96" height="64" rx="2" fill="white" />
      {/* 책 중앙선 */}
      <Rect x="160" y="220" width="3" height="64" fill={color} />
      {/* 책 위아래선 */}
      <Rect x="110" y="216" width="100" height="5" fill={color} />
      <Rect x="110" y="283" width="100" height="5" fill={color} />
      {/* 왼쪽 펜촉 */}
      <Path d="M 137 240 L 144 228 L 151 240 L 148 252 L 144 258 L 140 252 Z" fill={color} />
      {/* 오른쪽 사슴 */}
      <Ellipse cx="181" cy="256" rx="9" ry="11" fill={color} />
      <Path d="M 175 248 L 170 236 L 166 229" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M 170 236 L 165 233" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <Path d="M 187 248 L 192 236 L 196 229" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M 192 236 L 197 233" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* JEJU */}
      <SvgText x="160" y="328" fontSize={36} fontWeight="900" fill={color} textAnchor="middle" letterSpacing={6}>JEJU</SvgText>
      {/* 1952 */}
      <SvgText x="160" y="362" fontSize={26} fontWeight="700" fill={color} textAnchor="middle" letterSpacing={4}>1952</SvgText>
    </Svg>
  );
}
