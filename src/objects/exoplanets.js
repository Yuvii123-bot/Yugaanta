/**
 * Yugaanta — objects/exoplanets.js
 * ---------------------------------------------------------------------------
 * Landmark exoplanets (NASA Exoplanet Archive selections) — proof that
 * planetary systems are universal. Rendered as real destinations you can
 * zoom to, with their measured parameters.
 * ---------------------------------------------------------------------------
 */

export const EXOPLANETS = [
  { name: "Proxima Centauri b", star: "Proxima Centauri", distLy: 4.24, aAU: 0.0485, periodDays: 11.19, radiusEarth: 1.03, starSpec: "M5.5V", starTeff: 3042, note: "Closest exoplanet; in the habitable zone of a red dwarf." },
  { name: "TRAPPIST-1 e", star: "TRAPPIST-1", distLy: 40.7, aAU: 0.0292, periodDays: 6.10, radiusEarth: 0.92, starSpec: "M8V", starTeff: 2566, note: "One of 7 Earth-sized worlds around an ultra-cool dwarf." },
  { name: "51 Pegasi b", star: "51 Pegasi", distLy: 50.6, aAU: 0.0527, periodDays: 4.23, radiusEarth: 13.6, starSpec: "G2IV", starTeff: 5732, note: "The first exoplanet around a sun-like star (1995) — a hot Jupiter." },
  { name: "Kepler-452b", star: "Kepler-452", distLy: 1800, aAU: 1.04, periodDays: 384.8, radiusEarth: 1.63, starSpec: "G2V", starTeff: 5757, note: "Earth's 'older cousin' around a G2 star." },
  { name: "HD 209458 b", star: "HD 209458", distLy: 159, aAU: 0.047, periodDays: 3.52, radiusEarth: 15.2, starSpec: "G0V", starTeff: 6091, note: "First planet seen transiting its star; atmosphere spectroscopied." },
  { name: "GJ 1214 b", star: "GJ 1214", distLy: 47.5, aAU: 0.0149, periodDays: 1.58, radiusEarth: 2.7, starSpec: "M4.5V", starTeff: 3250, note: "Steam world candidate." },
  { name: "Kepler-16b", star: "Kepler-16 (AB)", distLy: 245, aAU: 0.7048, periodDays: 228.8, radiusEarth: 8.4, starSpec: "K+M binary", starTeff: 4450, note: "A real 'Tatooine' — orbits two suns." },
  { name: "WASP-12b", star: "WASP-12", distLy: 1400, aAU: 0.0234, periodDays: 1.09, radiusEarth: 21.2, starSpec: "G0", starTeff: 6300, note: "Being devoured by its star; 2600 K day side." },
  { name: "OGLE-2005-390L b", star: "OGLE-2005-BLG-390L", distLy: 21500, aAU: 2.6, periodDays: 3500, radiusEarth: 5.5, starSpec: "M", starTeff: 3200, note: "Found by microlensing — 21,000 ly away." },
  { name: "PSR B1257+12 b", star: "PSR B1257+12", distLy: 2300, aAU: 0.19, periodDays: 25.3, radiusEarth: 0.43, starSpec: "pulsar", starTeff: 30000, note: "A planet orbiting a pulsar — the first exoplanets ever found (1992)." },
  { name: "HR 8799 e", star: "HR 8799", distLy: 133, aAU: 14.5, periodDays: 18000, radiusEarth: 13.0, starSpec: "A5V", starTeff: 7400, note: "Directly imaged; in a 4-planet system." },
  { name: "K2-18 b", star: "K2-18", distLy: 124, aAU: 0.159, periodDays: 32.9, radiusEarth: 2.61, starSpec: "M2.5V", starTeff: 3512, note: "Water vapor detected; habitable-zone sub-Neptune." },
];

export default EXOPLANETS;
