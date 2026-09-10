import type {
  Gender, LuckDirection, LuckPillar, LuckStartMethod, StemIndex, BranchIndex,
} from '../types.js';
import { STEMS } from '../constants/index.js';
import { sexagenaryIndex, stemOfSexagenary, branchOfSexagenary } from '../pillars/index.js';
import { currentMonthTerm, nextMonthTerm } from '../astro/solarTerms.js';

const DAY_MS = 86_400_000;
const PILLAR_COUNT = 10;

/**
 * Direction of the luck pillars: forward for a yang-year male or yin-year
 * female, backward otherwise.
 */
export function luckDirection(yearStem: StemIndex, gender: Gender): LuckDirection {
  const yang = STEMS[yearStem]!.polarity === 'yang';
  const male = gender === 'male';
  return yang === male ? 'forward' : 'backward';
}

/**
 * Age at which the first luck pillar begins, from the distance between birth
 * and the adjoining 節: three days of life stand for one year, one day for
 * four months, one hour for five days.
 */
export function luckStartAge(
  birthUtc: Date,
  direction: LuckDirection,
  method: LuckStartMethod = 'exact',
  frameOffsetMinutes = 0,
): { years: number; months: number; days: number; totalYears: number } {
  const boundaryUtc =
    direction === 'forward'
      ? Date.parse(nextMonthTerm(birthUtc).utc)
      : Date.parse(currentMonthTerm(birthUtc).utc);

  const start = direction === 'forward' ? birthUtc.getTime() : boundaryUtc;
  const end = direction === 'forward' ? boundaryUtc : birthUtc.getTime();

  if (method === 'rounded') return roundedStartAge(start, end, frameOffsetMinutes);

  const totalYears = (end - start) / DAY_MS / 3;
  const years = Math.floor(totalYears);
  const monthsFloat = (totalYears - years) * 12;
  const months = Math.floor(monthsFloat);
  const days = Math.round((monthsFloat - months) * 30);

  return { years, months, days, totalYears };
}

/** Hour branch of an instant, read in the chart's own time frame. */
const hourBranchOf = (ms: number): number => {
  const h = new Date(ms).getUTCHours();
  return h === 23 ? 11 : Math.floor((h + 1) / 2);
};

/**
 * 流派1 — counts whole days and 時辰 rather than exact elapsed time:
 * 3 days = 1 year, 1 day = 4 months, 1 時辰 = 10 days.
 */
function roundedStartAge(
  startUtc: number,
  endUtc: number,
  frameOffsetMinutes: number,
): { years: number; months: number; days: number; totalYears: number } {
  // Whole days and 時辰 are counted on the local clock, not on UTC.
  const shift = frameOffsetMinutes * 60_000;
  const start = startUtc + shift;
  const end = endUtc + shift;

  const midnight = (ms: number) => Math.floor(ms / DAY_MS) * DAY_MS;
  let dayDiff = Math.round((midnight(end) - midnight(start)) / DAY_MS);
  let hourDiff = hourBranchOf(end) - hourBranchOf(start);
  if (hourDiff < 0) {
    hourDiff += 12;
    dayDiff -= 1;
  }

  const monthDiff = Math.floor((hourDiff * 10) / 30);
  const totalMonths = dayDiff * 4 + monthDiff;
  const days = hourDiff * 10 - monthDiff * 30;

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths - years * 12;

  return { years, months, days, totalYears: years + months / 12 + days / 360 };
}

/** The ten-year luck pillars, stepping from the month pillar. */
export function luckPillars(
  monthStem: StemIndex,
  monthBranch: BranchIndex,
  direction: LuckDirection,
  startAgeYears: number,
  birthYear: number,
): LuckPillar[] {
  const base = sexagenaryIndex(monthStem, monthBranch);
  const step = direction === 'forward' ? 1 : -1;
  const firstAge = Math.floor(startAgeYears);

  return Array.from({ length: PILLAR_COUNT }, (_, i) => {
    const idx = (((base + step * (i + 1)) % 60) + 60) % 60;
    const startAge = firstAge + i * 10;
    return {
      stem: stemOfSexagenary(idx),
      branch: branchOfSexagenary(idx),
      startAge,
      startYear: birthYear + startAge,
      endYear: birthYear + startAge + 9,
    };
  });
}
