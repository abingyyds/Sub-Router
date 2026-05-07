import React from 'react';
import BrandLayout from '../shared/BrandLayout';
import MaoqiuSplash from './Splash';

export default function MaoqiuLayout() {
  return (
    <>
      <MaoqiuSplash />
      <BrandLayout variant="maoqiu" />
    </>
  );
}
