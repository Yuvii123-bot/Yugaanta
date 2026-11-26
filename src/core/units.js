/**
 * Yugaanta — core/units.js
 * ---------------------------------------------------------------------------
 * Unit conversions and human-readable formatting for the enormous dynamic
 * range of a universe simulation: times from 1e-43 s to 1e100 yr, distances
 * from metres to 46 billion light-years, masses from electrons to 1e11 M☉.
 * ---------------------------------------------------------------------------
 */

import { C } from "./constants.js";

export const Mpc = C.pc * 1e6;
export const kpc = C.pc * 1e3;
export const Gly = C.ly * 1e9;
export const Mly = C.ly * 1e6;

/** Seconds in a Julian year (365.25 d). */
export const YR = C.year;
/** 1 Gyr in seconds. */
export const GYR = 1e9 * YR;
/** 1 Myr in seconds. */
export const MYR = 1e6 * YR;
/** 1 kyr in seconds. */
export const KYR = 1e3 * YR;

export const M_SUN = C.M_sun;
export const R_SUN = C.R_sun;
export const L_SUN = C.L_sun;

/**
 * Format a time given in seconds across 143 orders of magnitude.
 * Below 1 s → SI prefixes; up to 1e15 yr → named units; beyond → 10^n yr.
 */
export function formatTime(tSec) {
  if (!isFinite(tSec)) return "∞";
  const sgn = tSec < 0 ? "-" : "";
  tSec = Math.abs(tSec);
  if (tSec === 0) return "0 s";
  if (tSec < 1) {
    return sgn + sci(tSec) + " s";
  }
  if (tSec < 120) return sgn + trim(tSec) + " s";
  if (tSec < 7200) return sgn + trim(tSec / 60) + " min";
  if (tSec < 172800) return sgn + trim(tSec / 3600) + " h";
  if (tSec < 400 * 86400) return sgn + trim(tSec / 86400) + " d";
  const yr = tSec / YR;
  if (yr < 1e3) return sgn + trim(yr) + " yr";
  if (yr < 1e6) return sgn + trim(yr / 1e3) + " kyr";
  if (yr < 1e9) return sgn + trim(yr / 1e6) + " Myr";
  if (yr < 1e12) return sgn + trim(yr / 1e9) + " Gyr";
  if (yr < 1e15) return sgn + trim(yr / 1e12) + " Tyr";
  // Beyond a quadrillion years: pure log notation 10^n yr
  const n = Math.floor(Math.log10(yr));
  const mant = yr / 10 ** n;
  return `${sgn}${mant.toFixed(1)}×10^${n} yr`;
}

/** Format a length given in metres. */
export function formatDist(m) {
  if (!isFinite(m)) return "∞";
  if (m <= 0) return "0 m";
  if (m < 1e-2) return sci(m) + " m";
  if (m < 1000) return trim(m) + " m";
  if (m < 0.05 * C.AU) return trim(m / 1e3) + " km";
  if (m < 0.3 * C.ly) return trim(m / C.AU) + " AU";
  if (m < 0.3 * C.pc) return trim(m / C.ly) + " ly";
  if (m < 1e3 * C.pc) return trim(m / C.pc) + " pc";
  if (m < 1e6 * C.pc) return trim(m / (C.pc * 1e3)) + " kpc";
  if (m < 1e9 * C.pc) return trim(m / (C.pc * 1e6)) + " Mpc";
  if (m < 0.2 * C.ly * 1e9) return trim(m / (C.pc * 1e6)) + " Mpc";
  return trim(m / (C.ly * 1e9)) + " Gly";
}

/** Format a mass in kg with solar/earth/planch units when sensible. */
export function formatMass(kg) {
  if (!isFinite(kg)) return "∞";
  if (kg < 1e-25) return sci(kg) + " kg";
  if (kg < 1e15) return sci(kg) + " kg";
  if (kg < 0.01 * C.M_earth) return trim(kg / 5.972e24, 3) + " M⊕";
  if (kg < 0.02 * C.M_sun) return trim(kg / C.M_earth) + " M⊕";
  if (kg < 1e5 * C.M_sun) return trim(kg / C.M_sun) + " M☉";
  return trim(kg / C.M_sun) + " M☉";
}

/** Format a plain number with SI-ish judgement. */
export function formatNum(x, unit = "") {
  if (x === null || x === undefined || !isFinite(x)) return "—";
  if (x !== 0 && (Math.abs(x) < 1e-3 || Math.abs(x) >= 1e5)) return sci(x) + (unit ? " " + unit : "");
  return trim(x, 4) + (unit ? " " + unit : "");
}

/** Compact scientific notation with real superscripts. */
export function sci(x, digits = 3) {
  if (x === 0) return "0";
  const e = Math.floor(Math.log10(Math.abs(x)));
  const mant = x / 10 ** e;
  const sup = String(e).split("").map(ch => "⁻⁰¹²³⁴⁵⁶⁷⁸⁹"["-0123456789".indexOf(ch)] ?? ch).join("");
  if (mant >= 9.9995) return "10" + sup;
  return mant.toFixed(digits) + "×10" + sup;
}

/** Trim a float to `sig` significant digits for display. */
export function trim(x, sig = 3) {
  if (!isFinite(x)) return "∞";
  if (x === 0) return "0";
  const digits = Math.max(0, sig - 1 - Math.floor(Math.log10(Math.abs(x))));
  let s = x.toFixed(Math.min(12, digits));
  if (parseFloat(s) === 0) s = x.toExponential(sig - 1);
  return s.replace(/\.?0+$/, "").replace(/\.?0+e/, "e");
}

/** Logarithm helpers safe for 0/negatives. */
export const safeLog10 = (x) => Math.log10(Math.max(x, Number.MIN_VALUE));

/**
 * Speed presets. The user's headline request is 10,000× real time; beyond
 * that we need genuinely cosmic speeds: at 10^17× the entire 13.8 Gyr
 * history plays in ~4.4 seconds of wall-clock time.
 */
export const SPEED_PRESETS = [
  { mult: 1, label: "1×", note: "real time" },
  { mult: 60, label: "60×", note: "1 min → 1 s" },
  { mult: 1000, label: "1,000×", note: "1 h → 3.6 s" },
  { mult: 10000, label: "10,000×", note: "1 yr ≈ 53 min" },
  { mult: 1e6, label: "1M×", note: "1 yr ≈ 32 s" },
  { mult: 1e9, label: "1G×", note: "1 kyr ≈ 32 s" },
  { mult: 1e12, label: "1T×", note: "1 Myr ≈ 32 s" },
  { mult: 1e15, label: "10³·G×", note: "1 Gyr ≈ 32 s" },
  { mult: 1e17, label: "10⁵·G×", note: "full history ≈ 4.4 s" },
];

/** Human string for an arbitrary time multiplier. */
export function formatSpeed(m) {
  if (m < 1) return trim(m, 3) + "×";
  if (m < 1000) return trim(m, 4) + "×";
  if (m < 1e6) return trim(m / 1e3) + "k×";
  if (m < 1e9) return trim(m / 1e6) + "M×";
  if (m < 1e12) return trim(m / 1e9) + "G×";
  if (m < 1e15) return trim(m / 1e12) + "T×";
  return sci(m, 3) + "×";
}
