// src/pages/Onboarding.jsx — Multi-step onboarding quiz
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { db, analytics } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { calculateBaseline, footprintLabel } from '../services/baselineCalc';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

// ── Quiz definition ──────────────────────────────────────────────────────────
const STEPS = [
  {
    id: 'primary_transport_mode',
    title: 'How do you usually get around?',
    subtitle: 'Choose your primary mode of transport for daily commuting.',
    type: 'choice',
    options: [
      { value: 'walking',      label: 'Walking',        icon: '🚶', hint: 'Zero emissions' },
      { value: 'bicycle',      label: 'Cycling',        icon: '🚲', hint: 'Zero emissions' },
      { value: 'train',        label: 'Train / Metro',  icon: '🚂', hint: '0.04 kg/km' },
      { value: 'bus',          label: 'Bus',            icon: '🚌', hint: '0.08 kg/km' },
      { value: 'car_ev',       label: 'Electric car',   icon: '🔋', hint: '0.05 kg/km' },
      { value: 'car_gasoline', label: 'Petrol/Diesel car', icon: '🚗', hint: '0.19 kg/km' },
    ],
  },
  {
    id: 'weekly_km',
    title: 'How far do you travel each week?',
    subtitle: 'Approximate total weekly distance for your primary mode.',
    type: 'number',
    unit: 'km',
    placeholder: 'e.g. 80',
    min: 0,
    max: 2000,
  },
  {
    id: 'diet_type',
    title: "What best describes your diet?",
    subtitle: 'Food choices are one of the biggest levers for your footprint.',
    type: 'choice',
    options: [
      { value: 'vegan',        label: 'Vegan',          icon: '🌱', hint: '2.5 kg CO₂e/day' },
      { value: 'vegetarian',   label: 'Vegetarian',     icon: '🥦', hint: '3.2 kg CO₂e/day' },
      { value: 'pescatarian',  label: 'Pescatarian',    icon: '🐟', hint: '3.9 kg CO₂e/day' },
      { value: 'meat_average', label: 'Average meat',   icon: '🍗', hint: '5.6 kg CO₂e/day' },
      { value: 'meat_heavy',   label: 'High meat',      icon: '🥩', hint: '7.2 kg CO₂e/day' },
    ],
  },
  {
    id: 'monthly_electricity_kwh',
    title: 'Monthly electricity usage',
    subtitle: 'Check your utility bill or smart meter. Average home: 300–400 kWh/month.',
    type: 'number',
    unit: 'kWh/month',
    placeholder: 'e.g. 350',
    min: 0,
    max: 5000,
  },
  {
    id: 'monthly_gas_kwh',
    title: 'Monthly natural gas usage',
    subtitle: 'Leave blank or enter 0 if you use electric heating.',
    type: 'number',
    unit: 'kWh/month',
    placeholder: 'e.g. 500',
    min: 0,
    max: 10000,
    optional: true,
  },
  {
    id: 'short_haul_flights',
    title: 'Short-haul flights per year',
    subtitle: 'Flights under ~3 hours (e.g. London → Barcelona).',
    type: 'number',
    unit: 'flights/year',
    placeholder: 'e.g. 2',
    min: 0,
    max: 100,
    optional: true,
  },
  {
    id: 'long_haul_flights',
    title: 'Long-haul flights per year',
    subtitle: 'Flights over ~6 hours (e.g. London → New York).',
    type: 'number',
    unit: 'flights/year',
    placeholder: 'e.g. 1',
    min: 0,
    max: 50,
    optional: true,
  },
  {
    id: 'reduction_goal_pct',
    title: 'What\'s your reduction goal?',
    subtitle: 'How much do you want to cut your footprint over the next year?',
    type: 'choice',
    options: [
      { value: '5',  label: '5% reduction',   icon: '🌱', hint: 'Easy start' },
      { value: '10', label: '10% reduction',  icon: '🌿', hint: 'Recommended' },
      { value: '20', label: '20% reduction',  icon: '🌲', hint: 'Ambitious' },
      { value: '30', label: '30% reduction',  icon: '🏔️', hint: 'Bold' },
      { value: '50', label: '50% reduction',  icon: '🌍', hint: 'Climate hero' },
    ],
  },
];

// Inline emission factors for the result screen preview
// (actual calculation uses Firestore factors)
const INLINE_EF = {
  transport: { car_gasoline: 0.192, car_ev: 0.05, bus: 0.082, train: 0.041, bicycle: 0, walking: 0 },
  diet:      { vegan: 2.5, vegetarian: 3.2, pescatarian: 3.9, meat_average: 5.6, meat_heavy: 7.2 },
  energy:    { electricity_kwh: 0.385, natural_gas_kwh: 0.203 },
  flights:   { short_haul_per_flight: 250, long_haul_per_flight: 800 },
};

export default function Onboarding() {
  useDocumentTitle('Get Started', 'Answer a few questions to calculate your personal carbon footprint baseline.');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving]   = useState(false);
  const [result, setResult]   = useState(null); // computed baseline

  // Skip if already has baseline
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists() && snap.data().baselineKgPerYear) {
        navigate('/dashboard', { replace: true });
      }
    });
  }, [user, navigate]);

  const current = STEPS[step]; // nosemgrep: bracket-object-injection — index is 0..STEPS.length-1
  const isLast   = step === STEPS.length - 1;

  function answer(value) {
    setAnswers(prev => ({ ...prev, [current.id]: value }));
    if (current.type === 'choice') advance({ ...answers, [current.id]: value });
  }

  function advance(latestAnswers = answers) {
    // GA4 quiz step event
    if (analytics) {
      logEvent(analytics, 'quiz_step_complete', { step: step + 1, question_id: current.id });
    }
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      computeAndSave(latestAnswers);
    }
  }

  function back() {
    if (step > 0) setStep(s => s - 1);
  }

  async function computeAndSave(latestAnswers = answers) {
    setSaving(true);
    const baseline = calculateBaseline(latestAnswers, INLINE_EF);
    setResult({ ...baseline, answers: latestAnswers });
    setSaving(false);
  }

  async function confirmAndSave() {
    if (!result || !user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        displayName: user.displayName || '',
        email: user.email,
        onboardingAnswers: result.answers,
        baselineKgPerYear: result.totalKgPerYear,
        baselineBreakdown: result.breakdown,
        baselineCategoryPct: result.categoryPct,
        annualGoalKg: Math.round(result.totalKgPerYear * (1 - Number(result.answers.reduction_goal_pct ?? 10) / 100)),
        currentStreak: 0,
        totalSavedKg: 0,
        onboardedAt: new Date(),
        factorsVersion: 'v1',
      }, { merge: true });
      // GA4 onboarding complete
      if (analytics) {
        logEvent(analytics, 'onboarding_complete', {
          baseline_kg_year: result.totalKgPerYear,
          reduction_goal_pct: Number(result.answers.reduction_goal_pct ?? 10),
        });
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }

  // ── Result screen ────────────────────────────────────────────────────────
  if (result) {
    const { label, color } = footprintLabel(result.totalKgPerYear);
    const goalPct = Number(answers.reduction_goal_pct ?? 10);
    const targetKg = Math.round(result.totalKgPerYear * (1 - goalPct / 100));

    return (
      <div className="auth-page">
        <div className="auth-card animate-fade-up" style={{ maxWidth: 520 }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--sp-6)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--sp-3)' }}>🌍</div>
            <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, marginBottom: 'var(--sp-2)' }}>
              Your Baseline
            </h1>
            <p style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>
              Here's your estimated annual carbon footprint
            </p>
          </div>

          {/* Main number */}
          <div style={{
            textAlign: 'center',
            padding: 'var(--sp-6)',
            background: 'rgba(34,211,165,0.06)',
            border: '1px solid rgba(34,211,165,0.2)',
            borderRadius: 'var(--rad-lg)',
            marginBottom: 'var(--sp-6)',
          }}>
            <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 900, lineHeight: 1, marginBottom: 'var(--sp-2)' }}>
              {result.totalKgPerYear.toLocaleString()}
            </div>
            <div style={{ fontSize: 'var(--fs-md)', color: 'var(--clr-text-2)' }}>
              kg CO₂e / year
            </div>
            <div className="badge" style={{
              marginTop: 'var(--sp-3)',
              display: 'inline-flex',
              background: `${color}22`,
              color,
              border: `1px solid ${color}44`,
            }}>
              {label} footprint
            </div>
          </div>

          {/* Category breakdown */}
          <div style={{ marginBottom: 'var(--sp-6)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {Object.entries(result.breakdown).map(([cat, val]) => {
              const icons = { transport: '🚗', diet: '🥗', energy: '⚡', flights: '✈️' };
              const pct   = result.categoryPct[cat] ?? 0; // nosemgrep: bracket-object-injection — cat from Object.entries of our computed breakdown
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-1)', fontSize: 'var(--fs-sm)' }}>
                    <span>{Object.hasOwn(icons, cat) ? icons[cat] : '📊'} {cat.charAt(0).toUpperCase() + cat.slice(1)}</span> {/* nosemgrep: bracket-object-injection */}
                    <span style={{ fontWeight: 600 }}>{Math.round(val).toLocaleString()} kg ({pct}%)</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Goal */}
          <div style={{
            padding: 'var(--sp-4)',
            background: 'var(--clr-surface-2)',
            borderRadius: 'var(--rad-md)',
            marginBottom: 'var(--sp-6)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--clr-text-muted)' }}>Your {goalPct}% goal</div>
              <div style={{ fontWeight: 800, fontSize: 'var(--fs-lg)', color: 'var(--clr-primary)' }}>
                {targetKg.toLocaleString()} kg/year
              </div>
            </div>
            <div style={{ fontSize: '2rem' }}>🎯</div>
          </div>

          <button
            id="confirm-baseline-btn"
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={confirmAndSave}
            disabled={saving}
          >
            {saving ? <span className="spinner" /> : "Start Tracking →"}
          </button>
          <button
            id="retake-quiz-btn"
            className="btn btn-ghost"
            style={{ width: '100%', marginTop: 'var(--sp-3)' }}
            onClick={() => { setResult(null); setStep(0); setAnswers({}); }}
          >
            Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  // ── Quiz screen ──────────────────────────────────────────────────────────
  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 'var(--sp-8)' }}>
      <div className="auth-card animate-fade-up" style={{ maxWidth: 560, width: '100%' }}>

        {/* Header */}
        <div style={{ marginBottom: 'var(--sp-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <span style={{ fontSize: '1.2rem' }}>🌿</span>
              <span style={{ fontWeight: 800, background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                EcoTrace
              </span>
            </div>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)', fontWeight: 600 }}>
              {step + 1} of {STEPS.length}
            </span>
          </div>

          {/* Progress */}
          <div className="progress-track" style={{ marginBottom: 'var(--sp-6)' }}>
            <div
              className="progress-fill"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              role="progressbar"
              aria-valuenow={step + 1}
              aria-valuemin={1}
              aria-valuemax={STEPS.length}
            />
          </div>

          <h1 style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, lineHeight: 1.25, marginBottom: 'var(--sp-2)' }}>
            {current.title}
          </h1>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--clr-text-muted)', lineHeight: 1.6 }}>
            {current.subtitle}
          </p>
        </div>

        {/* Question body */}
        {current.type === 'choice' && (
          <div
            role="radiogroup"
            aria-label={current.title}
            style={{ display: 'grid', gap: 'var(--sp-3)', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', marginBottom: 'var(--sp-6)' }}
          >
            {current.options.map(opt => {
              const selected = answers[current.id] === opt.value; // nosemgrep: bracket-object-injection — current.id is a static STEPS constant
              return (
                <button
                  key={opt.value}
                  id={`q-${current.id}-${opt.value}`}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => answer(opt.value)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 'var(--sp-2)',
                    padding: 'var(--sp-4)',
                    background: selected ? 'rgba(34,211,165,0.1)' : 'var(--clr-surface-2)',
                    border: `1.5px solid ${selected ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
                    borderRadius: 'var(--rad-lg)',
                    cursor: 'pointer',
                    transition: 'all var(--dur-fast) var(--ease-default)',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{opt.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', color: selected ? 'var(--clr-primary)' : 'var(--clr-text)' }}>
                    {opt.label}
                  </span>
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)' }}>{opt.hint}</span>
                </button>
              );
            })}
          </div>
        )}

        {current.type === 'number' && (
          <div style={{ marginBottom: 'var(--sp-6)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor={`q-${current.id}`}>
                Amount ({current.unit}) {current.optional && <span style={{ color: 'var(--clr-text-muted)', fontWeight: 400 }}> — optional</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id={`q-${current.id}`}
                  type="number"
                  className="form-input"
                  placeholder={current.placeholder}
                  min={current.min}
                  max={current.max}
                  value={answers[current.id] ?? ''} // nosemgrep: bracket-object-injection — current.id is a static STEPS constant
                  onChange={e => setAnswers(prev => ({ ...prev, [current.id]: e.target.value }))}
                  style={{ paddingRight: 'var(--sp-16)' }}
                  autoFocus
                />
                <span style={{
                  position: 'absolute',
                  right: 'var(--sp-4)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--clr-text-muted)',
                  fontSize: 'var(--fs-sm)',
                  pointerEvents: 'none',
                }}>
                  {current.unit}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
          {step > 0 && (
            <button
              id="quiz-back-btn"
              className="btn btn-ghost"
              onClick={back}
              style={{ flex: '0 0 auto' }}
            >
              ← Back
            </button>
          )}
          {current.type === 'number' && (
            <button
              id="quiz-next-btn"
              className="btn btn-primary"
              onClick={() => advance()}
              disabled={!current.optional && !answers[current.id]} // nosemgrep: bracket-object-injection — current.id is a static STEPS constant
              style={{ flex: 1 }}
            >
              {isLast ? 'Calculate My Footprint 🌍' : 'Next →'}
            </button>
          )}
          {current.type === 'choice' && current.optional && (
            <button
              id="quiz-skip-btn"
              className="btn btn-ghost"
              onClick={() => advance()}
              style={{ flex: 1 }}
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
