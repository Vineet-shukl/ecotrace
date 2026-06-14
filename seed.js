// seed.js — Seeds emissionFactors/v1 to Firestore using firebase-admin v12+
const { initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({ credential: applicationDefault(), projectId: 'ecotrace-app-123' });
const db = getFirestore();

async function seed() {
  const factors = {
    transport: {
      car_gasoline: 0.192,
      car_ev: 0.05,
      bus: 0.082,
      train: 0.041,
      bicycle: 0.0,
      walking: 0.0
    },
    diet: {
      vegan: 2.5,
      vegetarian: 3.2,
      pescatarian: 3.9,
      meat_average: 5.6,
      meat_heavy: 7.2
    },
    energy: {
      electricity_kwh: 0.385,
      natural_gas_kwh: 0.203
    },
    flights: {
      short_haul_per_flight: 250,
      long_haul_per_flight: 800
    },
    metadata: {
      version: 'v1',
      source: 'IPCC AR6 / UK DEFRA 2023 emission factors',
      units: 'kg CO2e',
      updatedAt: new Date().toISOString(),
    }
  };

  await db.collection('emissionFactors').doc('v1').set(factors);
  console.log('✅ Seeded emissionFactors/v1 successfully.');
  process.exit(0);
}

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });
