import React, { useEffect, useRef } from 'react';

export const ForgeSparks: React.FC<{ density?: number }> = ({ density = 35 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    interface Spark {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      fadeRate: number;
      hue: number;
    }

    const sparks: Spark[] = [];

    const createSpark = (resetY?: boolean): Spark => ({
      x: Math.random() * width,
      y: resetY ? height + Math.random() * 20 : Math.random() * height,
      vx: (Math.random() - 0.5) * 0.7,
      vy: -(Math.random() * 0.9 + 0.4), // Drifts gently upward
      size: Math.random() * 1.8 + 0.6,
      alpha: Math.random() * 0.6 + 0.2,
      fadeRate: Math.random() * 0.003 + 0.001,
      hue: Math.random() > 0.4 ? 38 : 155, // Amber or Emerald spark
    });

    for (let i = 0; i < density; i++) {
      sparks.push(createSpark());
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < sparks.length; i++) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.alpha -= s.fadeRate;

        if (s.alpha <= 0 || s.y < -10 || s.x < 0 || s.x > width) {
          sparks[i] = createSpark(true);
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        if (s.hue === 38) {
          // Amber molten spark
          ctx.fillStyle = `rgba(245, 158, 11, ${Math.max(0, s.alpha)})`;
          ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
        } else {
          // Emerald verified spark
          ctx.fillStyle = `rgba(16, 185, 129, ${Math.max(0, s.alpha)})`;
          ctx.shadowColor = 'rgba(16, 185, 129, 0.8)';
        }
        ctx.shadowBlur = 6;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-60"
    />
  );
};
