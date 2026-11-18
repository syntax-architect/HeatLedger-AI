import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 0.8,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const currentVal = useRef<{ val: number }>({ val: value });

  useEffect(() => {
    const obj = currentVal.current;
    gsap.to(obj, {
      val: value,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        if (spanRef.current) {
          const formatted = decimals > 0 ? obj.val.toFixed(decimals) : Math.round(obj.val).toLocaleString();
          spanRef.current.innerText = `${prefix}${formatted}${suffix}`;
        }
      },
    });
  }, [value, duration, prefix, suffix, decimals]);

  return (
    <span ref={spanRef} className={`font-mono tabular-nums ${className}`}>
      {prefix}{decimals > 0 ? value.toFixed(decimals) : value.toLocaleString()}{suffix}
    </span>
  );
};
