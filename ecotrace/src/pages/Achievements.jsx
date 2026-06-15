// src/pages/Achievements.jsx — Gamification: streaks, badges, milestones
import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const BADGE_CATALOG = [
  { id: 'first_log',       icon: '🌱', name: 'First Step',         desc: 'Logged your first activity',         threshold: 1 },
  { id: 'week_streak',     icon: '🔥', name: '7-Day Streak',       desc: 'Logged every day for a week',         threshold: 7 },
  { id: 'meat_free_week',  icon: '🥦', name: 'Meatless Week',      desc: 'Chose vegetarian all week',           threshold: 7 },
  { id: 'transit_champ',   icon: '🚌', name: 'Transit Champion',   desc: 'Used public transit 10 times',        threshold: 10 },
  { id: 'century_saved',   icon: '🏆', name: 'Century Saver',      desc: 'Saved 100 kg CO₂e cumulatively',      threshold: 100 },
  { id: 'bike_warrior',    icon: '🚲', name: 'Bike Warrior',       desc: 'Cycled instead of driving 5 times',   threshold: 5 },
  { id: 'nudge_champion',  icon: '✅', name: 'Nudge Champion',     desc: 'Accepted 10 AI nudges',               threshold: 10 },
  { id: 'eco_master',      icon: '🌍', name: 'Eco Master',         desc: 'Maintained a 30-day streak',          threshold: 30 },
];

const MILESTONES = [
  { kg: 10,   label: '10 kg saved',   icon: '🌿' },
  { kg: 50,   label: '50 kg saved',   icon: '🌲' },
  { kg: 100,  label: '100 kg saved',  icon: '🏔️' },
  { kg: 500,  label: '500 kg saved',  icon: '🌎' },
  { kg: 1000, label: '1 tonne saved', icon: '🌟' },
];

export default function Achievements() {
  const { user } = useAuth();
  const [earned, setEarned]       = useState([]);
  const [userStats, setUserStats] = useState({});
  const [loading, setLoading]     = useState(true);

  const fetchAchievements = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [achSnap, userSnap] = await Promise.all([
        getDocs(collection(db, 'users', user.uid, 'achievements')),
        getDoc(doc(db, 'users', user.uid)),
      ]);
      setEarned(achSnap.docs.map(d => d.id));
      if (userSnap.exists()) setUserStats(userSnap.data());
    } catch { /* empty state */ }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Fetch-on-mount: state updates run after the awaited reads, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAchievements();
  }, [user, fetchAchievements]);

  const totalSaved  = userStats.totalSavedKg   ?? 0;
  const streak      = userStats.currentStreak  ?? 0;
  const nextMilestone = MILESTONES.find(m => m.kg > totalSaved) ?? MILESTONES[MILESTONES.length - 1];
  const milestoneProgress = Math.min((totalSaved / nextMilestone.kg) * 100, 100);

  return (
    <div className="page">
      <header className="page-header animate-fade-up">
        <h1 className="page-title">Achievements</h1>
        <p className="page-subtitle">Your eco-journey milestones and badges</p>
      </header>

      {/* Streak hero */}
      <div className="card animate-fade-up animate-fade-up-1" style={{ marginBottom: 'var(--sp-8)', display: 'flex', alignItems: 'center', gap: 'var(--sp-6)', flexWrap: 'wrap' }}>
        <div className="streak-display">
          <span className="streak-icon" aria-hidden="true">🔥</span>
          <div>
            <div className="streak-count">{loading ? '—' : streak}</div>
            <div className="streak-label">Day streak</div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-2)', fontSize: 'var(--fs-sm)', color: 'var(--clr-text-2)' }}>
            <span>Progress to next milestone</span>
            <span style={{ fontWeight: 600 }}>{nextMilestone.icon} {nextMilestone.label}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${milestoneProgress}%` }} role="progressbar" aria-valuenow={milestoneProgress} aria-valuemin={0} aria-valuemax={100} />
          </div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)', marginTop: 'var(--sp-2)' }}>
            {totalSaved.toFixed(1)} / {nextMilestone.kg} kg CO₂e saved
          </div>
        </div>
      </div>

      {/* Badge grid */}
      <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: 'var(--sp-4)' }} className="animate-fade-up animate-fade-up-2">Badges</h2>
      {loading ? (
        <div className="grid-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 'var(--rad-lg)' }} />)}
        </div>
      ) : (
        <div className="grid-4 animate-fade-up animate-fade-up-2" role="list" aria-label="Achievement badges">
          {BADGE_CATALOG.map(badge => {
            const isEarned = earned.includes(badge.id);
            return (
              <div
                key={badge.id}
                role="listitem"
                className="stat-card"
                style={{
                  textAlign: 'center',
                  opacity: isEarned ? 1 : 0.4,
                  filter: isEarned ? 'none' : 'grayscale(1)',
                  transition: 'opacity 0.3s, filter 0.3s',
                  cursor: 'default',
                }}
                aria-label={`${badge.name}: ${isEarned ? 'Earned' : 'Not yet earned'}`}
              >
                <div style={{ fontSize: '2.2rem', marginBottom: 'var(--sp-2)' }} aria-hidden="true">{badge.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-1)' }}>{badge.name}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)', lineHeight: 1.4 }}>{badge.desc}</div>
                {isEarned && (
                  <div className="badge badge-green" style={{ marginTop: 'var(--sp-3)', display: 'inline-flex' }}>Earned ✓</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Milestone timeline */}
      <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, margin: 'var(--sp-8) 0 var(--sp-4)' }} className="animate-fade-up animate-fade-up-3">Milestones</h2>
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}
        className="animate-fade-up animate-fade-up-3"
        role="list"
        aria-label="Saving milestones"
      >
        {MILESTONES.map(m => {
          const done = totalSaved >= m.kg;
          return (
            <div
              key={m.kg}
              role="listitem"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-4)',
                padding: 'var(--sp-4)',
                borderRadius: 'var(--rad-md)',
                background: done ? 'rgba(34,211,165,0.08)' : 'var(--clr-surface)',
                border: `1px solid ${done ? 'rgba(34,211,165,0.25)' : 'var(--clr-border)'}`,
                transition: 'all 0.3s',
              }}
            >
              <span style={{ fontSize: '1.5rem', opacity: done ? 1 : 0.35 }} aria-hidden="true">{m.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', flex: 1 }}>{m.label}</span>
              {done
                ? <span className="badge badge-green">✓ Done</span>
                : <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)' }}>{(m.kg - totalSaved).toFixed(1)} kg to go</span>
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}
