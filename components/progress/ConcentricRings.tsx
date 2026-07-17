"use client";

import { motion } from "framer-motion";

export type RingData = {
  label: string;
  value: number; // 0 to 100
  color: string; // Tailwind color class or hex
};

export function ConcentricRings({ rings, size = 160 }: { rings: RingData[]; size?: number }) {
  const center = size / 2;
  const strokeWidth = size * 0.085;
  const gap = strokeWidth * 1.4;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 transform">
        {rings.map((ring, index) => {
          const radius = center - strokeWidth / 2 - index * gap;
          const circumference = 2 * Math.PI * radius;
          const strokeDashoffset = circumference - (ring.value / 100) * circumference;

          return (
            <g key={ring.label}>
              {/* Background Track */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-white/5"
              />
              {/* Foreground Progress */}
              <motion.circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                className={ring.color.startsWith("#") ? "" : ring.color}
                style={ring.color.startsWith("#") ? { color: ring.color } : {}}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: "easeOut", delay: index * 0.1 }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
