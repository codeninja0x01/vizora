'use client';

import { useId } from 'react';

interface AutoClipLogoProps {
  /** Icon + wordmark size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show the text wordmark beside the icon */
  showWordmark?: boolean;
  className?: string;
}

/**
 * AutoClip brand logo — inline SVG icon with optional wordmark.
 * Works in both light and dark contexts; icon uses its own gradient fill.
 */
export function AutoClipLogo({
  size = 'md',
  showWordmark = true,
  className = '',
}: AutoClipLogoProps) {
  const id = useId();
  const bgId = `${id}-bg`;
  const boltId = `${id}-bolt`;

  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 40 : 32;
  const fontSize = size === 'sm' ? 15 : size === 'lg' ? 22 : 18;

  return (
    <div
      role="img"
      aria-label="AutoClip"
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
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="55%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient
            id={boltId}
            x1="10"
            y1="5"
            x2="22"
            y2="27"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#BAE6FD" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="32" height="32" rx="7.5" fill={`url(#${bgId})`} />

        {/* Film sprocket holes — left */}
        <rect
          x="2"
          y="9.5"
          width="4.5"
          height="5.5"
          rx="1.5"
          fill="#0A2550"
          opacity="0.35"
        />
        <rect
          x="2"
          y="18"
          width="4.5"
          height="5.5"
          rx="1.5"
          fill="#0A2550"
          opacity="0.35"
        />

        {/* Film sprocket holes — right */}
        <rect
          x="25.5"
          y="9.5"
          width="4.5"
          height="5.5"
          rx="1.5"
          fill="#0A2550"
          opacity="0.35"
        />
        <rect
          x="25.5"
          y="18"
          width="4.5"
          height="5.5"
          rx="1.5"
          fill="#0A2550"
          opacity="0.35"
        />

        {/* Lightning bolt */}
        <path
          d="M19 5L9.5 18H15.5L12 27L22.5 14H16.5L19 5Z"
          fill={`url(#${boltId})`}
        />
      </svg>

      {/* Wordmark */}
      {showWordmark && (
        <span
          style={{ fontSize, lineHeight: 1 }}
          className="font-heading tracking-tight text-foreground"
        >
          <span className="font-medium">Auto</span>
          <span className="font-bold">Clip</span>
        </span>
      )}
    </div>
  );
}
