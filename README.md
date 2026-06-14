# 🌿 EcoTrace — Carbon Footprint Awareness Platform

[![Cloud Build](https://storage.googleapis.com/badges.ecotrace.dev/build.svg)](https://console.cloud.google.com/cloud-build/builds?project=ecotrace-app-123)
[![Firebase Hosting](https://img.shields.io/badge/Firebase-Hosting-orange?logo=firebase)](https://ecotrace-app-123.web.app)

A full-stack carbon footprint tracking web app built entirely on Google Cloud — Firestore, Firebase Auth, Cloud Functions, Cloud Run + Vertex AI Gemini Flash, and Firebase Hosting.

---

## Architecture

```
Browser (React SPA on Firebase Hosting)
    │
    ├─── Firebase Auth (Google Sign-In / Email)
    ├─── Cloud Firestore (per-user data)
    │       users/{uid}
    │       users/{uid}/activities/{id}
    │       users/{uid}/aggregates/{period}
    │       users/{uid}/nudges/{id}
    │       users/{uid}/achievements/{id}
    │       emissionFactors/v1
    │
    └─── Cloud Run (/nudges) ←── Vertex AI Gemini Flash
             ▲
    Firebase ID Token verification

Cloud Functions (2nd gen, us-central1):
    ├─ provisionUserProfile  (users/{uid} onCreate)
    ├─ onActivityWrite       (activities/{id} onWrite → aggregates + streak)
    └─ gamificationEngine    (aggregates/{period} onWrite → badges)
```

## Project Structure

```
carbon-platform/
├── ecotrace/              # Vite + React SPA
│   ├── src/
│   │   ├── pages/         # Dashboard, LogActivity, Insights, Onboarding, Achievements, Settings
│   │   ├── components/    # Layout, BadgeCelebration, FirestoreTest
│   │   ├── services/      # baselineCalc.js, nudgeService.js
│   │   ├── contexts/      # AuthContext.jsx
│   │   └── firebase.js    # Firebase SDK init
│   └── vite.config.js
├── functions/             # Firebase Cloud Functions (Node 20)
│   ├── index.js           # provisionUserProfile, onActivityWrite, gamificationEngine
│   └── src/
│       ├── emissionCalc.js
│       └── gamification.js
├── cloudrun/nudges/       # Cloud Run nudge gateway
│   ├── index.js           # Express app, POST /nudges
│   └── lib/
│       ├── auth.js        # Firebase ID token middleware
│       ├── geminiNudges.js # Vertex AI Gemini Flash + caching + budget
│       └── ruleFallback.js # Rule-based fallback nudges
├── firestore.rules        # Firestore Security Rules
├── firebase.json          # Firebase project config
├── cloudbuild.yaml        # Cloud Build CI/CD pipeline
└── seed.js                # emissionFactors/v1 seeder
```

## Local Development

### Prerequisites
- Node.js ≥ 20
- Firebase CLI: `npm install -g firebase-tools`
- Google Cloud SDK (`gcloud`)

### 1. Install dependencies

```bash
# Frontend
cd ecotrace && npm install

# Cloud Functions
cd ../functions && npm install

# Cloud Run (optional for local nudge dev)
cd ../cloudrun/nudges && npm install
```

### 2. Start the dev server

```bash
cd ecotrace
npm run dev          # → http://localhost:5173
```

### 3. Run unit tests

```bash
cd functions
npm test             # 11 tests, ~0.7s
```

### 4. Firebase Emulator Suite (local Firestore + Auth + Functions)

```bash
# From project root
firebase emulators:start
# → Firestore: http://localhost:8080
# → Auth:      http://localhost:9099
# → Functions: http://localhost:5002
# → Hosting:   http://localhost:5001
# → Emulator UI: http://localhost:4000
```

## Environment Variables

| Variable | File | Description |
|---|---|---|
| `VITE_NUDGE_SERVICE_URL` | `.env.production` | Cloud Run nudge service URL |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 8, Recharts, React Router v6 |
| Auth | Firebase Authentication (Google + Email/Password) |
| Database | Cloud Firestore (Native mode) |
| Functions | Firebase Cloud Functions 2nd gen (Node 20) |
| AI Gateway | Cloud Run + Node.js + Express |
| AI Model | Vertex AI Gemini 2.0 Flash |
| Hosting | Firebase Hosting |
| CI/CD | Cloud Build |
| Monitoring | Cloud Monitoring + Cloud Logging |
| Analytics | Google Analytics for Firebase (GA4) |

## Emission Factors

Stored in Firestore `emissionFactors/v1` — never hardcoded in client or function code.

| Category | Source |
|---|---|
| Transport | IPCC AR6 Table 10.8 |
| Diet | Poore & Nemecek (2018), Science |
| Energy | UK Grid (BEIS 2023) |
| Flights | ICAO Carbon Calculator v12 |

## GA4 Events

| Event | Trigger |
|---|---|
| `log_activity` | Activity saved to Firestore |
| `nudge_accepted` | User clicks "I'll do it" on a nudge |
| `nudge_dismissed` | User clicks "Skip" on a nudge |
| `badge_earned` | Badge celebration modal dismissed |
| `onboarding_complete` | Baseline saved at end of quiz |
| `quiz_step_complete` | Each step of onboarding quiz |

## Deployment

See [RUNBOOK.md](./RUNBOOK.md) for full deployment procedures and rollback steps.

## License

MIT © 2025 EcoTrace
