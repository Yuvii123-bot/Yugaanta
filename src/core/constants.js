/**
 * Yugaanta — core/constants.js
 * ---------------------------------------------------------------------------
 * Physical constants in SI units (CODATA 2018 exact values where defined),
 * plus cosmological reference values (Planck 2018 TT,TE,EE+lowE+lensing).
 *
 * Every number here is traceable: the comment on each line states the source.
 * These constants feed the Friedmann solver, the BBN network, stellar
 * physics, black-hole thermodynamics and every observable computed by the
 * Theory Lab.
 * ---------------------------------------------------------------------------
 */

/** CODATA 2018 exact / measured fundamental constants (SI). */
export const C = {
  // Speed of light in vacuum (exact, SI definition)
  c: 299_792_458,                       // m/s

  // Newtonian gravitational constant (CODATA 2018: 6.67430e-11)
  G: 6.67430e-11,                       // m^3 kg^-1 s^-2

  // Planck constant (exact, SI definition)
  h: 6.62607015e-34,                    // J s
  hbar: 1.054571817e-34,                // J s (h / 2pi, CODATA 2018)

  // Boltzmann constant (exact, SI definition)
  kB: 1.380649e-23,                     // J/K

  // Stefan-Boltzmann constant
  sigmaSB: 5.670374419e-8,              // W m^-2 K^-4

  // Elementary charge (exact)
  qe: 1.602176634e-19,                  // C

  // Vacuum permittivity / permeability
  eps0: 8.8541878128e-12,               // F/m
  mu0: 1.25663706212e-6,                // N/A^2

  // Particle masses (kg)
  m_e: 9.1093837015e-31,                // electron
  m_p: 1.67262192369e-27,               // proton
  m_n: 1.67492749804e-27,               // neutron

  // Radiation constant a = 4σ/c  (energy density of blackbody radiation)
  aRad: 7.5657332160e-16,               // J m^-3 K^-4

  // Thomson cross-section of the electron
  sigmaT: 6.6524587321e-29,             // m^2

  // Avogadro number (exact)
  N_A: 6.02214076e23,                   // 1/mol

  // Planck units
  l_planck: 1.616255e-35,               // m
  t_planck: 5.391247e-44,               // s
  m_planck: 2.176434e-8,                // kg
  T_planck: 1.416784e32,                // K

  // Solar system reference values (IAU nominal + DE440 best estimates)
  AU: 1.495978707e11,                   // m (exact IAU definition)
  M_sun: 1.98892e30,                    // kg (IAU ~1.9885e30; adopted 1.98892e30)
  R_sun: 6.957e8,                       // m (IAU nominal)
  L_sun: 3.828e26,                      // W (IAU nominal)
  T_sun: 5772,                          // K (IAU effective temperature)
  M_earth: 5.97217e24,                  // kg
  R_earth: 6.371e6,                     // m (mean radius)

  // Astrophysical unit conversions
  pc: 3.0856775814913673e16,            // m (exact-ish, parallax of 1 arcsec)
  ly: 9.4607304725808e15,               // m (Julian light year)

  // Astronomical misc
  year: 3.15576e7,                      // s (Julian year, 365.25 d)
  ev_J: 1.602176634e-19,                // 1 eV in J (exact)
  ev_K: 11604.518121550082,             // K per eV (kB)
  Q_np: 0.00129333236,                  // neutron-proton mass difference in GeV → J? no: in MeV*1e6? stored as J below
  Q_np_J: 1.29333236e-13,              // J  (m_n - m_p)c^2 ≈ 1.29333 MeV
  B_H: 2.178709e-18,                    // J  hydrogen ionisation energy 13.5984 eV
  B_D: 3.56385e-13,                     // J  deuterium binding energy 2.2246 MeV
  ageBaryon: 1.67262e-27,               // proton mass shortcut (alias)
};

/**
 * Planck 2018 baseline cosmology (flat ΛCDM).
 * Source: Planck Collaboration (2020), A&A 641, A6, Table 2,
 * "TT,TE,EE+lowE+lensing" column, plus derived quantities.
 */
export const COSMO_DEFAULT = {
  H0: 67.36,           // km/s/Mpc  (Hubble constant)
  Om: 0.3153,          // matter fraction (baryons + CDM)
  Ob: 0.0493,          // baryon fraction
  Ocdm: 0.2660,        // cold dark matter fraction (= Om - Ob)
  T0: 2.72548,         // K, CMB temperature today (Fixsen 2009)
  Nnu: 3.046,          // effective number of neutrino species
  w: -1.0,             // dark energy equation of state (cosmological constant)
  sigma8: 0.8102,      // amplitude of matter fluctuations on 8 Mpc/h
  ns: 0.9649,          // scalar spectral index
  ageGyr: 13.787,      // Gyr (reported age, used as cross-check of the solver)
};

/** Reference values used by the Theory Lab for pass/fail comparisons. */
export const OBSERVED = {
  ageGyr:      { value: 13.787, err: 0.020, source: "Planck 2018 (ΛCDM fit)" },
  T0:          { value: 2.72548, err: 0.00057, source: "Fixsen 2009 (FIRAS)" },
  yp:          { value: 0.245,  err: 0.003,  source: "Aver et al. 2015 (H II regions)" },
  dOverH:      { value: 2.45e-5, err: 3e-7,  source: "Cooke et al. 2018 (quasar absorbers)" },
  zRec:        { value: 1089.9, err: 0.4,    source: "Planck 2018" },
  tauRecMyr:   { value: 0.379,  err: 0.021,  source: "Planck 2018" },
  horizonGly:  { value: 46.2,   err: 1.0,    source: "Particle horizon (ΛCDM)" },
  soundHorizon:{ value: 147.09, err: 0.26,   source: "Planck 2018 r_drag (Mpc)" },
  zEq:         { value: 3402,   err: 0,      source: "Planck 2018 (derived)" },
  oldestStar:  { value: 13.5,   err: 0.4,    source: "HE 1523-0901 / globular clusters" },
  sigma8:      { value: 0.8102, err: 0.0063, source: "Planck 2018" },
  baoScale:    { value: 150,    err: 3,      source: "BAO comoving scale (Mpc)" },
  helioSeisAge:{ value: 4.58,   err: 0.05,   source: "Solar system age (Gyr)" },
};

/** Quick access to frequently derived SI values (computed once). */
export const DERIVED = (() => {
  const H0_SI = COSMO_DEFAULT.H0 * 1000 / (C.pc * 1e6);   // s^-1 (per megaparsec!)
  const rhoCrit = 3 * H0_SI * H0_SI / (8 * Math.PI * C.G);  // kg/m^3
  const T0 = COSMO_DEFAULT.T0;
  const rhoGamma = C.aRad * T0 ** 4;                 // J/m^3
  const rhoGammaKg = rhoGamma / C.c ** 2;            // kg/m^3
  // Neutrino energy density relative to photons (two helicity states,
  // instant decoupling): ρν/ργ = (7/8)(4/11)^(4/3) N_eff = 0.2271 N_eff
  const nuGammaRatio = 0.22711 * COSMO_DEFAULT.Nnu;
  const rhoNuKg = rhoGammaKg * nuGammaRatio;
  const Or = (rhoGammaKg + rhoNuKg) / rhoCrit;
  return {
    H0_SI,
    rhoCrit,
    rhoGammaKg,
    rhoNuKg,
    Or,                     // total radiation fraction (photons + neutrinos)
    Ogamma: rhoGammaKg / rhoCrit,
    Onu: rhoNuKg / rhoCrit,
    // dark energy fraction for flat model
    Ode: 1 - COSMO_DEFAULT.Om - Or,
    // Hubble time and distance
    tHubble: 1 / H0_SI,                       // s  (~14.52 Gyr)
    dHubble: C.c / H0_SI,                     // m  (~14.52 Gly)
    // matter-radiation equality (flat, w=-1)
    zEq: COSMO_DEFAULT.Om / Or - 1,
    aEq: Or / COSMO_DEFAULT.Om,
    // Baryon-to-photon ratio η (Planck 2018): η = 6.11e-10
    eta: 6.11e-10,
    // Number density of CMB photons today (n_γ = 411 cm^-3)
    nGamma0: 2 * Math.pow(T0 * C.kB, 3) / (Math.PI ** 2) * 1 / (C.hbar * C.c) ** 3 * 1.20206 / 2 / 1e6,
  };
})();

/** Redshift → scale factor and back (flat relations, a=1 today). */
export const zToA = (z) => 1 / (1 + z);
export const aToZ = (a) => 1 / a - 1;

/** Wavelength shift helpers (for the redshift view tint). */
export const lambdaObserved = (lambdaRest, z) => lambdaRest * (1 + z);

/**
 * Surface gravity of a sphere:  g = G M / R^2  (m/s^2).
 */
export const surfaceGravity = (massKg, radiusM) => C.G * massKg / (radiusM * radiusM);

/**
 * Escape velocity from a sphere surface:  v = sqrt(2 G M / R)  (m/s).
 */
export const escapeVelocity = (massKg, radiusM) => Math.sqrt(2 * C.G * massKg / radiusM);

/**
 * Schwarzschild radius:  r_s = 2 G M / c^2  (m).
 * The event-horizon size of a non-rotating, uncharged black hole.
 */
export const schwarzschildRadius = (massKg) => 2 * C.G * massKg / (C.c * C.c);

/**
 * Blackbody peak wavelength (Wien's displacement law):  λ_max = b / T.
 * b = 2.897771955e-3 m·K.
 */
export const WIEN_B = 2.897771955e-3;
export const wienPeak = (tempK) => WIEN_B / tempK;

/**
 * Photon number density of a blackbody field:  n = 2 ζ(3)/π²  (kT/ħc)³.
 * ζ(3) ≈ 1.2020569.
 */
export const photonDensity = (tempK) => {
  const kt = tempK * C.kB;
  return 2 * 1.2020569 / (Math.PI * Math.PI) * Math.pow(kt / (C.hbar * C.c), 3);
};

/**
 * Blackbody spectral energy density (Planck law), per unit wavelength:
 *   B_λ(λ,T) = (2hc²/λ⁵) / (e^{hc/λkT} − 1)   [W m^-3 sr^-1]
 * Used for the CMB spectrum chart and star colours.
 */
export const planckBlambda = (lambdaM, tempK) => {
  const hc_lk = C.h * C.c / (lambdaM * tempK * C.kB);
  return (2 * C.h * C.c * C.c) / Math.pow(lambdaM, 5) / (Math.expm1(Math.min(hc_lk, 700)));
};
