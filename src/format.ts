import type { BaziChart } from './types.js';
import { STEMS, BRANCHES } from './constants/index.js';

/** e.g. '甲子 丙寅 戊午 庚申' — the eight characters, year to hour. */
export function formatEightCharacters(chart: BaziChart): string {
  const { year, month, day, hour } = chart.pillars;
  const s = (p: { stem: number; branch: number }) =>
    `${STEMS[p.stem]!.char}${BRANCHES[p.branch]!.char}`;
  return [s(year), s(month), s(day), hour ? s(hour) : '??'].join(' ');
}
