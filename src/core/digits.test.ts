import { describe, expect, it } from 'vitest';
import { parseNumber, toLatinDigits, toPersianDigits } from './digits';

describe('digits', () => {
  it('converts Persian and Arabic digits to Latin', () => {
    expect(toLatinDigits('۱۲۳۴۵۶۷۸۹۰')).toBe('1234567890');
    expect(toLatinDigits('٤٥٦')).toBe('456');
    expect(toLatinDigits('سال ۱۴۰۵ و 2026')).toBe('سال 1405 و 2026');
  });

  it('converts Latin digits to Persian', () => {
    expect(toPersianDigits('1405/08/21')).toBe('۱۴۰۵/۰۸/۲۱');
    expect(toPersianDigits(45)).toBe('۴۵');
  });

  it('parses grouped numbers', () => {
    expect(parseNumber('۱٬۲۳۴')).toBe(1234);
    expect(parseNumber(' 2,500 ')).toBe(2500);
    expect(parseNumber('۱۲')).toBe(12);
  });

  it('rejects non-numeric input', () => {
    expect(parseNumber('چهار')).toBeNull();
    expect(parseNumber('12.5')).toBeNull();
    expect(parseNumber('')).toBeNull();
  });
});
