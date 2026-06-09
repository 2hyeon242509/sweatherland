import React from 'react';
import { Image } from 'react-native';

interface Props {
  width?: number;
  height?: number;
}

export default function JejuLogo({ width = 60, height = 75 }: Props) {
  return (
    <Image
      source={require('../../assets/images/jeju_logo.webp')}
      style={{ width, height }}
      resizeMode="contain"
    />
  );
}
