import { describe, it, expect } from 'vitest';
import { Solar } from 'lunar-typescript';
import { solarTermsOfYear, baziYearOf, currentMonthTerm, SOLAR_TERMS } from '../src/index.js';

describe('solar term table', () => {
  it('yields 24 terms per year, strictly increasing', () => {
    for (const year of [1900, 1950, 2000, 2026, 2100]) {
      const terms = solarTermsOfYear(year);
      expect(terms).toHaveLength(24);
      for (let i = 1; i < terms.length; i++) {
        expect(Date.parse(terms[i]!.utc)).toBeGreaterThan(Date.parse(terms[i - 1]!.utc));
      }
      expect(terms.every((t) => new Date(t.utc).getUTCFullYear() === year)).toBe(true);
    }
  });

  it('places 立春 in early February and 冬至 in late December', () => {
    for (const year of [1901, 1975, 2026, 2099]) {
      const lichun = solarTermsOfYear(year).find((t) => t.index === 0)!;
      const d = new Date(lichun.utc);
      expect(d.getUTCMonth() + 1).toBe(2);
      expect(d.getUTCDate()).toBeGreaterThanOrEqual(3);
      expect(d.getUTCDate()).toBeLessThanOrEqual(5);

      const dongzhi = solarTermsOfYear(year).find((t) => t.index === 21)!;
      const dz = new Date(dongzhi.utc);
      expect(dz.getUTCMonth() + 1).toBe(12);
      expect(dz.getUTCDate()).toBeGreaterThanOrEqual(20);
      expect(dz.getUTCDate()).toBeLessThanOrEqual(23);
    }
  });

  it('marks exactly 12 month-opening 節', () => {
    expect(SOLAR_TERMS.filter((t) => t.startsMonth)).toHaveLength(12);
    expect(solarTermsOfYear(2026).filter((t) => t.startsMonth)).toHaveLength(12);
  });

  it('spaces consecutive terms 14–16 days apart', () => {
    const terms = solarTermsOfYear(2026);
    for (let i = 1; i < terms.length; i++) {
      const days = (Date.parse(terms[i]!.utc) - Date.parse(terms[i - 1]!.utc)) / 86_400_000;
      expect(days).toBeGreaterThan(14);
      expect(days).toBeLessThan(16.5);
    }
  });
});

describe('solar term accuracy', () => {
  /**
   * Cross-check against lunar-typescript, an independent implementation using a
   * truncated series rather than full VSOP87. The two legitimately disagree by
   * seconds; anything beyond a minute would mean one of them is wrong.
   */
  it('stays within 90 s of an independent implementation across 1900–2100', () => {
    let worst = 0;
    let worstLabel = '';
    let count = 0;

    for (let y = 1900; y <= 2100; y += 1) {
      const table = Solar.fromYmd(y, 6, 1).getLunar().getJieQiTable();
      for (const t of solarTermsOfYear(y)) {
        const ref = table[SOLAR_TERMS[t.index]!.char];
        if (!ref) continue;
        const refMs =
          Date.UTC(ref.getYear(), ref.getMonth() - 1, ref.getDay(),
                   ref.getHour(), ref.getMinute(), ref.getSecond()) - 8 * 3_600_000;
        const delta = Math.abs(Date.parse(t.utc) - refMs);
        if (delta > 200 * 86_400_000) continue; // table covers a moving window
        count++;
        if (delta > worst) { worst = delta; worstLabel = `${y} ${SOLAR_TERMS[t.index]!.char}`; }
      }
    }

    expect(count).toBeGreaterThan(3000);
    expect(worst / 1000, `worst divergence at ${worstLabel}`).toBeLessThan(90);
  });
});

describe('BaZi year boundary', () => {
  it('turns over at 立春, not at the Gregorian or lunar new year', () => {
    const lichun2026 = new Date(solarTermsOfYear(2026).find((t) => t.index === 0)!.utc);
    expect(baziYearOf(new Date(lichun2026.getTime() - 60_000))).toBe(2025);
    expect(baziYearOf(new Date(lichun2026.getTime() + 60_000))).toBe(2026);
    // Mid-January belongs to the previous BaZi year.
    expect(baziYearOf(new Date(Date.UTC(2026, 0, 20)))).toBe(2025);
  });
});

describe('month term lookup', () => {
  it('returns a 節, never a 氣', () => {
    for (const iso of ['1950-03-15', '1999-07-04', '2026-11-30', '2077-01-09']) {
      expect(currentMonthTerm(new Date(`${iso}T06:00:00Z`)).startsMonth).toBe(true);
    }
  });
});
