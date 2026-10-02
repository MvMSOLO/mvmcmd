import { useMemo } from "react";

type Point = {
  x: number;
  y: number;
  r: number;
  opacity: number;
};

type MvmGenerativeFieldProps = {
  seed: string;
  energy: number;
  density: number;
};

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextRandom(state: { value: number }): number {
  state.value = (Math.imul(state.value, 1664525) + 1013904223) >>> 0;
  return state.value / 4294967296;
}

export function MvmGenerativeField({ seed, energy, density }: MvmGenerativeFieldProps) {
  const safeEnergy = Math.max(0, Math.min(1, energy));
  const safeDensity = Math.max(0.2, Math.min(1, density));
  const geometry = useMemo(() => {
    const state = { value: hashSeed(seed) };
    const count = Math.round(8 + safeDensity * 8);
    const points: Point[] = Array.from({ length: count }, () => ({
      x: 8 + nextRandom(state) * 84,
      y: 10 + nextRandom(state) * 76,
      r: 0.9 + nextRandom(state) * 1.7,
      opacity: 0.18 + nextRandom(state) * 0.38,
    }));

    const links = points.map((point, index) => {
      const target = points[(index + 1) % points.length];
      return {
        x1: point.x,
        y1: point.y,
        x2: target.x,
        y2: target.y,
        opacity: 0.05 + nextRandom(state) * 0.1,
      };
    });

    const accent = points
      .filter((_, index) => index % 3 === 0)
      .slice(0, 5)
      .map((point) => ({
        x: point.x,
        y: point.y,
        r: point.r * (1.8 + nextRandom(state) * 1.8),
      }));

    return { points, links, accent };
  }, [seed, safeDensity]);

  return (
    <svg
      className="mvm-generative-field"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{
        "--mvm-field-energy": safeEnergy.toFixed(3),
        "--mvm-field-density": safeDensity.toFixed(3),
      } as React.CSSProperties}
    >
      <g className="mvm-generative-field__links">
        {geometry.links.map((link, index) => (
          <line
            key={`link-${index}`}
            x1={link.x1}
            y1={link.y1}
            x2={link.x2}
            y2={link.y2}
            opacity={link.opacity}
          />
        ))}
      </g>
      <g className="mvm-generative-field__nodes">
        {geometry.points.map((point, index) => (
          <circle
            key={`point-${index}`}
            cx={point.x}
            cy={point.y}
            r={point.r}
            opacity={point.opacity}
            style={{ "--mvm-field-delay": `${index * 80}ms` } as React.CSSProperties}
          />
        ))}
      </g>
      <g className="mvm-generative-field__accent">
        {geometry.accent.map((point, index) => (
          <circle
            key={`accent-${index}`}
            cx={point.x}
            cy={point.y}
            r={point.r}
            style={{ "--mvm-field-delay": `${index * 130}ms` } as React.CSSProperties}
          />
        ))}
      </g>
    </svg>
  );
}
