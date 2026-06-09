import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface Props {
  width?: number;
  height?: number;
}

export default function SweatOutLogo({ width = 220, height = 130 }: Props) {
  return (
    <Image
      source={require('../../assets/images/sweatout_logo.webp')}
      style={{ width, height }}
      resizeMode="contain"
    />
  );
}
