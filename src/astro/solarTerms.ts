import * as Astronomy from 'astronomy-engine';
import { SOLAR_TERMS } from '../constants/index.js';
import type { SolarTermMark } from '../types.js';

/**
 * The 24 solar terms are the instants at which the Sun's apparent ecliptic
 * longitude is a multiple of 15°. They are global instants, so they are
 * computed and compared in UTC — no timezone or location is involved.
 */

const DAY_MS = 86_400_000;

/**
 * Calendar-order term indices for a Gregorian year: a year opens with
 * 小寒 (285°, early January) and closes with 冬至 (270°, late December).
 */
const CALENDAR_ORDER: readonly number[] = Array.from({ length: 24 }, (_, j) => (22 + j) % 24);

const yearCache = new Map<number, SolarTermMark[]>();

/** All 24 solar terms falling inside the given Gregorian year, in time order. */
export function solarTermsOfYear(year: number): SolarTermMark[] {
  const cached = yearCache.get(year);
  if (cached) return cached;

  const marks: SolarTermMark[] = [];
  // Start before 小寒 of `year`, which falls on 5–6 January.
  let cursor = new Date(Date.UTC(year - 1, 11, 15));

  for (const index of CALENDAR_ORDER) {
    const def = SOLAR_TERMS[index]!;
    const found = Astronomy.SearchSunLongitude(def.longitude, cursor, 40);
    if (!found) {
      throw new Error(
        `Solar term ${def.char} (${def.longitude}°) not found for ${year} after ${cursor.toISOString()}`,
      );
    }
    const date = found.date;
    marks.push({
      index,
      longitude: def.longitude,
      utc: date.toISOString(),
      startsMonth: def.startsMonth,
    });
    // Consecutive terms are 14–16 days apart; skip ahead to avoid re-finding this one.
    cursor = new Date(date.getTime() + 5 * DAY_MS);
  }

  yearCache.set(year, marks);
  return marks;
}

/**
 * The solar term in effect at `instant` and the one that follows it.
 * `prev` is the latest term at or before `instant`.
 */
export function surroundingTerms(instant: Date): { prev: SolarTermMark; next: SolarTermMark } {
  const t = instant.getTime();
  const year = instant.getUTCFullYear();
  // 小寒 can fall on 5 January, so a January instant may belong to the previous
  // year's last term; December instants may precede the next year's first.
  const window = [
    ...solarTermsOfYear(year - 1),
    ...solarTermsOfYear(year),
    ...solarTermsOfYear(year + 1),
  ];

  for (let i = window.length - 1; i >= 0; i--) {
    const mark = window[i]!;
    if (Date.parse(mark.utc) <= t) {
      const next = window[i + 1];
      if (!next) throw new Error(`No following solar term for ${instant.toISOString()}`);
      return { prev: mark, next };
    }
  }
  throw new Error(`No preceding solar term for ${instant.toISOString()}`);
}

/** The latest 節 (month-opening term) at or before `instant`. */
export function currentMonthTerm(instant: Date): SolarTermMark {
  const t = instant.getTime();
  const year = instant.getUTCFullYear();
  const window = [...solarTermsOfYear(year - 1), ...solarTermsOfYear(year)];

  for (let i = window.length - 1; i >= 0; i--) {
    const mark = window[i]!;
    if (mark.startsMonth && Date.parse(mark.utc) <= t) return mark;
  }
  throw new Error(`No preceding month term for ${instant.toISOString()}`);
}

/**
 * The BaZi year number for `instant` — the Gregorian year of the 立春 that
 * opens it. A birth on 1 February 1990 belongs to BaZi year 1989.
 */
export function baziYearOf(instant: Date): number {
  const t = instant.getTime();
  const gYear = instant.getUTCFullYear();
  for (const candidate of [gYear + 1, gYear, gYear - 1]) {
    const lichun = solarTermsOfYear(candidate).find((m) => m.index === 0);
    if (lichun && Date.parse(lichun.utc) <= t) return candidate;
  }
  throw new Error(`Cannot resolve BaZi year for ${instant.toISOString()}`);
}

/** The next / previous month-opening 節 relative to `instant`, for luck pillar timing. */
export function nextMonthTerm(instant: Date): SolarTermMark {
  const t = instant.getTime();
  const year = instant.getUTCFullYear();
  const window = [...solarTermsOfYear(year), ...solarTermsOfYear(year + 1)];
  const found = window.find((m) => m.startsMonth && Date.parse(m.utc) > t);
  if (!found) throw new Error(`No following month term for ${instant.toISOString()}`);
  return found;
}
