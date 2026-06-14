// src/pages/LogActivity.jsx — Quick-log transport, diet & energy activities
import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

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
  const { user } = useAuth();
  const [tab, setTab] = useState('transport');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]   = useState('');

  // Transport
  const [transMode, setTransMode] = useState('car_gasoline');
  const [transKm, setTransKm]     = useState('');

  // Diet
  const [dietType, setDietType]   = useState('meat_average');

  // Energy
  const [energyType, setEnergyType] = useState('electricity_kwh');
  const [energyAmt, setEnergyAmt]   = useState('');

  function calcCo2e() {
    if (tab === 'transport') return EF.transport[transMode] * Number(transKm || 0);
    if (tab === 'diet')      return EF.diet[dietType];
    if (tab === 'energy')    return EF.energy[energyType] * Number(energyAmt || 0);
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
        subType: tab === 'transport' ? transMode : tab === 'diet' ? dietType : energyType,
        amount: tab === 'transport' ? Number(transKm) : tab === 'energy' ? Number(energyAmt) : 1,
        unit: tab === 'transport' ? 'km' : tab === 'energy' ? 'kWh' : 'meal',
        co2eKg,
        date: serverTimestamp(),
        uid: user.uid,
      });
      setSuccess(`Logged! +${co2eKg.toFixed(2)} kg CO₂e`);
      setTransKm(''); setEnergyAmt('');
    } catch (err) {
      setError('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header animate-fade-up">
        <h1 className="page-title">Log Activity</h1>
        <p className="page-subtitle">Track your daily choices to measure your footprint</p>
      </header>

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
                <select
                  id="trans-mode"
                  className="form-input"
                  value={transMode}
                  onChange={e => setTransMode(e.target.value)}
                >
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
                  id="trans-km"
                  type="number"
                  className="form-input"
                  placeholder="e.g. 15"
                  min="0"
                  step="0.1"
                  value={transKm}
                  onChange={e => setTransKm(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {/* Diet */}
          {tab === 'diet' && (
            <div className="form-group">
              <label className="form-label" htmlFor="diet-type">Today's diet</label>
              <select
                id="diet-type"
                className="form-input"
                value={dietType}
                onChange={e => setDietType(e.target.value)}
              >
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
                <select
                  id="energy-type"
                  className="form-input"
                  value={energyType}
                  onChange={e => setEnergyType(e.target.value)}
                >
                  <option value="electricity_kwh">💡 Electricity (kWh)</option>
                  <option value="natural_gas_kwh">🔥 Natural gas (kWh)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="energy-amt">Amount (kWh)</label>
                <input
                  id="energy-amt"
                  type="number"
                  className="form-input"
                  placeholder="e.g. 5"
                  min="0"
                  step="0.1"
                  value={energyAmt}
                  onChange={e => setEnergyAmt(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {/* CO₂e preview */}
          <div style={{
            background: 'rgba(34,211,165,0.06)',
            border: '1px solid rgba(34,211,165,0.2)',
            borderRadius: 'var(--rad-md)',
            padding: 'var(--sp-4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--clr-text-2)' }}>Estimated CO₂e</span>
            <span style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--clr-primary)' }}>
              {calcCo2e().toFixed(2)} kg
            </span>
          </div>

          {error   && <div role="alert" style={{ color: 'var(--clr-danger)', fontSize: 'var(--fs-sm)' }}>{error}</div>}
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
