import { describe, expect, it } from 'vitest';
import { parseTranscript, sentenceAt, UNKNOWN_SPEAKER } from './transcript';

const transcript = `عنوان: جلسهٔ تست
تاریخ: ۱۴۰۵/۰۸/۲۱
ساعت شروع: ۹:۳۰
مدت: ۴۵ دقیقه
حاضرین: سارا محمدی، علی رضایی

- 09:00 سارا محمدی: سلام. نسخهٔ ۲.۴ آماده است؟
علی رضایی: **بله**؛ تست‌ها تمام شده‌اند.
ادامهٔ توضیح بدون نام.`;

describe('transcript parser', () => {
  it('reads metadata lines', () => {
    const parsed = parseTranscript(transcript);
    expect(parsed.metadata.title).toBe('جلسهٔ تست');
    expect(parsed.metadata.date).toBe('1405-08-21');
    expect(parsed.metadata.startTime).toBe('09:30');
    expect(parsed.metadata.durationMins).toBe(45);
    expect(parsed.metadata.participants).toEqual(['سارا محمدی', 'علی رضایی']);
    expect(parsed.metadata.chair).toBeNull();
  });

  it.each(['9999/12/01', '9999/01/01', '3178/12/01', '۱ اسفند ۹۹۹۹'])('omits invalid metadata date %s without throwing', (date) => {
    const parsed = parseTranscript(`تاریخ: ${date}\nعلی: من فایل را آماده می‌کنم.`);
    expect(parsed.metadata.date).toBeNull();
    expect(parsed.sentences[0].text).toBe('من فایل را آماده می‌کنم.');
  });

  it.each([
    ['۱', 1], ['۱۴۴۰', 1440], ['۶۰۱', 601], ['۲۴ ساعت', 1440],
    ['۱ ساعت و ۳۰ دقیقه', 90], ['۴۵ دقیقه', 45], ['۱۴۴۰ دقیقه', 1440],
    ['00:01', 1], ['24:00', 1440], ['01.30', 90],
  ])('accepts bounded integer duration %s', (duration, expected) => {
    expect(parseTranscript(`مدت: ${duration}`).metadata.durationMins).toBe(expected);
  });

  it.each([
    '۰', '۰ دقیقه', '۰ ساعت', '00:00', '۹۹ ساعت', '99:00', '24:01',
    '۱۴۴۱', '۱۴۴۱ دقیقه', '۲۴ ساعت و ۱ دقیقه', '-1', '1.5', '1.5 ساعت', '00:99',
  ])('omits invalid or out-of-range duration %s', (duration) => {
    expect(parseTranscript(`مدت: ${duration}`).metadata.durationMins).toBeNull();
  });

  it('detects speakers, bullets and timestamps', () => {
    const parsed = parseTranscript(transcript);
    expect(parsed.speakers).toEqual(['سارا محمدی', 'علی رضایی']);
    expect(parsed.segments).toHaveLength(3);
    expect(parsed.segments[0].speaker).toBe('سارا محمدی');
    expect(parsed.segments[0].text).toContain('نسخهٔ ۲.۴ آماده است؟');
    expect(parsed.segments[1].speaker).toBe('علی رضایی');
    expect(parsed.segments[2].speaker).toBe('علی رضایی');
  });

  it('keeps decimals inside a sentence and splits real sentence endings', () => {
    const parsed = parseTranscript(transcript);
    expect(parsed.sentences.some((sentence) => sentence.text.includes('نسخهٔ ۲.۴ آماده است؟'))).toBe(
      true,
    );
    expect(parsed.sentences[0].text).toBe('سلام.');
    expect(parsed.sentences[1].text).toContain('نسخهٔ ۲.۴ آماده است؟');
  });

  it('warns when a line has no speaker label', () => {
    const parsed = parseTranscript(transcript);
    expect(parsed.warnings.some((warning) => warning.includes('بدون نام گوینده'))).toBe(true);
  });

  it('does not treat cue labels as speakers', () => {
    const parsed = parseTranscript('تصمیم: انتشار به تعویق می‌افتد.\nاقدام: گزارش ارسال شود.');
    expect(parsed.speakers).toEqual([]);
    expect(parsed.segments.every((segment) => segment.speaker === UNKNOWN_SPEAKER)).toBe(true);
  });

  it('parses bold speaker labels and timestamps', () => {
    const parsed = parseTranscript('**[09:15] نگار احمدی:** گزارش آماده است.');
    expect(parsed.speakers).toEqual(['نگار احمدی']);
    expect(parsed.segments[0].text).toBe('گزارش آماده است.');
  });

  it('inherits the previous speaker across multiline speech', () => {
    const parsed = parseTranscript('سارا محمدی: جملهٔ اول.\nجملهٔ دوم ادامه دارد.');
    expect(parsed.segments).toHaveLength(2);
    expect(parsed.segments[1].speaker).toBe('سارا محمدی');
    expect(parsed.warnings.some((warning) => warning.includes('بدون نام گوینده'))).toBe(true);
  });

  it('reports empty transcripts', () => {
    const parsed = parseTranscript('   \n\n');
    expect(parsed.segments).toHaveLength(0);
    expect(parsed.sentences).toHaveLength(0);
    expect(parsed.warnings[0]).toContain('رونوشت خالی');
  });

  it('finds sentences by index', () => {
    const parsed = parseTranscript(transcript);
    expect(sentenceAt(parsed, 0)?.text).toBe('سلام.');
    expect(sentenceAt(parsed, 999)).toBeNull();
    expect(parsed.sentences.map((sentence) => sentence.index)).toEqual(
      parsed.sentences.map((_, index) => index),
    );
  });

  it.each(['\r\n', '\n', 'mixed'])('preserves original offsets with %s newlines', (newline) => {
    const lines = [
      'عنوان: جلسهٔ تست', '', '- 09:00 سارا محمدی: سلام. جملهٔ اول.',
      'علی رضایی: **بله**؛ گزارش آماده است.', '  ادامهٔ توضیح بدون نام.', '',
    ];
    const original = newline === 'mixed'
      ? lines.map((line, index) => line + (index < lines.length - 1 ? (index % 2 ? '\n' : '\r\n') : '')).join('')
      : lines.join(newline);
    const parsed = parseTranscript(original);
    expect(parsed.segments.map((segment) => segment.line)).toEqual([3, 4, 5]);
    expect(parsed.sentences).toHaveLength(4);
    for (const item of [...parsed.segments, ...parsed.sentences]) {
      expect(original.slice(item.start, item.end)).toBe(item.text);
      expect(item.start).toBe(original.indexOf(item.text));
    }
  });

  it('keeps offsets inside the original text', () => {
    const parsed = parseTranscript(transcript);
    for (const sentence of parsed.sentences) {
      expect(transcript.slice(sentence.start, sentence.end)).toBe(sentence.text);
    }
  });
});
