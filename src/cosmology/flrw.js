/**
 * Yugaanta — cosmology/flrw.js
 * ---------------------------------------------------------------------------
 * THE COSMOLOGICAL ENGINE.
 *
 * Solves the Friedmann equations of general relativity for a homogeneous &
 * isotropic universe (FLRW metric) with radiation, matter, curvature and
 * dark-energy components:
 *
 *     Friedmann I:   (ȧ/a)² = H0² [ Ωr a⁻⁴ + Ωm a⁻³ + Ωk a⁻² + Ωde a⁻³(1+w) ]
 *     Friedmann II:  ä/a    = −(H0²/2) [ Ωr a⁻⁴ + Ωm a⁻³ ] + H0² Ωde a⁻³(1+w)
 *     Fluid eq.:     ρ̇ + 3 (ȧ/a) (ρ + p/c²) = 0,  p = w ρ c²
 *
 * We integrate dt/d(ln a) = 1/(H0 E(a)) with RK4 from the end of inflation
 * (a ≈ 2e-26, reheating temperature ≈ 10^13 GeV) to the far future, building
 * lookup tables for a(t), t(a), the comoving particle horizon ∫c dt/a, the
 * sound horizon ∫c_s dt/a and the linear growth factor D(a).
 *
 * Numerical validation targets (checked in tests/cosmology.test.mjs):
 *   - age of universe a=1 → ≈ 13.79 Gyr (Planck 2018)
 *   - recombination t ≈ 380 kyr at a ≈ 9.16e-4 (z=1089)
 *   - comoving particle horizon today ≈ 3.2 c/H0 ≈ 46.3 Gly
 *   - sound horizon at drag epoch ≈ 147 Mpc (BAO ruler)
 * ---------------------------------------------------------------------------
 */

import { C, COSMO_DEFAULT } from "../core/constants.js";
import { rk4Step, LookupTable, simpson } from "../core/mathx.js";
import { YR, GYR, Mpc } from "../core/units.js";

/** Scale factor at reheating (T ≈ 1.0e13 GeV ≈ 1.16e29 K): a = T0/T. */
export const A_REHEAT = COSMO_DEFAULT.T0 / 1.16e29;   // ≈ 2.3e-29... calibrated below
/** The integration actually starts here (≈ 2e-26 → T ≈ 1.15e26 K). */
export const A_START = 2.0e-26;
/** Hot big bang (reheating) time offset added to the table clock. */
export const T_REHEAT = 1.0e-32;                      // s
/** Inflation Hubble scale (s^-1) for the pre-reheating epoch. */
export const H_INFLATION = 6.0e36;
/** e-folds of inflation displayed to the user. */
export const N_EFOLDS = 60;
/** Integration resolution: steps per e-fold of ln(a). */
export const DLNA = 4.0e-4;

/**
 * Build a complete cosmology calculator from a parameter set.
 * Everything downstream (epochs, particles, falsification lab) reads from
 * this object. Pure functions + typed tables → fast enough to rebuild in
 * ~100 ms whenever the Theory Lab changes a parameter.
 *
 * @param {Partial<typeof COSMO_DEFAULT>} userParams
 */
export function buildCosmology(userParams = {}) {
  const p = { ...COSMO_DEFAULT, ...userParams };
  // H0 [km/s/Mpc] → s^-1 : (km/s → m/s) / (Mpc → m); 1 Mpc = 1e6 pc
  const H0_SI = p.H0 * 1000 / (C.pc * 1e6);         // s^-1
  const rhoCrit = 3 * H0_SI * H0_SI / (8 * Math.PI * C.G);

  // ---- Radiation (photons + neutrinos) -----------------------------------
  const rhoGammaKg = C.aRad * p.T0 ** 4 / C.c ** 2;
  const nuGammaRatio = 0.22711 * p.Nnu;             // ρν/ργ
  const Or = rhoGammaKg * (1 + nuGammaRatio) / rhoCrit;

  // ---- Components ----------------------------------------------------------
  const Om = p.Om;
  const Ob = p.Ob;
  const Ocdm = Math.max(0, Om - Ob);
  const w = p.w;
  const wExp = -3 * (1 + w);   // a^(wExp) scaling of dark energy density
  // Ω consistency: if curvature is given, dark energy takes the remainder;
  // otherwise flatness assigns Ωde = 1 − Ωm − Ωr (and Ωk follows).
  const Ode = p.Ode !== undefined ? p.Ode : (p.Ok !== undefined ? 1 - Om - Or - p.Ok : 1 - Om - Or);
  const Ok = p.Ok !== undefined ? p.Ok : (1 - Om - Or - Ode);

  /** H0-independent E(a) = H(a)/H0 (dimensionless). */
  const E = (a) => {
    const a2 = a * a;
    return Math.sqrt(
      Or / (a2 * a2) +          // radiation  a^-4
      Om / (a2 * a) +           // matter     a^-3
      Ok / a2 +                 // curvature  a^-2
      Ode * Math.pow(a, wExp)   // dark energy a^{-3(1+w)}
    );
  };

  /** Deceleration parameter q(a) = −ä a/ȧ². */
  const q = (a) => {
    const a2 = a * a;
    const ar = Or / (a2 * a2), am = Om / (a2 * a);
    const al = Ode * Math.pow(a, wExp) * (1 + 3 * w);
    return 0.5 * (ar + am) - al;
  };

  // ---- Numerical integration ----------------------------------------------
  // Integrate t(ln a) from A_START upward. Grid uniform in ln a.
  const lnStart = Math.log(A_START);
  const lnEnd = Math.log(1.30);
  const nSteps = Math.max(2000, Math.ceil((lnEnd - lnStart) / DLNA));
  const dln = (lnEnd - lnStart) / nSteps;

  const lna = new Float64Array(nSteps + 1);
  const tTab = new Float64Array(nSteps + 1);       // cosmic seconds (table clock)
  const chiTab = new Float64Array(nSteps + 1);     // ∫ c dt/a  comoving horizon (m)
  const rsTab = new Float64Array(nSteps + 1);      // ∫ c_s dt/a sound horizon (m)
  const dTab = new Float64Array(nSteps + 1);       // growth factor (unnormalised)
  const aTab = new Float64Array(nSteps + 1);       // scale factor per node

  for (let i = 0; i <= nSteps; i++) lna[i] = lnStart + i * dln;

  // dt/dlna = 1/(H0 E);  dchi/dlna = (c/H0)/E;  drs/dlna = (c_s/c)(c/H0)/E... 
  // more precisely drs/dt = c_s/a → drs/dlna = c_s/H0E  (since dt/dlna=1/(H0E),
  // and a = e^{ln a} → dt/a = e^{-lna}/(H0E) dlna).
  const cOverH0 = C.c / H0_SI;
  const photonFrac = rhoGammaKg / rhoCrit;              // Ωγ
  const Rb = (a) => (3 * Ob) / (4 * Math.max(photonFrac, 1e-30)) * a;  // baryon-photon momentum ratio

  const derivs = (lnaNow, y, out) => {
    // NOTE: the independent variable is ln a (passed as first arg);
    // y = [t, χ, r_s] is the state being integrated.
    const a = Math.exp(lnaNow);
    const Ea = E(a);
    const inv = 1 / (H0_SI * Ea);
    out[0] = inv;                                   // dt/dlna
    out[1] = cOverH0 / Ea * Math.exp(-lnaNow);      // dχ/dlna  (comoving horizon)
    const cs2 = C.c * C.c / (3 * (1 + Rb(a)));      // photon-baryon sound speed²
    out[2] = Math.sqrt(cs2) / (H0_SI * Ea) * Math.exp(-lnaNow); // dr_s/dlna
    out[3] = 0;
  };

  const y = new Float64Array(4);   // [t, chi, rs, 0]
  aTab[0] = A_START;
  for (let i = 1; i <= nSteps; i++) {
    rk4Step(derivs, lna[i - 1], y, dln);
    tTab[i] = y[0];
    chiTab[i] = y[1];
    rsTab[i] = y[2];
    aTab[i] = Math.exp(lna[i]);
  }

  // ---- Growth factor D(a) --------------------------------------------------
  // ΛCDM linear growth:  D(a) = (5 Ωm / 2) E(a) ∫_0^a da' / (a'³ E(a')³)
  // Integrate the ODE form instead for accuracy near the lower bound:
  //   dD/dlna = D · [ 3Ωm(a)/2 − Ωk(a) − Ωde(a)(1+3w) − 2 q̃ ] is messy;
  // use the integral form with substitution over the grid (converges fine
  // because integrand ~ a' near 0 → no singularity).
  {
    let sum = 0;
    // integrand over dlna: a / (a³ E³) = a⁻² E⁻³
    const g = (lna_) => {
      const a_ = Math.exp(lna_);
      return Math.pow(a_, -2) / Math.pow(E(a_), 3);
    };
    // integrate from lnStart (small a) upward, cumulative
    let prev = g(lna[0]) * dln;
    dTab[0] = 0;
    for (let i = 1; i <= nSteps; i++) {
      sum += 0.5 * (g(lna[i - 1]) + g(lna[i])) * dln;
      const a_ = aTab[i];
      dTab[i] = 2.5 * Om * E(a_) * sum;
    }
    const d1 = dTab[nSteps];  // value at a = 1.30, normalise to a=1
    // Find index of a=1 and normalise so D(1)=1
    const idx1 = Math.round((0 - lnStart) / dln);
    const dNorm = dTab[Math.min(idx1, nSteps)];
    for (let i = 0; i <= nSteps; i++) dTab[i] /= dNorm;
    void d1;
  }

  // ---- Lookup tables ---------------------------------------------------------
  const aOfT = new LookupTable(tTab, aTab);        // a(t) (a increasing with t)
  const tOfA = new LookupTable(aTab, tTab);        // t(a) (t increasing with a)
  const chiOfT = new LookupTable(tTab, chiTab);
  const chiOfA = new LookupTable(aTab, chiTab);
  const rsOfA = new LookupTable(aTab, rsTab);
  const dOfA = new LookupTable(aTab, dTab);

  // ---- Matter-radiation equality --------------------------------------------
  const aEq = Or / Math.max(Om, 1e-30);
  const zEq = 1 / aEq - 1;
  const tEq = tOfA.get(Math.min(aEq, 1.0));

  // ---- Big Rip (w < −1) -------------------------------------------------------
  // For w<−1 the scale factor diverges at finite time:
  //   t_rip = t0 + (2 / (3|1+w| H0 √Ωde))   [for the de-dominated future]
  let tRip = Infinity;
  if (w < -1 && Ode > 0) {
    tRip = tOfA.get(1.0) + 2 / (3 * Math.abs(1 + w) * H0_SI * Math.sqrt(Ode));
  }

  // ---- Public API ------------------------------------------------------------
  const cosmo = {
    params: p,
    Or, Om, Ob, Ocdm, Ode, Ok, w, wExp,
    H0_SI, rhoCrit, rhoGammaKg,
    aEq, zEq, tEq,
    tRip,

    /** H(a)/H0 */
    E,
    /** Hubble rate in s^-1 at scale factor a. */
    H: (a) => H0_SI * E(a),
    /** Hubble rate in km/s/Mpc. */
    Hkm: (a) => p.H0 * E(a),
    /** Deceleration parameter. */
    q,

    /** Scale factor at cosmic time t (seconds, absolute — includes reheating offset). */
    aAt: (tAbs) => aOfT.get(Math.max(0, tAbs - T_REHEAT)),
    /** Absolute cosmic time (s) at scale factor a. */
    tAt: (a) => tOfA.get(Math.max(a, A_START)) + T_REHEAT,
    /** Redshift at absolute cosmic time. */
    zAt: (tAbs) => 1 / aOfT.get(Math.max(0, tAbs - T_REHEAT)) - 1,
    /** Redshift for a scale factor. */
    zOfA: (a) => 1 / a - 1,
    /** Scale factor for a redshift. */
    aOfZ: (z) => 1 / (1 + z),

    /** Age of the universe today (absolute seconds). */
    t0: tOfA.get(1.0) + T_REHEAT,
    /** Age in Gyr. */
    t0Gyr: (tOfA.get(1.0) + T_REHEAT) / GYR,

    /** Growth factor normalised to D(1)=1. */
    growth: (a) => dOfA.get(a),
    /** Linear growth rate f = dlnD/dlna ≈ Ωm(a)^0.55. */
    growthRate: (a) => {
      // Ωm(a) = Ωm a⁻³ / E²(a)  — multiply E² by a³ to avoid overflow
      const denom = Om + Or / a + Ode * Math.pow(a, -3 * w) + Ok / a;
      const OmA = Om / Math.max(denom, 1e-30);
      return Math.pow(Math.max(OmA, 1e-6), 0.55);
    },

    /** Comoving particle horizon (m) at scale factor a: ∫₀ᵗ c dt/a. */
    particleHorizonComoving: (a) => chiOfA.get(Math.max(a, A_START)),
    /** Proper particle horizon = a × comoving. */
    particleHorizonProper: (a) => a * chiOfA.get(Math.max(a, A_START)),
    /** Sound horizon (m) at scale factor a. */
    soundHorizon: (a) => rsOfA.get(Math.max(a, A_START)),

    /** Density components (SI, kg/m³) and fractions at scale factor a. */
    densities: (a) => {
      const a2 = a * a;
      const r = Or / (a2 * a2), m = Om / (a2 * a);
      const de = Ode * Math.pow(a, wExp);
      const k = Ok / a2;
      const tot = r + m + de + k;
      return {
        radiation: r, matter: m, darkEnergy: de, curvature: k,
        total: tot,
        fracR: r / tot, fracM: m / tot, fracL: de / tot, fracK: k / tot,
        // physical components
        rhoMatterKg: m * rhoCrit,
        rhoRadiationKg: r * rhoCrit,
        rhoDarkEnergyKg: de * rhoCrit,
      };
    },
    /** Ωm(a) — matter fraction as a function of a. */
    OmA: (a) => {
      const d = E(a) * E(a);
      return Om / (a * a * a * d);
    },

    /** Lookback time to redshift z (seconds). */
    lookbackTime: (z) => tOfA.get(1.0) - tOfA.get(1 / (1 + z)),

    /** Comoving distance to redshift z (m) — Simpson on ∫ dz/E. */
    comovingDistance: (z) => cOverH0 * simpson((zp) => 1 / E(1 / (1 + zp)), 0, z, 2000),
    /** Luminosity distance: D_L = (1+z) χ. */
    luminosityDistance: (z) => (1 + z) * cosmo.comovingDistance(z),
    /** Angular diameter distance: D_A = χ/(1+z). */
    angularDiameterDistance: (z) => cosmo.comovingDistance(z) / (1 + z),

    /** Recombination: find a where the Saha x_e crosses a threshold (see recombination.js). */
    _tables: { aOfT, tOfA, chiOfA, rsOfA, dOfA, lna, aTab, tTab, chiTab, rsTab, dTab },
  };

  return cosmo;
}

/**
 * Inflation-era scale factor (analytic de Sitter piece used before the
 * numeric table begins). a(t) = a_end · e^{H (t − t_end)}.
 */
export function inflationScaleFactor(tAbs) {
  if (tAbs >= T_REHEAT) return A_START;
  const dt = tAbs - T_REHEAT;             // negative
  return A_START * Math.exp(H_INFLATION * dt);
}

/**
 * CMB photon temperature as a function of absolute cosmic time.
 * Tγ = T0 / a — exact by the definition of the scale factor (a is chosen
 * so that photon entropy is conserved; the e± annihilation energy dump is
 * absorbed into the a–T relation, not a correction on top of it).
 * The neutrino temperature after decoupling is Tγ·(4/11)^{1/3}.
 */
export function cmbTemperature(tAbs, T0 = COSMO_DEFAULT.T0, aOfTFn = null) {
  const a = tAbs < T_REHEAT
    ? inflationScaleFactor(tAbs)
    : (aOfTFn ? aOfTFn(tAbs) : buildAOfT(tAbs));
  return T0 / a;
}

/** Global a(t) closure — set by the engine once the primary cosmo exists. */
let _primaryAOfT = null;
export function setPrimaryAOfT(fn) { _primaryAOfT = fn; }
function buildAOfT(t) {
  if (_primaryAOfT) return _primaryAOfT(t);
  return 1; // fallback (should not happen)
}

/** Neutrino temperature after decoupling: Tν = Tγ (4/11)^{1/3}. */
export const TNU_RATIO = Math.pow(4 / 11, 1 / 3);
export function neutrinoTemperature(tAbs, T0 = COSMO_DEFAULT.T0) {
  return cmbTemperature(tAbs, T0) * TNU_RATIO;
}

export default buildCosmology;
