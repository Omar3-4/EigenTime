import React from "react";

interface ArcProgressProps {
  readonly size: number;
  readonly radius: number;
  readonly arcColor: string;
  readonly ratio: number;
  readonly isDeepFlow: boolean;
}

export function ArcProgress({ size, radius, arcColor, ratio, isDeepFlow }: ArcProgressProps) {
  const CIRC = 2 * Math.PI * radius;
  const ticks = Array.from({ length: 60 }, (_, i) => i);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g>
        {ticks.map((i) => {
          const angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
          const major = i % 5 === 0;
          const outer = radius + 26;
          const inner = outer - (major ? 14 : 7);
          const cx = size / 2;
          return (
            <line
              key={`tick-${i}`}
              x1={cx + Math.cos(angle) * inner}
              y1={cx + Math.sin(angle) * inner}
              x2={cx + Math.cos(angle) * outer}
              y2={cx + Math.sin(angle) * outer}
              stroke={major ? arcColor : "var(--border)"}
              strokeWidth={major ? 2.5 : 1.5}
              strokeLinecap="round"
              opacity={major ? 0.85 : 0.5}
            />
          );
        })}
      </g>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth={14}
        opacity={0.4}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={arcColor}
        strokeWidth={14}
        strokeLinecap="round"
        strokeDasharray={CIRC}
        strokeDashoffset={CIRC * (1 - ratio)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          transition: "stroke-dashoffset 300ms linear, stroke 1000ms ease, filter 1000ms ease",
          filter: isDeepFlow ? "drop-shadow(0 0 20px rgba(0,240,255,0.7))" : "none",
        }}
      />
    </svg>
  );
}
