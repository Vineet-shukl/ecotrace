/**
 * cloudrun/nudges/lib/ruleFallback.js
 * Rule-based fallback nudge engine.
 * Returns deterministic nudges from user aggregates without any AI call.
 * Always available — used when Gemini is down, budget exceeded, or no activities yet.
 */
'use strict';

const RULE_CATALOG = [
  {
    id:            'meatless_day',
    category:      'diet',
    title:         'Try a meatless meal today',
    body:          'Swapping one meat-based meal for a plant-based option saves up to 2 kg CO₂e. It\'s one of the highest-impact diet changes you can make.',
    co2eSavingKg:  2.0,
    trigger:       (agg) => (agg?.byCategory?.diet ?? 0) > 4,
  },
  {
    id:            'short_trip_cycling',
    category:      'transport',
    title:         'Cycle or walk for your next short trip',
    body:          'Trips under 5 km by car emit ~1 kg CO₂e each. Walking or cycling eliminates that entirely and improves cardiovascular health.',
    co2eSavingKg:  1.0,
    trigger:       (agg) => (agg?.byCategory?.transport ?? 0) > 3,
  },
  {
    id:            'lower_thermostat',
    category:      'energy',
    title:         'Lower your thermostat by 1°C',
    body:          'A single degree reduction in heating can cut energy bills by ~10% and save up to 0.5 kg CO₂e per day during winter months.',
    co2eSavingKg:  0.5,
    trigger:       (agg) => (agg?.byCategory?.energy ?? 0) > 2,
  },
  {
    id:            'public_transit',
    category:      'transport',
    title:         'Take public transit once this week',
    body:          'A single bus trip instead of driving saves ~0.7 kg CO₂e on average. Your commute is the easiest transport win.',
    co2eSavingKg:  0.7,
    trigger:       (agg) => (agg?.byCategory?.transport ?? 0) > 1,
  },
  {
    id:            'offset_flight',
    category:      'flights',
    title:         'Consider a direct flight next time',
    body:          'Direct flights produce ~10–15% less CO₂e than connecting flights because takeoff and landing are the highest-emission phases.',
    co2eSavingKg:  80,
    trigger:       (agg) => (agg?.byCategory?.flights ?? 0) > 0,
  },
  {
    id:            'log_streak',
    category:      'habits',
    title:         'Keep your logging streak alive!',
    body:          'Consistent tracking is proven to reduce footprint by 10–15% over 3 months. Log today\'s activities to keep your streak going.',
    co2eSavingKg:  0.3,
    trigger:       () => true, // always available as a fallback
  },
];

/**
 * @param {object} weekAgg   – aggregates/week_{...} doc data
 * @param {number} [count=2] – number of nudges to return
 */
function getRuleNudges(weekAgg, count = 2) {
  const triggered = RULE_CATALOG.filter(r => r.trigger(weekAgg));
  // Return up to `count`, shuffle for variety
  return triggered
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map(({ id, category, title, body, co2eSavingKg }) => ({
      id, category, title, body, co2eSavingKg,
      isAI: false,
      source: 'rule-based',
    }));
}

module.exports = { getRuleNudges };
