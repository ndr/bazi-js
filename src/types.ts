/** Five Elements (五行). */
export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

/** Yin/Yang polarity (陰陽). */
export type Polarity = 'yang' | 'yin';

/** Index into the 10 Heavenly Stems (天干). 0 = 甲 … 9 = 癸. */
export type StemIndex = number;

/** Index into the 12 Earthly Branches (地支). 0 = 子 … 11 = 亥. */
export type BranchIndex = number;

/** The Ten Gods (十神), relative to the Day Master. */
export type TenGod =
  | 'friend'          // 比肩
  | 'robWealth'       // 劫財
  | 'eatingGod'       // 食神
  | 'hurtingOfficer'  // 傷官
  | 'indirectWealth'  // 偏財
  | 'directWealth'    // 正財
  | 'sevenKillings'   // 七殺
  | 'directOfficer'   // 正官
  | 'indirectResource'// 偏印
  | 'directResource'; // 正印

/** The twelve stages of the life cycle (十二長生). */
export type LifeStage =
  | 'birth' | 'bath' | 'cap' | 'official' | 'emperor' | 'decline'
  | 'illness' | 'death' | 'tomb' | 'extinct' | 'womb' | 'nurture';

export type Gender = 'male' | 'female';
export type LuckDirection = 'forward' | 'backward';

/** How true solar time is derived from clock time. */
export type SolarTimeMode = 'off' | 'longitude' | 'longitude+eot';

/** Which instant starts a new day pillar. */
export type DayBoundary = '23:00' | '00:00';

/**
 * How the starting age of the first luck pillar is derived from the distance
 * to the adjoining 節. The schools disagree and can differ by up to a year.
 *  - 'exact'   (流派2) — exact elapsed time, 3 days = 1 year;
 *  - 'rounded' (流派1) — whole days and 時辰 only, 1 時辰 = 10 days.
 */
export type LuckStartMethod = 'exact' | 'rounded';

export interface CalcOptions {
  /** Default: 'longitude+eot'. */
  solarTime: SolarTimeMode;
  /** Default: '23:00' (早子時). */
  dayBoundary: DayBoundary;
  /** Default: 'exact' (流派2). */
  luckStartMethod: LuckStartMethod;
}

export interface BirthInput {
  /** Local calendar date, 'YYYY-MM-DD'. */
  date: string;
  /** Local wall-clock time 'HH:mm', or null when unknown. */
  time: string | null;
  /** IANA zone id, e.g. 'Europe/Kyiv'. */
  timeZone: string;
  /**
   * Degrees east of Greenwich, negative for west. Used for the true solar time
   * correction. There is deliberately no latitude: solar terms are geocentric
   * and nothing in a BaZi chart depends on how far north or south you were.
   */
  longitude: number;
  gender: Gender;
  /** Overrides the polarity/gender rule for luck pillar direction. */
  luckDirection?: LuckDirection;
  options?: Partial<CalcOptions>;
}

export interface SolarTermMark {
  /** 0…23, index into SOLAR_TERMS. */
  index: number;
  /** Target apparent ecliptic longitude of the Sun, degrees. */
  longitude: number;
  /** Instant, ISO 8601 UTC. */
  utc: string;
  /** True for the 12 節 terms that start a BaZi month. */
  startsMonth: boolean;
}

export interface Pillar {
  stem: StemIndex;
  branch: BranchIndex;
  /** 藏干, principal stem first. */
  hiddenStems: StemIndex[];
  /** Ten God of the pillar's stem; null for the day pillar (the self). */
  stemGod: TenGod | null;
  /** Ten Gods of the hidden stems, aligned with `hiddenStems`. */
  hiddenGods: TenGod[];
  /** 納音 index 0…29 into NAYIN. */
  naYin: number;
  /** 十二長生 of the Day Master in this branch. */
  lifeStage: LifeStage;
  /** 空亡 — branch falls in the day pillar's void pair. */
  isVoid: boolean;
}

export interface LuckPillar {
  stem: StemIndex;
  branch: BranchIndex;
  /** Age at which this 10-year pillar begins. */
  startAge: number;
  /** Gregorian year in which it begins. */
  startYear: number;
  endYear: number;
}

export type InteractionKind =
  | 'stemCombination'   // 天干五合
  | 'branchSixCombo'    // 六合
  | 'branchSixClash'    // 六沖
  | 'branchTrine'       // 三合
  | 'branchHalfTrine'   // 半合
  | 'branchDirectional' // 三會
  | 'branchHarm'        // 六害
  | 'branchPunishment'  // 刑
  | 'branchDestruction';// 破

export type PillarSlot = 'year' | 'month' | 'day' | 'hour';

export interface Interaction {
  kind: InteractionKind;
  /** Which pillars take part. */
  slots: PillarSlot[];
  /** Participating stem or branch indices, in slot order. */
  members: number[];
  /** Element produced by the combination, when the rule defines one. */
  producedElement?: Element;
}

export interface ElementBalance {
  raw: Record<Element, number>;
  weighted: Record<Element, number>;
  strength: 'strong' | 'weak' | 'balanced';
  /** Identifier of the scoring method, for reproducibility. */
  method: string;
  /** Normalised support-vs-drain score in [-1, 1]. */
  score: number;
}

export interface ResolvedTime {
  /** Birth instant, ISO 8601 UTC. */
  utc: string;
  /** Local civil time as resolved, ISO 8601 with offset. */
  local: string;
  /** Actual historical offset applied, in minutes. */
  tzOffsetMinutes: number;
  /** True solar clock reading, 'YYYY-MM-DDTHH:mm:ss'. */
  trueSolarTime: string;
  longitudeCorrectionMinutes: number;
  equationOfTimeMinutes: number;
  /** Julian Day Number of the true-solar civil date, after day-boundary shift. */
  julianDay: number;
  /** Nearest of the 24 terms either side, whichever kind. */
  prevTerm: SolarTermMark;
  nextTerm: SolarTermMark;
  /** The 節 that opened this BaZi month, and the 節 that closes it. */
  monthTerm: SolarTermMark;
  nextMonthTerm: SolarTermMark;
}

export type ChartWarning =
  /** Birth time unknown; the hour pillar is omitted and noon was assumed. */
  | 'timeUnknown'
  /** A month-opening 節 falls on the birth date, so an unknown time makes the month pillar uncertain. */
  | 'termBoundaryOnBirthDate'
  /** The wall-clock time occurs twice that day (DST fall-back); the first occurrence was used. */
  | 'ambiguousLocalTime'
  /** The wall-clock time does not exist that day (DST spring-forward); it was shifted forward. */
  | 'nonexistentLocalTime'
  /** Outside the range the engine is validated for (1900–2100). */
  | 'outOfValidatedRange';

export interface BaziChart {
  input: BirthInput;
  options: CalcOptions;
  resolved: ResolvedTime;
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    /** null when the birth time is unknown. */
    hour: Pillar | null;
  };
  dayMaster: { stem: StemIndex; element: Element; polarity: Polarity };
  /** 空亡 branches of the day pillar. */
  voidBranches: [BranchIndex, BranchIndex];
  elements: ElementBalance;
  luck: {
    direction: LuckDirection;
    /** Identifier of the starting-age convention used. */
    startMethod: LuckStartMethod;
    startAge: { years: number; months: number; days: number };
    pillars: LuckPillar[];
  };
  interactions: Interaction[];
  warnings: ChartWarning[];
  meta: { engineVersion: string; computedAt: string };
}
