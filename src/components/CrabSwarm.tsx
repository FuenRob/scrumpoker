import React, { useEffect, useMemo } from 'react';

interface CrabSwarmProps {
  active: boolean;
  duration?: number;
  onComplete?: () => void;
}

interface CrabParticle {
  id: number;
  top: number;
  size: number;
  speed: number;
  delay: number;
  wobbleDuration: number;
  opacity: number;
  zIndex: number;
}

const CRAB_COUNT = 55;

// Pure deterministic pseudo-random generator
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateParticles(): CrabParticle[] {
  const items: CrabParticle[] = [];
  for (let i = 0; i < CRAB_COUNT; i++) {
    const seed = (i + 1) * 37.17;
    const r1 = seededRandom(seed);
    const r2 = seededRandom(seed + 1.33);
    const r3 = seededRandom(seed + 2.71);
    const r4 = seededRandom(seed + 3.14);
    const r5 = seededRandom(seed + 4.95);
    const r6 = seededRandom(seed + 5.62);

    // Stratified vertical distribution across screen height
    const bucket = i % 11;
    const bucketBase = 3 + bucket * 8.2;
    const jitter = (r1 - 0.5) * 6;
    const top = Math.min(94, Math.max(3, bucketBase + jitter));

    // Size distribution: normal (36-52px), tiny (24-32px), giant (58-72px)
    let size: number;
    if (r2 < 0.2) {
      size = 24 + r3 * 8;
    } else if (r2 < 0.8) {
      size = 36 + r3 * 16;
    } else {
      size = 56 + r3 * 16;
    }

    // Horizontal march speed (2.2s to 4.2s)
    const speed = 2.2 + r4 * 2.0;

    // Staggered launch delay (0s to 2.2s)
    const delay = r5 * 2.2;

    // Scuttle wobble speed (0.26s to 0.48s)
    const wobbleDuration = 0.26 + r6 * 0.22;

    const opacity = 0.88 + r1 * 0.12;
    const zIndex = 60 + Math.floor(size);

    items.push({
      id: i,
      top,
      size,
      speed,
      delay,
      wobbleDuration,
      opacity,
      zIndex,
    });
  }

  return items;
}

export const CrabSwarm: React.FC<CrabSwarmProps> = ({
  active,
  duration = 5500,
  onComplete,
}) => {
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => {
      onComplete?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [active, duration, onComplete]);

  const particles = useMemo(() => {
    if (!active) return [];
    return generateParticles();
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-50 select-none"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="crab-swarm-particle"
          style={{
            top: `${p.top}%`,
            animationDuration: `${p.speed}s`,
            animationDelay: `${p.delay}s`,
            zIndex: p.zIndex,
            opacity: p.opacity,
          }}
        >
          <span
            className="crab-swarm-inner"
            style={{
              fontSize: `${p.size}px`,
              lineHeight: 1,
              animationDuration: `${p.wobbleDuration}s`,
            }}
          >
            🦀
          </span>
        </div>
      ))}
    </div>
  );
};
