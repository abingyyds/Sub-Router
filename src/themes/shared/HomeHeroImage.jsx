import React from 'react';

export default function HomeHeroImage({ src, alt, variant = 'light', className = '' }) {
  if (!src) return null;

  const chrome =
    variant === 'dark'
      ? 'border-white/10 bg-white/[0.04] shadow-2xl shadow-black/40'
      : 'border-slate-200 bg-white shadow-2xl shadow-slate-900/10';

  return (
    <div className={`overflow-hidden rounded-2xl border ${chrome} ${className}`}>
      <img
        src={src}
        alt={alt || ''}
        className="block h-full min-h-[260px] w-full object-cover"
        loading="eager"
      />
    </div>
  );
}
