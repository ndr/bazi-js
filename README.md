# bazi-js

A BaZi (八字 / Four Pillars of Destiny) calculation engine for TypeScript.

Give it a birth moment and a place; get back the chart. No UI, no network, no
localisation — the engine returns structural identifiers (`'directOfficer'`,
stem and branch indices) and leaves presentation to you.

```bash
npm install bazi-js
```

Not on npm yet — until it is, install straight from the repository:

```bash
npm install github:ndr/bazi-js
```

```ts
import { calculateChart } from 'bazi-js';

const chart = calculateChart({
  date: '1985-07-01',
  time: '12:00',
  timeZone: 'Europe/Kyiv',
  longitude: 30.52,
  gender: 'female',
});

chart.pillars.day;        // { stem, branch, hiddenStems, stemGod, naYin, … }
chart.resolved.trueSolarTime;  // '1985-07-01T09:58:19'
```

## Why this one

Two things are routinely got wrong, and both change the answer.

**Month boundaries are astronomical.** The month pillar turns over at the
instant the Sun's apparent ecliptic longitude crosses a multiple of 15°, not on
a fixed calendar date. The year turns at 立春, not at Chinese New Year. This
package uses [astronomy-engine](https://github.com/cosinekitty/astronomy) (full
VSOP87) rather than a lookup table.

**Historical timezones are not the current offset.** Using today's zone offset
for a 1985 birth in Kyiv is two hours wrong. That example: the clock said
12:00, the zone was UTC+4 (Soviet decree time plus DST), and true solar time was
**09:58** — which puts the hour pillar in 巳, not 午.

## Conventions the schools disagree on

Every one of these is an explicit option, and the value used is returned on the
chart, so a result is always reproducible and always self-describing.

| Option | Values | Default |
|---|---|---|
| `solarTime` | `'off'` \| `'longitude'` \| `'longitude+eot'` | `'longitude+eot'` |
| `dayBoundary` | `'23:00'` (早子時) \| `'00:00'` (晚子時) | `'00:00'` |
| `luckStartMethod` | `'exact'` (流派2) \| `'rounded'` (流派1) | `'exact'` |

`luckStartMethod` can differ by a whole year: a birth on 1986-07-28 17:20 starts
its luck cycles at 6 under `'exact'` and at 7 under `'rounded'`.

## What it computes

Four pillars · hidden stems (藏干) · Ten Gods (十神) · NaYin (納音) · the twelve
life-cycle stages (十二長生) · void branches (空亡) · Five Element balance ·
ten-year luck pillars (大運) · interactions (合 沖 刑 害 破, including 半合).

## Validation

Differential testing against [lunar-typescript](https://github.com/6tail/lunar-typescript),
an independent implementation derived from Chinese almanac sources.

| Check | Scope | Result |
|---|---|---|
| Four pillars | 3000+ samples, 1900–2100 | no disagreement |
| Day pillar | every day of six full years | no disagreement |
| Day boundary, both conventions | 408 samples around the 子 hour | no disagreement |
| Luck pillars, both schools × both genders | 440 samples | no disagreement |
| Solar term instants | 3618 terms, 1900–2100 | median 10 s, p99 43 s, max 62 s |

The solar-term spread is methodological, not an error: full VSOP87 against a
truncated series. Samples falling within ±2 minutes of a term are excluded from
the pillar comparison and covered by a separate boundary test.

`DAY_CYCLE_OFFSET = 49` — the offset of the continuous sixty-day cycle against
the Julian Day Number. Calibrated and pinned by tests; the memorable anchor is
1949-10-01 = 甲子.

## Known limitation

tzdb 2022b merged `Europe/Uzhgorod` and `Europe/Zaporozhye` into `Europe/Kyiv`,
and their separate histories now live only in the `backzone` file, which
browsers and Node do not ship. For births in Zakarpattia before 1945 this is
**two hours wrong** — the region was on UTC+1 under Czechoslovakia and Hungary.
Pass `Europe/Prague` or `Europe/Budapest` explicitly until this is addressed.

## Range

Validated for 1900–2100. Outside that range the chart still computes and carries
an `outOfValidatedRange` warning.

## License

MIT
