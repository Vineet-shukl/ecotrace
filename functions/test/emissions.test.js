/**
 * functions/test/emissions.test.js
 * Unit tests for emission calculation logic.
 * Run with: npm test (from functions/ directory)
 */
'use strict';

const { aggregateActivities, calculateBaseline } = require('../src/emissionCalc');

// Emission factors matching emissionFactors/v1 in Firestore
const FACTORS = {
  transport: { car_gasoline: 0.192, car_ev: 0.05, bus: 0.082, train: 0.041, bicycle: 0, walking: 0 },
  diet:      { vegan: 2.5, vegetarian: 3.2, pescatarian: 3.9, meat_average: 5.6, meat_heavy: 7.2 },
  energy:    { electricity_kwh: 0.385, natural_gas_kwh: 0.203 },
  flights:   { short_haul_per_flight: 250, long_haul_per_flight: 800 },
};

// ── calculateBaseline ───────────────────────────────────────────────────────

describe('calculateBaseline()', () => {
  test('average UK person — car + meat + typical energy + 2 flights', () => {
    const answers = {
      primary_transport_mode:   'car_gasoline',
      weekly_km:                '150',
      diet_type:                'meat_average',
      monthly_electricity_kwh:  '350',
      monthly_gas_kwh:          '500',
      short_haul_flights:       '2',
      long_haul_flights:        '1',
    };
    const result = calculateBaseline(answers, FACTORS);

    // Transport: 0.192 * 150 * 52 = 1497.6
    expect(result.breakdown.transport).toBeCloseTo(1497.6, 0);

    // Diet: 5.6 * 365 = 2044
    expect(result.breakdown.diet).toBeCloseTo(2044, 0);

    // Energy: (350*0.385 + 500*0.203) * 12 = (134.75+101.5)*12 = 2834.1... ≈ 2835
    expect(result.breakdown.energy).toBeCloseTo(2835, 0);

    // Flights: 2*250 + 1*800 = 1300
    expect(result.breakdown.flights).toBe(1300);

    // Total ≈ 7676
    expect(result.totalKgPerYear).toBeGreaterThan(7000);
    expect(result.totalKgPerYear).toBeLessThan(8500);

    // Daily average
    expect(result.dailyAvgKg).toBeCloseTo(result.totalKgPerYear / 365, 1);
  });

  test('vegan cyclist with no flights → low footprint', () => {
    const answers = {
      primary_transport_mode:   'bicycle',
      weekly_km:                '100',
      diet_type:                'vegan',
      monthly_electricity_kwh:  '200',
      monthly_gas_kwh:          '0',
      short_haul_flights:       '0',
      long_haul_flights:        '0',
    };
    const result = calculateBaseline(answers, FACTORS);

    expect(result.breakdown.transport).toBe(0);  // bicycle = 0 kg
    expect(result.breakdown.diet).toBeCloseTo(912.5, 0); // 2.5 * 365
    expect(result.breakdown.flights).toBe(0);
    expect(result.totalKgPerYear).toBeLessThan(2000);
  });

  test('returns 0 for all-zero answers', () => {
    const answers = {
      primary_transport_mode:   'walking',
      weekly_km:                '0',
      diet_type:                'vegan',
      monthly_electricity_kwh:  '0',
      monthly_gas_kwh:          '0',
      short_haul_flights:       '0',
      long_haul_flights:        '0',
    };
    const result = calculateBaseline(answers, FACTORS);
    expect(result.breakdown.transport).toBe(0);
    expect(result.breakdown.energy).toBe(0);
    expect(result.breakdown.flights).toBe(0);
    // Diet still non-zero even for vegan
    expect(result.breakdown.diet).toBeGreaterThan(0);
  });

  test('missing answer keys default safely', () => {
    // Completely empty answers
    const result = calculateBaseline({}, FACTORS);
    expect(result.totalKgPerYear).toBeGreaterThan(0); // defaults to meat_average diet
    expect(typeof result.dailyAvgKg).toBe('number');
  });

  test('invalid factor version → falls back gracefully', () => {
    const answers = {
      primary_transport_mode: 'car_gasoline',
      weekly_km: '100',
      diet_type: 'meat_average',
    };
    // Pass null factors — should not throw
    expect(() => calculateBaseline(answers, null)).not.toThrow();
    const result = calculateBaseline(answers, null);
    expect(result.totalKgPerYear).toBe(0);
  });
});

// ── aggregateActivities ─────────────────────────────────────────────────────

describe('aggregateActivities()', () => {
  const mockActivities = [
    { co2eKg: 3.5, category: 'transport' },
    { co2eKg: 5.6, category: 'diet'      },
    { co2eKg: 1.2, category: 'energy'    },
    { co2eKg: 2.0, category: 'transport' },
  ];

  test('sums totals correctly', () => {
    const result = aggregateActivities(mockActivities);
    expect(result.totalCo2eKg).toBeCloseTo(12.3, 2);
    expect(result.count).toBe(4);
  });

  test('groups by category', () => {
    const result = aggregateActivities(mockActivities);
    expect(result.byCategory.transport).toBeCloseTo(5.5, 2);
    expect(result.byCategory.diet).toBeCloseTo(5.6, 2);
    expect(result.byCategory.energy).toBeCloseTo(1.2, 2);
  });

  test('handles empty array', () => {
    const result = aggregateActivities([]);
    expect(result.totalCo2eKg).toBe(0);
    expect(result.count).toBe(0);
    expect(result.byCategory).toEqual({});
  });

  test('handles zero co2eKg activities', () => {
    const result = aggregateActivities([{ co2eKg: 0, category: 'transport' }]);
    expect(result.totalCo2eKg).toBe(0);
  });

  test('handles missing co2eKg gracefully', () => {
    const acts = [{ category: 'transport' }, { co2eKg: undefined, category: 'diet' }];
    expect(() => aggregateActivities(acts)).not.toThrow();
    const result = aggregateActivities(acts);
    expect(result.totalCo2eKg).toBe(0);
  });

  test('floating point precision maintained to 4 decimal places', () => {
    const acts = [{ co2eKg: 0.1, category: 'a' }, { co2eKg: 0.2, category: 'a' }];
    const result = aggregateActivities(acts);
    expect(result.totalCo2eKg).toBe(0.3); // proper rounding
  });
});
