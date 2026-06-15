// src/pages/Insights.jsx — AI nudges via Cloud Run + rule-based fallback
import { useEffect, useState, useCallback } from 'react';
import {
  collection, query, orderBy, limit, getDocs, updateDoc, doc
} from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { db, analytics } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { fetchNudges } from '../services/nudgeService';

const CATEGORY_ICONS = {
  transport: '🚗', diet: '🥗', energy: '⚡', flights: '✈️', habits: '✅', general: '💡',
};

export default function Insights() {
  const { user } = useAuth();
  const [nudges,  setNudges]   = useState([]);
  const [loading, setLoading]  = useState(true);
  const [generating, setGenerating] = useState(false);
  const [source, setSource]    = useState('');

  const generateFresh = useCallback(async () => {
    setGenerating(true);
    try {
      const fresh = await fetchNudges(3);
      setNudges(fresh);
      setSource(fresh[0]?.isAI ? 'gemini' : 'rules');
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  }, []);

  const loadNudges = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // First check Firestore for cached nudges from last 24h
      const q = query(
        collection(db, 'users', user.uid, 'nudges'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const snap = await getDocs(q);
      const stored = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(n => n.status === 'pending');

      if (stored.length > 0) {
        setNudges(stored);
        setSource(stored[0]?.isAI ? 'gemini' : 'rules');
      } else {
        await generateFresh();
        return;
      }
    } catch (err) {
      console.error('loadNudges error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, generateFresh]);

  useEffect(() => {
    if (!user) return;
    // Fetch-on-mount: state updates run after the awaited reads, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNudges();
  }, [user, loadNudges]);

  async function handleAction(nudge, action) {
    // GA4 event
    if (analytics) {
      logEvent(analytics, action === 'accepted' ? 'nudge_accepted' : 'nudge_dismissed', {
        nudge_id:       nudge.id,
        nudge_category: nudge.category,
        nudge_source:   nudge.source ?? 'unknown',
        co2e_saving_kg: nudge.co2eSavingKg,
      });
    }

    // Update Firestore if it's a stored nudge (has a real doc ID)
    if (!nudge.id?.startsWith('r_') && !nudge.id?.startsWith('ai_')) {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'nudges', nudge.id), {
          status:      action,
          respondedAt: new Date(),
        });
      } catch { /* ignore */ }
    }

    setNudges(prev => prev.filter(n => n.id !== nudge.id));
  }

  return (
    <div className="page">
      <header className="page-header animate-fade-up">
        <h1 className="page-title">AI Insights</h1>
        <p className="page-subtitle">Personalised nudges powered by Gemini Flash — tailored to your habits</p>
      </header>

      {/* Source badge + refresh */}
      {!loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-6)', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            {source === 'gemini' ? (
              <span className="badge badge-green">✨ Gemini AI</span>
            ) : (
              <span className="badge" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
                📋 Rule-based
              </span>
            )}
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)' }}>
              {nudges.length} nudge{nudges.length !== 1 ? 's' : ''} for you
            </span>
          </div>
          <button
            id="refresh-nudges-btn"
            className="btn btn-ghost btn-sm"
            onClick={generateFresh}
            disabled={generating || loading}
          >
            {generating ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '↺'} Refresh
          </button>
        </div>
      )}

      {/* Info banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(34,211,165,0.06), rgba(14,165,233,0.06))',
          border: '1px solid rgba(34,211,165,0.18)',
          borderRadius: 'var(--rad-lg)',
          padding: 'var(--sp-4) var(--sp-5)',
          marginBottom: 'var(--sp-8)',
          display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)',
        }}
        role="note"
      >
        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>✨</span>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 'var(--sp-1)' }}>How nudges work</div>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--clr-text-2)', lineHeight: 1.6 }}>
            Gemini analyses your weekly activity aggregates and baseline to generate personalised suggestions.
            Up to 3 AI nudges are generated per day; additional requests use curated rule-based nudges.
          </p>
        </div>
      </div>

      {/* Nudge list */}
      {loading || generating ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 140, borderRadius: 'var(--rad-lg)' }} />
          ))}
        </div>
      ) : nudges.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <div className="empty-title">All caught up!</div>
          <div className="empty-sub">No pending nudges. Log today's activities and check back for fresh suggestions.</div>
          <button className="btn btn-primary" onClick={generateFresh} style={{ marginTop: 'var(--sp-4)' }}>
            Generate Nudges
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }} role="list" aria-label="AI nudges">
          {nudges.map((n, i) => (
            <NudgeCard key={n.id} nudge={n} delay={i} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  );
}

function NudgeCard({ nudge, delay, onAction }) {
  const [status, setStatus] = useState(null);

  function act(a) {
    setStatus(a);
    setTimeout(() => onAction(nudge, a), 450);
  }

  return (
    <div
      role="listitem"
      className={`nudge-card animate-fade-up animate-fade-up-${Math.min(delay + 1, 3)}`}
      style={{
        transition: 'opacity 0.4s, transform 0.4s',
        opacity:    status ? 0 : 1,
        transform:  status === 'dismissed' ? 'translateX(40px)' : status === 'accepted' ? 'scale(0.97)' : 'none',
      }}
    >
      <div className="nudge-header">
        <div>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            {(Object.hasOwn(CATEGORY_ICONS, nudge.category) ? CATEGORY_ICONS[nudge.category] : '💡')} {nudge.category} {/* nosemgrep: bracket-object-injection */}
          </span>
          <div className="nudge-title" style={{ marginTop: 'var(--sp-1)' }}>{nudge.title}</div>
        </div>
        {nudge.isAI && <span className="badge badge-green" title="Generated by Gemini Flash">✨ AI</span>}
      </div>

      <p className="nudge-body">{nudge.body}</p>

      <div className="nudge-footer">
        <span className="nudge-saving">🌱 Saves ~{nudge.co2eSavingKg} kg CO₂e</span>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <button id={`dismiss-${nudge.id}`} className="btn btn-ghost btn-sm" onClick={() => act('dismissed')}>Skip</button>
          <button id={`accept-${nudge.id}`}  className="btn btn-primary btn-sm" onClick={() => act('accepted')}>I'll do it ✓</button>
        </div>
      </div>
    </div>
  );
}
