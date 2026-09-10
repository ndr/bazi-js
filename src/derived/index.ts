import type { Element, LifeStage, StemIndex, BranchIndex, TenGod } from '../types.js';
import {
  STEMS, BRANCHES, LIFE_STAGES, LIFE_STAGE_ORIGIN, generates, controls,
} from '../constants/index.js';

/**
 * Ten God (十神) of `other` as seen from the Day Master.
 * Determined by the element relation plus whether the polarities match.
 */
export function tenGod(dayMaster: StemIndex, other: StemIndex): TenGod {
  const dm = STEMS[dayMaster]!;
  const o = STEMS[other]!;
  const same = dm.polarity === o.polarity;

  if (dm.element === o.element) return same ? 'friend' : 'robWealth';
  if (generates(dm.element, o.element)) return same ? 'eatingGod' : 'hurtingOfficer';
  if (controls(dm.element, o.element)) return same ? 'indirectWealth' : 'directWealth';
  if (controls(o.element, dm.element)) return same ? 'sevenKillings' : 'directOfficer';
  return same ? 'indirectResource' : 'directResource';
}

/**
 * 十二長生 — the stage of the Day Master's life cycle in a branch.
 * Yang stems advance through the branches, yin stems retreat.
 */
export function lifeStage(stem: StemIndex, branch: BranchIndex): LifeStage {
  const origin = LIFE_STAGE_ORIGIN[stem]!;
  const forward = STEMS[stem]!.polarity === 'yang';
  const delta = forward ? branch - origin : origin - branch;
  return LIFE_STAGES[((delta % 12) + 12) % 12]!;
}

/** 納音 index 0…29 for a sexagenary index. */
export const naYinIndex = (sexagenary: number): number => Math.floor(sexagenary / 2);

// ------------------------------------------------------------ element balance

export interface WeightedSource {
  element: Element;
  weight: number;
}

/** Position weights for the 'weighted-v1' method. The month rules the season. */
const STEM_WEIGHT = { year: 0.8, month: 1.0, day: 1.0, hour: 0.8 } as const;
const BRANCH_WEIGHT = { year: 0.8, month: 1.8, day: 1.0, hour: 0.8 } as const;

export type Slot = 'year' | 'month' | 'day' | 'hour';

/** Collects every element contribution in the chart, hidden stems included. */
export function collectSources(
  pillars: { slot: Slot; stem: StemIndex; branch: BranchIndex }[],
  includeDayStem: boolean,
): WeightedSource[] {
  const out: WeightedSource[] = [];
  for (const p of pillars) {
    if (p.slot !== 'day' || includeDayStem) {
      out.push({ element: STEMS[p.stem]!.element, weight: STEM_WEIGHT[p.slot] });
    }
    const b = BRANCHES[p.branch]!;
    b.hidden.forEach((h, i) => {
      out.push({
        element: STEMS[h]!.element,
        weight: BRANCH_WEIGHT[p.slot] * b.hiddenWeights[i]!,
      });
    });
  }
  return out;
}

const zero = (): Record<Element, number> => ({ wood: 0, fire: 0, earth: 0, metal: 0, water: 0 });

export function elementBalance(
  pillars: { slot: Slot; stem: StemIndex; branch: BranchIndex }[],
  dayMaster: StemIndex,
): {
  raw: Record<Element, number>;
  weighted: Record<Element, number>;
  score: number;
  strength: 'strong' | 'weak' | 'balanced';
  method: string;
} {
  const raw = zero();
  for (const p of pillars) {
    raw[STEMS[p.stem]!.element] += 1;
    raw[BRANCHES[p.branch]!.element] += 1;
  }

  const weighted = zero();
  // The Day Master itself is the subject, not a supporter — it is excluded from
  // the strength tally but still counted in the visible element mix.
  for (const s of collectSources(pillars, false)) weighted[s.element] += s.weight;

  const dmElement = STEMS[dayMaster]!.element;
  let support = 0;
  let drain = 0;
  for (const [el, w] of Object.entries(weighted) as [Element, number][]) {
    if (el === dmElement || generates(el, dmElement)) support += w;
    else drain += w;
  }

  const total = support + drain;
  const score = total === 0 ? 0 : (support - drain) / total;
  const strength = score > 0.15 ? 'strong' : score < -0.15 ? 'weak' : 'balanced';

  // Round to keep snapshots stable across platforms.
  for (const k of Object.keys(weighted) as Element[]) {
    weighted[k] = Math.round(weighted[k] * 1000) / 1000;
  }

  return { raw, weighted, score: Math.round(score * 1000) / 1000, strength, method: 'weighted-v1' };
}
