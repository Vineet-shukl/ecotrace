// src/services/baselineCalc.test.js — unit tests for the baseline calculator.
import { describe, test, expect } from 'vitest';
import { calculateBaseline, computeActivityCo2e, footprintLabel } from './baselineCalc';

// Emission factors mirroring emissionFactors/v1 in Firestore.
const FACTORS = {
  transport: { car_gasoline: 0.192, car_ev: 0.05, bus: 0.082, train: 0.041, bicycle: 0, walking: 0 },
  diet:      { vegan: 2.5, vegetarian: 3.2, pescatarian: 3.9, meat_average: 5.6, meat_heavy: 7.2 },
  energy:    { electricity_kwh: 0.385, natural_gas_kwh: 0.203 },
  flights:   { short_haul_per_flight: 250, long_haul_per_flight: 800 },
};

describe('calculateBaseline()', () => {
  test('sums all categories into an annual total', () => {
    const res = calculateBaseline({
      primary_transport_mode: 'car_gasoline',
      weekly_km: '150',
      diet_type: 'meat_average',
      monthly_electricity_kwh: '350',
      monthly_gas_kwh: '500',
      short_haul_flights: '2',
      long_haul_flights: '1',
    }, FACTORS);

    // transport: 0.192*150*52 = 1497.6
    // diet: 5.6*365 = 2044
    // energy: (350*0.385 + 500*0.203)*12 = (134.75+101.5)*12 = 2835
    // flights: 2*250 + 1*800 = 1300
    expect(res.breakdown.transport).toBeCloseTo(1497.6, 1);
    expect(res.breakdown.diet).toBeCloseTo(2044, 1);
    expect(res.breakdown.energy).toBeCloseTo(2835, 1);
    expect(res.breakdown.flights).toBe(1300);
    expect(res.totalKgPerYear).toBe(Math.round(1497.6 + 2044 + 2835 + 1300));
    expect(res.factorsVersion).toBe('v1');
  });

  test('zero-impact lifestyle returns 0', () => {
    const res = calculateBaseline({
      primary_transport_mode: 'walking',
      weekly_km: '50',
      diet_type: 'vegan',          // vegan still has a diet factor
      monthly_electricity_kwh: '0',
      monthly_gas_kwh: '0',
      short_haul_flights: '0',
      long_haul_flights: '0',
    }, FACTORS);
    expect(res.breakdown.transport).toBe(0);
    expect(res.breakdown.energy).toBe(0);
    expect(res.breakdown.flights).toBe(0);
    expect(res.totalKgPerYear).toBeGreaterThan(0); // diet contributes
  });

  test('missing answers fall back to safe defaults without throwing', () => {
    const res = calculateBaseline({}, FACTORS);
    expect(Number.isFinite(res.totalKgPerYear)).toBe(true);
    expect(res.totalKgPerYear).toBeGreaterThanOrEqual(0);
  });

  test('unknown factors object degrades to 0 rather than NaN', () => {
    const res = calculateBaseline({ weekly_km: '100' }, {});
    expect(res.totalKgPerYear).toBe(0);
  });

  test('categoryPct values sum to ~100 when total > 0', () => {
    const res = calculateBaseline({
      primary_transport_mode: 'car_gasoline', weekly_km: '100',
      diet_type: 'meat_average', monthly_electricity_kwh: '300', monthly_gas_kwh: '200',
      short_haul_flights: '1', long_haul_flights: '0',
    }, FACTORS);
    const sum = Object.values(res.categoryPct).reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThanOrEqual(98);
    expect(sum).toBeLessThanOrEqual(102);
  });
});

describe('computeActivityCo2e()', () => {
  test('multiplies the right factor by the amount', () => {
    expect(computeActivityCo2e('transport', 'car_gasoline', 10, FACTORS)).toBeCloseTo(1.92, 4);
    expect(computeActivityCo2e('energy', 'electricity_kwh', 5, FACTORS)).toBeCloseTo(1.925, 4);
  });

  test('unknown subType returns 0', () => {
    expect(computeActivityCo2e('transport', 'teleporter', 100, FACTORS)).toBe(0);
  });

  test('prototype-pollution keys are ignored (returns 0)', () => {
    expect(computeActivityCo2e('transport', '__proto__', 100, FACTORS)).toBe(0);
    expect(computeActivityCo2e('__proto__', 'car_gasoline', 100, FACTORS)).toBe(0);
  });

  test('rounds to 4 decimal places', () => {
    const v = computeActivityCo2e('transport', 'train', 3, FACTORS); // 0.041*3 = 0.123
    expect(v).toBe(0.123);
  });
});

describe('footprintLabel()', () => {
  test('maps annual kg to the correct band', () => {
    expect(footprintLabel(1000).label).toBe('Very Low');
    expect(footprintLabel(3000).label).toBe('Low');
    expect(footprintLabel(5000).label).toBe('Average');
    expect(footprintLabel(8000).label).toBe('High');
    expect(footprintLabel(12000).label).toBe('Very High');
  });

  test('every band returns a color', () => {
    [1000, 3000, 5000, 8000, 12000].forEach(kg => {
      expect(footprintLabel(kg).color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});
