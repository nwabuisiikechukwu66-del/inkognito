/**
 * InkParticles — components/ui/InkParticles.tsx
 *
 * Canvas-based floating ink particle effect.
 * Creates subtle, atmospheric floating drops across the background.
 * Responds to Shadow Mood selection (color tinting).
 * Respects prefers-reduced-motion and user toggle in settings.
 * Performance-optimized with requestAnimationFrame.
 */

"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
  hue: number;
}

interface InkParticlesProps {
  /** CSS color for particle tinting */
  accentColor?: string;
  /** Number of particles (lower = better perf) */
  count?: number;
  /** Enable/disable particles */
  enabled?: boolean;
}

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function InkParticles({
  accentColor = "#c41e3a",
  count = 35,
  enabled = true,
}: InkParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const createParticle = useCallback(
    (width: number, height: number): Particle => {
      const { h } = hexToHSL(accentColor);
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.5 + 0.5,
        opacity: Math.random() * 0.15 + 0.02,
        velocityX: (Math.random() - 0.5) * 0.3,
        velocityY: -Math.random() * 0.4 - 0.1,
        life: 0,
        maxLife: Math.random() * 400 + 200,
        hue: h + (Math.random() - 0.5) * 30,
      };
    },
    [accentColor]
  );

  useEffect(() => {
    if (!enabled || reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    // Initialize particles
    particlesRef.current = Array.from({ length: count }, () =>
      createParticle(window.innerWidth, window.innerHeight)
    );

    const animate = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      for (const p of particlesRef.current) {
        p.x += p.velocityX;
        p.y += p.velocityY;
        p.life++;

        // Fade in and out based on life
        const lifeRatio = p.life / p.maxLife;
        const fadeIn = Math.min(lifeRatio * 5, 1);
        const fadeOut = Math.max(1 - (lifeRatio - 0.7) / 0.3, 0);
        const alpha = p.opacity * fadeIn * (lifeRatio > 0.7 ? fadeOut : 1);

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 40%, 30%, ${alpha})`;
        ctx.fill();

        // Soft glow
        if (p.radius > 1.5) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 50%, 25%, ${alpha * 0.15})`;
          ctx.fill();
        }

        // Reset if particle dies or leaves screen
        if (p.life >= p.maxLife || p.y < -10 || p.x < -10 || p.x > w + 10) {
          const newP = createParticle(w, h);
          newP.y = h + 10;
          Object.assign(p, newP);
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [enabled, reducedMotion, count, createParticle]);

  if (!enabled || reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.8 }}
      aria-hidden="true"
    />
  );
}
