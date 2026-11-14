import React from 'react';

/**
 * Animated dark background using pure CSS animations
 * for better performance (no JS animation frames).
 */
export const AnimatedBackground = ({
  variant = 'default',
}) => {
  const isSubtle = variant === 'subtle';

  return (
    <>
      {/* Inline keyframes — only injected once */}
      <style>{`
        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(100px, 80px) scale(1.18); }
          66% { transform: translate(-50px, -40px) scale(0.92); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-90px, -70px) scale(0.85); }
          66% { transform: translate(60px, 50px) scale(1.15); }
        }
        @keyframes drift3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-80px, 60px) scale(1.12); }
          66% { transform: translate(40px, -80px) scale(0.88); }
        }
        @keyframes drift4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(60px, -50px) scale(0.9); }
          66% { transform: translate(-90px, 60px) scale(1.12); }
        }
        @keyframes streak {
          0%, 100% { transform: translateX(-20%) scaleX(0.6); opacity: 0; }
          50% { transform: translateX(60%) scaleX(1.3); opacity: 1; }
        }
        @keyframes streak2 {
          0%, 100% { transform: translateX(15%) scaleX(0.8); opacity: 0; }
          50% { transform: translateX(-50%) scaleX(1.4); opacity: 0.8; }
        }
      `}</style>

      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* ── Drifting Gradient Orbs (CSS only) ── */}
        <div
          className="absolute rounded-full"
          style={{
            width: '50vw', height: '50vw', maxWidth: 700, maxHeight: 700,
            background: 'radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(59,130,246,0.08) 50%, transparent 70%)',
            top: '-10%', left: '-5%', filter: 'blur(80px)',
            animation: 'drift1 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: '45vw', height: '45vw', maxWidth: 600, maxHeight: 600,
            background: 'radial-gradient(circle, rgba(139,92,246,0.30) 0%, rgba(139,92,246,0.06) 50%, transparent 70%)',
            bottom: '-5%', right: '-5%', filter: 'blur(80px)',
            animation: 'drift2 24s ease-in-out infinite',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: '35vw', height: '35vw', maxWidth: 500, maxHeight: 500,
            background: 'radial-gradient(circle, rgba(34,211,238,0.20) 0%, rgba(34,211,238,0.04) 50%, transparent 70%)',
            top: '35%', right: '10%', filter: 'blur(70px)',
            animation: 'drift3 18s ease-in-out infinite',
          }}
        />
        {!isSubtle && (
          <div
            className="absolute rounded-full"
            style={{
              width: '30vw', height: '30vw', maxWidth: 450, maxHeight: 450,
              background: 'radial-gradient(circle, rgba(168,85,247,0.25) 0%, rgba(168,85,247,0.05) 50%, transparent 70%)',
              top: '5%', left: '45%', filter: 'blur(70px)',
              animation: 'drift4 22s ease-in-out infinite',
            }}
          />
        )}

        {/* ── Aurora Streaks (CSS only) ── */}
        {!isSubtle && (
          <>
            <div
              className="absolute rounded-full"
              style={{
                height: 3, width: '80%', top: '25%', left: '-10%',
                background: 'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 20%, rgba(139,92,246,0.4) 80%, transparent 100%)',
                filter: 'blur(1px)',
                animation: 'streak 8s ease-in-out infinite',
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                height: 2, width: '60%', top: '65%', right: '-5%',
                background: 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.4) 30%, rgba(34,211,238,0.3) 70%, transparent 100%)',
                filter: 'blur(1px)',
                animation: 'streak2 11s ease-in-out infinite',
              }}
            />
          </>
        )}

        {/* ── Subtle Background Pattern ── */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>
    </>
  );
};

export default AnimatedBackground;
