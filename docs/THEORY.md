# Yugaanta — The Physics Inside

Every equation the simulation uses, with the module that implements it and the
validation test that guards it.

---

## 1. The background universe — `cosmology/flrw.js`

The FLRW metric with the Friedmann equations governs the cosmic clock. For a
homogeneous & isotropic universe with components radiation (w=1/3), matter
(w=0), curvature, and dark energy (w free):

**Friedmann I** (expansion rate):

    H²(a) = (ȧ/a)² = H0² [ Ωr a⁻⁴ + Ωm a⁻³ + Ωk a⁻² + Ωde a⁻³(1+w) ]

**Friedmann II** (deceleration):

    ä/a = −(H0²/2)(Ωr a⁻⁴ + Ωm a⁻³) + H0² Ωde a⁻³(1+w)

**Fluid equation** (energy conservation): ρ̇ + 3H(ρ + p/c²) = 0, p = wρc².

We integrate dt/d ln a = 1/(H0·E(a)) with **RK4** (Δ ln a = 4×10⁻⁴) from the
end of inflation (a ≈ 2×10⁻²⁶, T ≈ 10¹³ GeV) to the far future, building tables
for a(t), t(a), the comoving particle horizon ∫c dt/a, the sound horizon
∫c_s dt/a, and the growth factor D(a).

- Densities: ρ_i(a) = ρ_c0 Ω_i a⁻³(1+w_i); Ω_i(a) fractions from the same table.
- Deceleration q(a) = ½Ωr + ½Ωm − Ωde(1+3w).
- Distances: comoving χ(z) = (c/H0)∫₀ᶻ dz′/E(z′) (Simpson), D_L=(1+z)χ, D_A=χ/(1+z).
- **Big Rip** (w<−1): t_rip = t0 + 2/(3|1+w| H0 √Ωde); a ∝ (t_rip−t)^(2/(3|1+w|)).

Defaults: Planck 2018 — H0=67.36, Ωm=0.3153, Ωb=0.0493, T0=2.72548 K,
N_eff=3.046, ns=0.9649, σ8=0.8102.
Ωr = Ωγ(1 + 0.2271·N_eff) computed from a·T⁴/c² (a = 7.5657×10⁻¹⁶ J m⁻³ K⁻⁴).

**Validated**: age 13.79 Gyr (±2%); z_eq ≈ 3400; horizon ≈ 46 Gly; r_drag ≈ 147 Mpc;
D(1)=1; EdS age < 11.5 Gyr.

## 2. Inflation — `flrw.js (inflationScaleFactor)`

Pre-reheating era as analytic quasi-de Sitter: a(t) = a_end·e^{H_inf(t−t_end)}
with H_inf = 6×10³⁶ s⁻¹ and ~60 e-folds — enough to solve the horizon and
flatness problems and stretch quantum fluctuations to cosmic scale. The Planck
epoch itself is outside known physics and is labelled as such (the clock starts
in "slow motion" there).

## 3. Thermal history — `cosmology/thermal.js`

- Photon temperature: Tγ = T0/a (exact by definition of a).
- Neutrinos: Tν = (4/11)^{1/3} Tγ after decoupling at T ≈ 1 MeV.
- Radiation-era clock: t ≈ 0.738 s (10.75/g★)^½ (T/MeV)⁻² — a cross-check of the
  numeric solver.
- Baryon-to-photon ratio η = 6.11×10⁻¹⁰ (Planck 2018); n_γ0 ≈ 411 cm⁻³.

## 4. Big Bang nucleosynthesis — `cosmology/bbn.js`

Chain (validated: T_f=0.72 MeV, n/p_f=1/6, Yp≈0.247):

1. **Weak freeze-out**: λ(T) = 1.80 (T/MeV)⁵ s⁻¹ (G_F²T⁵ rates with e±
   corrections, fit to Bernstein–Brown–Feinberg 1988); freeze-out at λ=H →
   T_f ≈ 0.72 MeV, t_f ≈ 1.4 s; n/p → exp(−Q/T_f) = 1/6.
2. **Neutron decay**: τ_n = 879.4 s → n/p ≈ 1/7 by BBN.
3. **Deuterium bottleneck**: photodisintegration γ+D→p+n rate
   η·n_γ·σ_PD·c·e^(−B_D/T) vs H(T), σ_PD ≈ 10⁻²⁰ cm², B_D = 2.2246 MeV →
   bottleneck opens at T_b ≈ 0.08 MeV, t_b ≈ 110–200 s.
4. **Helium-4**: Y_p = 2r/(1+r) ≈ 0.247 (observed 0.245±0.003).
5. **Traces** (documented scalings from full networks): D/H ∝ η^−1.6,
   ³He/H ≈ 10⁻⁵, ⁷Li/H ≈ 4×10⁻¹⁰ (the "lithium problem" is noted in the UI).

## 5. Recombination — `cosmology/recombination.js`

**Saha equation** for the equilibrium ionisation fraction:

    x²/(1−x) = (1/n_H)(m_e kT/2πħ²)^{3/2} e^(−B_H/kT),  B_H = 13.598 eV

**Operational last scattering**: photon scattering rate Γ = x_e·n_b·σ_T·c
falls below H(a(T)) — the mean free path reaches the Hubble radius. This
reproduces z* ≈ 1090±30, t* ≈ 0.38 Myr. *Disclosed limitation*: out-of-equilibrium
Peebles/RECFAST dynamics shift these by a few percent; we show the
approximation's status in the Theory Lab.

## 6. Structure formation — `cosmology/perturbations.js`, `physics/gravity.js`

1. **Power spectrum**: P(k) = A k^ns T²(k) with the **BBKS transfer function**
   (Bardeen, Bond, Kaiser & Stebbins 1986), normalised so σ(8 Mpc/h)=0.8102.
2. **Gaussian random field**: Hermitian complex modes |δ_k|² = V·P(k),
   inverse complex 3D FFT (radix-2, in `core/fft.js`). Convention δ(x) =
   (1/N³)Σδ_k e^{ikx}; raw field divided by V_cell (derived + unit-tested).
3. **Zel'dovich approximation**: ψ(k) = i(k/k²)δ(k); x(q,a) = q + D(a)ψ(q).
   Exact in the linear regime; produces pancakes/filaments/voids correctly
   into quasi-linearity. D(a) = (5Ωm/2)E(a)∫₀ᵃ da′/(a′³E³) (test: D(1)=1,
   f=Ωm^0.55 at a=1).
4. **Optional N-body**: Barnes–Hut octree (θ=0.6, Plummer softening, KDK
   leapfrog) in `physics/gravity.js` — G = 4.30091×10⁻⁹ Mpc(km/s)²/M☉.

## 7. Relativity — `physics/relativity.js`

- Schwarzschild radius r_s = 2GM/c² (test: Sun 2.953 km, Earth 8.87 mm)
- Time dilation dτ/dt = √(1−r_s/r); ISCO = 3r_s; photon sphere 1.5r_s
- Light deflection α = 4GM/c²b (test: solar limb 1.75″)
- Gravitational redshift 1+z = 1/√(1−2GM/rc²)
- Hawking temperature T = ħc³/8πGMk_B (test: 6.17×10⁻⁸ K for M☉)
- Evaporation power ħc⁶/15360πG²M²; lifetime τ = 5120πG²M³/ħc⁴
  (test: 2.1×10⁶⁷ yr for M☉)
- Lorentz factor, velocity addition, Kerr ergosphere r = (GM/c²)(1+√(1−a★²))

## 8. Stars — `physics/stellar.js`

- Mass–luminosity L ∝ M^3.5 (Eddington standard, piecewise fit)
- Lifetime τ = 10 Gyr · M/L ∝ M^−2.5 (test: Sun 10 Gyr, 10 M☉ → 31.6 Myr)
- Radius R ∝ M^0.8/M^0.57; T_eff = (L/4πR²σ)^¼ (test: Sun 5772 K)
- Harvard spectral classes (O≥30000K … M≥2400K) with blackbody colours
- Remnants: <8 M☉ → white dwarf (R ≈ 0.0127 R☉√[(M_Ch/M)^{2/3}−(M/M_Ch)^{2/3}],
  M_Ch=1.44); 8–20 → neutron star; >20 → black hole; pair-instability gap
- Habitable zone (Kopparapu-style): inner √(L/1.1), outer √(L/0.53) AU
- Planet equilibrium temperature T_eq = [L(1−A)/16πσd²]^¼ (test: Earth 255 K)
- Kepler III: P = 2π√(a³/GM) (test: Earth 365.25 d)

## 9. Galaxies — `objects/galaxy.js`

- **NFW halo**: ρ/ρs = [x(1+x)²]⁻¹; M(<r) = M200·f(x)/f(c), f(x)=ln(1+x)−x/(1+x)
- Rotation curves: NFW + exponential disk (4πGΣ0Rd·y²[I0K0−I1K1], numerically
  integrated Bessel functions) + Hernquist bulge → flat v ≈ 230 km/s for the
  Milky Way — the original evidence for dark matter
- M–σ relation (Kormendy & Ho 2013): log M_BH = 8.49 + 4.384 log(σ/200)
- Tully–Fisher: v ∝ L^0.25
- Procedural barred-spiral generator: log-spiral arms, Hernquist bulge, halo,
  HII regions, population colors

## 10. Thermodynamics — `physics/thermodynamics.js`

- Blackbody: u = aT⁴; radiation pressure u/3; entropy density (4/3)aT³
- Bekenstein–Hawking entropy S/k ≈ 1.05×10⁷⁷(M/M☉)² (test: S∝M²)
- Jeans length λ_J = √(15kT/4πGμm_p ρ) and mass — why the first stars take
  ~100 Myr to form
- Virial temperature, free-fall time √(3π/32Gρ), Compton cooling

## 11. The Solar System — `objects/sol.js`

Real J2000 mean elements (JPL/Standish) for 8 planets + dwarf planets, real
masses/radii/tilts/albedos, 10 major moons, Kepler propagation with Newton's
method: M = E − e·sin E → ν → position. Earth facts are computed, not stored:
g = GM/R² = 9.81, v_esc = √(2GM/R) = 11.19 km/s, greenhouse ΔT ≈ +33 K.

## 12. The Falsification Lab — `cosmology/falsify.js`

Twelve experiments, each a pass/fail against an independent measurement:

| # | Prediction | Observed | Source |
|---|---|---|---|
| 1 | Age 13.79 Gyr | 13.787±0.020 | Planck 2018 |
| 2 | Older than oldest stars (13.5) | — | globular clusters / HE 1523-0901 |
| 3 | CMB 2.72548 K | 2.72548±0.00057 | Fixsen 2009 (FIRAS) |
| 4 | Yp ≈ 0.247 | 0.245±0.003 | Aver et al. 2015 |
| 5 | D/H ≈ 2.5×10⁻⁵ | (2.45±0.03)×10⁻⁵ | Cooke et al. 2018 |
| 6 | z* ≈ 1090 | 1089.9±0.4 | Planck 2018 |
| 7 | t* ≈ 0.38 Myr | 0.379±0.021 | Planck 2018 |
| 8 | Horizon ≈ 46 Gly | 46.2±1.0 | ΛCDM-derived |
| 9 | r_drag ≈ 147 Mpc | 147.09±0.26 | Planck 2018 |
| 10 | z_eq ≈ 3400 | 3402 | Planck 2018 |
| 11 | Flatness / dark matter | \|Ωk\|<0.005, Ωcdm≈0.26 | Planck + BAO + rotation curves |
| 12 | Expansion law v=H·d | H0 = 67.4 / 73.0 | Planck vs SH0ES (tension noted) |

Presets that historically fail: no-Λ (age 9.7 Gyr < oldest stars), no-DM
(no structure in time), no-radiation (no CMB), closed (curvature), w=−1.3
(Big Rip), H0=73 (age tension).

## Known simplifications (disclosed)

1. Recombination via Saha + Γ=H criterion, not full Peebles/RECFAST (±5% on z*).
2. BBN trace abundances from network scalings, not a full reaction network.
3. Cosmic web via Zel'dovich + optional small-box N-body, not a full
   Gadget-class simulation.
4. The fireball/CMB renderings are display-grade visualisations of the solved
   temperature history.
5. Inflation parameters (H_inf, e-folds, reheating T) are illustrative choices
   within observationally allowed ranges.
