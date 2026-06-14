/**
 * cloudrun/nudges/index.js — EcoTrace Nudge Gateway (Cloud Run)
 *
 * Endpoints:
 *   POST /nudges  — generate AI nudges for authenticated user
 *   GET  /health  — health check
 *
 * Security: every request must carry a valid Firebase ID token.
 * AI: Vertex AI Gemini Flash with rule-based fallback + prompt caching.
 */
'use strict';

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Initialise Firebase Admin once
initializeApp();
const db = getFirestore();

const verifyToken  = require('./lib/auth');
const { getAiNudges }   = require('./lib/geminiNudges');
const { getRuleNudges } = require('./lib/ruleFallback');

const app  = express();
const PORT = process.env.PORT ?? 8080;

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({ origin: true }));
app.use(express.json({ limit: '16kb' }));

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ecotrace-nudges' }));

// ── POST /nudges ───────────────────────────────────────────────────────────
app.post('/nudges', verifyToken, async (req, res) => {
  const uid   = req.uid;
  const count = Math.min(Number(req.body?.count ?? 2), 5); // max 5 nudges

  try {
    // Fetch user profile + latest week aggregate in parallel
    const today     = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekKey   = `week_${today.getFullYear()}-W${isoWeek(today)}`;

    const [userSnap, aggSnap] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('users').doc(uid).collection('aggregates').doc(weekKey).get(),
    ]);

    if (!userSnap.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userData = userSnap.data();
    const weekAgg  = aggSnap.exists ? aggSnap.data() : {};

    // ── Generate nudges ─────────────────────────────────────
    let nudges;
    const useAI = userData?.baselineKgPerYear > 0; // only use AI once baseline is set
    if (useAI) {
      nudges = await getAiNudges(uid, userData, weekAgg, count);
    } else {
      nudges = getRuleNudges(weekAgg, count);
    }

    // ── Persist to Firestore nudges subcollection ───────────
    const nudgeRef = db.collection('users').doc(uid).collection('nudges');
    const batch    = db.batch();
    const now      = FieldValue.serverTimestamp();

    for (const nudge of nudges) {
      const ref = nudgeRef.doc(nudge.id);
      batch.set(ref, {
        ...nudge,
        status:    'pending',
        createdAt: now,
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000), // 24h TTL
      }, { merge: true });
    }
    await batch.commit();

    res.json({ nudges, count: nudges.length });
  } catch (err) {
    console.error('/nudges error:', err);
    // Always return rule-based nudges as last resort
    const fallback = getRuleNudges({}, count);
    res.status(207).json({ nudges: fallback, count: fallback.length, warning: 'Fallback used' });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🌿 EcoTrace nudge service listening on :${PORT}`);
});

// ISO week helper
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
