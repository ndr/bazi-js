import {
  calculateChart, STEMS, BRANCHES, NAYIN, LIFE_STAGE_CHARS, LIFE_STAGES, SOLAR_TERMS,
} from '../src/index.js';
import type { BaziChart, Pillar } from '../src/index.js';

const GOD_CHARS: Record<string, string> = {
  friend: '比肩', robWealth: '劫財', eatingGod: '食神', hurtingOfficer: '傷官',
  indirectWealth: '偏財', directWealth: '正財', sevenKillings: '七殺',
  directOfficer: '正官', indirectResource: '偏印', directResource: '正印',
};

function render(c: BaziChart): string {
  const cols: [string, Pillar | null][] = [
    ['Рік', c.pillars.year], ['Місяць', c.pillars.month],
    ['День', c.pillars.day], ['Година', c.pillars.hour],
  ];
  const cell = (s: string, w = 14) => s + ' '.repeat(Math.max(0, w - [...s].reduce((n, ch) => n + (/[㐀-鿿]/.test(ch) ? 2 : 1), 0)));

  const rows = [
    ['', ...cols.map(([h]) => cell(h))],
    ['Стовбур   ', ...cols.map(([, p]) => cell(p ? `${STEMS[p.stem]!.char} ${STEMS[p.stem]!.pinyin}` : '—'))],
    ['Гілка     ', ...cols.map(([, p]) => cell(p ? `${BRANCHES[p.branch]!.char} ${BRANCHES[p.branch]!.pinyin}` : '—'))],
    ['Бог       ', ...cols.map(([, p]) => cell(p ? (p.stemGod ? GOD_CHARS[p.stemGod]! : '日主') : '—'))],
    ['Приховані ', ...cols.map(([, p]) => cell(p ? p.hiddenStems.map((h) => STEMS[h]!.char).join('') : '—'))],
    ['納音      ', ...cols.map(([, p]) => cell(p ? NAYIN[p.naYin]!.char : '—'))],
    ['長生      ', ...cols.map(([, p]) => cell(p ? LIFE_STAGE_CHARS[LIFE_STAGES.indexOf(p.lifeStage)]! : '—'))],
    ['空亡      ', ...cols.map(([, p]) => cell(p ? (p.isVoid ? 'так' : '') : '—'))],
  ];
  return rows.map((r) => r.join(' ')).join('\n');
}

const input = {
  date: '1985-07-01', time: '12:00', timeZone: 'Europe/Kyiv', longitude: 30.52, gender: 'female' as const,
};
const c = calculateChart(input);

console.log(`\nНародження: ${input.date} ${input.time} ${input.timeZone} (${input.gender})`);
console.log(`Місцевий час:      ${c.resolved.local}  (зсув ${c.resolved.tzOffsetMinutes / 60} год)`);
console.log(`Істинний сонячний: ${c.resolved.trueSolarTime}  (довгота ${c.resolved.longitudeCorrectionMinutes} хв, EoT ${c.resolved.equationOfTimeMinutes} хв)`);
console.log(`Термін:            ${SOLAR_TERMS[c.resolved.prevTerm.index]!.char} ${c.resolved.prevTerm.utc} → ${SOLAR_TERMS[c.resolved.nextTerm.index]!.char}`);
console.log(`\n${render(c)}`);
console.log(`\nДень-господар: ${STEMS[c.dayMaster.stem]!.char} (${c.dayMaster.element}, ${c.dayMaster.polarity})`);
console.log(`Сила: ${c.elements.strength} (score ${c.elements.score}, ${c.elements.method})`);
console.log(`Елементи: ${Object.entries(c.elements.weighted).map(([k, v]) => `${k} ${v}`).join(', ')}`);
console.log(`Порожнеча: ${c.voidBranches.map((b) => BRANCHES[b]!.char).join('')}`);
console.log(`\nСтовпи удачі (${c.luck.direction}, старт ${c.luck.startAge.years}р ${c.luck.startAge.months}м, метод ${c.luck.startMethod}):`);
console.log('  ' + c.luck.pillars.slice(0, 6).map((p) => `${STEMS[p.stem]!.char}${BRANCHES[p.branch]!.char} ${p.startAge}–${p.startAge + 9}`).join('  '));
console.log(`\nВзаємодії: ${c.interactions.map((i) => `${i.kind}(${i.members.map((m) => i.kind.startsWith('stem') ? STEMS[m]!.char : BRANCHES[m]!.char).join('')})`).join(', ') || 'немає'}`);
console.log(`Попередження: ${c.warnings.join(', ') || 'немає'}\n`);
