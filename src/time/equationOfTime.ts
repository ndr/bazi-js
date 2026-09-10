/**
 * Equation of time — the offset between apparent (sundial) solar time and mean
 * solar time. Meeus, *Astronomical Algorithms*, 2nd ed., eq. 28.3.
 * Accurate to roughly 0.01 minutes over 1900–2100.
 */

const DEG = Math.PI / 180;

/** Julian Ephemeris Day for a UTC instant (ΔT is ignored; it is well under a minute here). */
export function julianDay(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5;
}

/** Equation of time in minutes. Positive means the true Sun runs ahead of the mean Sun. */
export function equationOfTimeMinutes(date: Date): number {
  const T = (julianDay(date) - 2_451_545) / 36_525;

  // Geometric mean longitude and mean anomaly of the Sun.
  const L0 = 280.46646 + 36_000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35_999.05029 * T - 0.0001537 * T * T;
  // Eccentricity of Earth's orbit.
  const e = 0.016_708_634 - 0.000_042_037 * T - 0.000_000_126_7 * T * T;
  // Mean obliquity of the ecliptic, in degrees.
  const eps =
    23 + (26 + (21.448 - 46.815 * T - 0.00059 * T * T + 0.001813 * T * T * T) / 60) / 60;

  const y = Math.tan((eps / 2) * DEG) ** 2;
  const L0r = L0 * DEG;
  const Mr = M * DEG;

  const eRad =
    y * Math.sin(2 * L0r) -
    2 * e * Math.sin(Mr) +
    4 * e * y * Math.sin(Mr) * Math.cos(2 * L0r) -
    0.5 * y * y * Math.sin(4 * L0r) -
    1.25 * e * e * Math.sin(2 * Mr);

  return (eRad / DEG) * 4;
}

/** Julian Day Number (integer) of a proleptic Gregorian calendar date. */
export function julianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32_045
  );
}
