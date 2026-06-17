<div align="center">

<img src="https://img.shields.io/badge/🌿_EcoTrace-Carbon_Footprint_Tracker-22d3a5?style=for-the-badge&labelColor=0d1117" alt="EcoTrace" />

# EcoTrace — Track. Reduce. Impact.

**AI-powered carbon footprint awareness platform built entirely on Google Cloud**

Track your daily carbon emissions, get personalised AI nudges from Gemini Flash,  
earn badges for eco-milestones, and visualise your impact — all in real time.

<br/>

[![Live App](https://img.shields.io/badge/🚀_Live_App-ecotrace--app--123.web.app-22d3a5?style=for-the-badge&logoColor=white)](https://ecotrace-app-123.web.app)
[![Cloud Build](https://img.shields.io/badge/CI%2FCD-Cloud_Build-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://console.cloud.google.com/cloud-build/builds?project=ecotrace-app-123)
[![Firebase Hosting](https://img.shields.io/badge/Hosting-Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://ecotrace-app-123.web.app)
[![Vertex AI](https://img.shields.io/badge/AI-Gemini_Flash-7c3aed?style=for-the-badge&logo=google&logoColor=white)](https://cloud.google.com/vertex-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-6ee7b7?style=for-the-badge)](./LICENSE)

<br/>

</div>

---

## ✨ What is EcoTrace?

EcoTrace is a **full-stack sustainability platform** that helps individuals understand and reduce their carbon footprint through:

- 🧮 **Personalised Baseline Quiz** — onboarding quiz maps your transport, diet, energy, and flights to an annual CO₂e baseline using IPCC-sourced emission factors
- 📊 **Real-time Dashboard** — daily, weekly, and streak stats with interactive charts
- 🤖 **AI Nudges** — Gemini 2.0 Flash generates personalised, actionable eco-tips based on your highest-emission categories (falls back to rule-based nudges when budget is exhausted)
- 🏆 **Gamification** — badges, streaks, and milestone tracking to keep you motivated
- 🔒 **Private by Design** — all data is per-user, Firestore rules enforce strict isolation

> Built entirely on the **Google Cloud + Firebase** ecosystem — zero third-party services.

---

## 🖥️ Live Demo

| | |
|---|---|
| **🌐 App** | [https://ecotrace-app-123.web.app](https://ecotrace-app-123.web.app) |
| **👤 Sign in with** | Google · Email/Password · Passwordless email link |
| **⚡ AI Nudges** | Up to 3 Gemini-powered nudges per day, then rule-based fallback |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Browser — React SPA (Firebase Hosting)      │
│              Vite 8 · React 19 · Recharts · React Router│
└──────────────┬──────────────────────────┬───────────────┘
               │                          │
        Firebase Auth              Cloud Firestore
   (Google · Email/PW ·        users/{uid}/activities
    email-link · verified)     users/{uid}/aggregates
                               users/{uid}/nudges
                               users/{uid}/achievements
                               emissionFactors/v1
               │
               ▼  (Bearer: Firebase ID Token)
┌──────────────────────────────────┐
│  Cloud Run — nudge-service       │
│  Node.js + Express               │
│  POST /nudges                    │
│  ├─ Auth middleware              │
│  ├─ Daily budget check           │
│  ├─ Prompt cache (6h TTL)        │
│  └─► Vertex AI Gemini 2.0 Flash  │
└──────────────────────────────────┘

Firebase Cloud Functions (2nd gen, us-central1):
  ├─ provisionUserProfile   → onCreate trigger
  ├─ onActivityWrite        → aggregates + streak update
  └─ gamificationEngine     → badge awards on aggregate writes

CI/CD: Cloud Build → Artifact Registry → Cloud Run + Firebase Hosting
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 + Vite 8 | SPA with code-split vendor chunks |
| **Charts** | Recharts 3 | 7-day trend & category breakdown |
| **Auth** | Firebase Authentication | Google · Email/Password · passwordless email link · email verification |
| **Database** | Cloud Firestore (Native) | Per-user real-time data |
| **Functions** | Firebase Cloud Functions v2 | Firestore triggers (Node 20) |
| **AI Gateway** | Cloud Run + Express | Server-side Vertex AI proxy |
| **AI Model** | Vertex AI Gemini 2.0 Flash | Personalised nudge generation |
| **Hosting** | Firebase Hosting | Global CDN, SPA rewrites |
| **CI/CD** | Cloud Build | Automated build + deploy pipeline |
| **Monitoring** | Cloud Monitoring + Logging | Metrics, alerts, log sinks |
| **Analytics** | Google Analytics (GA4) | User journey + nudge engagement |

---

## 📁 Project Structure

```
carbon-platform/
├── ecotrace/                   # 🖥️  Vite + React SPA
│   ├── public/                 # robots.txt, sitemap.xml, site.webmanifest,
│   │                           # og-image.png, favicon.svg
│   ├── src/
│   │   ├── pages/              # Dashboard, LogActivity, Insights, Onboarding,
│   │   │                       # Achievements, Settings, AuthPage, VerifyEmail
│   │   ├── components/         # Layout, BadgeCelebration
│   │   ├── services/           # baselineCalc.js, nudgeService.js,
│   │   │                       # passwordPolicy.js (+ *.test.js — Vitest)
│   │   ├── hooks/              # useDocumentTitle.js (per-route SEO titles)
│   │   ├── contexts/           # AuthContext.jsx
│   │   ├── constants.js        # shared UI constants
│   │   └── firebase.js         # Firebase SDK init (env-var driven)
│   ├── .env.example            # 📋 Config template — copy → .env
│   └── vite.config.js
│
├── functions/                  # ⚡ Firebase Cloud Functions (Node 20)
│   ├── index.js                # provisionUserProfile · onActivityWrite
│   │                           # gamificationEngine
│   └── src/
│       ├── emissionCalc.js     # CO₂e calculation engine
│       └── gamification.js     # Badge & streak logic
│
├── cloudrun/nudges/            # 🤖 AI Nudge Gateway (Cloud Run)
│   ├── index.js                # Express app — POST /nudges, GET /health
│   └── lib/
│       ├── auth.js             # Firebase ID token middleware
│       ├── geminiNudges.js     # Vertex AI · daily budget · prompt cache
│       └── ruleFallback.js     # Rule-based fallback nudges
│
├── firestore.rules             # 🔒 Per-user security rules (default deny)
├── firebase.json               # Firebase project config
├── cloudbuild.yaml             # 🔄 CI/CD pipeline
├── .semgrepignore              # Scanner false-positive suppressions
├── seed.js                     # emissionFactors/v1 seeder
└── RUNBOOK.md                  # 📖 Deployment & rollback procedures
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) |
| Firebase CLI | latest | `npm i -g firebase-tools` |
| Google Cloud SDK | latest | [cloud.google.com/sdk](https://cloud.google.com/sdk) |

### 1. Clone & install

```bash
git clone https://github.com/Vineet-shukl/ecotrace.git
cd ecotrace

# Frontend
cd ecotrace && npm install

# Cloud Functions
cd ../functions && npm install

# Cloud Run (optional — only needed for AI nudge development)
cd ../cloudrun/nudges && npm install
```

### 2. Configure environment

```bash
cd ecotrace
cp .env.example .env
# Edit .env and fill in your Firebase project values
# (Firebase Console → Project Settings → Your apps → SDK setup)
```

### 3. Start the dev server

```bash
cd ecotrace
npm run dev
# → http://localhost:5173
```

### 4. Run unit tests

```bash
cd functions
npm test
# ✓ 11 tests, ~0.7s — emission calc + gamification engine
```

### 5. Firebase Emulator Suite (full local stack)

```bash
# From project root — runs Firestore + Auth + Functions + Hosting locally
firebase emulators:start
```

| Service | Local URL |
|---|---|
| Firestore | http://localhost:8080 |
| Auth | http://localhost:9099 |
| Functions | http://localhost:5002 |
| Hosting | http://localhost:5001 |
| Emulator UI | http://localhost:4000 |

---

## 🔑 Environment Variables

All sensitive config is loaded from environment variables — never hardcoded.

| Variable | Required | Description |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | GCP / Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | ✅ | Firebase Web App ID |
| `VITE_NUDGE_SERVICE_URL` | ✅ | Cloud Run nudge service URL |
| `GOOGLE_CLOUD_PROJECT` | ✅ (Cloud Run) | Injected automatically by Cloud Run |

> **Local dev:** Copy `.env.example` → `.env` and fill in values.  
> **CI/CD:** Cloud Build injects vars from Secret Manager at build time.

---

## 📊 Emission Factors

All CO₂e factors are stored in Firestore `emissionFactors/v1` — **never hardcoded** in client or function code. This enables factor updates without deploys.

| Category | Emission Source | Reference |
|---|---|---|
| 🚗 Transport | kg CO₂e per km by mode | IPCC AR6 Table 10.8 |
| 🥗 Diet | kg CO₂e per day by diet type | Poore & Nemecek (2018), *Science* |
| ⚡ Energy | kg CO₂e per kWh | UK Grid (BEIS 2023) |
| ✈️ Flights | kg CO₂e per flight by haul | ICAO Carbon Calculator v12 |

---

## 🔒 Security

- **Firestore Rules** — default-deny; all reads/writes validated by `request.auth.uid == uid`
- **Cloud Run** — requires valid Firebase ID token on every request
- **Environment vars** — all secrets in `.env` (gitignored) or GCP Secret Manager
- **Gemini Safety** — `systemInstruction` scopes model to sustainability content only
- **Secret scanning** — TruffleHog GitHub Action blocks credential commits on every push
- **Prototype pollution** — `Object.hasOwn()` guards on all dynamic key lookups

---

## 📈 Analytics Events (GA4)

| Event | Trigger |
|---|---|
| `onboarding_complete` | Baseline quiz finished & saved |
| `quiz_step_complete` | Each step of onboarding quiz |
| `log_activity` | Activity saved to Firestore |
| `nudge_accepted` | User clicks "I'll do it ✓" |
| `nudge_dismissed` | User clicks "Skip" |
| `badge_earned` | Badge celebration modal dismissed |

---

## 📖 Deployment

See **[RUNBOOK.md](./RUNBOOK.md)** for full procedures including:
- Manual deploys (Hosting, Functions, Cloud Run, Firestore Rules)
- CI/CD pipeline via Cloud Build
- Rollback steps
- Health checks and monitoring

---

## 🗺️ Roadmap

| Phase | Status | Features |
|---|---|---|
| Phase 1 | ✅ Done | Firestore + Auth setup, data model, emission factors |
| Phase 2 | ✅ Done | Onboarding quiz, baseline calc, Cloud Functions, unit tests |
| Phase 3 | ✅ Done | Vertex AI nudges, gamification engine, GA4 analytics |
| Phase 4 | ✅ Done | CI/CD pipeline, Cloud Run, hosting, Firestore rules hardening |
| Phase 5 | 🔜 Planned | Carbon offset suggestions, social sharing, push notifications |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Copy `.env.example` → `.env` and configure your Firebase project
4. Make your changes and run `npm test` in `functions/`
5. Open a Pull Request — the secret-scan CI will run automatically

> ⚠️ **Never commit API keys, `.env` files, or service account JSON.**  
> The TruffleHog CI job will block the PR if detected.

---

## 📄 License

MIT © 2025 [Vineet Shukla](https://github.com/Vineet-shukl)

---

<div align="center">

**Built with ❤️ on Google Cloud**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black&style=flat-square)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore_+_Auth-FFCA28?logo=firebase&logoColor=black&style=flat-square)](https://firebase.google.com)
[![Vertex AI](https://img.shields.io/badge/Vertex_AI-Gemini_2.0_Flash-4285F4?logo=google-cloud&logoColor=white&style=flat-square)](https://cloud.google.com/vertex-ai)
[![Cloud Run](https://img.shields.io/badge/Cloud_Run-Serverless-4285F4?logo=google-cloud&logoColor=white&style=flat-square)](https://cloud.google.com/run)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white&style=flat-square)](https://vite.dev)

*If EcoTrace helped you think about your footprint, give it a ⭐*

</div>
