import type { Element, Polarity, LifeStage, StemIndex, BranchIndex } from '../types.js';

/** Canonical element order. Index i generates (i+1)%5 and controls (i+2)%5. */
export const ELEMENTS: readonly Element[] = ['wood', 'fire', 'earth', 'metal', 'water'] as const;

export const elementIndex = (e: Element): number => ELEMENTS.indexOf(e);
/** 生 — does `a` generate `b`? */
export const generates = (a: Element, b: Element): boolean =>
  ELEMENTS[(elementIndex(a) + 1) % 5] === b;
/** 剋 — does `a` control `b`? */
export const controls = (a: Element, b: Element): boolean =>
  ELEMENTS[(elementIndex(a) + 2) % 5] === b;

// ---------------------------------------------------------------- 天干

export interface StemDef {
  char: string;
  pinyin: string;
  element: Element;
  polarity: Polarity;
}

export const STEMS: readonly StemDef[] = [
  { char: '甲', pinyin: 'jiǎ',  element: 'wood',  polarity: 'yang' },
  { char: '乙', pinyin: 'yǐ',   element: 'wood',  polarity: 'yin'  },
  { char: '丙', pinyin: 'bǐng', element: 'fire',  polarity: 'yang' },
  { char: '丁', pinyin: 'dīng', element: 'fire',  polarity: 'yin'  },
  { char: '戊', pinyin: 'wù',   element: 'earth', polarity: 'yang' },
  { char: '己', pinyin: 'jǐ',   element: 'earth', polarity: 'yin'  },
  { char: '庚', pinyin: 'gēng', element: 'metal', polarity: 'yang' },
  { char: '辛', pinyin: 'xīn',  element: 'metal', polarity: 'yin'  },
  { char: '壬', pinyin: 'rén',  element: 'water', polarity: 'yang' },
  { char: '癸', pinyin: 'guǐ',  element: 'water', polarity: 'yin'  },
] as const;

// ---------------------------------------------------------------- 地支

export interface BranchDef {
  char: string;
  pinyin: string;
  animal: string;
  element: Element;
  polarity: Polarity;
  /** 藏干 — principal (本氣) first, then 中氣, then 餘氣. */
  hidden: readonly StemIndex[];
  /** Relative weight of each hidden stem, same order, summing to 1. */
  hiddenWeights: readonly number[];
}

export const BRANCHES: readonly BranchDef[] = [
  { char: '子', pinyin: 'zǐ',   animal: 'rat',     element: 'water', polarity: 'yang', hidden: [9],       hiddenWeights: [1] },
  { char: '丑', pinyin: 'chǒu', animal: 'ox',      element: 'earth', polarity: 'yin',  hidden: [5, 9, 7], hiddenWeights: [0.6, 0.2, 0.2] },
  { char: '寅', pinyin: 'yín',  animal: 'tiger',   element: 'wood',  polarity: 'yang', hidden: [0, 2, 4], hiddenWeights: [0.6, 0.25, 0.15] },
  { char: '卯', pinyin: 'mǎo',  animal: 'rabbit',  element: 'wood',  polarity: 'yin',  hidden: [1],       hiddenWeights: [1] },
  { char: '辰', pinyin: 'chén', animal: 'dragon',  element: 'earth', polarity: 'yang', hidden: [4, 1, 9], hiddenWeights: [0.6, 0.25, 0.15] },
  { char: '巳', pinyin: 'sì',   animal: 'snake',   element: 'fire',  polarity: 'yin',  hidden: [2, 4, 6], hiddenWeights: [0.6, 0.25, 0.15] },
  { char: '午', pinyin: 'wǔ',   animal: 'horse',   element: 'fire',  polarity: 'yang', hidden: [3, 5],    hiddenWeights: [0.7, 0.3] },
  { char: '未', pinyin: 'wèi',  animal: 'goat',    element: 'earth', polarity: 'yin',  hidden: [5, 3, 1], hiddenWeights: [0.6, 0.25, 0.15] },
  { char: '申', pinyin: 'shēn', animal: 'monkey',  element: 'metal', polarity: 'yang', hidden: [6, 8, 4], hiddenWeights: [0.6, 0.25, 0.15] },
  { char: '酉', pinyin: 'yǒu',  animal: 'rooster', element: 'metal', polarity: 'yin',  hidden: [7],       hiddenWeights: [1] },
  { char: '戌', pinyin: 'xū',   animal: 'dog',     element: 'earth', polarity: 'yang', hidden: [4, 7, 3], hiddenWeights: [0.6, 0.25, 0.15] },
  { char: '亥', pinyin: 'hài',  animal: 'pig',     element: 'water', polarity: 'yin',  hidden: [8, 0],    hiddenWeights: [0.7, 0.3] },
] as const;

// ---------------------------------------------------------------- 二十四節氣

export interface SolarTermDef {
  char: string;
  pinyin: string;
  /** Apparent ecliptic longitude of the Sun, degrees. */
  longitude: number;
  /** True for the 12 節 that open a BaZi month. */
  startsMonth: boolean;
}

/** Ordered from 立春 (λ☉ = 315°), the start of the BaZi year. */
export const SOLAR_TERMS: readonly SolarTermDef[] = [
  { char: '立春', pinyin: 'lì chūn',   longitude: 315, startsMonth: true  },
  { char: '雨水', pinyin: 'yǔ shuǐ',   longitude: 330, startsMonth: false },
  { char: '驚蟄', pinyin: 'jīng zhé',  longitude: 345, startsMonth: true  },
  { char: '春分', pinyin: 'chūn fēn',  longitude: 0,   startsMonth: false },
  { char: '清明', pinyin: 'qīng míng', longitude: 15,  startsMonth: true  },
  { char: '穀雨', pinyin: 'gǔ yǔ',     longitude: 30,  startsMonth: false },
  { char: '立夏', pinyin: 'lì xià',    longitude: 45,  startsMonth: true  },
  { char: '小滿', pinyin: 'xiǎo mǎn',  longitude: 60,  startsMonth: false },
  { char: '芒種', pinyin: 'máng zhòng',longitude: 75,  startsMonth: true  },
  { char: '夏至', pinyin: 'xià zhì',   longitude: 90,  startsMonth: false },
  { char: '小暑', pinyin: 'xiǎo shǔ',  longitude: 105, startsMonth: true  },
  { char: '大暑', pinyin: 'dà shǔ',    longitude: 120, startsMonth: false },
  { char: '立秋', pinyin: 'lì qiū',    longitude: 135, startsMonth: true  },
  { char: '處暑', pinyin: 'chù shǔ',   longitude: 150, startsMonth: false },
  { char: '白露', pinyin: 'bái lù',    longitude: 165, startsMonth: true  },
  { char: '秋分', pinyin: 'qiū fēn',   longitude: 180, startsMonth: false },
  { char: '寒露', pinyin: 'hán lù',    longitude: 195, startsMonth: true  },
  { char: '霜降', pinyin: 'shuāng jiàng', longitude: 210, startsMonth: false },
  { char: '立冬', pinyin: 'lì dōng',   longitude: 225, startsMonth: true  },
  { char: '小雪', pinyin: 'xiǎo xuě',  longitude: 240, startsMonth: false },
  { char: '大雪', pinyin: 'dà xuě',    longitude: 255, startsMonth: true  },
  { char: '冬至', pinyin: 'dōng zhì',  longitude: 270, startsMonth: false },
  { char: '小寒', pinyin: 'xiǎo hán',  longitude: 285, startsMonth: true  },
  { char: '大寒', pinyin: 'dà hán',    longitude: 300, startsMonth: false },
] as const;

/**
 * Earthly Branch of the month opened by SOLAR_TERMS[i] (even i only).
 * 立春 → 寅(2), 驚蟄 → 卯(3) … 大雪 → 子(0), 小寒 → 丑(1).
 */
export const monthBranchForTerm = (termIndex: number): BranchIndex =>
  ((termIndex >> 1) + 2) % 12;

// ---------------------------------------------------------------- 納音

export interface NaYinDef { char: string; pinyin: string; element: Element }

/** 六十甲子納音 — one entry per two consecutive sexagenary pairs. */
export const NAYIN: readonly NaYinDef[] = [
  { char: '海中金', pinyin: 'hǎi zhōng jīn', element: 'metal' },
  { char: '爐中火', pinyin: 'lú zhōng huǒ',  element: 'fire'  },
  { char: '大林木', pinyin: 'dà lín mù',     element: 'wood'  },
  { char: '路旁土', pinyin: 'lù páng tǔ',    element: 'earth' },
  { char: '劍鋒金', pinyin: 'jiàn fēng jīn', element: 'metal' },
  { char: '山頭火', pinyin: 'shān tóu huǒ',  element: 'fire'  },
  { char: '澗下水', pinyin: 'jiàn xià shuǐ', element: 'water' },
  { char: '城頭土', pinyin: 'chéng tóu tǔ',  element: 'earth' },
  { char: '白蠟金', pinyin: 'bái là jīn',    element: 'metal' },
  { char: '楊柳木', pinyin: 'yáng liǔ mù',   element: 'wood'  },
  { char: '泉中水', pinyin: 'quán zhōng shuǐ', element: 'water' },
  { char: '屋上土', pinyin: 'wū shàng tǔ',   element: 'earth' },
  { char: '霹靂火', pinyin: 'pī lì huǒ',     element: 'fire'  },
  { char: '松柏木', pinyin: 'sōng bǎi mù',   element: 'wood'  },
  { char: '長流水', pinyin: 'cháng liú shuǐ',element: 'water' },
  { char: '砂中金', pinyin: 'shā zhōng jīn', element: 'metal' },
  { char: '山下火', pinyin: 'shān xià huǒ',  element: 'fire'  },
  { char: '平地木', pinyin: 'píng dì mù',    element: 'wood'  },
  { char: '壁上土', pinyin: 'bì shàng tǔ',   element: 'earth' },
  { char: '金箔金', pinyin: 'jīn bó jīn',    element: 'metal' },
  { char: '覆燈火', pinyin: 'fù dēng huǒ',   element: 'fire'  },
  { char: '天河水', pinyin: 'tiān hé shuǐ',  element: 'water' },
  { char: '大驛土', pinyin: 'dà yì tǔ',      element: 'earth' },
  { char: '釵釧金', pinyin: 'chāi chuàn jīn',element: 'metal' },
  { char: '桑柘木', pinyin: 'sāng zhè mù',   element: 'wood'  },
  { char: '大溪水', pinyin: 'dà xī shuǐ',    element: 'water' },
  { char: '沙中土', pinyin: 'shā zhōng tǔ',  element: 'earth' },
  { char: '天上火', pinyin: 'tiān shàng huǒ',element: 'fire'  },
  { char: '石榴木', pinyin: 'shí liú mù',    element: 'wood'  },
  { char: '大海水', pinyin: 'dà hǎi shuǐ',   element: 'water' },
] as const;

// ---------------------------------------------------------------- 十二長生

export const LIFE_STAGES: readonly LifeStage[] = [
  'birth', 'bath', 'cap', 'official', 'emperor', 'decline',
  'illness', 'death', 'tomb', 'extinct', 'womb', 'nurture',
] as const;

export const LIFE_STAGE_CHARS: readonly string[] = [
  '長生', '沐浴', '冠帶', '臨官', '帝旺', '衰',
  '病', '死', '墓', '絕', '胎', '養',
] as const;

/** Branch in which each stem's 長生 falls. Yang stems advance, yin stems retreat. */
export const LIFE_STAGE_ORIGIN: readonly BranchIndex[] = [
  11, // 甲 → 亥
  6,  // 乙 → 午
  2,  // 丙 → 寅
  9,  // 丁 → 酉
  2,  // 戊 → 寅
  9,  // 己 → 酉
  5,  // 庚 → 巳
  0,  // 辛 → 子
  8,  // 壬 → 申
  3,  // 癸 → 卯
] as const;

// ---------------------------------------------------------------- 合沖刑害破

export const STEM_COMBINATIONS: readonly { pair: readonly [StemIndex, StemIndex]; element: Element }[] = [
  { pair: [0, 5], element: 'earth' }, // 甲己合土
  { pair: [1, 6], element: 'metal' }, // 乙庚合金
  { pair: [2, 7], element: 'water' }, // 丙辛合水
  { pair: [3, 8], element: 'wood'  }, // 丁壬合木
  { pair: [4, 9], element: 'fire'  }, // 戊癸合火
] as const;

export const BRANCH_SIX_COMBOS: readonly { pair: readonly [BranchIndex, BranchIndex]; element: Element }[] = [
  { pair: [0, 1],  element: 'earth' }, // 子丑
  { pair: [2, 11], element: 'wood'  }, // 寅亥
  { pair: [3, 10], element: 'fire'  }, // 卯戌
  { pair: [4, 9],  element: 'metal' }, // 辰酉
  { pair: [5, 8],  element: 'water' }, // 巳申
  { pair: [6, 7],  element: 'earth' }, // 午未
] as const;

/** 六沖 — opposing branches, six positions apart. */
export const BRANCH_CLASHES: readonly (readonly [BranchIndex, BranchIndex])[] = [
  [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11],
] as const;

export const BRANCH_TRINES: readonly { set: readonly [BranchIndex, BranchIndex, BranchIndex]; element: Element }[] = [
  { set: [8, 0, 4],  element: 'water' }, // 申子辰
  { set: [11, 3, 7], element: 'wood'  }, // 亥卯未
  { set: [2, 6, 10], element: 'fire'  }, // 寅午戌
  { set: [5, 9, 1],  element: 'metal' }, // 巳酉丑
] as const;

/**
 * 半合 — two of a trine's three branches, and only when the cardinal branch
 * (子午卯酉, the 帝旺 of that element) is one of them. The two outer branches
 * on their own are 拱合, which most schools do not count as a combination.
 */
export const BRANCH_HALF_TRINES: readonly { pair: readonly [BranchIndex, BranchIndex]; element: Element }[] = [
  { pair: [8, 0],  element: 'water' }, // 申子
  { pair: [0, 4],  element: 'water' }, // 子辰
  { pair: [11, 3], element: 'wood'  }, // 亥卯
  { pair: [3, 7],  element: 'wood'  }, // 卯未
  { pair: [2, 6],  element: 'fire'  }, // 寅午
  { pair: [6, 10], element: 'fire'  }, // 午戌
  { pair: [5, 9],  element: 'metal' }, // 巳酉
  { pair: [9, 1],  element: 'metal' }, // 酉丑
] as const;

export const BRANCH_DIRECTIONALS: readonly { set: readonly [BranchIndex, BranchIndex, BranchIndex]; element: Element }[] = [
  { set: [2, 3, 4],   element: 'wood'  }, // 寅卯辰 — east
  { set: [5, 6, 7],   element: 'fire'  }, // 巳午未 — south
  { set: [8, 9, 10],  element: 'metal' }, // 申酉戌 — west
  { set: [11, 0, 1],  element: 'water' }, // 亥子丑 — north
] as const;

export const BRANCH_HARMS: readonly (readonly [BranchIndex, BranchIndex])[] = [
  [0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10],
] as const;

export const BRANCH_DESTRUCTIONS: readonly (readonly [BranchIndex, BranchIndex])[] = [
  [0, 9], [3, 6], [1, 4], [7, 10], [2, 11], [5, 8],
] as const;

/** 三刑 groups plus 自刑 (self-punishment) pairs. */
export const BRANCH_PUNISHMENTS: readonly (readonly BranchIndex[])[] = [
  [2, 5, 8],  // 寅巳申 — 無恩之刑
  [1, 10, 7], // 丑戌未 — 恃勢之刑
  [0, 3],     // 子卯   — 無禮之刑
  [4, 4], [6, 6], [9, 9], [11, 11], // 自刑
] as const;
