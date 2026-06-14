/**
 * src/services/baselineCalc.js
 * Maps onboarding quiz answers → annual CO₂e baseline (kg/year).
 * Reads emission factors from the passed-in `factors` object (from
 * emissionFactors/v1 in Firestore) — never hardcodes CO₂e values inline.
 *
 * @param {object} answers  – quiz answers keyed by question ID
 * @param {object} factors  – emissionFactors/v1 document from Firestore
 * @returns {{ totalKgPerYear: number, breakdown: object }}
 */
export function calculateBaseline(answers, factors) {
  const breakdown = {};

  // ── Transport ─────────────────────────────────────────────
  // Q: primary_transport_mode, weekly_km
  const mode    = answers.primary_transport_mode ?? 'car_gasoline';
  const weeklyKm = Number(answers.weekly_km ?? 0);
  const transportFactor = factors?.transport?.[mode] ?? 0;
  breakdown.transport = transportFactor * weeklyKm * 52; // kg/year

  // ── Diet ─────────────────────────────────────────────────
  // Q: diet_type (daily CO₂e × 365)
  const dietType   = answers.diet_type ?? 'meat_average';
  const dietFactor = factors?.diet?.[dietType] ?? 0;
  breakdown.diet = dietFactor * 365; // kg/year

  // ── Home Energy ───────────────────────────────────────────
  // Q: monthly_electricity_kwh, monthly_gas_kwh
  const monthlyElec = Number(answers.monthly_electricity_kwh ?? 0);
  const monthlyGas  = Number(answers.monthly_gas_kwh ?? 0);
  const elecFactor  = factors?.energy?.electricity_kwh ?? 0;
  const gasFactor   = factors?.energy?.natural_gas_kwh ?? 0;
  breakdown.energy =
    (monthlyElec * elecFactor + monthlyGas * gasFactor) * 12; // kg/year

  // ── Flights ───────────────────────────────────────────────
  // Q: short_haul_flights, long_haul_flights (per year)
  const shortFlights = Number(answers.short_haul_flights ?? 0);
  const longFlights  = Number(answers.long_haul_flights ?? 0);
  breakdown.flights =
    shortFlights * (factors?.flights?.short_haul_per_flight ?? 0) +
    longFlights  * (factors?.flights?.long_haul_per_flight  ?? 0);

  const totalKgPerYear = Object.values(breakdown).reduce((s, v) => s + v, 0);

  // Category percentages for pie chart
  const categoryPct = {};
  for (const [cat, val] of Object.entries(breakdown)) {
    categoryPct[cat] = totalKgPerYear > 0
      ? Math.round((val / totalKgPerYear) * 100)
      : 0;
  }

  return {
    totalKgPerYear: Math.round(totalKgPerYear),
    dailyAvgKg: +(totalKgPerYear / 365).toFixed(2),
    breakdown,
    categoryPct,
    computedAt: new Date().toISOString(),
    factorsVersion: 'v1',
  };
}

/**
 * Computes daily CO₂e for a single logged activity.
 * @param {string} category  – 'transport' | 'diet' | 'energy' | 'flights'
 * @param {string} subType   – key within the category (e.g. 'car_gasoline')
 * @param {number} amount    – quantity (km, kWh, 1 for meals, count for flights)
 * @param {object} factors   – emissionFactors/v1 document
 */
export function computeActivityCo2e(category, subType, amount, factors) {
  const factor = factors?.[category]?.[subType] ?? 0;
  return +(factor * amount).toFixed(4);
}

/**
 * Returns a human-readable comparison to global average.
 * @param {number} annualKg
 */
export function footprintLabel(annualKg) {
  if (annualKg <  2000) return { label: 'Very Low',  color: '#22d3a5' };
  if (annualKg <  4000) return { label: 'Low',       color: '#6ee7b7' };
  if (annualKg <  6000) return { label: 'Average',   color: '#f59e0b' };
  if (annualKg < 10000) return { label: 'High',      color: '#f97316' };
  return                        { label: 'Very High', color: '#f87171' };
}
