import { describe, it, expect } from 'vitest';
import {
  calculateChart, formatEightCharacters, solarTermsOfYear, findInteractions, BRANCHES, STEMS,
} from '../src/index.js';
import type { BirthInput } from '../src/index.js';

const KYIV = { timeZone: 'Europe/Kyiv', longitude: 30.52 };

const chart = (over: Partial<BirthInput> & Pick<BirthInput, 'date'>) =>
  calculateChart({ time: '12:00', gender: 'male', ...KYIV, ...over });

describe('立春 as the year boundary', () => {
  const lichun2000 = new Date(solarTermsOfYear(2000).find((t) => t.index === 0)!.utc);
  const minute = 60_000;
  const at = (offsetMs: number) => {
    const d = new Date(lichun2000.getTime() + offsetMs);
    const p = (n: number, w = 2) => String(n).padStart(w, '0');
    return calculateChart({
      date: `${p(d.getUTCFullYear(), 4)}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`,
      time: `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`,
      timeZone: 'UTC', longitude: 0, gender: 'male',
      options: { solarTime: 'off', dayBoundary: '00:00' },
    });
  };

  it('assigns different year pillars one minute either side', () => {
    const before = at(-2 * minute);
    const after = at(+2 * minute);
    expect(before.pillars.year.stem).not.toBe(after.pillars.year.stem);
    // 1999 是 己卯, 2000 是 庚辰
    expect(STEMS[before.pillars.year.stem]!.char + BRANCHES[before.pillars.year.branch]!.char).toBe('己卯');
    expect(STEMS[after.pillars.year.stem]!.char + BRANCHES[after.pillars.year.branch]!.char).toBe('庚辰');
  });

  it('opens the 寅 month exactly at the term', () => {
    expect(BRANCHES[at(+2 * minute).pillars.month.branch]!.char).toBe('寅');
    expect(BRANCHES[at(-2 * minute).pillars.month.branch]!.char).toBe('丑');
  });

  it('keeps a mid-January birth in the previous BaZi year', () => {
    const c = chart({ date: '2000-01-20' });
    expect(STEMS[c.pillars.year.stem]!.char + BRANCHES[c.pillars.year.branch]!.char).toBe('己卯');
  });
});

describe('day boundary at 23:00', () => {
  it('moves the day pillar forward under 早子時 but not under 晚子時', () => {
    const base = { date: '2000-06-15', time: '23:30', ...KYIV, gender: 'male' as const };
    const early = calculateChart({ ...base, options: { solarTime: 'off', dayBoundary: '23:00' } });
    const late = calculateChart({ ...base, options: { solarTime: 'off', dayBoundary: '00:00' } });

    expect(early.pillars.day.stem).not.toBe(late.pillars.day.stem);
    expect(early.resolved.julianDay).toBe(late.resolved.julianDay + 1);
    // Both readings sit in the 子 hour either way.
    expect(BRANCHES[early.pillars.hour!.branch]!.char).toBe('子');
    expect(BRANCHES[late.pillars.hour!.branch]!.char).toBe('子');
  });

  it('leaves 22:59 alone under either convention', () => {
    const base = { date: '2000-06-15', time: '22:59', ...KYIV, gender: 'male' as const };
    const early = calculateChart({ ...base, options: { solarTime: 'off', dayBoundary: '23:00' } });
    const late = calculateChart({ ...base, options: { solarTime: 'off', dayBoundary: '00:00' } });
    expect(early.pillars.day.stem).toBe(late.pillars.day.stem);
    expect(BRANCHES[early.pillars.hour!.branch]!.char).toBe('亥');
  });
});

describe('子 hour split at midnight', () => {
  const gz = (p: { stem: number; branch: number }) =>
    STEMS[p.stem]!.char + BRANCHES[p.branch]!.char;
  // Control case: the clock says 00:30, true solar time is 23:30 the evening before.
  const odesa = {
    date: '1994-06-26', time: '00:30', timeZone: 'Europe/Kyiv', longitude: 30.72,
    gender: 'male' as const,
  };

  it('keeps the day but takes the hour stem from the next day under 晚子時', () => {
    const c = calculateChart(odesa);
    expect(c.resolved.trueSolarTime.slice(0, 16)).toBe('1994-06-25T23:30');
    expect(gz(c.pillars.day)).toBe('壬午');
    expect(STEMS[c.resolved.hourStemBase!]!.char).toBe('癸');
    expect(gz(c.pillars.hour!)).toBe('壬子');
  });

  it('gives the same hour pillar under 早子時, where the day has already turned', () => {
    const c = calculateChart({ ...odesa, options: { dayBoundary: '23:00' } });
    expect(gz(c.pillars.day)).toBe('癸未');
    expect(gz(c.pillars.hour!)).toBe('壬子');
  });

  it('gives both halves of one 子 hour the same pillar', () => {
    const at = (date: string, time: string) => calculateChart({
      date, time, ...KYIV, gender: 'male', options: { solarTime: 'off', dayBoundary: '00:00' },
    });
    const before = at('2000-06-15', '23:30');
    const after = at('2000-06-16', '00:30');
    expect(before.pillars.day.stem).not.toBe(after.pillars.day.stem);
    expect(gz(before.pillars.hour!)).toBe(gz(after.pillars.hour!));
  });
});

describe('historical timezones', () => {
  it('applies Soviet decree time in Kyiv', () => {
    expect(chart({ date: '1929-06-15' }).resolved.tzOffsetMinutes).toBe(120);
    expect(chart({ date: '1931-06-15' }).resolved.tzOffsetMinutes).toBe(180);
  });

  it('applies decree time plus DST in 1985, shifting the hour pillar', () => {
    const c = chart({ date: '1985-07-01', time: '12:00' });
    expect(c.resolved.tzOffsetMinutes).toBe(240);
    // Clock noon is really about 10:00 by the Sun, so the hour is 巳, not 午.
    expect(c.resolved.trueSolarTime.slice(11, 13)).toBe('09');
    expect(BRANCHES[c.pillars.hour!.branch]!.char).toBe('巳');
  });

  it('uses the modern offset for a present-day birth', () => {
    expect(chart({ date: '2024-01-15' }).resolved.tzOffsetMinutes).toBe(120);
  });

  it('handles Moscow permanent DST in 2012', () => {
    const c = chart({ date: '2012-07-01', timeZone: 'Europe/Moscow', longitude: 37.62 });
    expect(c.resolved.tzOffsetMinutes).toBe(240);
  });
});

describe('daylight saving edge cases', () => {
  it('flags a wall-clock time that never happened', () => {
    const c = chart({ date: '2010-03-28', time: '03:30' });
    expect(c.warnings).toContain('nonexistentLocalTime');
  });

  it('flags a wall-clock time that happened twice', () => {
    const c = chart({ date: '2010-10-31', time: '03:30' });
    expect(c.warnings).toContain('ambiguousLocalTime');
  });

  it('stays quiet for an unambiguous time', () => {
    expect(chart({ date: '2010-10-31', time: '05:30' }).warnings).toEqual([]);
  });
});

describe('unknown birth time', () => {
  it('omits the hour pillar and says so', () => {
    const c = chart({ date: '1990-06-15', time: null });
    expect(c.pillars.hour).toBeNull();
    expect(c.warnings).toContain('timeUnknown');
    expect(formatEightCharacters(c)).toMatch(/\?\?$/);
  });

  it('still produces year, month, day pillars and luck pillars', () => {
    const c = chart({ date: '1990-06-15', time: null });
    expect(c.pillars.year).toBeDefined();
    expect(c.pillars.month).toBeDefined();
    expect(c.luck.pillars).toHaveLength(10);
  });

  it('warns when a 節 falls on the birth date', () => {
    const lichun = new Date(solarTermsOfYear(1990).find((t) => t.index === 0)!.utc);
    const c = chart({ date: lichun.toISOString().slice(0, 10), time: null });
    expect(c.warnings).toContain('termBoundaryOnBirthDate');
  });
});

describe('true solar time', () => {
  it('is disabled, longitude-only, or longitude plus equation of time', () => {
    const base = { date: '2000-11-03', time: '12:00', ...KYIV, gender: 'male' as const };
    const off = calculateChart({ ...base, options: { solarTime: 'off' } });
    const lon = calculateChart({ ...base, options: { solarTime: 'longitude' } });
    const eot = calculateChart({ ...base, options: { solarTime: 'longitude+eot' } });

    expect(off.resolved.longitudeCorrectionMinutes).toBe(0);
    expect(off.resolved.equationOfTimeMinutes).toBe(0);
    // Kyiv sits west of the 30°E meridian of its +2 zone in winter.
    expect(lon.resolved.longitudeCorrectionMinutes).toBeCloseTo(30.52 * 4 - 120, 1);
    expect(lon.resolved.equationOfTimeMinutes).toBe(0);
    // Early November: the true Sun runs about 16 minutes ahead.
    expect(eot.resolved.equationOfTimeMinutes).toBeGreaterThan(15);
    expect(eot.resolved.equationOfTimeMinutes).toBeLessThan(17);
  });

  it('keeps the equation of time inside its physical range all year', () => {
    for (let day = 0; day < 365; day += 5) {
      const d = new Date(Date.UTC(2024, 0, 1 + day));
      const c = calculateChart({
        date: d.toISOString().slice(0, 10), time: '12:00',
        ...KYIV, gender: 'male',
      });
      expect(Math.abs(c.resolved.equationOfTimeMinutes)).toBeLessThan(17);
    }
  });
});

describe('geographic edge cases', () => {
  it('handles negative longitude', () => {
    const c = chart({ date: '1995-03-10', time: '08:00', timeZone: 'America/New_York', longitude: -74.0 });
    expect(c.resolved.longitudeCorrectionMinutes).toBeCloseTo(-74 * 4 + 300, 1);
    expect(c.pillars.hour).not.toBeNull();
  });

  it('handles longitudes near the antimeridian', () => {
    const c = chart({ date: '2001-09-09', time: '13:00', timeZone: 'Pacific/Auckland', longitude: 174.76 });
    expect(c.pillars.hour).not.toBeNull();
    expect(c.luck.pillars).toHaveLength(10);
  });

  it('handles a leap day', () => {
    const c = chart({ date: '2000-02-29', time: '06:00' });
    expect(BRANCHES[c.pillars.hour!.branch]!.char).toBe('卯');
  });
});

describe('range guard', () => {
  it('flags dates outside the validated window but still computes', () => {
    const c = chart({ date: '1850-04-12', time: '09:00' });
    expect(c.warnings).toContain('outOfValidatedRange');
    expect(c.pillars.year).toBeDefined();
  });
});

describe('chart shape', () => {
  const c = chart({ date: '1990-06-15', time: '10:30', gender: 'female' });

  it('fills every pillar with derived data', () => {
    for (const slot of ['year', 'month', 'day', 'hour'] as const) {
      const p = c.pillars[slot]!;
      expect(p.hiddenStems.length).toBeGreaterThan(0);
      expect(p.hiddenGods).toHaveLength(p.hiddenStems.length);
      expect(p.naYin).toBeGreaterThanOrEqual(0);
      expect(p.naYin).toBeLessThan(30);
    }
  });

  it('leaves the day stem without a Ten God — it is the self', () => {
    expect(c.pillars.day.stemGod).toBeNull();
    expect(c.pillars.year.stemGod).not.toBeNull();
  });

  it('reports two void branches that are adjacent', () => {
    const [a, b] = c.voidBranches;
    expect((a + 1) % 12).toBe(b);
  });

  it('produces an element balance that sums to something positive', () => {
    const total = Object.values(c.elements.weighted).reduce((x, y) => x + y, 0);
    expect(total).toBeGreaterThan(0);
    expect(['strong', 'weak', 'balanced']).toContain(c.elements.strength);
    expect(c.elements.method).toBe('weighted-v1');
    expect(Object.values(c.elements.raw).reduce((x, y) => x + y, 0)).toBe(8);
  });

  it('records the engine version and the options actually used', () => {
    expect(c.meta.engineVersion).toBeTruthy();
    expect(c.options.solarTime).toBe('longitude+eot');
    expect(c.options.dayBoundary).toBe('00:00');
    expect(c.luck.startMethod).toBe('exact');
  });

  it('formats the eight characters', () => {
    expect(formatEightCharacters(c)).toMatch(/^\S\S \S\S \S\S \S\S$/);
  });
});

describe('interactions', () => {
  const B = (c: string) => BRANCHES.findIndex((b) => b.char === c);
  const S = (c: string) => STEMS.findIndex((s) => s.char === c);
  const p = (slot: 'year' | 'month' | 'day' | 'hour', stem: string, branch: string) =>
    ({ slot, stem: S(stem), branch: B(branch) });

  it('finds 六沖 between opposing branches', () => {
    const found = findInteractions([p('year', '甲', '子'), p('month', '丙', '午')]);
    const clash = found.find((i) => i.kind === 'branchSixClash');
    expect(clash).toBeDefined();
    expect(clash!.members).toEqual([B('子'), B('午')]);
    expect(clash!.slots).toEqual(['year', 'month']);
  });

  it('finds 天干五合 and names the element produced', () => {
    const found = findInteractions([p('year', '甲', '子'), p('day', '己', '巳')]);
    const combo = found.find((i) => i.kind === 'stemCombination');
    expect(combo?.producedElement).toBe('earth'); // 甲己合土
  });

  it('finds 三合 only when all three branches are present', () => {
    const two = findInteractions([p('year', '甲', '申'), p('month', '丙', '子')]);
    expect(two.some((i) => i.kind === 'branchTrine')).toBe(false);

    const three = findInteractions([p('year', '甲', '申'), p('month', '丙', '子'), p('day', '戊', '辰')]);
    const trine = three.find((i) => i.kind === 'branchTrine');
    expect(trine?.producedElement).toBe('water'); // 申子辰合水
    expect(trine?.slots).toEqual(['year', 'month', 'day']);
  });

  it('finds 三會 for a full directional set', () => {
    const found = findInteractions([
      p('year', '甲', '寅'), p('month', '丁', '卯'), p('day', '戊', '辰'), p('hour', '庚', '申'),
    ]);
    const dir = found.find((i) => i.kind === 'branchDirectional');
    expect(dir?.producedElement).toBe('wood'); // 寅卯辰會木
  });

  it('finds 半合 for two trine branches including the cardinal one', () => {
    const found = findInteractions([p('year', '甲', '申'), p('month', '丙', '子')]);
    const half = found.find((i) => i.kind === 'branchHalfTrine');
    expect(half?.producedElement).toBe('water'); // 申子 half of 申子辰
  });

  it('does not call the two outer branches a 半合', () => {
    // 申辰 without 子 is 拱合, which most schools do not count.
    const found = findInteractions([p('year', '甲', '申'), p('month', '戊', '辰')]);
    expect(found.some((i) => i.kind === 'branchHalfTrine')).toBe(false);
  });

  it('reports the full 三合 instead of its halves', () => {
    const found = findInteractions([p('year', '甲', '申'), p('month', '丙', '子'), p('day', '戊', '辰')]);
    expect(found.some((i) => i.kind === 'branchTrine')).toBe(true);
    expect(found.some((i) => i.kind === 'branchHalfTrine')).toBe(false);
  });

  it('finds 自刑 when a branch repeats', () => {
    const found = findInteractions([p('year', '甲', '辰'), p('month', '戊', '辰')]);
    expect(found.some((i) => i.kind === 'branchPunishment')).toBe(true);
  });

  it('reports nothing for a chart with no relations', () => {
    const found = findInteractions([p('year', '甲', '子'), p('month', '甲', '子')]);
    expect(found.filter((i) => i.kind === 'branchSixClash')).toHaveLength(0);
  });

  it('keeps members and slots aligned in every interaction it reports', () => {
    const c = chart({ date: '1990-06-15', time: '10:30' });
    for (const i of c.interactions) {
      expect(i.members).toHaveLength(i.slots.length);
      expect(new Set(i.slots).size).toBe(i.slots.length);
    }
  });
});
