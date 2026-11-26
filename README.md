# YUGAANTA — The Universe, Simulated

**A real-time 3D simulation of the entire universe: Big Bang → Now → Deep Future.**

Yugaanta ("end of an era") solves the actual equations of modern cosmology live in
your browser — the same ΛCDM model that the Planck satellite, SDSS, DESI and JWST
test every day — and then lets you try to **prove or disprove it** with your own
hands.

---

## What it does

- **13.8 billion years + 10¹⁰⁰ more**, in one continuous timeline. The clock
  supports everything from slow motion through the Planck era to **10,000× real
  time** (the headline preset: one Earth year passes in ~53 minutes) up to
  10¹⁷× (the whole history of the universe in ~4.4 seconds).
- **One continuous zoom, 26 orders of magnitude**: observable universe → cosmic
  web → the Milky Way → the Solar System → Earth's cloud tops. Scroll to travel.
- **Real physics, solved live** — not canned animations:
  - Friedmann equations (RK4, ~130,000 steps) → a(t), H(t), densities, horizons
  - Big Bang nucleosynthesis → why 75% H / 25% He
  - Saha recombination → the moment the CMB was released
  - ΛCDM structure formation: BBKS power spectrum, FFT-generated Gaussian
    random fields, Zel'dovich approximation → the cosmic web forms before your eyes
  - Keplerian Solar System from real J2000 orbital elements
  - Stellar evolution, supernova remnants, black-hole thermodynamics
  - NFW dark-matter halos → flat galaxy rotation curves
- **The Falsification Lab** — the heart of the project. Twelve predictions
  checked against independent measurements. Turn off dark energy, delete the
  CMB, set w = −1.3 (Big Rip), try SH0ES's H0 = 73… and watch which
  predictions of the Big Bang break. *A theory that cannot fail explains nothing.*

## Run it

```bash
npm start          # serves on http://localhost:8080
npm test           # 78 physics validation tests (node --test)
```

No build step — the three.js library is vendored (`lib/`), the rest is vanilla ES modules.

## Controls

| Input | Action |
|---|---|
| Scroll / pinch | Zoom across 26 orders of magnitude |
| Drag | Orbit the focus |
| Double-click object | Fly to it (galaxy → solar system → planet) |
| Timeline | Scrub 10⁻⁴³ s → 10¹⁰⁰ yr |
| `Space` | Pause |
| `↑` / `↓` | Faster / slower time flow |
| `R` | Cycle realm (universe → galaxy → system → planet) |

## Repository map

```
src/
  core/         constants, units, numerics (RK4, FFT, noise, RNG)
  cosmology/    flrw.js (Friedmann solver), bbn.js, recombination.js,
                perturbations.js (P(k) → Zel'dovich), epochs.js, falsify.js
  physics/      relativity.js, stellar.js, gravity.js (Barnes-Hut), thermodynamics.js
  objects/      sol.js (real Solar System data), catalogs.js (110+ real stars),
                exoplanets.js, galaxy.js (NFW + procedural), planet.js, blackhole.js
  sim/          engine.js, clock.js — the orchestrator
  render/       three.js views: universe (cosmic web + CMB fireball),
                galaxy, solar system, planet surfaces
  ui/           HUD, timeline, charts, Theory Lab, inspector
tests/          78 validated physics tests
docs/THEORY.md  every equation used, with sources
```

## What is honest about this simulation

Every derived number in the HUD and Inspector comes from the equations in
`src/cosmology` and `src/physics` — validated by `npm test` against textbook
values (age 13.79 Gyr, z* ≈ 1100, r_drag ≈ 147 Mpc, Yp ≈ 0.247, r_s(M☉) =
2.953 km…). Known simplifications are disclosed in the UI and in
[docs/THEORY.md](docs/THEORY.md): Saha recombination (not full RECFAST), trace
abundances from network scalings, and a display-grade fireball renderer.

## Verdict so far

As configured (Planck 2018 parameters), **ΛCDM passes all 12 falsification
tests** in this simulation: age, CMB temperature, helium-4, deuterium,
recombination epoch, horizon size, BAO ruler, equality redshift, flatness,
dark-matter requirement, and the no-oldest-stars-paradox condition. Turn any
ingredient off and specific tests turn red — that is the whole point.

*The Big Bang is not believed because it is a nice story. It is believed
because it keeps passing tests like these — and Yugaanta lets you check.*
