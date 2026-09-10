import { Solar } from 'lunar-typescript';
import { calculateChart, STEMS, BRANCHES } from '../src/index.js';

const gz = (p: { stem: number; branch: number }) => `${STEMS[p.stem]!.char}${BRANCHES[p.branch]!.char}`;

let n = 0, bad = 0;
const samples: string[] = [];
const start = Date.UTC(1900, 0, 1), end = Date.UTC(2100, 11, 31);

for (let t = start; t <= end; t += 41 * 86400000) {
  const d = new Date(t);
  const [y, m, day] = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
  const h = (n * 7) % 22 + 1;         // 1..22, avoids the 23:00 boundary question
  const mi = (n * 13) % 60;

  const lunar = Solar.fromYmdHms(y, m, day, h, mi, 0).getLunar();
  const ref = {
    year: lunar.getYearInGanZhiExact(),
    month: lunar.getMonthInGanZhiExact(),
    day: lunar.getDayInGanZhi(),
    hour: lunar.getTimeInGanZhi(),
  };

  const c = calculateChart({
    date: `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`,
    time: `${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}`,
    timeZone: 'UTC+8', longitude: 121.5, gender: 'male',
    options: { solarTime: 'off', dayBoundary: '00:00' },
  });
  const mine = {
    year: gz(c.pillars.year), month: gz(c.pillars.month),
    day: gz(c.pillars.day), hour: gz(c.pillars.hour!),
  };

  n++;
  for (const k of ['year','month','day','hour'] as const) {
    if (mine[k] !== ref[k]) {
      bad++;
      if (samples.length < 15) {
        samples.push(`${y}-${m}-${day} ${h}:${mi}  ${k}: mine=${mine[k]} ref=${ref[k]}  (prev term ${c.resolved.prevTerm.utc})`);
      }
      break;
    }
  }
}
console.log(`samples: ${n}, charts with any mismatch: ${bad} (${(bad/n*100).toFixed(2)}%)`);
samples.forEach(s => console.log('  ' + s));
