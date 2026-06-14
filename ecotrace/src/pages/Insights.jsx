// src/pages/Insights.jsx — AI nudges + rule-based fallbacks
import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const RULE_NUDGES = [
  { id: 'r1', title: 'Go meatless today', body: 'Replacing one meat-based meal with a plant-based alternative saves up to 2 kg CO₂e — one of the highest-impact diet changes you can make.', co2eSavingKg: 2.0, category: 'diet' },
  { id: 'r2', title: 'Cycle for short trips', body: 'Trips under 5 km by car emit ~1 kg CO₂e. Cycling or walking eliminates that and improves cardiovascular health.', co2eSavingKg: 1.0, category: 'transport' },
  { id: 'r3', title: 'Lower your thermostat by 1°C', body: 'Turning your heating down by just 1°C can reduce energy consumption by up to 10%, saving ~0.5 kg CO₂e per day in winter.', co2eSavingKg: 0.5, category: 'energy' },
  { id: 'r4', title: 'Take public transit once this week', body: 'A single bus trip instead of driving saves ~0.7 kg CO₂e on average. Your commute is the easiest win.', co2eSavingKg: 0.7, category: 'transport' },
];

const CATEGORY_ICONS = { transport: '🚗', diet: '🥗', energy: '⚡', flights: '✈️' };

export default function Insights() {
  const { user } = useAuth();
  const [nudges, setNudges]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchNudges();
  }, [user]);

  async function fetchNudges() {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users', user.uid, 'nudges'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const snap = await getDocs(q);
      const firestoreNudges = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Fall back to rule-based if Firestore has none
      setNudges(firestoreNudges.length > 0 ? firestoreNudges : RULE_NUDGES);
    } catch {
      setNudges(RULE_NUDGES);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(nudgeId, action) {
    if (!nudgeId.startsWith('r')) {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'nudges', nudgeId), {
          status: action, respondedAt: new Date(),
        });
      } catch { /* ignore */ }
    }
    setNudges(prev => prev.filter(n => n.id !== nudgeId));
  }

  return (
    <div className="page">
      <header className="page-header animate-fade-up">
        <h1 className="page-title">AI Insights</h1>
        <p className="page-subtitle">Personalized nudges powered by Gemini — tailored to your habits</p>
      </header>

      {/* Info banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(34,211,165,0.08), rgba(14,165,233,0.08))',
          border: '1px solid rgba(34,211,165,0.2)',
          borderRadius: 'var(--rad-lg)',
          padding: 'var(--sp-4) var(--sp-5)',
          marginBottom: 'var(--sp-8)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--sp-3)',
        }}
        role="note"
      >
        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>✨</span>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 'var(--sp-1)' }}>How nudges work</div>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--clr-text-2)', lineHeight: 1.6 }}>
            Once you log activities, Gemini analyses your patterns and generates personalized suggestions.
            Until then, you'll see curated recommendations based on typical high-impact behaviours.
          </p>
        </div>
      </div>

      {/* Nudge list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ height: 140, borderRadius: 'var(--rad-lg)' }} />
          ))}
        </div>
      ) : nudges.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <div className="empty-title">All caught up!</div>
          <div className="empty-sub">No new nudges right now. Keep logging your activities and check back later.</div>
        </div>
      ) : (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}
          role="list"
          aria-label="AI nudges"
        >
          {nudges.map((n, i) => (
            <NudgeCard key={n.id} nudge={n} delay={i} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  );
}

function NudgeCard({ nudge, delay, onAction }) {
  const [status, setStatus] = useState(null); // null | 'accepted' | 'dismissed'

  function act(a) {
    setStatus(a);
    setTimeout(() => onAction(nudge.id, a), 500);
  }

  return (
    <div
      role="listitem"
      className={`nudge-card animate-fade-up animate-fade-up-${Math.min(delay + 1, 3)}`}
      style={{
        transition: 'opacity 0.4s, transform 0.4s',
        opacity: status ? 0 : 1,
        transform: status === 'dismissed' ? 'translateX(40px)' : status === 'accepted' ? 'scale(0.97)' : 'none',
      }}
    >
      <div className="nudge-header">
        <div>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            {CATEGORY_ICONS[nudge.category] || '💡'} {nudge.category}
          </span>
          <div className="nudge-title" style={{ marginTop: 'var(--sp-1)' }}>{nudge.title}</div>
        </div>
        {nudge.isAI && (
          <span className="badge badge-green" title="Generated by Gemini AI">✨ AI</span>
        )}
      </div>

      <p className="nudge-body">{nudge.body}</p>

      <div className="nudge-footer">
        <span className="nudge-saving">🌱 Saves ~{nudge.co2eSavingKg} kg CO₂e</span>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <button
            id={`dismiss-${nudge.id}`}
            className="btn btn-ghost btn-sm"
            onClick={() => act('dismissed')}
          >
            Skip
          </button>
          <button
            id={`accept-${nudge.id}`}
            className="btn btn-primary btn-sm"
            onClick={() => act('accepted')}
          >
            I'll do it ✓
          </button>
        </div>
      </div>
    </div>
  );
}
