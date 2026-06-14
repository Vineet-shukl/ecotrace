# EcoTrace — Runbook

> Last updated: 2026-06  
> Project: `ecotrace-app-123` · Region: `us-central1`

---

## 1. Regular Deployments

### Deploy everything (CI/CD — preferred)
```bash
git push origin main   # Cloud Build trigger fires automatically
```

### Manual deploy — SPA only
```bash
cd ecotrace && npm run build
firebase deploy --only hosting --project ecotrace-app-123
```

### Manual deploy — Cloud Functions only
```bash
firebase deploy --only functions --project ecotrace-app-123 --force
```

### Manual deploy — Firestore Rules only
```bash
firebase deploy --only firestore:rules --project ecotrace-app-123
```

### Deploy Cloud Run nudge service
```bash
# Build image
gcloud builds submit cloudrun/nudges \
  --tag us-central1-docker.pkg.dev/ecotrace-app-123/ecotrace/nudge-service:latest \
  --project ecotrace-app-123

# Deploy service
gcloud run deploy ecotrace-nudges \
  --image us-central1-docker.pkg.dev/ecotrace-app-123/ecotrace/nudge-service:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --concurrency 80 \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --set-env-vars GOOGLE_CLOUD_PROJECT=ecotrace-app-123 \
  --project ecotrace-app-123
```

---

## 2. Rollback Procedures

### Rollback SPA (Firebase Hosting)
```bash
# List releases
firebase hosting:releases:list --project ecotrace-app-123

# Rollback to previous release
firebase hosting:rollback --project ecotrace-app-123
```

### Rollback Cloud Functions
```bash
# Deploy a specific git commit
git checkout <prev-commit>
firebase deploy --only functions --project ecotrace-app-123 --force
git checkout main
```

### Rollback Cloud Run
```bash
# List revisions
gcloud run revisions list --service ecotrace-nudges --region us-central1

# Roll traffic to previous revision
gcloud run services update-traffic ecotrace-nudges \
  --to-revisions <REVISION-ID>=100 \
  --region us-central1 \
  --project ecotrace-app-123
```

### Rollback Firestore Rules
```bash
# Rules are stored in firebase.json — git revert and redeploy
git revert HEAD
firebase deploy --only firestore:rules --project ecotrace-app-123
```

---

## 3. Incident Response

### Symptom: Nudges not loading
1. Check Cloud Run health: `curl https://ecotrace-nudges-<hash>.run.app/health`
2. Check Cloud Run logs: `gcloud run services logs read ecotrace-nudges --region us-central1 --limit 50`
3. If AI errors: nudge service auto-falls back to rule-based nudges — **no user-visible failure**
4. Check Vertex AI quota: [GCP Console → Vertex AI → Quotas](https://console.cloud.google.com/iam-admin/quotas?project=ecotrace-app-123)

### Symptom: Aggregates not updating
1. Check `onActivityWrite` function logs in Firebase Console
2. Verify Eventarc service account has `roles/eventarc.eventReceiver`
3. Run manual aggregate recalculation by triggering a dummy activity write

### Symptom: Badges not awarded
1. Check `gamificationEngine` function logs
2. Verify `achievements` collection security rules allow Admin SDK writes
3. Check badge already-earned list in Firestore for the user

### Symptom: High Vertex AI spend
1. Check `_nudgeBudget` subcollections — per-user 3/day cap should be active
2. Temporarily reduce `DAILY_BUDGET` in `geminiNudges.js` and redeploy
3. Alert threshold: set budget alert at $50/month in [GCP Billing](https://console.cloud.google.com/billing)

---

## 4. Cost Model (Estimated Monthly at 1,000 DAU)

| Service | Usage | Est. Cost |
|---|---|---|
| Cloud Firestore | 10M reads, 2M writes | ~$8 |
| Firebase Hosting | 10 GB transfer | ~$1 |
| Cloud Functions | 5M invocations | ~$2 |
| Cloud Run | 500K requests, 512MB | ~$5 |
| Vertex AI Gemini Flash | 3M tokens (3 nudges × 1K active) | ~$3 |
| Cloud Build | 10 builds/month | ~$0 (free tier) |
| **Total** | | **~$19/month** |

> Flash pricing: $0.075/1M input tokens, $0.30/1M output tokens

---

## 5. Key URLs

| Resource | URL |
|---|---|
| Firebase Console | https://console.firebase.google.com/project/ecotrace-app-123 |
| Cloud Run Service | https://console.cloud.google.com/run?project=ecotrace-app-123 |
| Cloud Build | https://console.cloud.google.com/cloud-build/builds?project=ecotrace-app-123 |
| Artifact Registry | https://console.cloud.google.com/artifacts?project=ecotrace-app-123 |
| Cloud Monitoring | https://console.cloud.google.com/monitoring?project=ecotrace-app-123 |
| Vertex AI | https://console.cloud.google.com/vertex-ai?project=ecotrace-app-123 |
| GA4 Dashboard | https://analytics.google.com |

---

## 6. Monitoring Alerts

Configured alerts (Cloud Monitoring):

| Alert | Threshold | Severity |
|---|---|---|
| Cloud Run error rate | > 5% over 5 min | CRITICAL |
| Cloud Run p99 latency | > 3s over 5 min | WARNING |
| Gemini API errors | > 10 errors/min | WARNING |
| Firestore read cost | > 1M reads/day | WARNING |
| Function error rate | > 1% over 5 min | WARNING |

---

## 7. IAM Roles

| Service Account | Role | Purpose |
|---|---|---|
| Cloud Run SA | `roles/datastore.user` | Read/write Firestore |
| Cloud Run SA | `roles/aiplatform.user` | Call Vertex AI |
| Cloud Functions SA | `roles/datastore.user` | Firestore triggers |
| Cloud Build SA | `roles/run.developer` | Deploy Cloud Run |
| Cloud Build SA | `roles/artifactregistry.writer` | Push Docker images |
