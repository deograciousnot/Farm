/**
 * Maps free-text locations ("Njoro, Nakuru", "Westlands", "Muranga") to one of Kenya's 47 counties,
 * so activity can be compared by region. Unknown places resolve to null.
 */

export const KENYA_COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo Marakwet", "Embu", "Garissa", "Homa Bay", "Isiolo", "Kajiado",
  "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia",
  "Lamu", "Machakos", "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi",
  "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita Taveta", "Tana River",
  "Tharaka Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
];

// Towns, sub-counties and common spellings that don't contain their county's name.
const PLACE_TO_COUNTY = {
  // Central
  thika: "Kiambu", ruiru: "Kiambu", juja: "Kiambu", kikuyu: "Kiambu", limuru: "Kiambu", gatundu: "Kiambu", githunguri: "Kiambu", kiambaa: "Kiambu", lari: "Kiambu",
  muranga: "Murang'a", kangema: "Murang'a", kenol: "Murang'a", maragua: "Murang'a", kandara: "Murang'a",
  karatina: "Nyeri", othaya: "Nyeri", mukurweini: "Nyeri", mathira: "Nyeri", tetu: "Nyeri",
  kerugoya: "Kirinyaga", kutus: "Kirinyaga", sagana: "Kirinyaga", mwea: "Kirinyaga", wanguru: "Kirinyaga",
  "ol kalou": "Nyandarua", "ol joro orok": "Nyandarua", engineer: "Nyandarua", njabini: "Nyandarua",
  // Nairobi
  westlands: "Nairobi", karen: "Nairobi", kasarani: "Nairobi", embakasi: "Nairobi", langata: "Nairobi", dagoretti: "Nairobi", kibra: "Nairobi", roysambu: "Nairobi", "industrial area": "Nairobi", wakulima: "Nairobi", marikiti: "Nairobi",
  // Rift Valley
  njoro: "Nakuru", naivasha: "Nakuru", molo: "Nakuru", gilgil: "Nakuru", subukia: "Nakuru", rongai: "Nakuru", kuresoi: "Nakuru", bahati: "Nakuru",
  eldoret: "Uasin Gishu", turbo: "Uasin Gishu", burnt_forest: "Uasin Gishu", moiben: "Uasin Gishu",
  kitale: "Trans Nzoia", endebess: "Trans Nzoia", kiminini: "Trans Nzoia",
  kapsabet: "Nandi", nandi_hills: "Nandi",
  iten: "Elgeyo Marakwet", "elgeyo": "Elgeyo Marakwet", marakwet: "Elgeyo Marakwet",
  kabarnet: "Baringo", eldama_ravine: "Baringo", marigat: "Baringo",
  nanyuki: "Laikipia", nyahururu: "Laikipia", rumuruti: "Laikipia",
  kitengela: "Kajiado", ngong: "Kajiado", "ongata rongai": "Kajiado", loitokitok: "Kajiado", namanga: "Kajiado",
  litein: "Kericho", londiani: "Kericho", kipkelion: "Kericho",
  sotik: "Bomet", "longisa": "Bomet",
  kilgoris: "Narok", "mai mahiu": "Narok",
  maralal: "Samburu", lodwar: "Turkana", kakuma: "Turkana", kapenguria: "West Pokot", makutano: "West Pokot",
  // Western & Nyanza
  ahero: "Kisumu", maseno: "Kisumu", muhoroni: "Kisumu", kondele: "Kisumu",
  bondo: "Siaya", ugunja: "Siaya", yala: "Siaya",
  mbita: "Homa Bay", oyugi: "Homa Bay", kendu_bay: "Homa Bay", homabay: "Homa Bay",
  rongo: "Migori", awendo: "Migori", isebania: "Migori",
  ogembo: "Kisii", keroka: "Nyamira",
  mumias: "Kakamega", malava: "Kakamega", butere: "Kakamega",
  webuye: "Bungoma", kimilili: "Bungoma", chwele: "Bungoma",
  malaba: "Busia", "port victoria": "Busia",
  mbale: "Vihiga", luanda: "Vihiga", chavakali: "Vihiga",
  // Eastern & North
  chuka: "Tharaka Nithi", "tharaka": "Tharaka Nithi", marimanti: "Tharaka Nithi",
  maua: "Meru", nkubu: "Meru", timau: "Meru",
  runyenjes: "Embu", siakago: "Embu",
  athi_river: "Machakos", mlolongo: "Machakos", "mavoko": "Machakos", kangundo: "Machakos", tala: "Machakos",
  wote: "Makueni", emali: "Makueni", mtito_andei: "Makueni",
  mwingi: "Kitui",
  moyale: "Marsabit",
  // Coast
  malindi: "Kilifi", watamu: "Kilifi", mtwapa: "Kilifi", mariakani: "Kilifi",
  ukunda: "Kwale", diani: "Kwale", msambweni: "Kwale",
  voi: "Taita Taveta", wundanyi: "Taita Taveta", taveta: "Taita Taveta", mwatate: "Taita Taveta",
  hola: "Tana River", garsen: "Tana River",
  likoni: "Mombasa", nyali: "Mombasa", kisauni: "Mombasa", changamwe: "Mombasa",
};

function normalize(text) {
  return ` ${String(text)
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

// Longest names first so "Uasin Gishu" wins over shorter partial matches.
const COUNTY_PATTERNS = KENYA_COUNTIES.map((county) => ({ county, pattern: normalize(county) })).sort(
  (a, b) => b.pattern.length - a.pattern.length
);
const PLACE_PATTERNS = Object.entries(PLACE_TO_COUNTY)
  .map(([place, county]) => ({ county, pattern: normalize(place.replace(/_/g, " ")) }))
  .sort((a, b) => b.pattern.length - a.pattern.length);

export function resolveCounty(location) {
  if (!location || /^unknown$/i.test(String(location).trim())) {
    return null;
  }

  const text = normalize(location);

  // A county named outright ("Ahero, Kisumu") beats a town match. Addresses run from specific
  // to general, so when several match ("Mombasa Road, Nairobi") the last one mentioned wins.
  const lastMatch = (patterns) =>
    patterns.reduce((best, entry) => {
      const index = text.lastIndexOf(entry.pattern);
      return index >= 0 && (!best || index > best.index) ? { county: entry.county, index } : best;
    }, null);

  return (lastMatch(COUNTY_PATTERNS) ?? lastMatch(PLACE_PATTERNS))?.county ?? null;
}

/** Mongoose plugin: keep a `county` field in step with a free-text location field. */
export function countyPlugin(schema, { from = "location" } = {}) {
  schema.add({ county: { type: String, default: null, index: true } });

  schema.pre("save", function setCounty() {
    if (this.isNew || this.isModified(from)) {
      this.county = resolveCounty(this.get(from));
    }
  });
}
