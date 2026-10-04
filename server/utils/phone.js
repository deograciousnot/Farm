/**
 * Normalise Kenyan mobile numbers to E.164 (+2547XXXXXXXX / +2541XXXXXXXX).
 * Accepts the ways people actually type them: 0712 345 678, 712345678, 254712345678, +254 712 345 678.
 * Returns null for anything that isn't a Kenyan mobile number.
 */
export function normalizeKenyanPhone(input) {
  const digits = String(input ?? "").replace(/[^\d+]/g, "").replace(/^\+/, "");
  let local;

  if (/^254[17]\d{8}$/.test(digits)) local = digits.slice(3);
  else if (/^0[17]\d{8}$/.test(digits)) local = digits.slice(1);
  else if (/^[17]\d{8}$/.test(digits)) local = digits;
  else return null;

  return `+254${local}`;
}

/** "+254 712 *** 678": enough for someone to recognise their own number in a message. */
export function maskPhone(phone) {
  return phone.replace(/^(\+254)(\d{3})\d{3}(\d{3})$/, "$1 $2 *** $3");
}
