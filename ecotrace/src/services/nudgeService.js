/**
 * src/services/nudgeService.js
 * Calls the Cloud Run nudge gateway. Falls back to rule-based nudges
 * if the service is unavailable or returns an error.
 */
import { getAuth } from 'firebase/auth';

// Cloud Run URL — set via Vite env var in production, localhost in dev
const NUDGE_SERVICE_URL =
  import.meta.env.VITE_NUDGE_SERVICE_URL ?? 'http://localhost:8080';

/** Rule-based fallback nudges (identical to server rules, no network needed) */
const FALLBACK_NUDGES = [
  { id: 'r_diet',      category: 'diet',      isAI: false, co2eSavingKg: 2.0,
    title: 'Try a meatless meal today',
    body: 'Swapping one meat-based meal saves up to 2 kg CO₂e — one of the highest-impact changes you can make.' },
  { id: 'r_transport', category: 'transport', isAI: false, co2eSavingKg: 1.0,
    title: 'Cycle for your next short trip',
    body: 'Trips under 5 km by car emit ~1 kg CO₂e each. Walking or cycling eliminates that and boosts health.' },
  { id: 'r_energy',    category: 'energy',    isAI: false, co2eSavingKg: 0.5,
    title: 'Lower your thermostat 1°C',
    body: 'A single degree reduction cuts heating energy by ~10% — about 0.5 kg CO₂e per day in winter.' },
];

/**
 * Fetch personalised nudges for the current user.
 * 1. Gets Firebase ID token
 * 2. POSTs to Cloud Run /nudges
 * 3. Falls back to local rule-based nudges on any error
 *
 * @param {number} [count=2]
 * @returns {Promise<Array>}
 */
export async function fetchNudges(count = 2) {
  try {
    const user = getAuth().currentUser;
    if (!user) return FALLBACK_NUDGES.slice(0, count);

    const idToken = await user.getIdToken();

    const res = await fetch(`${NUDGE_SERVICE_URL}/nudges`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ count }),
      signal: AbortSignal.timeout(8000), // 8s timeout
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    return data.nudges ?? FALLBACK_NUDGES.slice(0, count);
  } catch (err) {
    console.warn('[nudgeService] Using local fallback:', err.message);
    return FALLBACK_NUDGES.slice(0, count);
  }
}
