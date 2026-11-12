import { toPersianDigits } from './core/digits';
import { formatJalaliKey } from './core/jalali';

export function formatCount(value: number): string {
  return toPersianDigits(value.toLocaleString('en-US'));
}

export function formatDate(key: string): string {
  return formatJalaliKey(key, { style: 'long' });
}

export function formatDateWeekday(key: string): string {
  return formatJalaliKey(key, { style: 'weekday' });
}

export function formatDuration(mins: number | null): string {
  if (!mins) return '—';
  return `${toPersianDigits(String(mins))} دقیقه`;
}

export function formatRelative(timestamp: number, now = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'همین حالا';
  if (diff < hour) return `${toPersianDigits(String(Math.floor(diff / minute)))} دقیقه پیش`;
  if (diff < day) return `${toPersianDigits(String(Math.floor(diff / hour)))} ساعت پیش`;
  if (diff < 7 * day) return `${toPersianDigits(String(Math.floor(diff / day)))} روز پیش`;
  return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(timestamp),
  );
}

export function durationLabel(mins: number | null): string {
  return mins ? formatDuration(mins) : 'بدون مدت';
}

export function transcriptSize(chars: number): string {
  return `${formatCount(chars)} نویسه`;
}
