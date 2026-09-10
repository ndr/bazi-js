import type { Interaction, PillarSlot, StemIndex, BranchIndex } from '../types.js';
import {
  STEM_COMBINATIONS, BRANCH_SIX_COMBOS, BRANCH_CLASHES, BRANCH_TRINES,
  BRANCH_HALF_TRINES, BRANCH_DIRECTIONALS, BRANCH_HARMS, BRANCH_DESTRUCTIONS,
  BRANCH_PUNISHMENTS,
} from '../constants/index.js';

export interface SlotPillar { slot: PillarSlot; stem: StemIndex; branch: BranchIndex }

/** Every unordered pair of slots, in canonical year→hour order. */
function pairs<T>(items: T[]): [T, T][] {
  const out: [T, T][] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) out.push([items[i]!, items[j]!]);
  }
  return out;
}

function matchesPair(a: number, b: number, pair: readonly [number, number]): boolean {
  return (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0]);
}

/** Detects 合 / 沖 / 刑 / 害 / 破 among the pillars present in the chart. */
export function findInteractions(pillars: SlotPillar[]): Interaction[] {
  const out: Interaction[] = [];

  for (const [p, q] of pairs(pillars)) {
    // 天干五合
    for (const c of STEM_COMBINATIONS) {
      if (matchesPair(p.stem, q.stem, c.pair)) {
        out.push({
          kind: 'stemCombination', slots: [p.slot, q.slot],
          members: [p.stem, q.stem], producedElement: c.element,
        });
      }
    }
    // 六合
    for (const c of BRANCH_SIX_COMBOS) {
      if (matchesPair(p.branch, q.branch, c.pair)) {
        out.push({
          kind: 'branchSixCombo', slots: [p.slot, q.slot],
          members: [p.branch, q.branch], producedElement: c.element,
        });
      }
    }
    // 六沖
    for (const c of BRANCH_CLASHES) {
      if (matchesPair(p.branch, q.branch, c)) {
        out.push({ kind: 'branchSixClash', slots: [p.slot, q.slot], members: [p.branch, q.branch] });
      }
    }
    // 六害
    for (const c of BRANCH_HARMS) {
      if (matchesPair(p.branch, q.branch, c)) {
        out.push({ kind: 'branchHarm', slots: [p.slot, q.slot], members: [p.branch, q.branch] });
      }
    }
    // 六破
    for (const c of BRANCH_DESTRUCTIONS) {
      if (matchesPair(p.branch, q.branch, c)) {
        out.push({ kind: 'branchDestruction', slots: [p.slot, q.slot], members: [p.branch, q.branch] });
      }
    }
  }

  // 刑 — three-branch groups and 自刑 pairs.
  for (const group of BRANCH_PUNISHMENTS) {
    if (group.length === 2 && group[0] === group[1]) {
      const holders = pillars.filter((p) => p.branch === group[0]);
      if (holders.length >= 2) {
        for (const [p, q] of pairs(holders)) {
          out.push({ kind: 'branchPunishment', slots: [p.slot, q.slot], members: [p.branch, q.branch] });
        }
      }
      continue;
    }
    const holders = group.map((b) => pillars.find((p) => p.branch === b));
    if (holders.every((h): h is SlotPillar => h !== undefined)) {
      out.push({
        kind: 'branchPunishment',
        slots: holders.map((h) => h.slot),
        members: holders.map((h) => h.branch),
      });
    }
  }

  // 半合 — reported only where the full 三合 is absent, so one relation is not
  // counted twice for the same branches.
  const fullTrineBranches = new Set<number>();
  for (const t of BRANCH_TRINES) {
    if (t.set.every((b) => pillars.some((p) => p.branch === b))) {
      for (const b of t.set) fullTrineBranches.add(b);
    }
  }
  for (const [p, q] of pairs(pillars)) {
    for (const h of BRANCH_HALF_TRINES) {
      if (!matchesPair(p.branch, q.branch, h.pair)) continue;
      if (fullTrineBranches.has(p.branch) && fullTrineBranches.has(q.branch)) continue;
      out.push({
        kind: 'branchHalfTrine', slots: [p.slot, q.slot],
        members: [p.branch, q.branch], producedElement: h.element,
      });
    }
  }

  // 三合 and 三會 — only counted when all three branches are present.
  for (const t of BRANCH_TRINES) {
    const holders = t.set.map((b) => pillars.find((p) => p.branch === b));
    if (holders.every((h): h is SlotPillar => h !== undefined)) {
      out.push({
        kind: 'branchTrine', slots: holders.map((h) => h.slot),
        members: holders.map((h) => h.branch), producedElement: t.element,
      });
    }
  }
  for (const d of BRANCH_DIRECTIONALS) {
    const holders = d.set.map((b) => pillars.find((p) => p.branch === b));
    if (holders.every((h): h is SlotPillar => h !== undefined)) {
      out.push({
        kind: 'branchDirectional', slots: holders.map((h) => h.slot),
        members: holders.map((h) => h.branch), producedElement: d.element,
      });
    }
  }

  return out;
}
