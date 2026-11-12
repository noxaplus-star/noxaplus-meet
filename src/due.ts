import { resolveDueInput } from './core/dates';
import { parseJalaliKey } from './core/jalali';

export interface DueParse {
  ok: boolean;
  due: string | null;
  error?: string;
}

export function parseDueField(value: string, meetingDate: string): DueParse {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, due: null };
  const resolved = resolveDueInput(trimmed, meetingDate);
  if (!resolved || !parseJalaliKey(resolved.key)) {
    return {
      ok: false,
      due: null,
      error: 'مهلت را واضح بنویسید؛ مثلاً «پنجشنبه»، «پایان هفته» یا «۱۴۰۵/۰۹/۰۱».',
    };
  }
  return { ok: true, due: resolved.key };
}
