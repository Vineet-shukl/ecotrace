/**
 * cloudrun/nudges/lib/geminiNudges.js
 * Vertex AI Gemini Flash nudge generator.
 * Called server-side only — API keys never leave this container.
 *
 * Features:
 *  - Structured JSON output (enforced via responseMimeType)
 *  - Per-user daily nudge budget (Firestore counter)
 *  - Prompt caching via a Firestore document keyed on context hash
 *  - Automatic fallback to rule-based engine on any failure
 */
'use strict';

const { VertexAI }   = require('@google-cloud/vertexai');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getRuleNudges } = require('./ruleFallback');
const crypto = require('crypto');

const PROJECT    = process.env.GOOGLE_CLOUD_PROJECT ?? 'ecotrace-app-123';
const LOCATION   = 'us-central1';
const MODEL      = 'gemini-2.0-flash-001';   // Flash-class per cost discipline
const DAILY_BUDGET = 3;                       // max AI nudges per user per day

let _vertex;
function getVertex() {
  if (!_vertex) _vertex = new VertexAI({ project: PROJECT, location: LOCATION });
  return _vertex;
}

/**
 * Generate AI-powered nudges for a user.
 * Falls back to rule-based nudges on error or budget exceeded.
 *
 * @param {string} uid
 * @param {object} userData    – users/{uid} doc
 * @param {object} weekAgg     – aggregates/week_* doc
 * @param {number} [count=2]
 */
async function getAiNudges(uid, userData, weekAgg, count = 2) {
  const db = getFirestore();

  // ── Budget check ──────────────────────────────────────────
  const today    = new Date().toISOString().slice(0, 10);
  const budgetRef = db.collection('users').doc(uid)
    .collection('_nudgeBudget').doc(today);
  const budgetSnap = await budgetRef.get();
  const usedToday  = budgetSnap.exists ? (budgetSnap.data().count ?? 0) : 0;

  if (usedToday >= DAILY_BUDGET) {
    console.log(`[nudges] Budget exhausted for ${uid} (${usedToday}/${DAILY_BUDGET}). Using rules.`);
    return getRuleNudges(weekAgg, count);
  }

  // ── Build context ─────────────────────────────────────────
  const context = {
    weekCo2eKg:    weekAgg?.totalCo2eKg  ?? 0,
    byCategory:    weekAgg?.byCategory   ?? {},
    baselineKg:    userData?.baselineKgPerYear ?? 0,
    dietType:      userData?.onboardingAnswers?.diet_type ?? 'unknown',
    transportMode: userData?.onboardingAnswers?.primary_transport_mode ?? 'unknown',
    currentStreak: userData?.currentStreak ?? 0,
  };

  // ── Cache lookup ──────────────────────────────────────────
  const contextHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(context))
    .digest('hex')
    .slice(0, 16);

  const cacheRef  = db.collection('_nudgeCache').doc(contextHash);
  const cacheSnap = await cacheRef.get();

  if (cacheSnap.exists) {
    const cached = cacheSnap.data();
    const ageMs  = Date.now() - cached.cachedAt?.toMillis?.();
    if (ageMs < 6 * 3600 * 1000) {   // cache valid for 6 hours
      console.log(`[nudges] Cache hit for hash ${contextHash}`);
      return cached.nudges.slice(0, count);
    }
  }

  // ── Gemini call ───────────────────────────────────────────
  try {
    const model  = getVertex().preview.getGenerativeModel({
      model: MODEL,
      // System instruction establishes safety boundaries and behavioral guidelines
      // See: https://ai.google.dev/gemini-api/docs/safety-guidance
      systemInstruction: {
        role: 'system',
        parts: [{
          text: [
            'You are a helpful sustainability coach for the EcoTrace app.',
            'Your only purpose is to provide personalised, evidence-based carbon reduction tips.',
            'You MUST NOT produce content unrelated to carbon footprint, sustainability, or eco-friendly habits.',
            'You MUST NOT include personally identifiable information, medical advice, financial advice, or harmful content.',
            'Always be encouraging, positive, and constructive. Never shame or guilt the user.',
            'Output only valid JSON matching the schema provided. No markdown, no prose outside JSON.',
          ].join(' '),
        }],
      },
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 512,
        temperature: 0.7,
      },
    });

    const prompt = buildPrompt(context, count);
    const result = await model.generateContent(prompt);
    const text   = result.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    const nudges = JSON.parse(text);

    if (!Array.isArray(nudges) || nudges.length === 0) throw new Error('Empty AI response');

    // Validate and sanitise each nudge
    const sanitised = nudges.slice(0, count).map((n, i) => ({
      id:           `ai_${contextHash}_${i}`,
      category:     n.category     ?? 'general',
      title:        n.title        ?? 'Eco tip',
      body:         n.body         ?? '',
      co2eSavingKg: Number(n.co2eSavingKg) || 0,
      isAI:         true,
      source:       'gemini-flash',
    }));

    // ── Write cache + increment budget ────────────────────────
    await Promise.all([
      cacheRef.set({ nudges: sanitised, cachedAt: FieldValue.serverTimestamp(), contextHash }),
      budgetRef.set({ count: FieldValue.increment(1), date: today }, { merge: true }),
    ]);

    return sanitised;
  } catch (err) {
    console.error('[nudges] Gemini error, falling back to rules:', err.message);
    return getRuleNudges(weekAgg, count);
  }
}

function buildPrompt(ctx, count) {
  return `You are an expert sustainability coach helping users reduce their carbon footprint.

User context:
- Weekly CO₂e: ${ctx.weekCo2eKg.toFixed(2)} kg
- Breakdown: ${JSON.stringify(ctx.byCategory)}
- Annual baseline: ${ctx.baselineKg} kg/year
- Primary diet: ${ctx.dietType}
- Primary transport: ${ctx.transportMode}
- Current streak: ${ctx.currentStreak} days

Generate exactly ${count} personalised, actionable carbon reduction nudges.
Each nudge must be specific to this user's highest-emission categories.
Be encouraging, concrete, and brief.

Respond with a JSON array only (no markdown, no explanation):
[
  {
    "category": "transport|diet|energy|flights|habits",
    "title": "Short action title (max 60 chars)",
    "body": "Explanation with specific savings and why it matters (max 200 chars)",
    "co2eSavingKg": 1.5
  }
]`;
}

module.exports = { getAiNudges };
