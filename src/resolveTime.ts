import type { CalcOptions, ChartWarning, SolarTermMark } from './types.js';
import { resolveInstant, formatTst } from './time/resolve.js';
import { surroundingTerms } from './astro/solarTerms.js';
import { DEFAULT_OPTIONS } from './chart.js';

/**
 * Everything the "how this was computed" panel needs, without requiring the
 * fields that only matter for a full chart (gender, luck direction).
 */
export interface TimeResolutionInput {
  date: string;
  time: string | null;
  timeZone: string;
  longitude: number;
  options?: Partial<CalcOptions>;
}

export interface TimeResolution {
  utc: string;
  local: string;
  tzOffsetMinutes: number;
  longitudeCorrectionMinutes: number;
  equationOfTimeMinutes: number;
  trueSolarTime: string;
  julianDay: number;
  prevTerm: SolarTermMark;
  nextTerm: SolarTermMark;
  warnings: ChartWarning[];
}

/**
 * Resolves a birth moment to UTC and to true solar time. Cheap enough to run on
 * every keystroke — the solar term table is cached per year.
 */
export function resolveBirthTime(input: TimeResolutionInput): TimeResolution {
  const options: CalcOptions = { ...DEFAULT_OPTIONS, ...input.options };
  const r = resolveInstant({ ...input, gender: 'male' }, options);
  const { prev, next } = surroundingTerms(r.utc);

  return {
    utc: r.utc.toISOString(),
    local: r.localIso,
    tzOffsetMinutes: r.tzOffsetMinutes,
    longitudeCorrectionMinutes: Math.round(r.longitudeCorrectionMinutes * 100) / 100,
    equationOfTimeMinutes: Math.round(r.equationOfTimeMinutes * 100) / 100,
    trueSolarTime: formatTst(r.tst),
    julianDay: r.julianDayNumber,
    prevTerm: prev,
    nextTerm: next,
    warnings: r.warnings,
  };
}
