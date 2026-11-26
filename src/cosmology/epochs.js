/**
 * Yugaanta — cosmology/epochs.js
 * ---------------------------------------------------------------------------
 * The master timeline of the universe: every epoch from the Planck time to
 * the heat death, with real physical anchors. Each epoch defines:
 *   - the cosmic time window (seconds),
 *   - a short human description of what the universe IS then,
 *   - the visual treatment the renderer should use,
 *   - key events anchored to computed/known times.
 *
 * The timeline UI maps log10(t) from 1e-43 s to 1e100 yr; the adaptive tour
 * speed uses each era's duration to cross it in a few wall-clock seconds.
 * ---------------------------------------------------------------------------
 */

import { C } from "../core/constants.js";
import { YR, GYR, MYR } from "../core/units.js";

/**
 * Era definitions. tStart/tEnd are cosmic seconds. A few anchors are
 * parameter-dependent (recombination, equality) and are computed at runtime
 * by buildEraRegistry(cosmo) — the static entries here are the
 * parameter-independent ones (inflation, quark epoch, future eras).
 */
export const STATIC_ERAS = [
  {
    id: "planck",
    name: "Planck Epoch",
    tStart: 0,
    tEnd: 1e-35,
    color: "#ffffff",
    desc: "Quantum gravity dominates. Spacetime itself fluctuates on the Planck scale (1.6×10⁻³⁵ m). Our physics cannot describe earlier moments — the simulation extrapolates honestly.",
  },
  {
    id: "inflation",
    name: "Cosmic Inflation",
    tStart: 1e-35,
    tEnd: 1.0e-32,
    color: "#fff2c8",
    desc: "Exponential expansion: space doubles ~every 10⁻³⁷ s, stretching a quantum fluctuation to cosmic size in ~60 e-folds. Inflation explains why the universe is flat, homogeneous, and why structure can grow from quantum seeds.",
  },
  {
    id: "reheating",
    name: "Reheating",
    tStart: 1.0e-32,
    tEnd: 1.5e-32,
    color: "#ffe7a0",
    desc: "The inflaton field decays into a ultra-hot plasma of elementary particles. The hot Big Bang — as an era of known physics — begins here.",
  },
  {
    id: "grand-unified",
    name: "Grand Unification Era",
    tStart: 1.5e-32,
    tEnd: 1e-11,
    color: "#ffd9d0",
    desc: "Strong, weak and electromagnetic forces are unified. Baryogenesis: the matter-antimatter asymmetry (~1 part in a billion) is imprinted. Violating CP symmetry here is why anything exists.",
  },
  {
    id: "quark",
    name: "Quark Epoch",
    tStart: 1e-11,
    tEnd: 1e-5,
    color: "#ffc9b8",
    desc: "Universe is a quark–gluon plasma at ~10¹³ K. Below 10¹² K, quarks confine into protons and neutrons (QCD transition). Antiquarks annihilate with quarks — the leftover 1-in-10⁹ is everything you have ever touched.",
  },
  {
    id: "hadron",
    name: "Hadron Epoch",
    tStart: 1e-5,
    tEnd: 1,
    color: "#f5b8a8",
    desc: "Protons and neutrons form. At ~1 second, neutrinos decouple — they still stream through you today at nearly light speed (CνB, ~330 per cm³, never directly detected).",
  },
  {
    id: "lepton",
    name: "Lepton Epoch",
    tStart: 1,
    tEnd: 10,
    color: "#e8b0d8",
    desc: "Electrons and positrons annihilate into photons. The n/p ratio locks in as weak interactions freeze out at T ≈ 0.72 MeV — this single number fixes how much helium the universe will contain.",
  },
  {
    id: "bbn",
    name: "Big Bang Nucleosynthesis",
    tStart: 10,
    tEnd: 1.2e3,
    color: "#ffd27a",
    desc: "The deuterium bottleneck opens at T ≈ 0.08 MeV and nuclei cook: 75% hydrogen, ~25% helium-4 by mass, traces of deuterium, helium-3 and lithium-7. These abundances are the sharpest Big Bang evidence we have.",
  },
  {
    id: "radiation",
    name: "Radiation Domination",
    tStart: 1.2e3,
    tEnd: 6.2e12,
    color: "#a8c8ff",
    desc: "Light rules the universe. Ordinary matter is a thin ionized fog coupled to photons. Density ripples grow only logarithmically — waiting for matter to take over.",
  },
  {
    id: "equality",
    name: "Matter–Radiation Equality",
    tStart: 6.2e12,
    tEnd: 1.2e13,
    color: "#8fb4ff",
    desc: "Matter overtakes radiation (z ≈ 3400). Dark-matter potentials — frozen in during radiation domination — suddenly begin pulling in baryons. Structure growth switches on.",
  },
  {
    id: "recombination",
    name: "Recombination — Let There Be Light",
    tStart: 1.2e13,
    tEnd: 2.5e13,
    color: "#ffb36e",
    desc: "At z ≈ 1100 the plasma neutralizes and photons stream free. The CMB you can detect today — a perfect 2.72548 K blackbody with 1e-5 ripples — is this moment, redshifted by a factor of 1100.",
  },
  {
    id: "dark-ages",
    name: "The Dark Ages",
    tStart: 2.5e13,
    tEnd: 180 * MYR,
    color: "#1a2340",
    desc: "No stars exist yet. The universe is cold neutral hydrogen and helium, slowly collapsing under gravity into the cosmic web that the CMB's ripples seeded.",
  },
  {
    id: "cosmic-dawn",
    name: "Cosmic Dawn — First Stars",
    tStart: 180 * MYR,
    tEnd: 400 * MYR,
    color: "#9fd0ff",
    desc: "Population III stars ignite: hundreds of solar masses, metal-free, ferociously bright. Their UV light reionizes the fog. JWST has now seen galaxies at z > 13 — within 330 Myr of this moment.",
  },
  {
    id: "first-galaxies",
    name: "First Galaxies & Reionization",
    tStart: 400 * MYR,
    tEnd: 1e3 * MYR,
    color: "#7fc0ff",
    desc: "Star clusters merge into the first proto-galaxies. Reionization completes by z ≈ 6. Supermassive black holes seed themselves in the densest cores — quasars blaze across the young universe.",
  },
  {
    id: "assembly",
    name: "Galaxy Assembly",
    tStart: 1e3 * MYR,
    tEnd: 3.2 * GYR,
    color: "#6eb2ff",
    desc: "Hierarchical merging builds big galaxies. The Milky Way's thick disk forms. Star formation peaks around z ≈ 2 — the universe will never again be this bright.",
  },
  {
    id: "maturity",
    name: "Cosmic Maturity",
    tStart: 3.2 * GYR,
    tEnd: 9.2 * GYR,
    color: "#5aa0f0",
    desc: "Galaxies mature into spirals and ellipticals. Dark energy, negligible for 10 billion years, quietly begins accelerating the expansion (z ≈ 0.7).",
  },
  {
    id: "solar-system",
    name: "The Solar System Forms",
    tStart: 9.2 * GYR,
    tEnd: 10 * GYR,
    color: "#ffcf6e",
    desc: "A molecular cloud collapses; the Sun ignites, planets accrete from the disk. 4.54 billion years ago the Earth forms — 9.2 Gyr after the Big Bang, in a universe already 2/3 of its present age.",
  },
  {
    id: "life",
    name: "Life on Earth",
    tStart: 10 * GYR,
    tEnd: 13.787 * GYR,
    color: "#6ee7a0",
    desc: "Chemistry becomes biology. For 3 billion years life is microbial; then — in the last half-billion years — multicellular complexity, animals, intelligence: matter waking up to look at itself.",
  },
];

/** Eras after the present — appended at runtime from the cosmo model. */
export function buildFutureEras(cosmo) {
  const t0 = cosmo.t0;
  const eras = [
    {
      id: "near-future",
      name: "Near Future",
      tStart: t0,
      tEnd: t0 + 5.4 * GYR,
      color: "#b0e0ff",
      desc: "The Andromeda Galaxy collides with the Milky Way in ~4.5 Gyr — a slow-motion merger into 'Milkomeda'. The Sun remains a main-sequence star for another ~5 Gyr.",
    },
    {
      id: "sun-dies",
      name: "The Sun Becomes a Red Giant",
      tStart: t0 + 5.4 * GYR,
      tEnd: t0 + 8 * GYR,
      color: "#ff9a5e",
      desc: "The Sun exhausts core hydrogen, swells past Earth's orbit, then sheds its shell as a planetary nebula, leaving a white dwarf. Earth is scorched and likely engulfed.",
    },
    {
      id: "stelliferous-end",
      name: "End of the Stelliferous Era",
      tStart: t0 + 8 * GYR,
      tEnd: t0 + 1e14 * YR,
      color: "#6a7fa8",
      desc: "Star formation dwindles as gas is exhausted. Red dwarfs smolder until ~10¹⁴ yr — the last ordinary light in the universe. Galaxies darken.",
    },
    {
      id: "degenerate",
      name: "Degenerate Era",
      tStart: t0 + 1e14 * YR,
      tEnd: t0 + 1e40 * YR,
      color: "#3a4468",
      desc: "Only white dwarfs, neutron stars and black holes remain. Protons may decay (~10³⁴–10³⁹ yr) — if so, all baryonic matter slowly evaporates into photons and leptons.",
    },
    {
      id: "black-hole",
      name: "Black Hole Era",
      tStart: t0 + 1e40 * YR,
      tEnd: cosmo.tRip !== Infinity ? cosmo.tRip : t0 + 1e100 * YR,
      color: "#1a1f30",
      desc: "Black holes dominate, evaporating via Hawking radiation: τ ≈ 2.1×10⁶⁷ yr (M/M☉)³. The largest supermassive holes fade at ~10¹⁰⁰ yr.",
    },
    {
      id: "dark-era",
      name: "Dark Era — Heat Death",
      tStart: cosmo.tRip !== Infinity ? cosmo.tRip : t0 + 1e100 * YR,
      tEnd: Infinity,
      color: "#0a0d16",
      desc: cosmo.tRip !== Infinity
        ? "The Big Rip: dark energy with w < −1 tears galaxies, stars, atoms and eventually spacetime itself apart."
        : "Only a dilute soup of photons and leptons in eternal, near-absolute cold. Entropy maximal — the heat death predicted by the second law.",
    },
  ];
  return eras;
}

/**
 * Key events for timeline markers — parameter-dependent anchors are filled
 * by buildEventRegistry(cosmo, bbn, rec).
 */
export function buildEventRegistry(cosmo, bbn, rec) {
  const t0 = cosmo.t0;
  return [
    { t: 1e-32, label: "Reheating (Hot Big Bang)" },
    { t: 1e-11, label: "Electroweak symmetry breaking" },
    { t: 1e-5, label: "Quarks → hadrons (QCD)" },
    { t: bbn.tF, label: "Weak freeze-out (n/p = 1/6)" },
    { t: bbn.tB, label: "BBN ignites (deuterium bottleneck)" },
    { t: bbn.tEnd, label: "BBN ends (75% H, 25% He)" },
    { t: cosmo.tEq, label: "Matter–radiation equality" },
    { t: rec.tStarSec, label: "Recombination — CMB released" },
    { t: 0.18e6 * YR * 1e3, label: "First stars (cosmic dawn)" },
    { t: 1e9 * YR, label: "First galaxies" },
    { t: 9.2e9 * YR, label: "Solar system forms" },
    { t: 10.1e9 * YR, label: "Life on Earth" },
    { t: t0, label: "NOW" },
    { t: t0 + 4.5e9 * YR, label: "Milky Way–Andromeda collision" },
    { t: t0 + 5.4e9 * YR, label: "Sun becomes red giant" },
    { t: t0 + 1e14 * YR, label: "Last stars die" },
    ...(cosmo.tRip !== Infinity ? [{ t: cosmo.tRip, label: "BIG RIP" }] : []),
  ];
}

/**
 * Resolve the era containing a cosmic time t.
 * @param {Array} eras full registry (static + future)
 */
export function eraAt(eras, tSec) {
  for (let i = eras.length - 1; i >= 0; i--) {
    if (tSec >= eras[i].tStart) return eras[i];
  }
  return eras[0];
}

/** Build the full ordered era registry for a cosmology. */
export function buildEraRegistry(cosmo, bbn, rec) {
  const eras = [];
  for (const e of STATIC_ERAS) {
    const era = { ...e };
    // Anchor the parameter-sensitive eras to the solved cosmology
    if (e.id === "radiation") { era.tEnd = cosmo.tEq; }
    if (e.id === "equality") { era.tStart = cosmo.tEq; era.tEnd = rec.tStarSec; }
    if (e.id === "recombination") { era.tStart = rec.tStarSec; era.tEnd = rec.tStarSec * 2.1; }
    if (e.id === "dark-ages") { era.tStart = rec.tStarSec * 2.1; }
    if (e.id === "bbn") { era.tStart = bbn.events[0].t; era.tEnd = bbn.tEnd; }
    if (e.id === "lepton") { era.tEnd = bbn.events[0].t; }
    if (e.id === "hadron") { era.tEnd = bbn.events[0].t; }
    if (e.id === "life") { era.tEnd = cosmo.t0; }
    eras.push(era);
  }
  eras.push(...buildFutureEras(cosmo));
  eras.sort((a, b) => a.tStart - b.tStart);
  return eras;
}

export default { STATIC_ERAS, buildEraRegistry, buildEventRegistry, eraAt };
