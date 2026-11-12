import { resolveDueInput } from './dates';
import { toLatinDigits, parseNumber } from './digits';
import { formatJalaliKey, todayJalali, jalaliKey } from './jalali';
import { normalizeForMatch } from './normalize';
import type { ParsedMetadata, ParsedTranscript, TranscriptSegment, TranscriptSentence } from './types';

export const UNKNOWN_SPEAKER = 'نامشخص';

const META_KEYS: { match: string[]; field: keyof ParsedMetadata }[] = [
  { match: ['عنوان', 'عنوان جلسه', 'موضوع جلسه'], field: 'title' },
  { match: ['تاریخ', 'تاریخ جلسه', 'روز جلسه'], field: 'date' },
  { match: ['ساعت شروع', 'ساعت', 'زمان شروع'], field: 'startTime' },
  { match: ['مدت', 'مدت جلسه', 'زمان جلسه'], field: 'durationMins' },
  { match: ['حاضرین', 'حاضران', 'شرکت کنندگان', 'شرکت‌کنندگان', 'اعضا'], field: 'participants' },
  { match: ['رئیس جلسه', 'رئیس', 'اداره کننده', 'اداره‌کننده'], field: 'chair' },
];

function emptyMetadata(): ParsedMetadata {
  return {
    title: null,
    date: null,
    startTime: null,
    durationMins: null,
    participants: [],
    chair: null,
  };
}

function splitParticipants(value: string): string[] {
  return value
    .split(/[،,;؛]|\s+و\s+/)
    .map((part) => part.trim().replace(/^[-•*]\s*/, ''))
    .filter((part) => part.length >= 2)
    .slice(0, 40);
}

function parseDuration(value: string): number | null {
  const text = normalizeForMatch(value);
  const clock = /^(\d{1,2})[:.](\d{2})$/.exec(text);
  const units = /^(?:(\d+)\s*ساعت\s*(?:و\s*)?)?(?:(\d+)\s*دقیقه)?$/.exec(text);
  let duration: number | null;
  if (clock) {
    if (Number(clock[2]) >= 60) return null;
    duration = Number(clock[1]) * 60 + Number(clock[2]);
  } else if (units) {
    duration = Number(units[1] ?? 0) * 60 + Number(units[2] ?? 0);
  } else {
    duration = parseNumber(value);
  }
  return duration !== null && Number.isInteger(duration) && duration >= 1 && duration <= 1440
    ? duration
    : null;
}

function parseDateValue(value: string): string | null {
  const today = jalaliKey(todayJalali());
  const resolved = resolveDueInput(value, today);
  return resolved ? resolved.key : null;
}

function parseMetaLine(rawLine: string): { field: keyof ParsedMetadata; value: string } | null {
  const line = rawLine
    .replace(/^\s*(?:[-*•#]+\s*)+/, '')
    .replace(/\*+/g, '')
    .trim();
  const match = /^([^:：]{2,32})[:：]\s*(.+)$/.exec(line);
  if (!match) return null;
  const key = normalizeForMatch(match[1]).replace(/\s+/g, ' ');
  for (const entry of META_KEYS) {
    if (entry.match.some((candidate) => normalizeForMatch(candidate) === key)) {
      return { field: entry.field, value: match[2].trim() };
    }
  }
  return null;
}

function looksLikeSpeakerName(name: string): boolean {
  const text = name.trim().replace(/\*+/g, '');
  if (text.length < 2 || text.length > 42) return false;
  if (/[.!؟?؛;]/.test(text)) return false;
  if (/\d/.test(text)) return false;
  if (/https?:|www\./i.test(text)) return false;
  if (/^\d+$/.test(text)) return false;
  const normalized = normalizeForMatch(text);
  if (!normalized) return false;
  if (normalized.includes('ساعت') || normalized.includes('تاریخ') || normalized.includes('مدت')) return false;
  if (
    /^(موضوع|عنوان|حاضرین|حاضران|شرکت کنندگان|رئیس|دبیر|نکته|نتیجه|جمع بندی|پیشنهاد|سوال|پاسخ|تصمیم|اقدام|ریسک|دستور|بند|گزارش|وضعیت|برنامه|هدف|مهلت|مسیول|مسیولیت|مالک|توضیح|مثال|خلاصه)$/.test(
      normalized,
    )
  ) {
    return false;
  }
  return /[آ-یa-z]/i.test(text);
}

function splitSentences(text: string): { text: string; start: number; end: number }[] {
  const out: { text: string; start: number; end: number }[] = [];
  let start = 0;

  const push = (from: number, to: number) => {
    const raw = text.slice(from, to);
    const trimmed = raw.trim();
    if (trimmed.length < 2) return;
    const leading = raw.length - raw.trimStart().length;
    out.push({ text: trimmed, start: from + leading, end: from + leading + trimmed.length });
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const isPunctuation = char === '.' || char === '!' || char === '?' || char === '؟' || char === '…';
    if (!isPunctuation) continue;
    if (char === '.' && /[0-9۰-۹٠-٩]/.test(text[index - 1] ?? '') && /[0-9۰-۹٠-٩]/.test(text[index + 1] ?? '')) {
      continue;
    }
    let end = index + 1;
    while (end < text.length && /[.!?؟…]/.test(text[end])) end += 1;
    while (end < text.length && /["'”’»)\]]/.test(text[end])) end += 1;
    push(start, end);
    start = end;
    index = end - 1;
  }
  if (start < text.length) push(start, text.length);

  return out;
}

export function parseTranscript(transcript: string): ParsedTranscript {
  const metadata = emptyMetadata();
  const segments: TranscriptSegment[] = [];
  const sentences: TranscriptSentence[] = [];
  const warnings: string[] = [];
  const speakers: string[] = [];
  const speakerSet = new Set<string>();
  let offset = 0;
  let previousSpeaker = '';
  let speakerLines = 0;
  let plainLines = 0;

  const lines = transcript.split(/\r?\n/);
  for (const [lineIndex, rawLine] of lines.entries()) {
    const lineStart = offset;
    const lineEnd = lineStart + rawLine.length;
    offset = lineEnd + (transcript[lineEnd] === '\r' ? 2 : transcript[lineEnd] === '\n' ? 1 : 0);

    if (!rawLine.trim()) continue;

    const meta = parseMetaLine(rawLine);
    if (meta) {
      if (meta.field === 'participants') metadata.participants = splitParticipants(meta.value);
      else if (meta.field === 'durationMins') metadata.durationMins = parseDuration(meta.value);
      else if (meta.field === 'date') metadata.date = parseDateValue(meta.value) ?? metadata.date;
      else if (meta.field === 'startTime') {
        const clock = /(\d{1,2}[:.]\d{2})/.exec(toLatinDigits(meta.value));
        metadata.startTime = clock ? clock[1].replace('.', ':').padStart(5, '0') : null;
      } else if (meta.field === 'title') metadata.title = meta.value;
      else if (meta.field === 'chair') metadata.chair = meta.value;
      continue;
    }

    let base = lineStart;
    let line = rawLine;
    const bullet = /^\s*(?:[-*•]\s+)/.exec(line);
    if (bullet) {
      base += bullet[0].length;
      line = line.slice(bullet[0].length);
    }

    const time = /^\*{0,2}\[?(\d{1,2}[:.]\d{2})\]?\*{0,2}\s*[-–—:]?\s*/.exec(line);
    if (time) {
      base += time[0].length;
      line = line.slice(time[0].length);
    }

    const speakerMatch = /^\s*\*{0,2}([^:：]{2,42}?)\*{0,2}\s*[:：]\s*(.*)$/.exec(line);
    let speaker = previousSpeaker;
    let content = line.trim();
    let contentStart = base + (line.length - line.trimStart().length);

    if (speakerMatch && looksLikeSpeakerName(speakerMatch[1])) {
      speaker = speakerMatch[1].replace(/\*+/g, '').trim();
      const rawContent = speakerMatch[2];
      let offset = base + speakerMatch[0].length - rawContent.length;
      offset += rawContent.length - rawContent.trimStart().length;
      const trimmedStart = rawContent.trimStart();
      const boldPrefix = /^\*+\s*/.exec(trimmedStart);
      if (boldPrefix) offset += boldPrefix[0].length;
      content = trimmedStart.slice(boldPrefix?.[0].length ?? 0).trimEnd();
      contentStart = offset;
      previousSpeaker = speaker;
      speakerLines += 1;
      if (speaker && !speakerSet.has(speaker)) {
        speakerSet.add(speaker);
        speakers.push(speaker);
      }
    } else {
      plainLines += 1;
      if (!speaker) speaker = UNKNOWN_SPEAKER;
    }

    if (!content) continue;

    segments.push({
      speaker,
      text: content,
      line: lineIndex + 1,
      start: contentStart,
      end: contentStart + content.length,
    });
  }

  for (const [segmentIndex, segment] of segments.entries()) {
    const parts = splitSentences(segment.text);
    for (const part of parts) {
      sentences.push({
        index: sentences.length,
        speaker: segment.speaker,
        text: part.text,
        start: segment.start + part.start,
        end: segment.start + part.end,
        segmentIndex,
      });
    }
  }

  if (!segments.length) warnings.push('رونوشت خالی است یا خط معتبری ندارد.');
  if (speakerLines === 0) warnings.push('هیچ برچسب گوینده‌ای پیدا نشد؛ همهٔ جمله‌ها به «نامشخص» نسبت داده شدند.');
  else if (plainLines > 0) warnings.push(`${plainLines} خط بدون نام گوینده بود و به گویندهٔ قبلی نسبت داده شد.`);

  return { metadata, segments, sentences, speakers, warnings };
}

export function sentenceAt(parsed: ParsedTranscript, index: number): TranscriptSentence | null {
  return parsed.sentences.find((sentence) => sentence.index === index) ?? null;
}

export function metadataDate(metadata: ParsedMetadata): string {
  return metadata.date ? formatJalaliKey(metadata.date) : '';
}
