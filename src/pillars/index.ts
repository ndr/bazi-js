import type { StemIndex, BranchIndex } from '../types.js';
import { monthBranchForTerm } from '../constants/index.js';

/**
 * Offset of the continuous 60-day sexagenary cycle against the Julian Day Number:
 * dayIndex = (JDN + 49) mod 60.
 *
 * Calibrated and locked by differential testing across 1900–2100 (see
 * test/day-pillar.test.ts). Memorable anchor: 1949-10-01 is 甲子 (JDN 2433191).
 * Do not change without re-running the full differential suite.
 */
export const DAY_CYCLE_OFFSET = 49;

/** Sexagenary index 0…59 (0 = 甲子) for a stem/branch pair. */
export function sexagenaryIndex(stem: StemIndex, branch: BranchIndex): number {
  for (let k = 0; k < 6; k++) {
    const i = stem + 10 * k;
    if (i % 12 === branch) return i;
  }
  throw new Error(`Impossible stem/branch pair: stem ${stem}, branch ${branch}`);
}

export const stemOfSexagenary = (i: number): StemIndex => ((i % 60) + 60) % 60 % 10;
export const branchOfSexagenary = (i: number): BranchIndex => ((i % 60) + 60) % 60 % 12;

/** Year pillar. `baziYear` is the Gregorian year of the opening 立春. */
export function yearPillar(baziYear: number): { stem: StemIndex; branch: BranchIndex } {
  const n = baziYear - 4;
  return { stem: ((n % 10) + 10) % 10, branch: ((n % 12) + 12) % 12 };
}

/**
 * Month pillar. The branch comes from the month-opening 節; the stem follows
 * 五虎遁 — the 寅 month of a 甲 or 己 year starts at 丙寅.
 */
export function monthPillar(
  yearStem: StemIndex,
  monthTermIndex: number,
): { stem: StemIndex; branch: BranchIndex } {
  const branch = monthBranchForTerm(monthTermIndex);
  // Months are counted from 寅; 子 and 丑 belong to the tail of the BaZi year.
  const offsetFromYin = (branch - 2 + 12) % 12;
  const stem = (2 + (yearStem % 5) * 2 + offsetFromYin) % 10;
  return { stem, branch };
}

/** Day pillar from the Julian Day Number of the true-solar date. */
export function dayPillar(jdn: number): { stem: StemIndex; branch: BranchIndex } {
  const i = (((jdn + DAY_CYCLE_OFFSET) % 60) + 60) % 60;
  return { stem: i % 10, branch: i % 12 };
}

/** Hour pillar. The stem follows 五鼠遁 — the 子 hour of a 甲 or 己 day starts at 甲子. */
export function hourPillar(
  dayStem: StemIndex,
  hourBranch: BranchIndex,
): { stem: StemIndex; branch: BranchIndex } {
  return { stem: ((dayStem % 5) * 2 + hourBranch) % 10, branch: hourBranch };
}

/** 空亡 — the two branches left uncovered by the day pillar's 旬 (ten-day period). */
export function voidBranches(
  stem: StemIndex,
  branch: BranchIndex,
): [BranchIndex, BranchIndex] {
  const head = ((branch - stem) % 12 + 12) % 12;
  return [(head + 10) % 12, (head + 11) % 12];
}
