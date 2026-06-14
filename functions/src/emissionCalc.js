/**
 * functions/src/emissionCalc.js
 * Pure calculation logic — shared between Cloud Functions and unit tests.
 * No Firebase SDK imports (keeps this fully testable without mocking).
 */

/**
 * Recompute aggregates from a list of activity docs for a given date range.
 * @param {Array<{co2eKg: number, category: string, date: FirebaseFirestore.Timestamp}>} activities
 * @returns {{ totalCo2eKg: number, byCategory: object, count: number }}
 */
function aggregateActivities(activities) {
  const byCategory = {};
  let totalCo2eKg = 0;

  for (const act of activities) {
    const kg  = Number(act.co2eKg ?? 0);
    const cat = act.category ?? 'other';
    totalCo2eKg += kg;
    byCategory[cat] = (byCategory[cat] ?? 0) + kg;
  }

  return {
    totalCo2eKg: +totalCo2eKg.toFixed(4),
    byCategory,
    count: activities.length,
  };
}

/**
 * Calculates annual baseline CO₂e from quiz answers + emission factors.
 * Mirrors src/services/baselineCalc.js on the client.
 */
function calculateBaseline(answers, factors) {
  const breakdown = {};

  const mode       = answers.primary_transport_mode ?? 'car_gasoline';
  const weeklyKm   = Number(answers.weekly_km ?? 0);
  breakdown.transport = (factors?.transport?.[mode] ?? 0) * weeklyKm * 52;

  const dietType   = answers.diet_type ?? 'meat_average';
  breakdown.diet   = (factors?.diet?.[dietType] ?? 0) * 365;

  const monthlyElec = Number(answers.monthly_electricity_kwh ?? 0);
  const monthlyGas  = Number(answers.monthly_gas_kwh ?? 0);
  breakdown.energy  =
    (monthlyElec * (factors?.energy?.electricity_kwh ?? 0) +
     monthlyGas  * (factors?.energy?.natural_gas_kwh  ?? 0)) * 12;

  const shortFlights = Number(answers.short_haul_flights ?? 0);
  const longFlights  = Number(answers.long_haul_flights  ?? 0);
  breakdown.flights  =
    shortFlights * (factors?.flights?.short_haul_per_flight ?? 0) +
    longFlights  * (factors?.flights?.long_haul_per_flight  ?? 0);

  const totalKgPerYear = Object.values(breakdown).reduce((s, v) => s + v, 0);

  return {
    totalKgPerYear: Math.round(totalKgPerYear),
    dailyAvgKg: +(totalKgPerYear / 365).toFixed(2),
    breakdown,
  };
}

module.exports = { aggregateActivities, calculateBaseline };
