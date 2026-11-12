import { toLatinDigits } from './digits';
import {
  addDays,
  addMonths,
  compareDates,
  formatJalali,
  isValidJalaliDate,
  jalaliFromEnglishDate,
  jalaliKey,
  lastDayOfMonth,
  MONTH_NAMES,
  parseJalaliKey,
  weekdayIndex,
  firstDayOfMonth,
} from './jalali';
import { normalizeForMatch } from './normalize';
import type { DueDate, JalaliDate } from './types';

const NUMBER_WORDS: Record<string, number> = {
  یک: 1,
  دو: 2,
  سه: 3,
  چهار: 4,
  پنج: 5,
  شش: 6,
  هفت: 7,
  هشت: 8,
  نه: 9,
  ده: 10,
  یازده: 11,
  دوازده: 12,
  پانزده: 15,
  بیست: 20,
  سی: 30,
};

const WEEKDAY_PATTERNS: { index: number; pattern: RegExp }[] = [
  { index: 1, pattern: /یک\s*شنبه/ },
  { index: 2, pattern: /دو\s*شنبه/ },
  { index: 3, pattern: /سه\s*شنبه/ },
  { index: 4, pattern: /چهار\s*شنبه/ },
  { index: 5, pattern: /پنج\s*شنبه/ },
  { index: 0, pattern: /(?:^|\s)شنبه(?:\s|$|[،,.؛:])/ },
  { index: 6, pattern: /جمعه/ },
];

const MONTH_LOOKUP = new Map<string, number>(
  MONTH_NAMES.map((name, index) => [normalizeForMatch(name).replace(/\s+/g, ''), index + 1]),
);

function due(key: string, kind: DueDate['kind']): DueDate | null {
  const date = parseJalaliKey(key);
  if (!date) return null;
  return { key, label: formatJalali(date, { style: 'long' }), kind };
}

function resolveMonthDay(month: number, day: number, meeting: JalaliDate): JalaliDate | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  let date: JalaliDate = { jy: meeting.jy, jm: month, jd: Math.min(day, 31) };
  if (compareDates(date, meeting) < 0) date = { ...date, jy: date.jy + 1 };
  const key = jalaliKey(date);
  return parseJalaliKey(key);
}

function nextWeekday(meeting: JalaliDate, weekday: number, allowSameDay = false): JalaliDate {
  const current = weekdayIndex(meeting);
  let delta = (weekday - current + 7) % 7;
  if (delta === 0 && !allowSameDay) delta = 7;
  return addDays(meeting, delta);
}

function matchWeekday(text: string): number | null {
  for (const entry of WEEKDAY_PATTERNS) if (entry.pattern.test(text)) return entry.index;
  return null;
}

function parseAmount(text: string): number | null {
  if (/^\d+$/.test(text)) return Number(text);
  return NUMBER_WORDS[text] ?? null;
}

export function findDueDate(rawText: string, meetingDateKey: string): DueDate | null {
  const meeting = parseJalaliKey(meetingDateKey);
  if (!meeting) return null;
  const text = normalizeForMatch(rawText);

  const numeric = /(?:^|\s)(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})(?:\s|$|[،,.؛:])/.exec(text);
  if (numeric) {
    const year = Number(numeric[1]);
    const month = Number(numeric[2]);
    const day = Number(numeric[3]);
    if (year >= 1200 && year <= 1600) {
      if (isValidJalaliDate(year, month, day)) {
        return due(jalaliKey({ jy: year, jm: month, jd: day }), 'explicit');
      }
    } else if (year >= 1900 && year <= 2200) {
      const gregorian = new Date(Date.UTC(year, month - 1, day));
      if (
        gregorian.getUTCFullYear() !== year ||
        gregorian.getUTCMonth() + 1 !== month ||
        gregorian.getUTCDate() !== day
      ) return null;
      const key = jalaliFromEnglishDate(
        gregorian.getUTCFullYear(),
        gregorian.getUTCMonth() + 1,
        gregorian.getUTCDate(),
      );
      return due(key, 'explicit');
    }
  }

  const monthName = /(?:^|\s)(\d{1,2})\s*(فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|ابان|اذر|دی|بهمن|اسفند)\s*(\d{4})?/.exec(
    text,
  );
  if (monthName) {
    const month = MONTH_LOOKUP.get(normalizeForMatch(monthName[2]).replace(/\s+/g, ''));
    const day = Number(monthName[1]);
    const explicitYear = monthName[3] ? Number(monthName[3]) : null;
    if (month) {
      const base = explicitYear ? { jy: explicitYear, jm: month, jd: day } : resolveMonthDay(month, day, meeting);
      if (base) {
        const key = jalaliKey(base);
        if (parseJalaliKey(key)) return due(key, 'explicit');
      }
    }
  }

  if (/(?:روز|هفته|ماه)\s*(?:پس|بعد)\s*از/.test(text)) return null;

  if (/(^|\s)پس\s*فردا(?=\s|$|[،,.؛:!?؟…])/.test(text)) return due(jalaliKey(addDays(meeting, 2)), 'relative');
  if (/(^|\s)فردا(?=\s|$|[،,.؛:!?؟…])/.test(text)) return due(jalaliKey(addDays(meeting, 1)), 'relative');
  if (/(^|\s)امروز(?=\s|$|[،,.؛:!?؟…])/.test(text)) return due(jalaliKey(meeting), 'relative');

  const duration =
    /(?:تا|حداکثر|قبل\s*از|ظرف)\s+(\d{1,2}|[آ-ی]+)\s*(روز|هفته)(?:\s*(?:دیگر|بعد|اینده))?(?!\s*پس\s*از)(?=\s*(?:$|[،,.؛:]|(?:را|و|برای|به)\s|[آ-ی]))/.exec(
      text,
    );
  if (duration) {
    const amount = parseAmount(duration[1]);
    if (amount) {
      const days = duration[2] === 'هفته' ? amount * 7 : amount;
      return due(jalaliKey(addDays(meeting, days)), 'relative');
    }
  }

  const nextWeek = /هفته\s*(اینده|بعد|دیگر)/.test(text);
  const weekday = matchWeekday(text);
  if (nextWeek && weekday !== null) {
    return due(jalaliKey(addDays(meeting, 7 - weekdayIndex(meeting) + weekday)), 'weekday');
  }

  if (/اول\s*ماه\s*(اینده|بعد)/.test(text)) {
    return due(jalaliKey(firstDayOfMonth(addMonths(meeting, 1))), 'period');
  }
  if (/(پایان|اخر)\s*ماه\s*(اینده|بعد)/.test(text)) {
    return due(jalaliKey(lastDayOfMonth(addMonths(meeting, 1))), 'period');
  }
  if (/(پایان|اخر)\s*ماه/.test(text)) {
    return due(jalaliKey(lastDayOfMonth(meeting)), 'period');
  }
  if (/(پایان|اخر)\s*هفته/.test(text)) {
    const date = nextWeek
      ? addDays(meeting, 7 - weekdayIndex(meeting) + 5)
      : nextWeekday(meeting, 5, true);
    return due(jalaliKey(date), 'period');
  }
  if (weekday !== null) {
    return due(jalaliKey(nextWeekday(meeting, weekday)), 'weekday');
  }
  if (nextWeek) {
    return due(jalaliKey(addDays(meeting, 7)), 'relative');
  }
  if (/ماه\s*(اینده|بعد|دیگر)/.test(text)) {
    return due(jalaliKey(addMonths(meeting, 1)), 'relative');
  }

  return null;
}

export function resolveDueInput(input: string, meetingDateKey: string): DueDate | null {
  const text = normalizeForMatch(input);
  if (!text) return null;
  const meeting = parseJalaliKey(meetingDateKey);
  if (!meeting) return null;
  const numeric = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/.exec(text);
  if (numeric) {
    const date = { jy: Number(numeric[1]), jm: Number(numeric[2]), jd: Number(numeric[3]) };
    if (!isValidJalaliDate(date.jy, date.jm, date.jd)) return null;
    return due(jalaliKey(date), 'explicit');
  }
  const monthDay = /^(\d{1,2})\s*(فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند)(?:\s*(\d{4}))?$/.exec(
    toLatinDigits(input).trim(),
  );
  if (monthDay) {
    const month = MONTH_LOOKUP.get(monthDay[2]);
    const day = Number(monthDay[1]);
    const year = monthDay[3] ? Number(monthDay[3]) : null;
    if (month) {
      const date = year ? { jy: year, jm: month, jd: day } : resolveMonthDay(month, day, meeting);
      if (date) {
        const key = jalaliKey(date);
        if (parseJalaliKey(key)) return due(key, 'explicit');
      }
    }
  }
  return findDueDate(input, meetingDateKey);
}
