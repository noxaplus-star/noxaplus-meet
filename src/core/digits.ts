const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function toLatinDigits(value: string): string {
  let out = '';
  for (const char of value) {
    const persian = PERSIAN_DIGITS.indexOf(char);
    const arabic = ARABIC_DIGITS.indexOf(char);
    if (persian >= 0) out += String(persian);
    else if (arabic >= 0) out += String(arabic);
    else out += char;
  }
  return out;
}

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

export function parseNumber(value: string): number | null {
  const latin = toLatinDigits(value).replace(/[,٬\s]/g, '');
  if (!/^\d+$/.test(latin)) return null;
  const number = Number(latin);
  return Number.isSafeInteger(number) ? number : null;
}
