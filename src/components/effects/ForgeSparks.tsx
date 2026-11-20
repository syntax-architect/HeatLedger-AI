import React from 'react';

export const ForgeSparks: React.FC<{ density?: number }> = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 opacity-40"
      style={{
        backgroundSize: '32px 32px',
        backgroundImage:
          'radial-gradient(circle, currentColor 0.75px, transparent 0.75px), linear-gradient(to right, rgba(161, 161, 170, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(161, 161, 170, 0.08) 1px, transparent 1px)',
        color: 'rgba(161, 161, 170, 0.22)',
      }}
    />
  );
};
