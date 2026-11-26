/**
 * Yugaanta — objects/catalogs.js
 * ---------------------------------------------------------------------------
 * REAL STAR CATALOG — bright named stars with measured positions (RA/Dec),
 * distances (Hipparcos/Gaia), apparent magnitudes and spectral classes.
 * Used for the sky view and for "fly to this star" navigation.
 *
 * Format per line:  Name | RA(h) | Dec(deg) | dist(ly) | mag | spec | bayer
 * Data sources: Hipparcos catalog + common astronomical almanac values.
 * Distances are Gaia-era values where known.
 * ---------------------------------------------------------------------------
 */

export const STAR_CATALOG_CSV = `
Sirius|6.7525|-16.716|8.6|-1.46|A1V|α CMa
Canopus|6.3992|-52.696|310|-0.74|A9II|α Car
Arcturus|14.2610|19.182|36.7|-0.05|K1.5III|α Boo
Vega|18.6156|38.784|25.04|0.03|A0V|α Lyr
Capella|5.2782|45.998|42.9|0.08|G8III|α Aur
Rigel|5.2423|-8.202|860|0.13|B8Ia|β Ori
Procyon|7.6551|5.225|11.46|0.34|F5IV|α CMi
Betelgeuse|5.9195|7.407|548|0.42|M1-2Ia|α Ori
Achernar|1.6286|-57.237|139|0.46|B6Ve|α Eri
Altair|19.8464|8.868|16.73|0.76|A7V|α Aql
Aldebaran|4.5987|16.509|65.3|0.86|K5III|α Tau
Antares|16.4901|-26.432|550|1.09|M1.5Iab|α Sco
Spica|13.4199|-11.161|250|1.04|B1V|α Vir
Pollux|7.7553|28.026|33.78|1.14|K0III|β Gem
Fomalhaut|22.9608|-29.622|25.13|1.16|A3V|α PsA
Deneb|20.6905|45.280|2600|1.25|A2Ia|α Cyg
Regulus|10.1395|11.972|79.3|1.35|B8IV|α Leo
Adhara|6.9770|-28.972|430|1.50|B2II|ε CMa
Castor|7.5766|31.888|51|1.58|A1V|α Gem
Gacrux|12.5194|-57.113|88.6|1.63|M3.5III|γ Cru
Shaula|17.5601|-37.104|570|1.62|B2IV|λ Sco
Bellatrix|5.4189|6.350|250|1.64|B2III|γ Ori
Elnath|5.4382|28.608|134|1.65|B7III|β Tau
Miaplacidus|9.2200|-69.717|113|1.67|A1III|β Car
Alnilam|5.6036|-1.202|2000|1.69|B0Ia|ε Ori
Alnair|22.1372|-46.961|101|1.74|B6V|α Gru
Alnitak|5.6793|-1.943|1260|1.77|O9.5Ib|ζ Ori
Alioth|12.9005|55.960|82.6|1.77|A1III|ε UMa
Mirfak|3.4149|49.861|510|1.79|F5Ib|α Per
Dubhe|11.0621|61.751|123|1.79|K0III|α UMa
Kaus Australis|18.4029|-34.385|143|1.85|B9.5III|ε Sgr
Wezen|7.1399|-26.393|1600|1.83|F8Ia|δ CMa
Sargas|17.6220|-42.998|300|1.87|F1II|θ Sco
Avior|8.3752|-59.510|630|1.86|K3III|ε Car
Atria|16.8110|-69.028|391|1.91|K2II|α TrA
Peacock|20.4271|-56.735|179|1.94|B2IV|α Pav
Alkaid|13.7923|49.313|104|1.86|B3V|η UMa
Alcyone|3.7914|24.105|440|2.87|B7III|η Tau
Hamal|2.1208|23.463|65.8|2.00|K2III|α Ari
Almach|2.0650|42.330|390|2.10|K3II|γ And
Diphda|0.7265|-17.987|96.3|2.02|K0III|β Cet
Mizar|13.3990|54.925|86|2.23|A2V|ζ UMa
Nunki|18.9211|-26.297|228|2.05|B2.5V|σ Sgr
Menkent|14.1114|-36.370|58.8|2.06|K0III|θ Cen
Mirach|1.1624|35.621|197|2.05|M0III|β And
Alpheratz|0.1398|29.091|97|2.06|B8IV|α And
Rasalhague|17.5822|12.560|48.6|2.07|A5III|α Oph
Kochab|14.8451|74.155|131|2.08|K4III|β UMi
Saiph|5.7959|-9.670|650|2.09|B0.5Ia|κ Ori
Denebola|11.8184|14.572|36|2.14|A3V|β Leo
Algol|3.1361|40.956|90|2.12|B8V|β Per
Tiaki|22.7110|-46.885|220|2.11|K5III|β Gru
Muhlifain|12.6919|-48.960|130|2.20|A0V|γ Cen
Aspidiske|9.1762|-59.275|690|2.21|A9Ib|ι Car
Suhail|9.1321|-43.433|570|2.23|K4Ib|λ Vel
Alphecca|15.5781|26.715|75|2.23|A0V|α CrB
Mintaka|5.5334|-0.299|1200|2.23|O9.5II|δ Ori
Sadr|20.3705|40.257|1800|2.23|F8Ib|γ Cyg
Eltanin|17.9434|51.489|154|2.23|K5III|γ Dra
Schedar|0.6751|56.538|45|2.24|K0II|α Cas
Naos|8.0604|-40.003|1080|2.25|O5Ia|ζ Pup
Aludra|7.4015|-29.303|2000|2.32|B5Ia|η CMa
Markab|23.0880|15.205|133|2.48|A0III|α Peg
Gienah|20.7434|33.970|72|2.48|B8III|ε Cyg
Tarazed|19.7710|10.613|395|2.72|K3II|γ Aql
Enif|21.7364|9.875|690|2.39|K2Ib|ε Peg
Alderamin|21.3095|62.585|49|2.45|A7V|α Cep
Scheat|23.0629|28.083|196|2.42|M2III|β Peg
Aljanah|21.2857|-78.636|96|2.39|K0III|ε Gru
Rasalgethi|16.4103|14.390|360|3.35|M5II|α Her
Deneb Algedi|21.8838|-16.127|38.7|2.81|A7III|δ Cap
Thuban|14.1162|64.376|300|3.65|A0III|α Dra
Polaris|2.5303|89.264|433|1.98|F7Ib|α UMi
Mira|2.3225|-2.977|300|3.04|M7IIIe|ο Cet
Algorab|12.4966|-69.717|87|2.95|B9V|δ Cru
Mimosa|12.7953|-59.689|280|1.25|B0.5IV|β Cru
Delta Velorum|8.7451|-54.708|80|2.00|A1V|δ Vel
Zeta Ophiuchi|16.6194|-10.567|366|2.56|O9.5V|ζ Oph
Zubeneschamali|14.8480|-16.042|185|2.61|B8III|β Lib
Vindemiatrix|13.0363|10.959|110|2.83|G8III|ε Vir
Zosma|11.2356|20.524|58|2.56|A4V|δ Leo
Alphard|9.4599|-8.659|177|1.98|K3II|α Hya
Acrux|12.4433|-63.099|320|0.76|B0.5IV|α Cru
Acrab|16.0906|-25.587|120|2.62|B1V|β Sco
Dschubba|16.0056|-22.622|400|2.29|B0.3IV|δ Sco
Larawag|16.8361|-34.293|65|2.29|K2III|ε Sco
Lesath|17.5127|-37.296|580|2.70|B2.5V|υ Sco
Albireo|19.5121|27.960|430|3.08|K3II|β Cyg
Ruchbah|0.6875|60.235|99|2.68|A5III|δ Cas
Segin|1.9225|63.670|440|3.36|B3III|ε Cas
Nihal|5.4992|-20.759|159|2.84|G5III|β Lep
Arneb|5.5453|-17.537|2200|2.58|F0Ib|α Lep
Phact|4.6653|-34.074|270|2.65|B7IV|α Col
Wazn|5.8956|-35.768|86|3.02|K1III|β Col
Zaurak|3.9818|-13.510|221|2.97|M1III|γ Eri
Baten Kaitos|1.8917|-9.063|235|3.53|K2III|ζ Cet
Menkar|3.0672|4.091|220|2.53|M1.5III|α Cet
Ain|4.4863|19.188|147|3.53|K0III|ε Tau
Taygeta|3.7543|24.467|440|3.70|B6V|19 Tau
Seginus|13.9111|38.318|85|3.25|A7III|γ Boo
Izar|14.7498|27.074|210|2.37|K0III|ε Boo
Muphrid|13.9114|18.241|37|2.68|G0IV|η Boo
Unukalhai|15.7429|4.523|74|2.63|K2III|α Ser
Sinjaestae|16.0906|3.675|65|3.71|K0III|δ Ser
Girtab|17.7143|8.310|60|3.20|K2III|ξ Sco
Cebalrai|17.7238|4.567|82|2.76|K2III|β Oph
Sabik|17.1732|-15.725|58|2.43|A2V|η Oph
Alnasl|17.3114|-30.424|96|2.98|K0III|γ Sgr
Nusbayn|17.7081|-36.702|270|2.60|K3.5III|δ Sgr
Ascella|19.0435|-40.027|120|2.60|A2.5V|ζ Sgr
Kaus Media|18.3499|-29.828|348|2.70|K3III|δ Sgr
Kaus Borealis|18.4662|-25.421|78|2.81|K1III|λ Sgr
Phi Sagittarii|18.7624|-26.991|239|3.17|B8III|φ Sgr
Tau Sagittarii|19.1148|-27.670|122|3.32|K1III|τ Sgr
Alshat|20.4841|-21.030|170|3.43|B9III|α Cap
Dabih|20.3359|-14.781|328|3.05|F8V|β¹ Cap
Nashira|22.0000|-16.655|139|3.67|G8III|γ Cap
Psi Capricorni|20.8317|-25.271|48|3.67|F5V|ψ Cap
Skat|22.9107|-15.821|160|3.44|A3V|δ Aqr
Sadalsuud|21.5257|-5.571|540|2.90|G0Ib|β Aqr
Sadalmelik|22.0965|-0.325|520|2.95|G2Ib|α Aqr
Ancha|22.5390|-7.577|380|4.17|G8III|θ Aqr
Zeta Aquarii|22.4847|0.018|103|4.59|F3IV|ζ Aqr
Bunda|22.9599|-21.665|185|4.00|M0III|λ Aqr
Hydor|22.8932|-1.141|203|4.03|K0III|φ Aqr
Epsilon Gruis|22.8573|-37.365|53|3.49|A1V|ε Gru
Beta Gruis|22.7110|-46.885|177|2.11|M5III|β Gru
Delta Gruis|22.4854|-43.497|139|3.97|G7III|δ² Gru
Zeta Tucanae|1.2129|-64.821|28|4.23|F9V|ζ Tuc
Alpha Tucanae|22.3087|-60.259|199|4.49|K3II|α Tuc
Beta Hyi|0.4275|-77.254|24.3|2.80|G0IV|β Hyi
Alpha Hyi|1.9865|-61.573|217|2.86|F0V|α Hyi
Gamma Hyi|2.5192|-74.741|214|3.24|G8III|γ Hyi
Beta Doradus|5.5582|-62.474|38|3.76|F4III|β Dor
Alpha Doradus|4.5671|-55.045|176|3.27|A0IV|α Dor
Zeta Doradus|4.6776|-55.616|38|4.16|F7V|ζ Dor
Alpha Volantis|9.8661|-66.855|124|4.00|A7IV|α Vol
Beta Volantis|8.4154|-75.656|108|3.77|K1III|β Vol
Gamma Volantis|8.5981|-70.843|142|5.35|K1III|γ² Vol
Epsilon Volantis|8.9370|-72.651|641|4.35|B6IV|ε Vol
Delta Volantis|8.4394|-69.642|638|4.24|F3Ia|δ Vol
Alpha Chamaeleontis|8.3070|-76.921|63.8|4.05|F1V|α Cha
Beta Chamaeleontis|12.8824|-78.952|310|4.26|B9V|β Cha
Gamma Chamaeleontis|10.4498|-78.614|415|4.11|M0III|γ Cha
Delta Chamaeleontis|10.7466|-80.554|354|4.45|B2.5IV|δ² Cha
Epsilon Chamaeleontis|9.0038|-78.616|363|4.51|B9V|ε Cha
`;

/**
 * Parse the CSV into structured star records.
 * Each: {name, ra (deg), dec (deg), dist (ly), mag, spec, bayer}
 */
export function parseStarCatalog() {
  const out = [];
  for (const line of STAR_CATALOG_CSV.trim().split("\n")) {
    const parts = line.split("|");
    if (parts.length < 7) continue;
    out.push({
      name: parts[0].trim(),
      raDeg: parseFloat(parts[1]) * 15,
      decDeg: parseFloat(parts[2]),
      distLy: parseFloat(parts[3]),
      mag: parseFloat(parts[4]),
      spec: parts[5].trim(),
      bayer: parts[6].trim(),
    });
  }
  return out;
}

/**
 * The 88 IAU constellations with abbreviations — used for region labels.
 */
export const CONSTELLATIONS = [
  ["Andromeda", "And"], ["Antlia", "Ant"], ["Apus", "Aps"], ["Aquarius", "Aqr"],
  ["Aquila", "Aql"], ["Ara", "Ara"], ["Aries", "Ari"], ["Auriga", "Aur"],
  ["Boötes", "Boo"], ["Caelum", "Cae"], ["Camelopardalis", "Cam"], ["Cancer", "Cnc"],
  ["Canes Venatici", "CVn"], ["Canis Major", "CMa"], ["Canis Minor", "CMi"],
  ["Capricornus", "Cap"], ["Carina", "Car"], ["Cassiopeia", "Cas"], ["Centaurus", "Cen"],
  ["Cepheus", "Cep"], ["Cetus", "Cet"], ["Chamaeleon", "Cha"], ["Circinus", "Cir"],
  ["Columba", "Col"], ["Coma Berenices", "Com"], ["Corona Australis", "CrA"],
  ["Corona Borealis", "CrB"], ["Corvus", "Crv"], ["Crater", "Crt"], ["Crux", "Cru"],
  ["Cygnus", "Cyg"], ["Delphinus", "Del"], ["Dorado", "Dor"], ["Draco", "Dra"],
  ["Equuleus", "Equ"], ["Eridanus", "Eri"], ["Fornax", "For"], ["Gemini", "Gem"],
  ["Grus", "Gru"], ["Hercules", "Her"], ["Horologium", "Hor"], ["Hydra", "Hya"],
  ["Hydrus", "Hyi"], ["Indus", "Ind"], ["Lacerta", "Lac"], ["Leo", "Leo"],
  ["Leo Minor", "LMi"], ["Lepus", "Lep"], ["Libra", "Lib"], ["Lupus", "Lup"],
  ["Lynx", "Lyn"], ["Lyra", "Lyr"], ["Mensa", "Men"], ["Microscopium", "Mic"],
  ["Monoceros", "Mon"], ["Musca", "Mus"], ["Norma", "Nor"], ["Octans", "Oct"],
  ["Ophiuchus", "Oph"], ["Orion", "Ori"], ["Pavo", "Pav"], ["Pegasus", "Peg"],
  ["Perseus", "Per"], ["Phoenix", "Phe"], ["Pictor", "Pic"], ["Pisces", "Psc"],
  ["Piscis Austrinus", "PsA"], ["Puppis", "Pup"], ["Pyxis", "Pyx"], ["Reticulum", "Ret"],
  ["Sagitta", "Sge"], ["Sagittarius", "Sgr"], ["Scorpius", "Sco"], ["Sculptor", "Scl"],
  ["Scutum", "Sct"], ["Serpens", "Ser"], ["Sextans", "Sex"], ["Taurus", "Tau"],
  ["Telescopium", "Tel"], ["Triangulum", "Tri"], ["Triangulum Australe", "TrA"],
  ["Tucana", "Tuc"], ["Ursa Major", "UMa"], ["Ursa Minor", "UMi"], ["Vela", "Vel"],
  ["Virgo", "Vir"], ["Volans", "Vol"], ["Vulpecula", "Vul"],
];

/**
 * Famous deep-sky objects (for navigation bookmarks).
 */
export const DEEP_SKY = [
  { name: "Andromeda Galaxy (M31)", type: "galaxy", distLy: 2.537e6, raDeg: 10.684, decDeg: 41.269, note: "1 trillion stars; on collision course with the Milky Way." },
  { name: "Orion Nebula (M42)", type: "nebula", distLy: 1344, raDeg: 83.822, decDeg: -5.391, note: "A stellar nursery — protoplanetary disks form here now." },
  { name: "Pleiades (M45)", type: "cluster", distLy: 444, raDeg: 56.75, decDeg: 24.117, note: "Hot young B stars, 100 Myr old." },
  { name: "Crab Nebula (M1)", type: "nebula", distLy: 6500, raDeg: 83.633, decDeg: 22.017, note: "SN 1054 remnant — a pulsar spins 30 times per second inside." },
  { name: "Sombrero Galaxy (M104)", type: "galaxy", distLy: 31.1e6, raDeg: 189.998, decDeg: -11.623, note: "Edge-on spiral with a billion-solar-mass black hole." },
  { name: "Triangulum Galaxy (M33)", type: "galaxy", distLy: 2.73e6, raDeg: 23.462, decDeg: 30.66, note: "Third member of the Local Group." },
  { name: "Large Magellanic Cloud", type: "galaxy", distLy: 163000, raDeg: 80.894, decDeg: -69.756, note: "Satellite galaxy — hosted SN 1987A." },
  { name: "Omega Centauri (NGC 5139)", type: "cluster", distLy: 15800, raDeg: 201.697, decDeg: -47.479, note: "10 million stars — possibly a stripped dwarf galaxy core." },
];

export default { parseStarCatalog, CONSTELLATIONS, DEEP_SKY };
