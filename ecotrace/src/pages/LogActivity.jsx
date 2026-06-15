// src/pages/LogActivity.jsx — Quick-log transport, diet & energy activities
import { useState, useEffect } from 'react';
import {
  collection, addDoc, getDocs, query,
  orderBy, limit, serverTimestamp, where, Timestamp
} from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { db, analytics } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

// Emission factors mirror emissionFactors/v1 in Firestore
const EF = {
  transport: { car_gasoline: 0.192, car_ev: 0.05, bus: 0.082, train: 0.041, bicycle: 0, walking: 0 },
  diet:      { vegan: 2.5, vegetarian: 3.2, pescatarian: 3.9, meat_average: 5.6, meat_heavy: 7.2 },
  energy:    { electricity_kwh: 0.385, natural_gas_kwh: 0.203 },
};

const TABS = [
  { id: 'transport', label: 'Transport', icon: '🚗' },
  { id: 'diet',      label: 'Diet',      icon: '🥗' },
  { id: 'energy',    label: 'Energy',    icon: '⚡' },
];

export default function LogActivity() {
  useDocumentTitle('Log Activity', 'Quickly log your transport, diet and energy activities to track your daily carbon footprint.');
  const { user } = useAuth();
  const [tab, setTab]       = useState('transport');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]   = useState('');
  const [yesterday, setYesterday] = useState(null); // yesterday's last activity doc

  // Transport
  const [transMode, setTransMode] = useState('car_gasoline');
  const [transKm, setTransKm]     = useState('');

  // Diet
  const [dietType, setDietType] = useState('meat_average');

  // Energy
  const [energyType, setEnergyType] = useState('electricity_kwh');
  const [energyAmt, setEnergyAmt]   = useState('');

  // Load yesterday's most recent activity for "repeat" feature
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const start = new Date(); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
        const end   = new Date(); end.setHours(0, 0, 0, 0);
        const q = query(
          collection(db, 'users', user.uid, 'activities'),
          where('date', '>=', Timestamp.fromDate(start)),
          where('date', '<',  Timestamp.fromDate(end)),
          orderBy('date', 'desc'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) setYesterday(snap.docs[0].data());
      } catch { /* ignore */ }
    })();
  }, [user]);

  function calcCo2e() {
    // Object.hasOwn guards prevent prototype-pollution — keys are from fixed <select> options
    if (tab === 'transport') {
      const f = Object.hasOwn(EF.transport, transMode) ? EF.transport[transMode] : 0; // nosemgrep: bracket-object-injection
      return f * Number(transKm || 0);
    }
    if (tab === 'diet') {
      return Object.hasOwn(EF.diet, dietType) ? EF.diet[dietType] : 0; // nosemgrep: bracket-object-injection
    }
    if (tab === 'energy') {
      const f = Object.hasOwn(EF.energy, energyType) ? EF.energy[energyType] : 0; // nosemgrep: bracket-object-injection
      return f * Number(energyAmt || 0);
    }
    return 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    const co2eKg = calcCo2e();
    setSaving(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'activities'), {
        category: tab,
        subType:  tab === 'transport' ? transMode : tab === 'diet' ? dietType : energyType,
        amount:   tab === 'transport' ? Number(transKm) : tab === 'energy' ? Number(energyAmt) : 1,
        unit:     tab === 'transport' ? 'km' : tab === 'energy' ? 'kWh' : 'meal',
        co2eKg,
        date: serverTimestamp(),
        uid: user.uid,
      });
      setSuccess(`Logged! +${co2eKg.toFixed(2)} kg CO₂e`);
      // GA4 event
      if (analytics) {
        logEvent(analytics, 'log_activity', {
          category:  tab,
          sub_type:  tab === 'transport' ? transMode : tab === 'diet' ? dietType : energyType,
          co2e_kg:   co2eKg,
        });
      }
      setTransKm(''); setEnergyAmt('');
    } catch (err) {
      setError('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRepeatYesterday() {
    if (!yesterday || !user) return;
    setError(''); setSuccess('');
    setSaving(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'activities'), {
        ...yesterday,
        date: serverTimestamp(),
        uid:  user.uid,
        note: 'Repeated from yesterday',
      });
      setSuccess(`Repeated yesterday! +${Number(yesterday.co2eKg).toFixed(2)} kg CO₂e`);
    } catch (err) {
      setError('Failed to repeat: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const SUBTYPE_LABELS = {
    car_gasoline: '🚗 Car (gasoline)', car_ev: '🔋 Car (electric)', bus: '🚌 Bus',
    train: '🚂 Train', bicycle: '🚲 Bicycle', walking: '🚶 Walking',
    vegan: '🌱 Vegan', vegetarian: '🥦 Vegetarian', pescatarian: '🐟 Pescatarian',
    meat_average: '🍗 Average meat', meat_heavy: '🥩 Heavy meat',
    electricity_kwh: '💡 Electricity', natural_gas_kwh: '🔥 Natural gas',
  };

  return (
    <div className="page">
      <header className="page-header animate-fade-up">
        <h1 className="page-title">Log Activity</h1>
        <p className="page-subtitle">Track your daily choices to measure your footprint</p>
      </header>

      {/* Repeat Yesterday shortcut */}
      {yesterday && (
        <div
          className="card animate-fade-up"
          style={{ marginBottom: 'var(--sp-6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-4)', flexWrap: 'wrap' }}
          role="complementary"
          aria-label="Repeat yesterday shortcut"
        >
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--sp-1)' }}>
              🕐 Yesterday's activity
            </div>
            <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
              {(Object.hasOwn(SUBTYPE_LABELS, yesterday.subType) ? SUBTYPE_LABELS[yesterday.subType] : yesterday.subType)}
              {yesterday.amount > 1 && ` — ${yesterday.amount} ${yesterday.unit}`}
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)' }}>
              {Number(yesterday.co2eKg).toFixed(2)} kg CO₂e
            </div>
          </div>
          <button
            id="repeat-yesterday-btn"
            className="btn btn-ghost btn-sm"
            onClick={handleRepeatYesterday}
            disabled={saving}
            style={{ whiteSpace: 'nowrap' }}
          >
            ↺ Repeat Today
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Activity category"
        style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-6)', flexWrap: 'wrap' }}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            className={`btn ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setTab(t.id); setSuccess(''); setError(''); }}
          >
            <span aria-hidden="true">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ maxWidth: 520 }}
        aria-label={`Log ${tab} activity`}
      >
        <div className="card animate-fade-up animate-fade-up-1" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>

          {/* Transport */}
          {tab === 'transport' && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="trans-mode">Transport mode</label>
                <select id="trans-mode" className="form-input" value={transMode} onChange={e => setTransMode(e.target.value)}>
                  <option value="car_gasoline">🚗 Car (gasoline)</option>
                  <option value="car_ev">🔋 Car (electric)</option>
                  <option value="bus">🚌 Bus</option>
                  <option value="train">🚂 Train</option>
                  <option value="bicycle">🚲 Bicycle</option>
                  <option value="walking">🚶 Walking</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="trans-km">Distance (km)</label>
                <input
                  id="trans-km" type="number" className="form-input"
                  placeholder="e.g. 15" min="0" step="0.1"
                  value={transKm} onChange={e => setTransKm(e.target.value)} required
                />
              </div>
            </>
          )}

          {/* Diet */}
          {tab === 'diet' && (
            <div className="form-group">
              <label className="form-label" htmlFor="diet-type">Today's diet</label>
              <select id="diet-type" className="form-input" value={dietType} onChange={e => setDietType(e.target.value)}>
                <option value="vegan">🌱 Vegan</option>
                <option value="vegetarian">🥦 Vegetarian</option>
                <option value="pescatarian">🐟 Pescatarian</option>
                <option value="meat_average">🍗 Average meat</option>
                <option value="meat_heavy">🥩 Heavy meat</option>
              </select>
            </div>
          )}

          {/* Energy */}
          {tab === 'energy' && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="energy-type">Energy type</label>
                <select id="energy-type" className="form-input" value={energyType} onChange={e => setEnergyType(e.target.value)}>
                  <option value="electricity_kwh">💡 Electricity (kWh)</option>
                  <option value="natural_gas_kwh">🔥 Natural gas (kWh)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="energy-amt">Amount (kWh)</label>
                <input
                  id="energy-amt" type="number" className="form-input"
                  placeholder="e.g. 5" min="0" step="0.1"
                  value={energyAmt} onChange={e => setEnergyAmt(e.target.value)} required
                />
              </div>
            </>
          )}

          {/* Live CO₂e preview */}
          <div style={{
            background: 'rgba(34,211,165,0.06)', border: '1px solid rgba(34,211,165,0.2)',
            borderRadius: 'var(--rad-md)', padding: 'var(--sp-4)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--clr-text-2)' }}>Estimated CO₂e</span>
            <span style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--clr-primary)' }}>
              {calcCo2e().toFixed(2)} kg
            </span>
          </div>

          {error   && <div role="alert"  style={{ color: 'var(--clr-danger)',  fontSize: 'var(--fs-sm)' }}>{error}</div>}
          {success && <div role="status" style={{ color: 'var(--clr-primary)', fontSize: 'var(--fs-sm)', fontWeight: 600 }}>✅ {success}</div>}

          <button
            id="log-submit-btn"
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ width: '100%' }}
          >
            {saving ? <span className="spinner" /> : '📝 Log Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}
