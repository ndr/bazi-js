import { DateTime } from 'luxon';
import type { BirthInput, CalcOptions, ChartWarning } from '../types.js';
import { equationOfTimeMinutes, julianDayNumber } from './equationOfTime.js';

export interface ResolvedInstant {
  /** The birth instant. Month and year pillars are decided from this. */
  utc: Date;
  localIso: string;
  tzOffsetMinutes: number;
  longitudeCorrectionMinutes: number;
  equationOfTimeMinutes: number;
  /** Offset from UTC of the frame the solar clock is read in, in minutes. */
  solarOffsetMinutes: number;
  /** True solar clock reading as civil fields. */
  tst: { year: number; month: number; day: number; hour: number; minute: number; second: number };
  /** Julian Day Number of the day pillar's date, after the day-boundary shift. */
  julianDayNumber: number;
  /** 0…11 — the hour branch, or null when the birth time is unknown. */
  hourBranch: number | null;
  warnings: ChartWarning[];
}

const MIN_MS = 60_000;

export function resolveInstant(input: BirthInput, options: CalcOptions): ResolvedInstant {
  const warnings: ChartWarning[] = [];
  const timeKnown = input.time !== null;
  // With no birth time, noon minimises the chance of landing on the wrong day.
  const wallTime = input.time ?? '12:00';
  if (!timeKnown) warnings.push('timeUnknown');

  const iso = `${input.date}T${wallTime}`;
  const local = DateTime.fromISO(iso, { zone: input.timeZone });
  if (!local.isValid) {
    throw new Error(`Invalid local time ${iso} in ${input.timeZone}: ${local.invalidReason}`);
  }

  if (timeKnown) {
    const [wantH, wantM] = wallTime.split(':').map(Number) as [number, number];
    if (local.hour !== wantH || local.minute !== wantM) {
      // Luxon shifted the time forward across a DST gap.
      warnings.push('nonexistentLocalTime');
    } else {
      // On a DST fall-back the same wall time occurs twice. Luxon resolves to
      // the first occurrence, so the duplicate sits one hour later in absolute
      // time; check both directions to stay correct if that ever changes.
      const sameWallClock = (offsetMs: number): boolean => {
        const other = DateTime.fromMillis(local.toMillis() + offsetMs, { zone: input.timeZone });
        return other.hour === local.hour && other.minute === local.minute;
      };
      if (sameWallClock(3_600_000) || sameWallClock(-3_600_000)) {
        warnings.push('ambiguousLocalTime');
      }
    }
  }

  const utc = local.toJSDate();
  const year = utc.getUTCFullYear();
  if (year < 1900 || year > 2100) warnings.push('outOfValidatedRange');

  // Offset from UTC used to read the "solar" clock:
  //  - 'off'        → the civil clock, exactly as the timezone defines it;
  //  - 'longitude'  → local mean time at the birth meridian;
  //  - '+eot'       → local apparent (sundial) time.
  const civilOffset = local.offset;
  const lmtOffset = input.longitude * 4;
  const eot = options.solarTime === 'longitude+eot' ? equationOfTimeMinutes(utc) : 0;
  const solarOffset = options.solarTime === 'off' ? civilOffset : lmtOffset + eot;

  // What the UI reports: how far the sundial runs from the wall clock.
  const longitudeCorrection = options.solarTime === 'off' ? 0 : lmtOffset - civilOffset;

  const tstMs = utc.getTime() + solarOffset * MIN_MS;
  const t = new Date(tstMs);
  const tst = {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth() + 1,
    day: t.getUTCDate(),
    hour: t.getUTCHours(),
    minute: t.getUTCMinutes(),
    second: t.getUTCSeconds(),
  };

  // 早子時: the 23:00 hour already belongs to the following day's pillar.
  const shiftDay = options.dayBoundary === '23:00' && tst.hour >= 23;
  const pillarDate = shiftDay ? new Date(tstMs + 86_400_000) : t;
  const jdn = julianDayNumber(
    pillarDate.getUTCFullYear(),
    pillarDate.getUTCMonth() + 1,
    pillarDate.getUTCDate(),
  );

  // 23:00–00:59 → 子, 01:00–02:59 → 丑, … 21:00–22:59 → 亥.
  const hourBranch = timeKnown ? Math.floor(((tst.hour + 1) % 24) / 2) : null;

  return {
    utc,
    localIso: local.toISO({ suppressMilliseconds: true })!,
    tzOffsetMinutes: local.offset,
    longitudeCorrectionMinutes: longitudeCorrection,
    equationOfTimeMinutes: eot,
    solarOffsetMinutes: solarOffset,
    tst,
    julianDayNumber: jdn,
    hourBranch,
    warnings,
  };
}

/** Formats true solar time as 'YYYY-MM-DDTHH:mm:ss'. */
export function formatTst(tst: ResolvedInstant['tst']): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(tst.year, 4)}-${p(tst.month)}-${p(tst.day)}T${p(tst.hour)}:${p(tst.minute)}:${p(tst.second)}`;
}
