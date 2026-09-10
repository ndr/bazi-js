import { describe, it, expect } from 'vitest';
import { Solar } from 'lunar-typescript';
import { calculateChart, surroundingTerms, STEMS, BRANCHES } from '../src/index.js';
import type { Gender } from '../src/index.js';

/**
 * Differential testing against lunar-typescript — an independent implementation
 * derived from Chinese almanac sources. Our engine is configured to match its
 * assumptions: naive UTC+8 civil time, no solar-time correction.
 *
 * The two disagree only inside a sub-minute window around each solar term,
 * where their ephemerides differ (see solar-terms.test.ts). Samples that land
 * in that window are excluded and covered by the boundary test below.
 */

const gz = (p: { stem: number; branch: number }) =>
  `${STEMS[p.stem]!.char}${BRANCHES[p.branch]!.char}`;
const pad = (n: number, w = 2) => String(n).padStart(w, '0');
const TERM_GUARD_MS = 120_000;

function compute(d: Date, gender: Gender, dayBoundary: '23:00' | '00:00' = '00:00') {
  return calculateChart({
    date: `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
    timeZone: 'UTC+8',
    longitude: 116.4,
    gender,
    options: { solarTime: 'off', dayBoundary },
  });
}

function reference(d: Date) {
  return Solar.fromYmdHms(
    d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(),
    d.getUTCHours(), d.getUTCMinutes(), 0,
  ).getLunar();
}

/** True when the sample sits close enough to a term for ephemeris noise to decide the month. */
function nearTermBoundary(chart: ReturnType<typeof compute>): boolean {
  const t = Date.parse(chart.resolved.utc);
  const { prev, next } = surroundingTerms(new Date(t));
  return t - Date.parse(prev.utc) < TERM_GUARD_MS || Date.parse(next.utc) - t < TERM_GUARD_MS;
}

describe('four pillars vs an independent implementation', () => {
  it('agrees on every pillar across 1900–2100', () => {
    const mismatches: string[] = [];
    let compared = 0;
    let skipped = 0;

    let i = 0;
    for (let t = Date.UTC(1900, 0, 1); t <= Date.UTC(2100, 11, 31); t += 23 * 86_400_000, i++) {
      const base = new Date(t);
      const d = new Date(Date.UTC(
        base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(),
        (i * 7) % 22 + 1, (i * 13) % 60,
      ));

      const mine = compute(d, 'male');
      if (nearTermBoundary(mine)) { skipped++; continue; }
      compared++;

      const ref = reference(d);
      const actual = {
        year: gz(mine.pillars.year), month: gz(mine.pillars.month),
        day: gz(mine.pillars.day), hour: gz(mine.pillars.hour!),
      };
      const expected = {
        year: ref.getYearInGanZhiExact(), month: ref.getMonthInGanZhiExact(),
        day: ref.getDayInGanZhi(), hour: ref.getTimeInGanZhi(),
      };

      for (const k of ['year', 'month', 'day', 'hour'] as const) {
        if (actual[k] !== expected[k]) {
          mismatches.push(`${d.toISOString().slice(0, 16)} ${k}: ${actual[k]} ≠ ${expected[k]}`);
          break;
        }
      }
    }

    expect(compared).toBeGreaterThan(3000);
    expect(skipped).toBeLessThan(compared * 0.01);
    expect(mismatches.slice(0, 10)).toEqual([]);
  }, 60_000);
});

describe('day pillar across the full range', () => {
  it('matches the reference on every day of several complete years', () => {
    const mismatches: string[] = [];
    for (const year of [1900, 1949, 1984, 2000, 2026, 2100]) {
      for (let d = new Date(Date.UTC(year, 0, 1)); d.getUTCFullYear() === year;
           d = new Date(d.getTime() + 86_400_000)) {
        const mine = gz(compute(d, 'male').pillars.day);
        const ref = reference(d).getDayInGanZhi();
        if (mine !== ref) mismatches.push(`${d.toISOString().slice(0, 10)}: ${mine} ≠ ${ref}`);
      }
    }
    expect(mismatches.slice(0, 10)).toEqual([]);
  }, 60_000);
});

describe('day boundary conventions', () => {
  it('matches 早子時 (23:00) and 晚子時 (00:00) around the 子 hour', () => {
    const early: string[] = [];
    const late: string[] = [];

    for (let y = 1950; y <= 2050; y += 3) {
      for (const [m, dd] of [[3, 7], [8, 19]] as [number, number][]) {
        for (const [hh, mm] of [[22, 59], [23, 0], [23, 30], [23, 59], [0, 0], [0, 30]] as [number, number][]) {
          const d = new Date(Date.UTC(y, m - 1, dd, hh, mm));
          const ref = reference(d);
          if (gz(compute(d, 'male', '23:00').pillars.day) !== ref.getDayInGanZhiExact()) {
            early.push(d.toISOString());
          }
          if (gz(compute(d, 'male', '00:00').pillars.day) !== ref.getDayInGanZhiExact2()) {
            late.push(d.toISOString());
          }
        }
      }
    }
    expect(early.slice(0, 5)).toEqual([]);
    expect(late.slice(0, 5)).toEqual([]);
  }, 30_000);
});

describe('luck pillars', () => {
  /**
   * The two starting-age conventions are checked against the matching school in
   * the reference: 'exact' is 流派2, 'rounded' is 流派1. They legitimately differ
   * from each other by up to a year, which is why the method is an explicit option.
   */
  it.each([
    ['exact', 2],
    ['rounded', 1],
  ] as const)('matches %s start ages (流派%i) for both genders', (method, sect) => {
    const bad: string[] = [];
    let compared = 0;

    for (let y = 1930; y <= 2060; y += 3) {
      for (const [m, dd, hh] of [[1, 15, 4], [4, 3, 11], [7, 28, 17], [11, 9, 21], [6, 1, 0]] as [number, number, number][]) {
        for (const gender of ['male', 'female'] as const) {
          const d = new Date(Date.UTC(y, m - 1, dd, hh, 20));
          const mine = calculateChart({
            date: `${pad(y, 4)}-${pad(m)}-${pad(dd)}`,
            time: `${pad(hh)}:20`,
            timeZone: 'UTC+8', longitude: 116.4, gender,
            options: { solarTime: 'off', dayBoundary: '00:00', luckStartMethod: method },
          });
          if (nearTermBoundary(mine)) continue;
          compared++;

          const yun = reference(d).getEightChar().getYun(gender === 'male' ? 1 : 0, sect);
          const label = `${d.toISOString().slice(0, 16)} ${gender}`;

          if ((mine.luck.direction === 'forward') !== yun.isForward()) {
            bad.push(`${label} direction`);
          } else if (mine.luck.startAge.years !== yun.getStartYear()) {
            bad.push(`${label} years ${mine.luck.startAge.years} ≠ ${yun.getStartYear()}`);
          } else if (mine.luck.startAge.months !== yun.getStartMonth()) {
            bad.push(`${label} months ${mine.luck.startAge.months} ≠ ${yun.getStartMonth()}`);
          } else {
            const refFirst = yun.getDaYun()[1]?.getGanZhi();
            if (refFirst && gz(mine.luck.pillars[0]!) !== refFirst) {
              bad.push(`${label} first pillar ${gz(mine.luck.pillars[0]!)} ≠ ${refFirst}`);
            }
          }
        }
      }
    }
    expect(compared).toBeGreaterThan(300);
    expect(bad.slice(0, 10)).toEqual([]);
  }, 30_000);

  it('gives the two schools genuinely different answers sometimes', () => {
    const input = {
      date: '1986-07-28', time: '17:20', timeZone: 'UTC+8', longitude: 116.4, gender: 'female' as const,
    };
    const exact = calculateChart({ ...input, options: { solarTime: 'off', dayBoundary: '00:00', luckStartMethod: 'exact' } });
    const rounded = calculateChart({ ...input, options: { solarTime: 'off', dayBoundary: '00:00', luckStartMethod: 'rounded' } });
    expect(exact.luck.startAge.years).toBe(6);
    expect(rounded.luck.startAge.years).toBe(7);
    expect(exact.luck.startMethod).toBe('exact');
  });
});
