import { describe, it, expect } from 'vitest';
import {
  yearPillar, monthPillar, dayPillar, hourPillar, sexagenaryIndex, voidBranches,
  tenGod, lifeStage, naYinIndex, julianDayNumber,
  STEMS, BRANCHES, NAYIN, monthBranchForTerm, generates, controls,
} from '../src/index.js';

const S = (c: string) => STEMS.findIndex((s) => s.char === c);
const B = (c: string) => BRANCHES.findIndex((b) => b.char === c);
const gz = (p: { stem: number; branch: number }) => `${STEMS[p.stem]!.char}${BRANCHES[p.branch]!.char}`;

describe('element cycles', () => {
  it('generates in the canonical order', () => {
    expect(generates('wood', 'fire')).toBe(true);
    expect(generates('water', 'wood')).toBe(true);
    expect(generates('fire', 'metal')).toBe(false);
  });
  it('controls in the canonical order', () => {
    expect(controls('wood', 'earth')).toBe(true);
    expect(controls('metal', 'wood')).toBe(true);
    expect(controls('earth', 'metal')).toBe(false);
  });
});

describe('year pillar', () => {
  // 1984 opened a new 60-year cycle at 甲子.
  it.each([
    [1984, '甲子'], [1985, '乙丑'], [2000, '庚辰'],
    [2024, '甲辰'], [1900, '庚子'], [2044, '甲子'],
  ])('%i → %s', (year, expected) => {
    expect(gz(yearPillar(year))).toBe(expected);
  });
});

describe('month pillar — 五虎遁', () => {
  // The 寅 month of each year stem, i.e. the month opened by 立春 (term 0).
  it.each([
    ['甲', '丙寅'], ['乙', '戊寅'], ['丙', '庚寅'], ['丁', '壬寅'], ['戊', '甲寅'],
    ['己', '丙寅'], ['庚', '戊寅'], ['辛', '庚寅'], ['壬', '壬寅'], ['癸', '甲寅'],
  ])('%s year → %s', (yearStem, expected) => {
    expect(gz(monthPillar(S(yearStem), 0))).toBe(expected);
  });

  it('walks the twelve months of a 甲 year in sexagenary order', () => {
    const months = Array.from({ length: 12 }, (_, i) => gz(monthPillar(S('甲'), i * 2)));
    expect(months).toEqual([
      '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未',
      '壬申', '癸酉', '甲戌', '乙亥', '丙子', '丁丑',
    ]);
  });

  it('maps 節 index to the right month branch', () => {
    expect(monthBranchForTerm(0)).toBe(B('寅'));   // 立春
    expect(monthBranchForTerm(20)).toBe(B('子'));  // 大雪
    expect(monthBranchForTerm(22)).toBe(B('丑'));  // 小寒
  });
});

describe('hour pillar — 五鼠遁', () => {
  it.each([
    ['甲', '甲子'], ['乙', '丙子'], ['丙', '戊子'], ['丁', '庚子'], ['戊', '壬子'],
    ['己', '甲子'], ['庚', '丙子'], ['辛', '戊子'], ['壬', '庚子'], ['癸', '壬子'],
  ])('%s day, 子 hour → %s', (dayStem, expected) => {
    expect(gz(hourPillar(S(dayStem), 0))).toBe(expected);
  });

  it('walks the twelve hours of a 甲 day', () => {
    const hours = Array.from({ length: 12 }, (_, i) => gz(hourPillar(S('甲'), i)));
    expect(hours).toEqual([
      '甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳',
      '庚午', '辛未', '壬申', '癸酉', '甲戌', '乙亥',
    ]);
  });
});

describe('day pillar', () => {
  it('anchors on 1949-10-01 = 甲子', () => {
    expect(gz(dayPillar(julianDayNumber(1949, 10, 1)))).toBe('甲子');
  });
  it('advances one step per day', () => {
    const base = julianDayNumber(1949, 10, 1);
    expect(gz(dayPillar(base + 1))).toBe('乙丑');
    expect(gz(dayPillar(base + 59))).toBe('癸亥');
    expect(gz(dayPillar(base + 60))).toBe('甲子');
  });
});

describe('sexagenary index', () => {
  it('is a bijection onto 0…59', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 60; i++) seen.add(sexagenaryIndex(i % 10, i % 12));
    expect(seen.size).toBe(60);
  });
  it('rejects impossible pairs', () => {
    expect(() => sexagenaryIndex(S('甲'), B('丑'))).toThrow();
  });
});

describe('空亡', () => {
  it.each([
    ['甲', '子', ['戌', '亥']],
    ['甲', '戌', ['申', '酉']],
    ['丙', '寅', ['戌', '亥']],
    ['甲', '午', ['辰', '巳']],
  ])('%s%s → %s', (stem, branch, expected) => {
    const voids = voidBranches(S(stem), B(branch)).map((v) => BRANCHES[v]!.char);
    expect(voids.sort()).toEqual([...expected].sort());
  });
});

describe('十神', () => {
  it('reads 甲 as Day Master', () => {
    expect(tenGod(S('甲'), S('甲'))).toBe('friend');
    expect(tenGod(S('甲'), S('乙'))).toBe('robWealth');
    expect(tenGod(S('甲'), S('丙'))).toBe('eatingGod');
    expect(tenGod(S('甲'), S('丁'))).toBe('hurtingOfficer');
    expect(tenGod(S('甲'), S('戊'))).toBe('indirectWealth');
    expect(tenGod(S('甲'), S('己'))).toBe('directWealth');
    expect(tenGod(S('甲'), S('庚'))).toBe('sevenKillings');
    expect(tenGod(S('甲'), S('辛'))).toBe('directOfficer');
    expect(tenGod(S('甲'), S('壬'))).toBe('indirectResource');
    expect(tenGod(S('甲'), S('癸'))).toBe('directResource');
  });
  it('covers all ten gods for every Day Master', () => {
    for (let dm = 0; dm < 10; dm++) {
      const gods = new Set(Array.from({ length: 10 }, (_, o) => tenGod(dm, o)));
      expect(gods.size).toBe(10);
    }
  });
});

describe('十二長生', () => {
  it('places yang stems forward from their origin', () => {
    expect(lifeStage(S('甲'), B('亥'))).toBe('birth');    // 甲木長生在亥
    expect(lifeStage(S('甲'), B('卯'))).toBe('emperor');  // 帝旺在卯
    expect(lifeStage(S('丙'), B('寅'))).toBe('birth');
    expect(lifeStage(S('庚'), B('巳'))).toBe('birth');
    expect(lifeStage(S('壬'), B('申'))).toBe('birth');
  });
  it('places yin stems backward from their origin', () => {
    expect(lifeStage(S('乙'), B('午'))).toBe('birth');    // 乙木長生在午
    expect(lifeStage(S('乙'), B('寅'))).toBe('emperor');  // 帝旺在寅
    expect(lifeStage(S('丁'), B('酉'))).toBe('birth');
    expect(lifeStage(S('辛'), B('子'))).toBe('birth');
    expect(lifeStage(S('癸'), B('卯'))).toBe('birth');
  });
});

describe('納音', () => {
  it('has 30 entries covering 60 pairs', () => {
    expect(NAYIN).toHaveLength(30);
  });
  it.each([
    ['甲', '子', '海中金'], ['乙', '丑', '海中金'],
    ['丙', '寅', '爐中火'], ['壬', '戌', '大海水'], ['癸', '亥', '大海水'],
  ])('%s%s → %s', (stem, branch, expected) => {
    expect(NAYIN[naYinIndex(sexagenaryIndex(S(stem), B(branch)))]!.char).toBe(expected);
  });
});

describe('藏干', () => {
  it('gives every branch a principal stem of a compatible element', () => {
    for (const b of BRANCHES) {
      expect(b.hidden.length).toBeGreaterThan(0);
      const sum = b.hiddenWeights.reduce((a, c) => a + c, 0);
      expect(sum).toBeCloseTo(1, 6);
      expect(b.hidden.length).toBe(b.hiddenWeights.length);
    }
  });
  it('matches the classical table', () => {
    const chars = (c: string) => BRANCHES[B(c)]!.hidden.map((h) => STEMS[h]!.char).join('');
    expect(chars('子')).toBe('癸');
    expect(chars('丑')).toBe('己癸辛');
    expect(chars('寅')).toBe('甲丙戊');
    expect(chars('亥')).toBe('壬甲');
    expect(chars('戌')).toBe('戊辛丁');
  });
});
