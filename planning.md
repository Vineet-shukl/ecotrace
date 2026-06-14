# Project Plan: Carbon Footprint Awareness Platform (Google Stack Edition)

## 1. Executive Summary & Vision

**Core Concept**
EcoTrace is a mobile-first platform that turns the abstract concept of a personal carbon footprint into a concrete, daily, improvable number. Most people want to reduce their environmental impact but lack (a) a trustworthy baseline, (b) a low-friction way to log everyday choices, and (c) clear, personalized next steps. EcoTrace closes this gap: a 2-minute onboarding quiz estimates the user's annual CO₂e baseline, a frictionless daily tracker captures transport / diet / energy choices, and a Gemini-powered insights engine converts that data into one or two simple, personalized nudges per day. Gamification (streaks, badges, milestones) sustains the habit loop. The mission: **make carbon reduction measurable, personal, and rewarding enough to become a daily habit.**

**Target Audience (Personas)**
- **"Conscious Clara" (Primary)** — 25–40, urban professional, environmentally motivated but time-poor. Wants impact without spreadsheets. Success = effortless logging + visible progress.
- **"Data-Driven Dev Dan" (Secondary)** — 22–35, analytical, motivated by metrics and optimization. Wants accurate numbers, trends, and granular breakdowns.
- **"Gamer Gabby" (Tertiary)** — 18–30, motivated by streaks, badges, and social comparison more than by climate per se. Success = retention through gamification.
- **"Curious Carlos" (Top-of-funnel)** — broad public who completes the calculator once; conversion goal = turn one-time quiz takers into daily trackers.

**Success Metrics (KPIs)**
1. **Activation rate** — % of new sign-ups who complete onboarding baseline + log ≥1 activity within 48h. Target ≥ 60%.
2. **D30 tracking retention** — % of activated users logging ≥3 days/week at day 30. Target ≥ 35%.
3. **Average measured CO₂e reduction per retained user** — % decline in rolling 30-day footprint vs. their baseline. Target ≥ 8% by day 90.
4. **Nudge engagement rate** — % of delivered Gemini nudges marked "done" / accepted. Target ≥ 25%.
5. **Streak depth** — median active streak length among retained users. Target ≥ 7 days.

## 2. Scope & Feature Hierarchy

**In-Scope (MVP)**
- **Onboarding & Baseline Calculator** — 8–12 question quiz (home energy, primary transport mode + weekly distance, diet type, flights/year). Maps answers to CO₂e using a versioned emission-factor table stored in Firestore. Produces an annual baseline + per-category breakdown shown as a radial/stacked chart.
- **Daily/Weekly Activity Tracker** — quick-log UI for transport (mode + distance), meals (diet category), and energy (e.g., heating/AC usage). One-tap "repeat yesterday" and templated common entries to minimize friction. Each entry computes CO₂e from the emission-factor table and updates running daily/weekly/monthly totals.
- **Personalized Insights & Nudges** — Vertex AI (Gemini) generates 1–2 daily personalized, actionable suggestions grounded in the user's recent logs and baseline; a rule-based fallback engine guarantees a nudge when AI is unavailable or over budget. Each nudge has an estimated CO₂e saving and an accept/dismiss action.
- **Gamification / Habit Building** — logging streaks, achievement badges (e.g., "Meat-free week", "Transit Champion"), and cumulative impact milestones ("You've saved 100 kg CO₂e"). Visual progress toward the user's reduction goal.
- **Web Application** — Vite + React single-page application (SPA) hosted on Firebase Hosting, fully responsive across all device sizes (320px → 1440px+). Firebase JS SDK for Auth + Firestore; Recharts for data visualisation.

**Out-of-Scope (Future Phases)**
- Social graph: friends, leaderboards, team/household challenges.
- Bank/utility/transaction integrations (e.g., automatic spend-based estimation) and smart-meter / Google Maps Timeline imports.
- Verified carbon-offset marketplace and purchasing.
- Wearable / Google Fit / Apple Health auto-import of activity.
- Native iOS / Android mobile apps.
- Corporate/B2B ESG dashboards.
- Localization beyond English and region-specific emission-factor sets.

## 3. Technical Architecture & Tech Stack (100% Google Ecosystem)

**Frontend / Client Layer — Vite + React (Web)**
- Single-page application built with Vite + React, hosted on Firebase Hosting (global CDN). Vanilla CSS design system with CSS custom properties, CSS Grid, Flexbox, and fluid typography via `clamp()` — fully responsive from 320 px to 1440 px+. Firebase JS SDK v10 (`firebase/auth`, `firebase/firestore`, `firebase/analytics`) wired directly to Firestore with client-side security rules. Charts via Recharts. React Router v6 for navigation. No framework-specific state library — React Context + hooks for Phase 1; Zustand if complexity grows.

**Application Logic & Hosting — Cloud Run + Firebase Cloud Functions**
- **Firebase Cloud Functions (2nd gen)** for lightweight event-driven logic: Firestore triggers (recompute aggregates on new log, award badges/streaks), Auth `onCreate` trigger to seed a user profile.
- **Cloud Run** for the containerized REST API that brokers Vertex AI calls (Gemini insight generation), enforces auth (Firebase ID-token verification), rate-limits, and runs heavier batch jobs. Cloud Run chosen for the AI gateway because of longer timeouts, controlled concurrency, and clean cost isolation; Functions chosen for cheap reactive triggers. Cloud Scheduler triggers periodic jobs (weekly summaries).

**Database & State — Cloud Firestore (NoSQL)**
- Collections: `users/{uid}` (profile, baseline, goal), `users/{uid}/activities/{id}` (timestamped logs), `users/{uid}/aggregates/{period}` (precomputed daily/weekly/monthly CO₂e), `users/{uid}/nudges/{id}`, `users/{uid}/achievements/{id}`, and a top-level `emissionFactors/{version}` reference collection. Security Rules enforce per-user isolation (`request.auth.uid == uid`). Composite indexes for activity range queries by date + category.

**AI & Insights Engine — Google Gemini via Vertex AI**
- Cloud Run service calls Vertex AI Gemini (e.g., `gemini-2.x-flash` for cost/latency) with a structured prompt containing recent aggregates + baseline; responses constrained to JSON (suggestion text, category, estimated CO₂e saving). Caching of similar prompts and a deterministic rule-based fallback control cost/latency. All AI calls run server-side — no API keys on device.

**Authentication — Firebase Authentication**
- Google Sign-In + Email/Password providers. ID tokens passed as Bearer tokens to Cloud Run; Functions/Rules use `request.auth`. Auth `onCreate` trigger provisions the Firestore user document.

**Analytics & Monitoring — Google Analytics for Firebase + Cloud Logging**
- GA4 for Firebase: funnel events (`onboarding_complete`, `activity_logged`, `nudge_accepted`, `streak_milestone`). Cloud Logging + Cloud Monitoring + Error Reporting for backend; dashboards/alerts on Vertex AI latency, error rate, and spend. Crashlytics for client crash reporting.

**Architecture flow (text):**
`React SPA (Firebase Hosting) → Firebase Auth (ID token) → Firestore (direct, rules-guarded reads/writes for logs) ↘ Firestore triggers → Cloud Functions (aggregates, badges, streaks). React SPA → Cloud Run API (Bearer token in Authorization header) → Vertex AI Gemini → nudge written to Firestore. Cloud Scheduler → Cloud Run (weekly summary). All services → Cloud Logging/Monitoring; client → GA4 (Firebase Analytics JS SDK).`

## 4. Implementation Roadmap (Phases)

### Phase 1 — Google Cloud Environment Setup & Data Modeling (Week 1)
- [ ] Create GCP project; link billing; set budget + budget alerts.
- [ ] Create Firebase project on the same GCP project; register iOS + Android apps; add `google-services.json` / `GoogleService-Info.plist`.
- [ ] Create Firebase project on the same GCP project; add `firebase.json`; configure Firebase Hosting.
- [ ] Enable APIs: Firestore, Cloud Functions, Cloud Run, Cloud Build, Artifact Registry, Vertex AI, IAM, Cloud Scheduler, Cloud Logging/Monitoring.
- [ ] Provision Firestore (Native mode) in chosen region; define collection structure (`users`, `activities`, `aggregates`, `nudges`, `achievements`, `emissionFactors`).
- [ ] Author Firestore Security Rules (per-user isolation) + seed `emissionFactors/v1` document with sourced CO₂e factors.
- [ ] Define composite indexes for activity queries (uid + date range + category).
- [ ] Enable Firebase Authentication (Google + Email/Password).
- [ ] Set up IAM service accounts (Cloud Run → Vertex AI invoker; least privilege) and Secret Manager for any config.
- [ ] Scaffold Vite + React web app (`npm create vite@latest ecotrace -- --template react`); integrate Firebase JS SDK (`firebase/auth`, `firebase/firestore`, `firebase/analytics`); configure Firebase Hosting in `firebase.json`; verify a test read/write to Firestore from the browser.
- [ ] Initialize Git repo + branch strategy; document local dev setup (Firebase Emulator Suite for Auth + Firestore).

### Phase 2 — Core Calculator & Backend Development (Week 2)
- [ ] Build onboarding quiz UI in React (multi-step form with progress indicator, React Router).
- [ ] Implement baseline calculation service mapping answers → CO₂e via `emissionFactors`; persist baseline + breakdown to `users/{uid}`.
- [ ] Build activity tracker UI (transport / meals / energy) with quick-log + "repeat yesterday" templates.
- [ ] Implement Cloud Function (Firestore `onWrite` of activity) to recompute daily/weekly/monthly `aggregates`.
- [ ] Implement Auth `onCreate` Function to provision user profile doc.
- [ ] Build dashboard screen: baseline vs. current footprint, category breakdown (Recharts), trend over time.
- [ ] Write unit tests for emission calculations; test triggers against Firebase Emulator Suite.

### Phase 3 — Vertex AI Integration & Gamification (Week 3)
- [ ] Build Cloud Run container (FastAPI/Node) exposing `/nudges` endpoint; verify Firebase ID token on each request.
- [ ] Integrate Vertex AI Gemini: structured prompt from aggregates+baseline; enforce JSON output; map to nudge schema.
- [ ] Implement rule-based fallback nudge engine + prompt caching + per-user daily nudge budget.
- [ ] Deploy Cloud Run; wire React SPA to call it and render nudges with accept/dismiss + estimated savings.
- [ ] Implement gamification engine (Cloud Function): streak tracking, badge awarding, milestone detection → write to `achievements`.
- [ ] Build gamification UI: streak counter, badge gallery, milestone celebrations.
- [ ] Configure Cloud Scheduler → Cloud Run weekly summary job.
- [ ] Instrument GA4 events across onboarding, logging, nudges, streaks (Firebase Analytics JS SDK).

### Phase 4 — CI/CD, Optimization & Deployment (Week 4)
- [ ] Set up Cloud Build CI/CD: triggers on push — run tests, build Cloud Run image to Artifact Registry, deploy Functions + Rules + Hosting + Cloud Run.
- [ ] Configure environments (dev/staging/prod) with Firebase Hosting channels (preview channels for PRs).
- [ ] Load/latency test Vertex AI path; tune model choice, max tokens, caching; set Cloud Run concurrency/min-instances.
- [ ] Set Cloud Monitoring dashboards + alerts (AI latency, error rate, Firestore usage, spend).
- [ ] Harden Security Rules; run penetration sanity checks; review IAM least privilege.
- [ ] Verify GA4 funnels report correctly in Firebase console.
- [ ] Configure Firebase Hosting custom domain; enable HTTPS.
- [ ] Write runbook (incident response, rollback) + README; finalize cost model.

## 5. Potential Risks & Mitigation Strategies

**Data Fatigue Risk** — Manual logging is the platform's biggest churn driver; users tire of daily entry.
- *Mitigation:* one-tap "repeat yesterday" + templates; cap required inputs to 3 categories at MVP; smart defaults from history; weekly (not only daily) logging mode; gamification + streak freezes to preserve momentum; nudges that reward logging itself. Roadmap: automated imports (Maps Timeline, utilities) to remove manual entry entirely.

**Vertex AI API Cost / Latency Risk** — Per-call Gemini cost and latency can degrade UX and inflate spend at scale.
- *Mitigation:* use a fast/cheap model tier (Gemini Flash) for routine nudges; per-user daily nudge budget; cache + reuse responses for similar contexts; deterministic rule-based fallback so the feature never blocks on AI; precompute nudges in scheduled batch jobs rather than synchronously; Cloud Monitoring alerts on latency/spend; budget alerts + quotas to cap runaway cost.

## 6. Next Actions (Immediate First 3 Steps)
1. **In Google Cloud Console:** create the GCP project, enable billing with a budget alert, and create a Firebase project on top of it — then enable Firestore (Native mode), Firebase Authentication (Google + Email/Password), and the Vertex AI API.
2. **In the code editor / terminal:** scaffold the Flutter app (`flutter create ecotrace`), run `flutterfire configure` to bind it to the Firebase project, and commit the initial repo with the Firebase Emulator Suite configured for local dev.
3. **In Firestore + editor:** author the initial Security Rules (per-user isolation) and seed the `emissionFactors/v1` document, then implement and verify a single end-to-end write/read of a test activity log from the Flutter app.
