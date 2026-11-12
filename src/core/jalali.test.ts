import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  compareDates,
  firstDayOfMonth,
  formatJalali,
  formatJalaliKey,
  isValidJalaliDate,
  isLeapJalaaliYear,
  jalaaliMonthLength,
  jalaliFromEnglishDate,
  jalaliKey,
  lastDayOfMonth,
  parseJalaliKey,
  toGregorian,
  toJalaali,
  todayJalali,
  weekdayIndex,
  WEEKDAY_NAMES,
} from './jalali';

describe('jalali calendar', () => {
  it('converts known dates both ways', () => {
    expect(toJalaali(2024, 3, 20)).toEqual({ jy: 1403, jm: 1, jd: 1 });
    expect(toGregorian(1403, 1, 1)).toEqual({ gy: 2024, gm: 3, gd: 20 });
    expect(toJalaali(2026, 11, 12)).toEqual({ jy: 1405, jm: 8, jd: 21 });
    expect(jalaliFromEnglishDate(2026, 11, 12)).toBe('1405-08-21');
  });

  it('knows leap years and month lengths', () => {
    expect(isLeapJalaaliYear(1403)).toBe(true);
    expect(isLeapJalaaliYear(1404)).toBe(false);
    expect(jalaaliMonthLength(1403, 12)).toBe(30);
    expect(jalaaliMonthLength(1404, 12)).toBe(29);
    expect(jalaaliMonthLength(1405, 1)).toBe(31);
    expect(jalaaliMonthLength(1405, 7)).toBe(30);
  });

  it('validates dates', () => {
    expect(isValidJalaliDate(1405, 8, 21)).toBe(true);
    expect(isValidJalaliDate(1403, 12, 30)).toBe(true);
    expect(isValidJalaliDate(1404, 12, 30)).toBe(false);
    expect(isValidJalaliDate(1405, 13, 1)).toBe(false);
    expect(isValidJalaliDate(1405, 0, 1)).toBe(false);
    expect(isValidJalaliDate(1405, 8, 0)).toBe(false);
  });

  it.each([0, -61, 3178, 9999, NaN, Infinity, 1405.5])('rejects unsupported year %s before conversion or leap checks', (year) => {
    for (const month of [1, 8, 12]) {
      expect(isValidJalaliDate(year, month, 1)).toBe(false);
    }
  });

  it('validates the supported positive-year boundaries', () => {
    expect(isValidJalaliDate(1, 1, 1)).toBe(true);
    expect(isValidJalaliDate(3177, 12, 1)).toBe(true);
    expect(toGregorian(3177, 12, 1).gy).toBe(3799);
    expect(parseJalaliKey('9999/12/01')).toBeNull();
    expect(parseJalaliKey('9999/01/01')).toBeNull();
    expect(parseJalaliKey('3178/01/01')).toBeNull();
  });

  it('parses and formats keys', () => {
    expect(parseJalaliKey('1405-08-21')).toEqual({ jy: 1405, jm: 8, jd: 21 });
    expect(parseJalaliKey('۱۴۰۵/۰۸/۲۱')).toEqual({ jy: 1405, jm: 8, jd: 21 });
    expect(parseJalaliKey('1405-13-01')).toBeNull();
    expect(parseJalaliKey('not-a-date')).toBeNull();
    expect(formatJalali({ jy: 1405, jm: 8, jd: 21 }, { style: 'long' })).toBe('۲۱ آبان ۱۴۰۵');
    expect(formatJalali({ jy: 1405, jm: 8, jd: 21 })).toBe('۱۴۰۵/۰۸/۲۱');
    expect(formatJalali({ jy: 1405, jm: 8, jd: 21 }, { persianDigits: false })).toBe('1405/08/21');
    expect(formatJalaliKey('1405-08-21', { style: 'long', persianDigits: false })).toBe(
      '21 آبان 1405',
    );
  });

  it('computes weekdays with Saturday as the first day', () => {
    const thursday = { jy: 1405, jm: 8, jd: 21 };
    expect(weekdayIndex(thursday)).toBe(5);
    expect(WEEKDAY_NAMES[weekdayIndex(thursday)]).toBe('پنج‌شنبه');
    expect(formatJalali(thursday, { style: 'weekday' })).toContain('پنج‌شنبه');
  });

  it('adds days and months across boundaries', () => {
    expect(jalaliKey(addDays({ jy: 1405, jm: 8, jd: 21 }, 5))).toBe('1405-08-26');
    expect(jalaliKey(addDays({ jy: 1405, jm: 8, jd: 21 }, 10))).toBe('1405-09-01');
    expect(jalaliKey(addDays({ jy: 1403, jm: 12, jd: 30 }, 1))).toBe('1404-01-01');
    expect(jalaliKey(addMonths({ jy: 1405, jm: 6, jd: 31 }, 1))).toBe('1405-07-30');
    expect(jalaliKey(firstDayOfMonth({ jy: 1405, jm: 8, jd: 21 }))).toBe('1405-08-01');
    expect(jalaliKey(lastDayOfMonth({ jy: 1405, jm: 8, jd: 21 }))).toBe('1405-08-30');
    expect(jalaliKey(lastDayOfMonth({ jy: 1403, jm: 12, jd: 1 }))).toBe('1403-12-30');
  });

  it('compares dates', () => {
    expect(compareDates({ jy: 1405, jm: 8, jd: 21 }, { jy: 1405, jm: 8, jd: 22 })).toBeLessThan(0);
    expect(compareDates({ jy: 1405, jm: 8, jd: 21 }, { jy: 1405, jm: 9, jd: 1 })).toBeLessThan(0);
    expect(compareDates({ jy: 1405, jm: 8, jd: 21 }, { jy: 1405, jm: 8, jd: 21 })).toBe(0);
  });

  it('returns a valid Jalali date for today', () => {
    const today = todayJalali(new Date(2026, 10, 12));
    expect(today).toEqual({ jy: 1405, jm: 8, jd: 21 });
  });
});
