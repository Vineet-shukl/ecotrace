// src/pages/Dashboard.jsx — Main dashboard with stats + charts + nudges
import { useEffect, useState, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { footprintLabel } from '../services/baselineCalc';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#22d3a5', '#0ea5e9', '#a78bfa', '#f59e0b'];

const CATEGORY_ICONS = {
  transport: '🚗',
  diet: '🥗',
  energy: '⚡',
  flights: '✈️',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats]         = useState(null);
  const [activities, setActivities] = useState([]);
  const [nudges, setNudges]       = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!user) return;
    // Real-time listener on user doc for live stats
    const unsub = onSnapshot(doc(db, 'users', user.uid), snap => {
      if (snap.exists()) setStats(snap.data());
      setLoading(false);
    });
    fetchActivitiesAndNudges();
    return unsub;
  }, [user]);

  async function fetchActivitiesAndNudges() {
    try {
      // Recent activities for trend chart
      const actQuery = query(
        collection(db, 'users', user.uid, 'activities'),
        orderBy('date', 'desc'),
        limit(7)
      );
      const actSnap = await getDocs(actQuery);
      setActivities(actSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Nudges
      const nudgeQuery = query(
        collection(db, 'users', user.uid, 'nudges'),
        orderBy('createdAt', 'desc'),
        limit(3)
      );
      const nudgeSnap = await getDocs(nudgeQuery);
      setNudges(nudgeSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }
  }

  // 7-day trend from activities
  const trendData = activities.length > 0
    ? activities.slice().reverse().map(a => ({
        name: new Date(a.date?.toDate?.() || a.date).toLocaleDateString('en', { weekday: 'short' }),
        co2e: Number((a.co2eKg || 0).toFixed(2)),
      }))
    : [
        { name: 'Mon', co2e: 8.2 }, { name: 'Tue', co2e: 6.5 },
        { name: 'Wed', co2e: 9.1 }, { name: 'Thu', co2e: 5.8 },
        { name: 'Fri', co2e: 7.3 }, { name: 'Sat', co2e: 4.9 },
        { name: 'Sun', co2e: 6.1 },
      ];

  // Pie from real baseline breakdown or default
  const breakdown = stats?.baselineBreakdown ?? {};
  const pieData = Object.keys(breakdown).length > 0
    ? Object.entries(breakdown).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: Math.round(value) }))
    : [
        { name: 'Transport', value: 35 }, { name: 'Diet', value: 28 },
        { name: 'Energy',    value: 22 }, { name: 'Flights', value: 15 },
      ];

  // Baseline vs current comparison
  const baselineKg = stats?.baselineKgPerYear ?? null;
  const dailyBaseline = baselineKg ? +(baselineKg / 365).toFixed(1) : null;
  const todayKg = stats?.todayCo2eKg ?? null;
  const vsBaseline = dailyBaseline && todayKg != null
    ? Math.round(((todayKg - dailyBaseline) / dailyBaseline) * 100)
    : null;
  const footprint = baselineKg ? footprintLabel(baselineKg) : null;

  return (
    <div className="page">
      {/* Header */}
      <header className="page-header animate-fade-up">
        <h1 className="page-title">
          Hi, {user?.displayName?.split(' ')[0] || 'Explorer'} 👋
        </h1>
        <p className="page-subtitle">Here's your carbon footprint at a glance</p>
        {footprint && (
          <span className="badge" style={{
            background: `${footprint.color}22`,
            color: footprint.color,
            border: `1px solid ${footprint.color}44`,
            marginTop: 'var(--sp-2)',
            display: 'inline-flex',
          }}>
            {footprint.label} footprint baseline
          </span>
        )}
      </header>

      {/* Baseline comparison bar (only shown if baseline set) */}
      {baselineKg && !loading && (
        <div className="card animate-fade-up" style={{ marginBottom: 'var(--sp-6)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-sm)', color: 'var(--clr-text-2)' }}>
            <span>Today vs daily baseline</span>
            {vsBaseline !== null && (
              <span style={{ fontWeight: 700, color: vsBaseline < 0 ? 'var(--clr-primary)' : 'var(--clr-danger)' }}>
                {vsBaseline > 0 ? '+' : ''}{vsBaseline}%
              </span>
            )}
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(todayKg != null ? (todayKg / dailyBaseline) * 100 : 0, 100)}%`,
                background: vsBaseline != null && vsBaseline < 0 ? 'var(--grad-primary)' : 'linear-gradient(90deg,#f59e0b,#f87171)' }}
              role="progressbar"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)' }}>
            <span>Today: {todayKg?.toFixed(1) ?? '0'} kg</span>
            <span>Daily baseline: {dailyBaseline} kg</span>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid-4 animate-fade-up animate-fade-up-1" style={{ marginBottom: 'var(--sp-8)' }}>
        <StatCard
          label="Today's CO₂e"
          value={loading ? '—' : `${(stats?.todayCo2eKg ?? 0).toFixed(1)} kg`}
          icon="🌍"
          iconClass="stat-card-icon-green"
          trend={vsBaseline !== null ? { dir: vsBaseline < 0 ? 'down' : 'up', pct: `${Math.abs(vsBaseline)}%` } : null}
        />
        <StatCard
          label="This Week"
          value={loading ? '—' : `${(stats?.weekCo2eKg ?? 0).toFixed(1)} kg`}
          icon="📅"
          iconClass="stat-card-icon-blue"
          trend={null}
        />
        <StatCard
          label="Streak"
          value={loading ? '—' : `${stats?.currentStreak ?? 0} days`}
          icon="🔥"
          iconClass="stat-card-icon-warn"
          trend={null}
        />
        <StatCard
          label="Annual Goal"
          value={loading ? '—' : `${(stats?.annualGoalKg ?? 0).toLocaleString()} kg`}
          icon="🎯"
          iconClass="stat-card-icon-purple"
          trend={null}
        />
      </div>

      {/* Charts row */}
      <div className="grid-2 animate-fade-up animate-fade-up-2" style={{ marginBottom: 'var(--sp-8)' }}>
        {/* Trend */}
        <div className="card" style={{ minHeight: 260 }}>
          <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 700, marginBottom: 'var(--sp-4)' }}>7-Day Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="co2eGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22d3a5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22d3a5" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1c2a3a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#f0fdf4' }}
              />
              <Area type="monotone" dataKey="co2e" stroke="#22d3a5" strokeWidth={2} fill="url(#co2eGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="card" style={{ minHeight: 260 }}>
          <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 700, marginBottom: 'var(--sp-4)' }}>Category Breakdown</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius="45%" outerRadius="70%" paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1c2a3a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
              />
              <Legend
                formatter={v => <span style={{ color: '#a3c4bc', fontSize: 11 }}>{v}</span>}
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Nudges */}
      <div className="animate-fade-up animate-fade-up-3">
        <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: 'var(--sp-4)' }}>
          💡 Today's Nudges
        </h2>
        {nudges.length === 0 ? (
          <DefaultNudges />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            {nudges.map(n => <NudgeCard key={n.id} nudge={n} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, iconClass, trend }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        <div className={`stat-card-icon ${iconClass}`} aria-hidden="true">{icon}</div>
      </div>
      <div className="stat-card-value">{value}</div>
      {trend && (
        <div className={`stat-card-trend trend-${trend.dir}`}>
          {trend.dir === 'down' ? '↓' : '↑'} {trend.pct} vs last period
        </div>
      )}
    </div>
  );
}

function DefaultNudges() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <NudgeCard nudge={{ title: 'Try meatless Monday', body: 'Swapping one meat meal for legumes saves ~1.5 kg CO₂e. It\'s one of the highest-impact diet changes you can make.', co2eSavingKg: 1.5, category: 'diet' }} />
      <NudgeCard nudge={{ title: 'Cycle or walk for short trips', body: 'Trips under 3 km by car average ~0.6 kg CO₂e. Walking or cycling saves that entirely and improves cardiovascular health.', co2eSavingKg: 0.6, category: 'transport' }} />
    </div>
  );
}

function NudgeCard({ nudge }) {
  const [dismissed, setDismissed] = useState(false);
  const [accepted, setAccepted] = useState(false);
  if (dismissed) return null;

  return (
    <div className="nudge-card" role="article" aria-label={`Nudge: ${nudge.title}`}>
      <div className="nudge-header">
        <div>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            {CATEGORY_ICONS[nudge.category] || '💡'} {nudge.category}
          </span>
          <div className="nudge-title" style={{ marginTop: 'var(--sp-1)' }}>{nudge.title}</div>
        </div>
      </div>
      <p className="nudge-body">{nudge.body}</p>
      <div className="nudge-footer">
        <span className="nudge-saving">🌱 Saves ~{nudge.co2eSavingKg} kg CO₂e</span>
        {!accepted ? (
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <button id={`dismiss-nudge-${nudge.title?.slice(0,8)}`} className="btn btn-ghost btn-sm" onClick={() => setDismissed(true)}>Dismiss</button>
            <button id={`accept-nudge-${nudge.title?.slice(0,8)}`} className="btn btn-primary btn-sm" onClick={() => setAccepted(true)}>I'll do it ✓</button>
          </div>
        ) : (
          <span className="badge badge-green">✓ Committed!</span>
        )}
      </div>
    </div>
  );
}
