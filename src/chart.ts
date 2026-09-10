import type {
  BaziChart, BirthInput, CalcOptions, Pillar, PillarSlot, StemIndex, BranchIndex, ChartWarning,
} from './types.js';
import { STEMS, BRANCHES } from './constants/index.js';
import { resolveInstant, formatTst } from './time/resolve.js';
import { surroundingTerms, currentMonthTerm, nextMonthTerm, baziYearOf } from './astro/solarTerms.js';
import {
  yearPillar, monthPillar, dayPillar, hourPillar, sexagenaryIndex, voidBranches,
} from './pillars/index.js';
import { tenGod, lifeStage, naYinIndex, elementBalance } from './derived/index.js';
import { findInteractions } from './derived/interactions.js';
import { luckDirection, luckStartAge, luckPillars } from './derived/luck.js';

export const ENGINE_VERSION = '0.1.0';

export const DEFAULT_OPTIONS: CalcOptions = {
  solarTime: 'longitude+eot',
  // 晚子時: the day pillar turns over at midnight. Chosen by the practitioner
  // this site is built for; the 23:00 school stays available as an option.
  dayBoundary: '00:00',
  luckStartMethod: 'exact',
};

export function calculateChart(input: BirthInput): BaziChart {
  const options: CalcOptions = { ...DEFAULT_OPTIONS, ...input.options };
  const resolved = resolveInstant(input, options);
  const warnings: ChartWarning[] = [...resolved.warnings];

  // Year and month pillars are decided by the Sun's position, i.e. by the
  // absolute instant — location and clock convention do not enter here.
  const baziYear = baziYearOf(resolved.utc);
  const monthTerm = currentMonthTerm(resolved.utc);
  const { prev, next } = surroundingTerms(resolved.utc);

  const year = yearPillar(baziYear);
  const month = monthPillar(year.stem, monthTerm.index);
  const day = dayPillar(resolved.julianDayNumber);
  const hour =
    resolved.hourBranch === null ? null : hourPillar(day.stem, resolved.hourBranch);

  // With an unknown birth time, a 節 landing on the birth date makes the month
  // pillar a coin flip — say so rather than presenting a guess as fact.
  if (resolved.hourBranch === null) {
    const birthDay = resolved.utc.toISOString().slice(0, 10);
    if (prev.utc.slice(0, 10) === birthDay || next.utc.slice(0, 10) === birthDay) {
      warnings.push('termBoundaryOnBirthDate');
    }
  }

  const dayMaster = day.stem;
  const voids = voidBranches(day.stem, day.branch);

  const slots: { slot: PillarSlot; stem: StemIndex; branch: BranchIndex }[] = [
    { slot: 'year', ...year },
    { slot: 'month', ...month },
    { slot: 'day', ...day },
    ...(hour ? [{ slot: 'hour' as const, ...hour }] : []),
  ];

  const buildPillar = (
    slot: PillarSlot,
    p: { stem: StemIndex; branch: BranchIndex },
  ): Pillar => {
    const hidden = [...BRANCHES[p.branch]!.hidden];
    return {
      stem: p.stem,
      branch: p.branch,
      hiddenStems: hidden,
      stemGod: slot === 'day' ? null : tenGod(dayMaster, p.stem),
      hiddenGods: hidden.map((h) => tenGod(dayMaster, h)),
      naYin: naYinIndex(sexagenaryIndex(p.stem, p.branch)),
      lifeStage: lifeStage(dayMaster, p.branch),
      isVoid: voids.includes(p.branch),
    };
  };

  const direction = input.luckDirection ?? luckDirection(year.stem, input.gender);
  const startAge = luckStartAge(
    resolved.utc, direction, options.luckStartMethod, resolved.solarOffsetMinutes,
  );

  return {
    input,
    options,
    resolved: {
      utc: resolved.utc.toISOString(),
      local: resolved.localIso,
      tzOffsetMinutes: resolved.tzOffsetMinutes,
      trueSolarTime: formatTst(resolved.tst),
      longitudeCorrectionMinutes: Math.round(resolved.longitudeCorrectionMinutes * 100) / 100,
      equationOfTimeMinutes: Math.round(resolved.equationOfTimeMinutes * 100) / 100,
      julianDay: resolved.julianDayNumber,
      prevTerm: prev,
      nextTerm: next,
      monthTerm,
      nextMonthTerm: nextMonthTerm(resolved.utc),
    },
    pillars: {
      year: buildPillar('year', year),
      month: buildPillar('month', month),
      day: buildPillar('day', day),
      hour: hour ? buildPillar('hour', hour) : null,
    },
    dayMaster: {
      stem: dayMaster,
      element: STEMS[dayMaster]!.element,
      polarity: STEMS[dayMaster]!.polarity,
    },
    voidBranches: voids,
    elements: elementBalance(slots, dayMaster),
    luck: {
      direction,
      startMethod: options.luckStartMethod,
      startAge: { years: startAge.years, months: startAge.months, days: startAge.days },
      pillars: luckPillars(
        month.stem, month.branch, direction, startAge.totalYears,
        new Date(resolved.utc).getUTCFullYear(),
      ),
    },
    interactions: findInteractions(slots),
    warnings,
    meta: { engineVersion: ENGINE_VERSION, computedAt: new Date().toISOString() },
  };
}
