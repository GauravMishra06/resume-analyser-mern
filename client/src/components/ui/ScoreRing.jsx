import React from 'react';
import { motion } from 'framer-motion';

export const ScoreRing = ({
  score,
  maxValue = 100,
  size = 'md',
  showLabel = true,
  className = '',
  animate = true,
}) => {
  // Clamp score between 0 and maxValue
  const clampedScore = Math.min(maxValue, Math.max(0, score));
  // Calculate percentage for ring progress and colors (0-100)
  const percentage = (clampedScore / maxValue) * 100;

  const sizeConfig = {
    sm: { width: 84, strokeWidth: 6, fontSize: 'text-xl', centerClass: 'gap-0.5' },
    md: { width: 124, strokeWidth: 8, fontSize: 'text-3xl', centerClass: 'gap-0.5' },
    lg: { width: 184, strokeWidth: 10, fontSize: 'text-5xl', centerClass: 'gap-1' },
    xl: { width: 244, strokeWidth: 12, fontSize: 'text-7xl', centerClass: 'gap-1.5' },
  };

  const config = sizeConfig[size] || sizeConfig.md;
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getScoreTone = () => {
    if (percentage >= 80) {
      return {
        color: '#60a5fa',
        from: '#22d3ee',
        to: '#60a5fa',
        glow: 'rgba(96, 165, 250, 0.28)'
      };
    }
    if (percentage >= 60) {
      return {
        color: '#8b5cf6',
        from: '#a78bfa',
        to: '#8b5cf6',
        glow: 'rgba(139, 92, 246, 0.26)'
      };
    }
    return {
      color: '#f43f5e',
      from: '#fb7185',
      to: '#f43f5e',
      glow: 'rgba(244, 63, 94, 0.26)'
    };
  };

  const getScoreLabel = () => {
    if (percentage >= 80) return 'Excellent';
    if (percentage >= 60) return 'Good';
    if (percentage >= 40) return 'Fair';
    return 'Needs Work';
  };

  const displayValue = maxValue <= 10
    ? (Number.isInteger(clampedScore) ? clampedScore : clampedScore.toFixed(1))
    : Math.round(clampedScore);

  const tone = getScoreTone();
  const gradientId = React.useId();

  const ringEase = [0.16, 1, 0.3, 1];
  const circleVariants = {
    hidden: { strokeDashoffset: circumference },
    visible: {
      strokeDashoffset,
      transition: {
        duration: 1.5,
        ease: ringEase,
        delay: 0.2
      }
    }
  };

  const initialOffset = animate ? circumference : strokeDashoffset;

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full blur-2xl"
          style={{
            background: `radial-gradient(circle, ${tone.glow} 0%, transparent 70%)`,
            transform: 'scale(1.25)'
          }}
        />

        <svg
          width={config.width}
          height={config.width}
          className="transform -rotate-90"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={tone.from} />
              <stop offset="100%" stopColor={tone.to} />
            </linearGradient>
          </defs>

          {/* Background circle */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-surface-200/60"
          />

          {/* Progress circle */}
          {animate ? (
            <motion.circle
              cx={config.width / 2}
              cy={config.width / 2}
              r={radius}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={config.strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={initialOffset}
              strokeLinecap="round"
              variants={circleVariants}
              initial="hidden"
              animate="visible"
            />
          ) : (
            <circle
              cx={config.width / 2}
              cy={config.width / 2}
              r={radius}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={config.strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Center content */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center ${config.centerClass}`}>
          <span className={`font-bold ${config.fontSize} text-white tracking-tight`}>
            {displayValue}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
            / {maxValue}
          </span>
        </div>
      </div>

      {showLabel && (
        <span
          className="mt-3 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/10"
          style={{ color: tone.color, backgroundColor: `${tone.color}15` }}
        >
          {getScoreLabel()}
        </span>
      )}
    </div>
  );
};

export default ScoreRing;
