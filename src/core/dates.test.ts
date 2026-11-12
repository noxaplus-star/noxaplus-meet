import { describe, expect, it } from 'vitest';
import { findDueDate, resolveDueInput } from './dates';

const meeting = '1405-08-21';

describe('due date extraction', () => {
  it('resolves explicit Jalali dates', () => {
    expect(findDueDate('انتشار در ۲۵ آبان انجام شود', meeting)?.key).toBe('1405-08-25');
    expect(findDueDate('تاریخ ۱۴۰۵/۰۹/۰۳ ثبت شود', meeting)?.key).toBe('1405-09-03');
    expect(findDueDate('۲۵ آبان ۱۴۰۶', meeting)?.key).toBe('1406-08-25');
  });

  it('rolls a month-day into the next year when it has passed', () => {
    expect(findDueDate('۲۵ آبان', '1405-09-01')?.key).toBe('1406-08-25');
  });

  it('resolves Gregorian numeric dates', () => {
    expect(findDueDate('انتشار 2026-11-20', meeting)?.key).toBe('1405-08-29');
  });

  it('resolves relative days', () => {
    expect(findDueDate('امروز', meeting)?.key).toBe('1405-08-21');
    expect(findDueDate('فردا', meeting)?.key).toBe('1405-08-22');
    expect(findDueDate('پس‌فردا', meeting)?.key).toBe('1405-08-23');
    expect(findDueDate('تا ۵ روز', meeting)?.key).toBe('1405-08-26');
    expect(findDueDate('حداکثر ۳ روز دیگر', meeting)?.key).toBe('1405-08-24');
    expect(findDueDate('تا یک هفته آینده تکمیل شود', '1405-08-18')?.key).toBe('1405-08-25');
  });

  it('resolves weekdays to the next occurrence', () => {
    expect(findDueDate('تا سه‌شنبه', meeting)?.key).toBe('1405-08-26');
    expect(findDueDate('تا پنجشنبه', meeting)?.key).toBe('1405-08-28');
    expect(findDueDate('یکشنبه', meeting)?.key).toBe('1405-08-24');
    expect(findDueDate('روز شنبه برگزار شود', '1405-08-15')?.key).toBe('1405-08-16');
    expect(findDueDate('تا دوشنبه', '1405-08-18')?.key).toBe('1405-08-25');
  });

  it('prioritizes week quantities over generic future weeks', () => {
    expect(findDueDate('تا دو هفته آینده', meeting)?.key).toBe('1405-09-05');
    expect(findDueDate('تا سه هفته بعد', meeting)?.key).toBe('1405-09-12');
    expect(findDueDate('ظرف ۲ هفته دیگر.', meeting)?.key).toBe('1405-09-05');
  });

  it.each([
    ['شنبه', '1405-08-23'],
    ['یکشنبه', '1405-08-24'],
    ['دوشنبه', '1405-08-25'],
    ['سه‌شنبه', '1405-08-26'],
    ['چهارشنبه', '1405-08-27'],
    ['پنجشنبه', '1405-08-28'],
    ['جمعه', '1405-08-29'],
  ])('resolves %s in the next Saturday-based week', (weekday, expected) => {
    for (const date of ['1405-08-16', meeting, '1405-08-22']) {
      expect(findDueDate(`تا ${weekday} هفته آینده`, date)?.key).toBe(expected);
      expect(findDueDate(`هفته بعد ${weekday}.`, date)?.key).toBe(expected);
    }
  });

  it.each(['.', '،', '؛', ':', '!', '؟', '?', '…'])('accepts %s after relative days', (punctuation) => {
    expect(findDueDate(`تا فردا${punctuation}`, meeting)?.key).toBe('1405-08-22');
    expect(findDueDate(`تا پس‌فردا${punctuation}`, meeting)?.key).toBe('1405-08-23');
    expect(findDueDate(`امروز${punctuation}`, meeting)?.key).toBe(meeting);
  });

  it('resolves periods', () => {
    expect(findDueDate('پایان هفته', '1405-08-15')?.key).toBe('1405-08-21');
    expect(findDueDate('هفته آینده', meeting)?.key).toBe('1405-08-28');
    expect(findDueDate('ماه آینده', meeting)?.key).toBe('1405-09-21');
    expect(findDueDate('اول ماه آینده', meeting)?.key).toBe('1405-09-01');
    expect(findDueDate('آخر ماه آینده', meeting)?.key).toBe('1405-09-30');
    expect(findDueDate('آخر ماه', meeting)?.key).toBe('1405-08-30');
    expect(findDueDate('پایان هفته آینده', meeting)?.key).toBe('1405-08-28');
  });

  it('does not create deadlines from unbounded durations', () => {
    expect(findDueDate('تا یک هفته پس از انتشار', meeting)).toBeNull();
    expect(findDueDate('تا دو هفته بعد از راه‌اندازی', meeting)).toBeNull();
  });

  it.each(['2026-02-31', '2026-02-29', '2026-13-01', '2026-00-01', '2026-01-00'])('rejects invalid Gregorian date %s', (date) => {
    expect(findDueDate(`انتشار ${date}`, meeting)).toBeNull();
  });

  it('accepts a valid Gregorian leap day', () => {
    expect(findDueDate('2024-02-29', meeting)?.key).toBe('1402-12-10');
  });

  it.each(['9999/12/01', '9999/01/01', '3178/12/01', '۱ اسفند ۹۹۹۹'])('rejects unsupported Jalali year in %s', (date) => {
    expect(resolveDueInput(date, meeting)).toBeNull();
    expect(findDueDate(date, meeting)).toBeNull();
    expect(findDueDate('فردا', date)).toBeNull();
  });

  it('returns null for invalid input', () => {
    expect(findDueDate('بدون تاریخ', meeting)).toBeNull();
    expect(findDueDate('۱۴۰۵/۱۲/۳۰', '1405-08-21')).toBeNull();
    expect(findDueDate('فردا', 'invalid')).toBeNull();
  });

  it('resolves manual due-date input', () => {
    expect(resolveDueInput('۱۴۰۵/۰۸/۲۵', meeting)?.key).toBe('1405-08-25');
    expect(resolveDueInput('۲۵ آبان', meeting)?.key).toBe('1405-08-25');
    expect(resolveDueInput('فردا', meeting)?.key).toBe('1405-08-22');
    expect(resolveDueInput('', meeting)).toBeNull();
    expect(resolveDueInput('هیچ', meeting)).toBeNull();
  });

  it('returns readable labels', () => {
    const due = findDueDate('۲۵ آبان', meeting);
    expect(due?.label).toBe('۲۵ آبان ۱۴۰۵');
    expect(due?.kind).toBe('explicit');
    expect(findDueDate('فردا', meeting)?.kind).toBe('relative');
    expect(findDueDate('شنبه', meeting)?.kind).toBe('weekday');
    expect(findDueDate('آخر ماه', meeting)?.kind).toBe('period');
  });
});
