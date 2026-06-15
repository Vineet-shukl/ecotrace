/**
 * functions/test/gamification.test.js
 * Unit tests for badge evaluation logic.
 * Run with: npm test (from functions/ directory)
 */
'use strict';

const { BADGE_CATALOG, evaluateBadges } = require('../src/gamification');

describe('evaluateBadges()', () => {
  test('awards first_log on the very first activity', () => {
    const earned = evaluateBadges({ totalActivities: 1 }, []);
    expect(earned.map(b => b.id)).toContain('first_log');
  });

  test('awards nothing for all-zero stats', () => {
    expect(evaluateBadges({}, [])).toEqual([]);
  });

  test('streak badges unlock at their thresholds and not before', () => {
    expect(evaluateBadges({ currentStreak: 2 }, []).map(b => b.id)).not.toContain('week_streak_3');
    expect(evaluateBadges({ currentStreak: 3 }, []).map(b => b.id)).toContain('week_streak_3');
    expect(evaluateBadges({ currentStreak: 7 }, []).map(b => b.id)).toContain('week_streak_7');
    expect(evaluateBadges({ currentStreak: 30 }, []).map(b => b.id)).toContain('week_streak_30');
  });

  test('does not re-award badges already earned', () => {
    const earned = evaluateBadges({ totalActivities: 5, currentStreak: 3 }, ['first_log', 'week_streak_3']);
    const ids = earned.map(b => b.id);
    expect(ids).not.toContain('first_log');
    expect(ids).not.toContain('week_streak_3');
  });

  test('awards multiple newly-qualified badges in one pass', () => {
    const stats = {
      totalActivities: 10,
      currentStreak: 7,
      weekTransitCount: 5,
      weekMeatFreeDays: 7,
    };
    const ids = evaluateBadges(stats, []).map(b => b.id);
    expect(ids).toEqual(expect.arrayContaining([
      'first_log', 'week_streak_3', 'week_streak_7', 'transit_champ', 'meat_free_week',
    ]));
  });

  test('threshold badges respect their boundaries', () => {
    expect(evaluateBadges({ totalSavedKg: 99 }, []).map(b => b.id)).not.toContain('century_saved');
    expect(evaluateBadges({ totalSavedKg: 100 }, []).map(b => b.id)).toContain('century_saved');
    expect(evaluateBadges({ totalNudgesAccepted: 10 }, []).map(b => b.id)).toContain('nudge_champion');
    expect(evaluateBadges({ monthBelowBaselinePct: 50 }, []).map(b => b.id)).toContain('eco_master');
  });

  test('returns full badge objects, not just ids', () => {
    const [badge] = evaluateBadges({ totalActivities: 1 }, []);
    expect(badge).toMatchObject({
      id: 'first_log',
      name: expect.any(String),
      tier: expect.any(String),
    });
  });

  test('every catalog badge has a unique id and a check function', () => {
    const ids = BADGE_CATALOG.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    BADGE_CATALOG.forEach(b => expect(typeof b.check).toBe('function'));
  });

  test('missing alreadyEarned arg defaults to none earned', () => {
    expect(evaluateBadges({ totalActivities: 1 }).map(b => b.id)).toContain('first_log');
  });
});
