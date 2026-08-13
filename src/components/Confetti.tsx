"use client";

import { useEffect, useState } from "react";

interface Piece {
  key: number;
  left: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
  size: number;
}

let seq = 0;

/**
 * Renders nothing until `burst` changes to a new value, then spawns a batch
 * of falling pieces and clears itself after they land. Pass an
 * ever-incrementing counter as `burst` to fire repeatedly.
 */
export function Confetti({
  burst,
  colors,
  count = 24,
}: {
  burst: number;
  colors: string[];
  count?: number;
}) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (burst === 0) return;
    const batch: Piece[] = Array.from({ length: count }, () => ({
      key: seq++,
      left: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.15,
      duration: 0.7 + Math.random() * 0.5,
      drift: (Math.random() - 0.5) * 60,
      size: 5 + Math.random() * 5,
    }));
    setPieces(batch);
    const t = setTimeout(() => setPieces([]), 1300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burst]);

  if (pieces.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {pieces.map((p) => (
        <span
          key={p.key}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: "50%",
            width: p.size,
            height: p.size * 0.4,
            background: p.color,
            borderRadius: 1,
            opacity: 0,
            // @ts-expect-error -- custom properties consumed by the keyframe below
            "--drift": `${p.drift}px`,
            animation: `confetti-fall ${p.duration}s ease-out ${p.delay}s forwards`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(var(--drift), 70px) rotate(340deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
