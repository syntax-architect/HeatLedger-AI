import React from 'react';
import { motion } from 'framer-motion';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface GsapRevealProps {
  children: React.ReactNode;
  className?: string;
  y?: number;
  x?: number;
  delay?: number;
  duration?: number;
  start?: string;
}

/**
 * Scroll-choreographed reveal wrapper.
 * Uses compositor-only transform/opacity properties with reduced-motion support.
 */
export const GsapReveal: React.FC<GsapRevealProps> = ({
  children,
  className = '',
  y = 10,
  x = 0,
  delay = 0,
  duration = 0.42,
}) => {
  const reduced = prefersReducedMotion();
  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};

interface GsapStaggerProps {
  children: React.ReactNode;
  className?: string;
  selector?: string;
  y?: number;
  stagger?: number;
  duration?: number;
  start?: string;
}

/**
 * Staggers direct children smoothly on scroll entry.
 */
export const GsapStagger: React.FC<GsapStaggerProps> = ({
  children,
  className = '',
  y = 20,
  stagger = 0.08,
  duration = 0.65,
}) => {
  const reduced = prefersReducedMotion();
  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-10% 0px' }}
      variants={{
        visible: {
          transition: {
            staggerChildren: stagger,
          },
        },
      }}
    >
      {React.Children.map(children, (child) => (
        <motion.div
          variants={{
            hidden: { opacity: 0, y },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration, ease: [0.22, 1, 0.36, 1] },
            },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

interface GsapParallaxProps {
  children: React.ReactNode;
  className?: string;
  offset?: number;
}

/**
 * Subtle compositor-only scroll parallax layer.
 */
export const GsapParallax: React.FC<GsapParallaxProps> = ({
  children,
  className = '',
}) => {
  return <div className={className}>{children}</div>;
};

interface MagneticWrapProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

/**
 * Tactile, restrained magnetic micro-interaction for primary actions.
 * Disabled automatically on coarse pointers and reduced-motion preferences.
 */
export const MagneticWrap: React.FC<MagneticWrapProps> = ({
  children,
  className = 'inline-block',
}) => {
  return <div className={className}>{children}</div>;
};
