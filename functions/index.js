/**
 * functions/index.js — Firebase Cloud Functions (2nd gen)
 *
 * Functions:
 *  1. onUserCreate     — Auth onCreate trigger: provisions user profile doc
 *  2. onActivityWrite  — Firestore onWrite trigger: recomputes daily/weekly/monthly aggregates
 */
'use strict';

const { onRequest }                         = require('firebase-functions/v2/https');
const { onDocumentWritten }                 = require('firebase-functions/v2/firestore');
const { beforeUserCreated }                 = require('firebase-functions/v2/identity');
const { getAuth }                           = require('firebase-admin/auth');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { initializeApp }                     = require('firebase-admin/app');
const { aggregateActivities }               = require('./src/emissionCalc');

// Initialise once
const app = initializeApp();
const db  = getFirestore(app);

const PROJECT = 'ecotrace-app-123';
const REGION  = 'us-central1';

// ── 1. Auth onCreate: provision user profile ────────────────────────────────
// Note: Firebase Functions v2 uses onRequest + Auth triggers via beforeUserCreated
// For onCreate behaviour, we use a Firestore-triggered pattern OR cloud-tasks.
// Most straightforward 2nd-gen equivalent is beforeUserCreated (runs before user is persisted).
// We use onRequest as a fallback callable, plus a Firestore trigger to self-provision.
// The client already calls setDoc on login so this function handles the authoritative defaults.

exports.provisionUserProfile = onDocumentWritten(
  { document: 'users/{uid}', region: REGION },
  async (event) => {
    const { uid } = event.params;

    // Only run on CREATE (before: null, after: exists)
    if (event.data.before.exists) return null;

    const afterData = event.data.after.data();

    // If client already wrote a full profile (has email), don't overwrite
    if (afterData?.email) {
      console.log(`User ${uid}: profile already provisioned by client.`);
      return null;
    }

    // Fetch auth record to get email/displayName
    try {
      const authUser = await getAuth(app).getUser(uid);
      await db.collection('users').doc(uid).set({
        email:          authUser.email ?? '',
        displayName:    authUser.displayName ?? '',
        photoURL:       authUser.photoURL ?? '',
        createdAt:      FieldValue.serverTimestamp(),
        currentStreak:  0,
        totalSavedKg:   0,
        weekCo2eKg:     0,
        todayCo2eKg:    0,
        onboarded:      false,
      }, { merge: true });
      console.log(`✅ Provisioned profile for user ${uid}`);
    } catch (err) {
      console.error(`❌ Failed to provision user ${uid}:`, err);
    }
    return null;
  }
);

// ── 2. onActivityWrite: recompute aggregates ────────────────────────────────
exports.onActivityWrite = onDocumentWritten(
  { document: 'users/{uid}/activities/{activityId}', region: REGION },
  async (event) => {
    const { uid } = event.params;

    // Skip if delete-only with no data (shouldn't happen, guard anyway)
    if (!event.data.before.exists && !event.data.after.exists) return null;

    const now   = new Date();
    const today = dateStr(now);

    // ── Date range helpers ──────────────────────────────────────
    const startOfDay   = new Date(now); startOfDay.setHours(0,0,0,0);
    const startOfWeek  = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0,0,0,0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    try {
      const actRef = db.collection('users').doc(uid).collection('activities');

      // Fetch activities for each window in parallel
      const [daySnap, weekSnap, monthSnap] = await Promise.all([
        actRef.where('date', '>=', Timestamp.fromDate(startOfDay)).get(),
        actRef.where('date', '>=', Timestamp.fromDate(startOfWeek)).get(),
        actRef.where('date', '>=', Timestamp.fromDate(startOfMonth)).get(),
      ]);

      const dayAgg   = aggregateActivities(daySnap.docs.map(d => d.data()));
      const weekAgg  = aggregateActivities(weekSnap.docs.map(d => d.data()));
      const monthAgg = aggregateActivities(monthSnap.docs.map(d => d.data()));

      // Write aggregates subcollection
      const aggRef = db.collection('users').doc(uid).collection('aggregates');
      await Promise.all([
        aggRef.doc(`day_${today}`).set({
          period: 'day', date: today, ...dayAgg, updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true }),
        aggRef.doc(`week_${weekStr(now)}`).set({
          period: 'week', weekStart: dateStr(startOfWeek), ...weekAgg, updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true }),
        aggRef.doc(`month_${monthStr(now)}`).set({
          period: 'month', month: monthStr(now), ...monthAgg, updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true }),
      ]);

      // Update top-level user doc with live summary values
      await db.collection('users').doc(uid).set({
        todayCo2eKg: dayAgg.totalCo2eKg,
        weekCo2eKg:  weekAgg.totalCo2eKg,
        lastActivityAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      // ── Streak calculation ────────────────────────────────────
      await updateStreak(uid, today);

      console.log(`✅ Aggregates updated for user ${uid} — day: ${dayAgg.totalCo2eKg} kg`);
    } catch (err) {
      console.error(`❌ Aggregate update failed for ${uid}:`, err);
    }
    return null;
  }
);

// ── Streak helper ───────────────────────────────────────────────────────────
async function updateStreak(uid, todayStr) {
  const userRef  = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  const data     = userSnap.data() ?? {};

  const lastActive    = data.lastActiveDateStr ?? '';
  const currentStreak = data.currentStreak ?? 0;

  const yesterday = dateStr(new Date(Date.now() - 86400000));
  let newStreak;

  if (lastActive === todayStr) {
    newStreak = currentStreak; // already counted today
  } else if (lastActive === yesterday) {
    newStreak = currentStreak + 1; // consecutive day
  } else {
    newStreak = 1; // streak broken or first time
  }

  await userRef.set({
    currentStreak:    newStreak,
    lastActiveDateStr: todayStr,
    longestStreak: Math.max(data.longestStreak ?? 0, newStreak),
  }, { merge: true });
}

// ── Date utils ──────────────────────────────────────────────────────────────
function dateStr(d)  { return d.toISOString().slice(0, 10); }        // YYYY-MM-DD
function weekStr(d)  { return `${d.getFullYear()}-W${isoWeek(d)}`; }
function monthStr(d) { return d.toISOString().slice(0, 7); }         // YYYY-MM

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
