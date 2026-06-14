# GEMINI.md — Workspace Rules (EcoTrace / Carbon Footprint Awareness Platform)

> These rules govern how the agent works in this workspace. Read them on every turn.

## 0. Source of Truth
- **`planning.md` in the project root is the authoritative specification.** When any instruction conflicts with `planning.md`, follow `planning.md` and flag the conflict.
- Do not invent scope. Build only what `planning.md` defines.

## 1. Tech Stack — Google Ecosystem Only (non-negotiable)
Use these technologies exactly; do **not** substitute non-Google equivalents:
- **Frontend:** Flutter (iOS + Android, Material 3). State via Riverpod. Charts via `fl_chart`. FlutterFire plugins (`cloud_firestore`, `firebase_auth`, `firebase_analytics`).
- **App logic / hosting:** Firebase Cloud Functions (2nd gen) for Firestore/Auth triggers; Cloud Run for the Vertex AI gateway and batch jobs.
- **Database:** Cloud Firestore (Native mode) only. No other DB.
- **AI:** Google Gemini via Vertex AI, called **server-side only** (Cloud Run). Never embed AI keys or call Vertex directly from the Flutter client.
- **Auth:** Firebase Authentication (Google Sign-In + Email/Password).
- **Analytics/Monitoring:** Google Analytics for Firebase (GA4), Cloud Logging, Cloud Monitoring, Crashlytics.
- If a task seems to need a non-Google service, **stop and ask** instead of substituting.

## 2. Phase Discipline
- Build strictly in order: **Phase 1 → 2 → 3 → 4** as defined in `planning.md` §4.
- **Complete one phase, then stop and wait for review** before starting the next. Do not run ahead.
- Treat each phase's checklist items as the task list; map your generated Task List artifact to them.

## 3. Scope Guardrails
- Do **not** implement anything listed under **Out-of-Scope (Future Phases)** in `planning.md` §2 (no social graph, no bank/utility integrations, no offset marketplace, no wearables, no web/B2B, no extra localization).
- Prefer the simplest implementation that satisfies the MVP feature definition.

## 4. Safety — Billable & Irreversible Actions
- This project provisions **real, billable GCP resources**. Operate in Agent-Assisted mode with Review Gates.
- **Stop and show the exact command for approval before running** any of: `gcloud ...`, `firebase deploy`, `firebase ... create`, `gsutil`, Terraform apply, Artifact Registry pushes, or anything that creates/deletes cloud resources or incurs cost.
- Never delete cloud resources, Firestore data, or IAM bindings without explicit confirmation in the same turn.
- Keep all secrets in Secret Manager / environment config — never commit keys, `google-services.json` secrets, or service-account JSON to the repo.

## 5. Data Model & Security
- Follow the Firestore collection structure in `planning.md` §3 exactly: `users/{uid}`, `users/{uid}/activities/{id}`, `users/{uid}/aggregates/{period}`, `users/{uid}/nudges/{id}`, `users/{uid}/achievements/{id}`, and top-level `emissionFactors/{version}`.
- Security Rules must enforce per-user isolation (`request.auth.uid == uid`). Default-deny everything else.
- Emission factors live in `emissionFactors/{version}` (versioned). Never hardcode CO₂e factors in client or function code — read them from Firestore.

## 6. Cost & Latency Discipline (Vertex AI)
- Use a fast/cheap Gemini tier (Flash-class) for routine nudges; reserve larger models for genuinely complex reasoning.
- Always implement the **rule-based fallback** nudge path so the feature never blocks on the AI call.
- Enforce a per-user daily nudge budget and cache similar prompts, as specified in `planning.md` §5.

## 7. Code Quality
- Write tests for emission/CO₂e calculations and for Cloud Function triggers (use the Firebase Emulator Suite locally before any deploy).
- Match existing file/folder conventions once they exist; keep functions small and single-purpose.
- Produce verifiable artifacts (task lists, walkthroughs) so each step can be reviewed.

## 8. When Uncertain
- If `planning.md` is silent or ambiguous on a decision, ask a brief clarifying question rather than guessing on anything that affects architecture, cost, security, or scope. Minor implementation details (naming, formatting) you may decide and note.
