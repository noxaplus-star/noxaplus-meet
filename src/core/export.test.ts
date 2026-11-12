import { describe, expect, it } from 'vitest';
import {
  actionStatusLabel,
  confidenceLabel,
  minutesToHtml,
  minutesToMarkdown,
  suggestedFilename,
} from './export';
import { createMeeting } from './model';
import type { Meeting } from './types';

function fixture(): Meeting {
  const meeting = createMeeting({ title: 'صورت‌جلسهٔ <script> & گزارش | مالی', date: '1405-08-21' });
  meeting.meta = {
    title: 'صورت‌جلسهٔ <script> & گزارش | مالی',
    date: '1405-08-21',
    startTime: '09:30',
    durationMins: 45,
    participants: ['سارا محمدی', 'نگار احمدی'],
    chair: 'سارا محمدی',
  };
  meeting.minutes = {
    summary: [{ id: 's1', text: 'انتشار نسخه به تعویق افتاد.', source: 1 }],
    decisions: [{ id: 'd1', text: 'انتشار به پنجشنبه موکول شد.', source: 1, confidence: 'high' }],
    actions: [
      {
        id: 'a1',
        text: 'ارسال گزارش | مالی',
        owner: 'نگار احمدی',
        due: '1405-08-25',
        status: 'open',
        source: 2,
        confidence: 'high',
      },
      {
        id: 'a2',
        text: 'پایان بازبینی فنی',
        owner: 'سارا محمدی',
        due: null,
        status: 'done',
        source: 3,
        confidence: 'medium',
      },
    ],
    questions: [
      { id: 'q1', text: 'آیا بودجه تصویب شد؟', askedBy: 'نگار احمدی', source: 4, confidence: 'high' },
    ],
    risks: [{ id: 'r1', text: 'تأخیر در تولید.', source: 5, confidence: 'medium' }],
    topics: [{ id: 't1', title: 'انتشار نسخه', source: 1 }],
  };
  meeting.stats = {
    chars: 120,
    words: 20,
    sentences: 2,
    speakers: 2,
    readingMinutes: 1,
    analyzedAt: 1700000000000,
    signature: 'abc',
    engineVersion: 1,
  };
  return meeting;
}

describe('Markdown export', () => {
  it('renders the full minutes document', () => {
    const text = minutesToMarkdown(fixture());
    expect(text).toContain('# صورت‌جلسهٔ <script> & گزارش | مالی');
    expect(text).toContain('تاریخ: ۲۱ آبان ۱۴۰۵');
    expect(text).toContain('ساعت شروع: ۰۹:۳۰');
    expect(text).toContain('مدت: ۴۵ دقیقه');
    expect(text).toContain('رئیس جلسه: سارا محمدی');
    expect(text).toContain('حاضرین: سارا محمدی، نگار احمدی');
    expect(text).toContain('## خلاصهٔ مدیریتی');
    expect(text).toContain('## تصمیم‌ها');
    expect(text).toContain('## اقدام‌ها');
    expect(text).toContain('## پرسش‌های باز');
    expect(text).toContain('## ریسک‌ها');
    expect(text).toContain('## موضوع‌های جلسه');
    expect(text).toContain('| ۱ | ارسال گزارش \\| مالی | نگار احمدی | ۲۵ آبان ۱۴۰۵ | باز |');
    expect(text).toContain('| ۲ | پایان بازبینی فنی | سارا محمدی | — | انجام‌شده |');
    expect(text).toContain('آیا بودجه تصویب شد؟ — نگار احمدی');
    expect(text).toContain('NoxaPlus Meet');
    expect(text).toContain('www.noxaplus.ir');
  });

  it('writes empty sections clearly', () => {
    const meeting = createMeeting({ title: 'جلسهٔ خالی', date: '1405-08-21' });
    const text = minutesToMarkdown(meeting);
    expect(text).toContain('_خلاصه‌ای ثبت نشده است._');
    expect(text).toContain('_تصمیمی ثبت نشده است._');
    expect(text).toContain('_اقدامی ثبت نشده است._');
    expect(text).toContain('_پرسشی ثبت نشده است._');
    expect(text).toContain('_ریسکی ثبت نشده است._');
    expect(text).toContain('_موضوعی ثبت نشده است._');
  });
});

describe('HTML export', () => {
  it('escapes untrusted transcript content', () => {
    const html = minutesToHtml(fixture());
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="fa"');
    expect(html).toContain('NoxaPlus Meet');
    expect(html).toContain('نگار احمدی');
    expect(html).toContain('۲۵ آبان ۱۴۰۵');
    expect(html).toContain('status-open');
    expect(html).toContain('status-done');
  });

  it('renders empty states', () => {
    const html = minutesToHtml(createMeeting({ title: 'خالی', date: '1405-08-21' }));
    expect(html).toContain('خلاصه‌ای ثبت نشده است.');
    expect(html).toContain('اقدامی ثبت نشده است.');
    expect(html).toContain('پرسشی ثبت نشده است.');
  });
});

describe('export helpers', () => {
  it('sanitises file names', () => {
    const meeting = createMeeting({ title: 'جلسه/مالی: نسخه ۲', date: '1405-08-21' });
    const name = suggestedFilename(meeting, 'md');
    expect(name.endsWith('.md')).toBe(true);
    expect(name).not.toMatch(/[\\/:*?"<>|]/);
    expect(name).toContain('1405-08-21');
  });

  it('labels statuses and confidence', () => {
    expect(actionStatusLabel('open')).toBe('باز');
    expect(actionStatusLabel('done')).toBe('انجام‌شده');
    expect(confidenceLabel('high')).toBe('اطمینان بالا');
    expect(confidenceLabel('medium')).toBe('نیازمند بازبینی');
  });
});
