import React, { useId } from 'react';

export const CRYPTO_NETWORKS = {
  tron: { label: 'TRON', tag: 'TRC-20', accent: '#ef233c' },
  eth: { label: 'Ethereum', tag: 'ERC-20', accent: '#627eea' },
  bsc: { label: 'BNB Smart Chain', tag: 'BEP-20', accent: '#d99e20' },
  polygon: { label: 'Polygon', tag: 'PoS', accent: '#8247e5' },
  solana: { label: 'Solana', tag: 'SPL', accent: '#14f195' },
};

export const CryptoNetworkIcon = ({ chain, size = 40, className = '' }) => {
  const iconSize = Math.max(20, Number(size) || 40);
  const gradientId = `solana-icon-gradient-${useId().replace(/:/g, '')}`;
  const common = {
    width: iconSize,
    height: iconSize,
    viewBox: '0 0 32 32',
    fill: 'none',
    role: 'img',
    'aria-label': CRYPTO_NETWORKS[chain]?.label || chain,
  };

  if (chain === 'tron') {
    return <svg {...common} className={className}><circle cx='16' cy='16' r='16' fill='#FF060A' /><path d='M22.7 8.3 9.1 14.5l6.9 9.2 6.7-13.2Z' fill='white' /><path d='m9.1 14.5 6.9 9.2 1.2-9.4Z' fill='white' opacity='.55' /><path d='m9.1 14.5 10.4-1.5-3.5 1.3Z' fill='#FF060A' opacity='.8' /></svg>;
  }
  if (chain === 'eth') {
    return <svg {...common} className={className}><circle cx='16' cy='16' r='16' fill='#627EEA' /><path d='m16 4-.25.85v15.04l.25.21 6.52-3.95L16 4Z' fill='white' /><path d='M16 4 9.48 16.15 16 20.1V4Z' fill='white' opacity='.55' /><path d='m16 21.5-.15.18v5.07l.15.4 6.52-9.7L16 21.5Z' fill='white' /><path d='M16 27.15v-5.65l-6.52-3.95L16 27.15Z' fill='white' opacity='.55' /></svg>;
  }
  if (chain === 'bsc') {
    return <svg {...common} className={className}><circle cx='16' cy='16' r='16' fill='#F3BA2F' /><path d='m16 7.4-3.2 3.2 3.2 3.2 3.2-3.2L16 7.4Zm-5.2 5.2L7.6 15.8l3.2 3.2 3.2-3.2-3.2-3.2Zm10.4 0L18 15.8l3.2 3.2 3.2-3.2-3.2-3.2ZM16 17.9l-3.2 3.2 3.2 3.2 3.2-3.2-3.2-3.2Zm0-3.6-2.2 2.2 2.2 2.2 2.2-2.2-2.2-2.2Z' fill='white' /></svg>;
  }
  if (chain === 'polygon') {
    return <svg {...common} className={className}><circle cx='16' cy='16' r='16' fill='#8247E5' /><path d='m9 12.2 4-2.3 4 2.3v4.6l-4 2.3-4-2.3v-4.6Zm6 0 4-2.3 4 2.3v4.6l-4 2.3-4-2.3v-4.6Z' fill='none' stroke='white' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' /></svg>;
  }
  if (chain === 'solana') {
    return <svg {...common} className={className}><defs><linearGradient id={gradientId} x1='5' y1='26' x2='27' y2='6' gradientUnits='userSpaceOnUse'><stop stopColor='#9945FF' /><stop offset='.5' stopColor='#14F195' /><stop offset='1' stopColor='#00FFA3' /></linearGradient></defs><circle cx='16' cy='16' r='16' fill='#111827' /><path d='m9 10.1 2.1-2.2h12.2c.65 0 .98.78.52 1.24l-2.1 2.16H9.5c-.65 0-.97-.77-.5-1.2Z' fill={`url(#${gradientId})`} /><path d='m8.1 15.1 2.1-2.16h12.3c.64 0 .96.77.5 1.22l-2.1 2.17H8.6c-.65 0-.97-.77-.5-1.23Z' fill={`url(#${gradientId})`} /><path d='m9 20.1 2.1-2.17h12.2c.65 0 .98.78.52 1.24l-2.1 2.16H9.5c-.65 0-.97-.77-.5-1.23Z' fill={`url(#${gradientId})`} /></svg>;
  }
  return <span className={`inline-flex items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground ${className}`} style={{ width: iconSize, height: iconSize }} aria-label={chain}>?</span>;
};

export const CryptoTokenIcon = ({ token, size = 28, className = '' }) => {
  const iconSize = Math.max(20, Number(size) || 28);
  const isUsdc = String(token || '').toLowerCase() === 'usdc';
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-white/70 text-xs font-extrabold shadow-sm dark:border-black/20 ${isUsdc ? 'bg-[#2775ca] text-white' : 'bg-[#26a17b] text-white'} ${className}`} style={{ width: iconSize, height: iconSize }} aria-label={isUsdc ? 'USDC' : 'USDT'}>{isUsdc ? '$' : '₮'}</span>;
};

export const CRYPTO_TOKEN_OPTIONS = [
  { key: 'usdt', label: 'USDT', accent: '#26a17b' },
  { key: 'usdc', label: 'USDC', accent: '#2775ca' },
];
