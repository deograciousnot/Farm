/** Kenya's 47 counties. Keep in step with KENYA_COUNTIES in server/utils/regions.js. */
export const KENYA_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo Marakwet', 'Embu', 'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado',
  'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia',
  'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', "Murang'a", 'Nairobi',
  'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya', 'Taita Taveta', 'Tana River',
  'Tharaka Nithi', 'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot',
] as const;

const normalize = (value: string) => value.toLowerCase().replace(/['’]/g, '').trim();

/**
 * Locations are stored as one string, "Town, County" (the server derives the county from it).
 * Split it back into parts for editing; the county is the last part that names a county.
 */
export function splitLocation(location?: string | null): { town: string; county: string } {
  const parts = (location ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && normalize(part) !== 'unknown');

  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const county = KENYA_COUNTIES.find((name) => normalize(name) === normalize(parts[index]));
    if (county) {
      return { county, town: parts.filter((_, partIndex) => partIndex !== index).join(', ') };
    }
  }

  return { county: '', town: parts.join(', ') };
}

export function joinLocation(town: string, county: string) {
  const cleanTown = town.trim();
  if (!county) return cleanTown;
  return cleanTown && normalize(cleanTown) !== normalize(county) ? `${cleanTown}, ${county}` : county;
}
