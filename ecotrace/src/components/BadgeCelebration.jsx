// src/components/BadgeCelebration.jsx — Animated badge earned modal
import { useEffect, useState, useCallback } from 'react';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { db, analytics } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const TIER_COLORS = {
  bronze: { bg: '#78350f', accent: '#f59e0b', glow: 'rgba(245,158,11,0.4)' },
  silver: { bg: '#1e293b', accent: '#94a3b8', glow: 'rgba(148,163,184,0.4)' },
  gold:   { bg: '#1c1008', accent: '#fbbf24', glow: 'rgba(251,191,36,0.5)' },
};

export default function BadgeCelebration() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]); // queue of undisplayed badges
  const [current, setCurrent] = useState(null);

  // Poll for newly earned, undisplayed badges
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkForNewBadges, 8000);
    checkForNewBadges(); // check immediately on mount
    return () => clearInterval(interval);
  }, [user]);

  async function checkForNewBadges() {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'users', user.uid, 'achievements'),
        where('displayed', '==', false)
      );
      const snap = await getDocs(q);
      const badges = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
      if (badges.length > 0) {
        setPending(prev => {
          const existingIds = new Set(prev.map(b => b.docId));
          const fresh = badges.filter(b => !existingIds.has(b.docId));
          return [...prev, ...fresh];
        });
      }
    } catch { /* silent */ }
  }

  // Show next badge from queue
  useEffect(() => {
    if (!current && pending.length > 0) {
      setCurrent(pending[0]);
      setPending(prev => prev.slice(1));
    }
  }, [pending, current]);

  async function dismiss() {
    if (!current || !user) return;
    // Mark as displayed in Firestore
    try {
      await updateDoc(doc(db, 'users', user.uid, 'achievements', current.docId), {
        displayed: true,
      });
    } catch { /* ignore */ }
    if (analytics) {
      logEvent(analytics, 'badge_earned', {
        badge_id:   current.id,
        badge_tier: current.tier,
        badge_name: current.name,
      });
    }
    setCurrent(null);
  }

  if (!current) return null;

  const colors = TIER_COLORS[current.tier] ?? TIER_COLORS.bronze;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Badge earned: ${current.name}`}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.3s ease',
      }}
      onClick={dismiss}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--clr-surface)',
          border: `2px solid ${colors.accent}`,
          borderRadius: 'var(--rad-xl)',
          padding: 'var(--sp-10) var(--sp-8)',
          maxWidth: 380,
          width: '90vw',
          textAlign: 'center',
          boxShadow: `0 0 60px ${colors.glow}, 0 25px 50px rgba(0,0,0,0.5)`,
          animation: 'slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          position: 'relative',
        }}
      >
        {/* Confetti particles */}
        <Confetti color={colors.accent} />

        {/* Tier label */}
        <div style={{
          fontSize: 'var(--fs-xs)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: colors.accent,
          marginBottom: 'var(--sp-4)',
        }}>
          🎉 New Badge Earned
        </div>

        {/* Badge icon */}
        <div style={{
          fontSize: '4rem',
          lineHeight: 1,
          marginBottom: 'var(--sp-4)',
          filter: `drop-shadow(0 0 20px ${colors.glow})`,
          animation: 'pulse 1.5s ease infinite',
        }}>
          {current.icon ?? '🏅'}
        </div>

        {/* Name */}
        <h2 style={{
          fontSize: 'var(--fs-2xl)',
          fontWeight: 900,
          marginBottom: 'var(--sp-2)',
          background: `linear-gradient(135deg, ${colors.accent}, #fff)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          {current.name}
        </h2>

        {/* Tier badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--sp-2)',
          padding: '2px 12px',
          background: `${colors.accent}22`,
          border: `1px solid ${colors.accent}55`,
          borderRadius: 'var(--rad-full)',
          fontSize: 'var(--fs-xs)',
          fontWeight: 700,
          color: colors.accent,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 'var(--sp-4)',
        }}>
          {current.tier}
        </div>

        {/* Description */}
        <p style={{
          color: 'var(--clr-text-2)',
          fontSize: 'var(--fs-sm)',
          lineHeight: 1.6,
          marginBottom: 'var(--sp-8)',
        }}>
          {current.description}
        </p>

        <button
          id="badge-celebration-dismiss"
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={dismiss}
        >
          Awesome! 🚀
        </button>
      </div>
    </div>
  );
}

// Simple CSS confetti burst
function Confetti({ color }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 'var(--rad-xl)' }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: i % 3 === 0 ? 8 : 5,
            height: i % 3 === 0 ? 8 : 5,
            borderRadius: i % 2 === 0 ? '50%' : 0,
            background: i % 3 === 0 ? color : i % 3 === 1 ? '#22d3a5' : '#0ea5e9',
            left: `${5 + (i * 4.5) % 90}%`,
            top:  `${(i * 13) % 80}%`,
            opacity: 0.7,
            animation: `confetti-fall ${1.5 + (i % 4) * 0.3}s ${(i * 0.08)}s ease-out forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-60px) rotate(0deg); opacity: 0.9; }
          100% { transform: translateY(300px) rotate(${Math.random() > 0.5 ? '' : '-'}360deg); opacity: 0; }
        }
        @keyframes slideUp {
          from { transform: translateY(40px) scale(0.92); opacity: 0; }
          to   { transform: translateY(0) scale(1);      opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
