/**
 * functions/src/gamification.js
 * Badge evaluation logic — pure functions, no Firebase SDK.
 * Called from the gamificationEngine Cloud Function.
 */
'use strict';

/** Full badge catalog */
const BADGE_CATALOG = [
  {
    id:          'first_log',
    name:        'First Step',
    description: 'Logged your first activity',
    icon:        '🌱',
    tier:        'bronze',
    check: (stats) => (stats.totalActivities ?? 0) >= 1,
  },
  {
    id:          'week_streak_3',
    name:        'Consistent Tracker',
    description: 'Logged for 3 days in a row',
    icon:        '🔥',
    tier:        'bronze',
    check: (stats) => (stats.currentStreak ?? 0) >= 3,
  },
  {
    id:          'week_streak_7',
    name:        'Week Warrior',
    description: 'Logged every day for a full week',
    icon:        '⚡',
    tier:        'silver',
    check: (stats) => (stats.currentStreak ?? 0) >= 7,
  },
  {
    id:          'week_streak_30',
    name:        'Monthly Legend',
    description: '30-day logging streak',
    icon:        '🏆',
    tier:        'gold',
    check: (stats) => (stats.currentStreak ?? 0) >= 30,
  },
  {
    id:          'transit_champ',
    name:        'Transit Champion',
    description: 'Used public transit or cycling 5+ times this week',
    icon:        '🚌',
    tier:        'silver',
    check: (stats) => (stats.weekTransitCount ?? 0) >= 5,
  },
  {
    id:          'meat_free_week',
    name:        'Plant Power',
    description: 'Logged vegan or vegetarian diet every day this week',
    icon:        '🥦',
    tier:        'silver',
    check: (stats) => (stats.weekMeatFreeDays ?? 0) >= 7,
  },
  {
    id:          'century_saved',
    name:        'Century Club',
    description: 'Saved 100 kg CO₂e below baseline',
    icon:        '💯',
    tier:        'gold',
    check: (stats) => (stats.totalSavedKg ?? 0) >= 100,
  },
  {
    id:          'nudge_champion',
    name:        'Nudge Champion',
    description: 'Accepted 10 AI nudges',
    icon:        '🤖',
    tier:        'silver',
    check: (stats) => (stats.totalNudgesAccepted ?? 0) >= 10,
  },
  {
    id:          'eco_master',
    name:        'Eco Master',
    description: 'Footprint 50% below baseline for a full month',
    icon:        '🌍',
    tier:        'gold',
    check: (stats) => (stats.monthBelowBaselinePct ?? 0) >= 50,
  },
];

/**
 * Evaluate which new badges a user has earned.
 * @param {object} stats         – merged user stats + weekly/monthly aggregates
 * @param {string[]} alreadyEarned – badge IDs already in achievements subcollection
 * @returns {Array} newly earned badge objects
 */
function evaluateBadges(stats, alreadyEarned = []) {
  const earnedSet = new Set(alreadyEarned);
  return BADGE_CATALOG.filter(badge =>
    !earnedSet.has(badge.id) && badge.check(stats)
  );
}

module.exports = { BADGE_CATALOG, evaluateBadges };
