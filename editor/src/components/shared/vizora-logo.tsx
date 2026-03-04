'use client';

import { useId } from 'react';

interface VizoraLogoProps {
  /** Icon + wordmark size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show the text wordmark beside the icon */
  showWordmark?: boolean;
  className?: string;
}

/**
 * Vizora brand logo — inline SVG icon with optional wordmark.
 * Works in both light and dark contexts; icon uses its own gradient fill.
 */
export function VizoraLogo({
  size = 'md',
  showWordmark = true,
  className = '',
}: VizoraLogoProps) {
  const id = useId();
  const bgId = `${id}-bg`;
  const symbolId = `${id}-symbol`;

  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 40 : 32;
  const fontSize = size === 'sm' ? 15 : size === 'lg' ? 22 : 18;

  return (
    <div
      role="img"
      aria-label="Vizora"
      className={`flex items-center gap-2.5 select-none ${className}`}
    >
      {/* Icon mark */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient
            id={bgId}
            x1="0"
            y1="0"
            x2="32"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="55%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
          <linearGradient
            id={symbolId}
            x1="10"
            y1="5"
            x2="22"
            y2="27"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E9D5FF" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="32" height="32" rx="8" fill={`url(#${bgId})`} />

        {/* Play/Vision triangle — the "V" of Vizora */}
        <path
          d="M11 7L25 16L11 25V7Z"
          fill={`url(#${symbolId})`}
          opacity="0.95"
        />

        {/* Lens ring — the "eye" / vision element */}
        <circle
          cx="16"
          cy="16"
          r="5.5"
          stroke="white"
          strokeWidth="1.5"
          fill="none"
          opacity="0.4"
        />
      </svg>

      {/* Wordmark */}
      {showWordmark && (
        <span
          style={{ fontSize, lineHeight: 1 }}
          className="font-heading tracking-tight text-foreground"
        >
          <span className="font-medium">Viz</span>
          <span className="font-bold">ora</span>
        </span>
      )}
    </div>
  );
}
