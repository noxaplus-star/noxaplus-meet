import { describe, expect, it } from 'vitest';
import { analyzeTranscript, ENGINE_VERSION } from './analyze';
import { SAMPLES } from './sample';
import type { ActionItem } from './types';

const dates: Record<string, string> = {
  'product-weekly': '1405-08-21',
  'incident-review': '1405-08-18',
  'campaign-planning': '1405-08-15',
};

function analyzeSample(id: string) {
  const sample = SAMPLES.find((entry) => entry.id === id);
  if (!sample) throw new Error(`Unknown sample ${id}`);
  return analyzeTranscript(sample.transcript, dates[id], []);
}

function actionContaining(actions: ActionItem[], needle: string): ActionItem | undefined {
  return actions.find((action) => action.text.includes(needle));
}

describe('minutes analyzer on sample transcripts', () => {
  it('extracts a complete product meeting', () => {
    const result = analyzeSample('product-weekly');
    expect(result.metadata.title).toContain('نسخهٔ ۲.۴');
    expect(result.metadata.durationMins).toBe(45);
    expect(result.metadata.participants).toHaveLength(5);
    expect(result.speakers).toHaveLength(5);
    expect(result.warnings).toEqual([]);
    expect(result.minutes.summary).toHaveLength(5);
    expect(result.minutes.decisions).toHaveLength(4);
    expect(result.minutes.actions).toHaveLength(9);
    expect(actionContaining(result.minutes.actions, 'باید بازخورد سه مشتری سازمانی')?.owner).toBe('');
    expect(actionContaining(result.minutes.actions, 'متن را تا چهارشنبه آماده می‌کنم')?.owner).toBe('نگار احمدی');
    expect(result.minutes.questions).toHaveLength(2);
    expect(result.minutes.risks).toHaveLength(3);
    expect(result.minutes.topics).toHaveLength(2);
    expect(result.stats.engineVersion).toBe(ENGINE_VERSION);
    expect(result.stats.words).toBeGreaterThan(250);
    expect(result.stats.sentences).toBe(26);
    expect(result.stats.readingMinutes).toBeGreaterThanOrEqual(2);
  });

  it('assigns owners and deadlines on the product meeting', () => {
    const { minutes } = analyzeSample('product-weekly');
    const bugs = actionContaining(minutes.actions, 'باگ');
    expect(bugs?.owner).toBe('علی رضایی');
    expect(bugs?.due).toBe('1405-08-26');
    expect(bugs?.confidence).toBe('high');

    const script = actionContaining(minutes.actions, 'اسکریپت بازگشت');
    expect(script?.owner).toBe('حسین توکلی');
    expect(script?.due).toBe('1405-08-25');

    const feedback = actionContaining(minutes.actions, 'بازخورد مشتریان');
    expect(feedback?.owner).toBe('مریم کاظمی');
    expect(feedback?.due).toBe('1405-08-28');

    const copy = actionContaining(minutes.actions, 'صفحهٔ تغییرات');
    expect(copy?.owner).toBe('نگار احمدی');
    expect(copy?.due).toBe('1405-08-27');

    const email = actionContaining(minutes.actions, 'ایمیل اطلاع');
    expect(email?.owner).toBe('نگار احمدی');

    const traffic = actionContaining(minutes.actions, 'پایش ترافیک');
    expect(traffic?.owner).toBe('حسین توکلی');
  });

  it('extracts decisions, questions and risks from the incident review', () => {
    const result = analyzeSample('incident-review');
    expect(result.minutes.decisions).toHaveLength(4);
    expect(result.minutes.actions).toHaveLength(4);
    expect(result.minutes.questions).toHaveLength(1);
    expect(result.minutes.risks).toHaveLength(3);
    expect(result.minutes.topics[0].title).toContain('قطعی سرویس گزارش');
    expect(result.minutes.questions[0].askedBy).toBe('نگار احمدی');
    expect(result.minutes.risks[0].confidence).toBe('high');

    const docs = actionContaining(result.minutes.actions, 'مستندات');
    expect(docs?.due).toBe('1405-08-25');
    expect(docs?.owner).toBe('');

    const postmortem = actionContaining(result.minutes.actions, 'گزارش پس‌مرگ');
    expect(postmortem?.owner).toBe('علی رضایی');
    expect(postmortem?.due).toBe('1405-08-25');

    const responsible = actionContaining(result.minutes.actions, 'مسئول تکمیل مستندات');
    expect(responsible?.owner).toBe('نگار احمدی');
    expect(responsible?.confidence).toBe('high');
  });

  it('does not turn scheduling decisions into action items', () => {
    const result = analyzeSample('incident-review');
    expect(actionContaining(result.minutes.actions, 'تست بازگشت را قبل')).toBeUndefined();
    expect(actionContaining(result.minutes.actions, 'جلسهٔ بازبینی دوم')).toBeUndefined();

    const campaign = analyzeSample('campaign-planning');
    expect(actionContaining(campaign.minutes.actions, 'جلسهٔ بازبینی نهایی')).toBeUndefined();
  });

  it('keeps assigned actions from decisions', () => {
    const result = analyzeSample('incident-review');
    const payment = actionContaining(result.minutes.actions, 'جداسازی ذخیره‌سازی');
    expect(payment?.owner).toBe('نگار احمدی');
    expect(payment?.due).toBe('1405-08-21');
  });

  it('extracts the campaign plan with explicit deadlines', () => {
    const result = analyzeSample('campaign-planning');
    expect(result.minutes.decisions).toHaveLength(4);
    expect(result.minutes.actions).toHaveLength(6);
    expect(actionContaining(result.minutes.actions, 'پیش‌نویس صفحهٔ فرود را آماده کرده‌ام')?.owner).toBe('مریم کاظمی');
    expect(result.minutes.questions).toHaveLength(1);
    expect(result.minutes.risks).toHaveLength(1);
    expect(result.minutes.topics).toHaveLength(2);

    const videos = actionContaining(result.minutes.actions, 'ویدیوی کوتاه');
    expect(videos?.due).toBe('1405-08-23');
    expect(videos?.owner).toBe('');

    const budget = actionContaining(result.minutes.actions, 'امیرحسین تا چهارشنبه');
    expect(budget?.owner).toBe('امیرحسین صادقی');
    expect(budget?.due).toBe('1405-08-20');

    const budgetRequest = actionContaining(result.minutes.actions, 'باید درخواست بودجه');
    expect(budgetRequest?.owner).toBe('');
    expect(budgetRequest?.due).toBe('1405-08-21');

    const costs = actionContaining(result.minutes.actions, 'گزارش هزینه');
    expect(costs?.owner).toBe('امیرحسین صادقی');
    expect(costs?.due).toBe('1405-08-18');

    const responsible = actionContaining(result.minutes.actions, 'مسئول هماهنگی انتشار');
    expect(responsible?.owner).toBe('مریم کاظمی');
  });

  it('produces a stable signature for the same input', () => {
    const first = analyzeSample('product-weekly');
    const second = analyzeSample('product-weekly');
    expect(first.stats.signature).toBe(second.stats.signature);
    expect(analyzeTranscript(SAMPLES[0].transcript, '1405-08-22', []).stats.signature).not.toBe(
      first.stats.signature,
    );
  });
});

describe('minutes analyzer edge cases', () => {
  it('extracts a named owner from a vocative', () => {
    const result = analyzeTranscript(
      'سارا محمدی: مریم، لطفاً گزارش را تا دوشنبه ارسال کن.\nمریم کاظمی: انجام می‌شود.',
      '1405-08-21',
      [],
    );
    const action = actionContaining(result.minutes.actions, 'گزارش را تا دوشنبه');
    expect(action?.owner).toBe('مریم کاظمی');
    expect(action?.due).toBe('1405-08-25');
  });

  it('extracts an owner from a responsibility clause', () => {
    const result = analyzeTranscript(
      'سارا محمدی: مسئول ارسال گزارش نگار است.\nنگار احمدی: گزارش را تا فردا ارسال می‌کنم.',
      '1405-08-21',
      [],
    );
    const action = actionContaining(result.minutes.actions, 'مسئول ارسال گزارش');
    expect(action?.owner).toBe('نگار احمدی');
  });

  it.each(['آماده', 'آموزش', 'ارائه'])('extracts normalized action verb %s', (verb) => {
    const result = analyzeTranscript(`علی: من فایل را ${verb} می‌کنم.`, '1405-08-21', []);
    expect(result.minutes.actions).toHaveLength(1);
    expect(result.minutes.actions[0].owner).toBe('علی');
    expect(result.minutes.actions[0].text).toBe(`من فایل را ${verb} می‌کنم.`);
  });

  it.each([
    'اقدام: مالک: مریم محمدی، فایل را ارسال کند.',
    'اقدام: مالک: مريم محمدي، فایل را ارسال کند.',
    'اقدام: مریم محمدی باید فایل را ارسال کند.',
    'اقدام: ارسال فایل با مریم محمدی است.',
  ])('prioritizes full participant names in %s', (text) => {
    for (const participants of [['سارا محمدی', 'مریم محمدی'], ['مریم محمدی', 'سارا محمدی']]) {
      const result = analyzeTranscript(text, '1405-08-21', participants);
      expect(result.minutes.actions).toHaveLength(1);
      expect(result.minutes.actions[0].owner).toBe('مریم محمدی');
    }
  });

  it('does not map an ambiguous surname to an arbitrary participant', () => {
    const participants = ['سارا محمدی', 'مریم محمدی'];
    const mentioned = analyzeTranscript('باید محمدی فایل را ارسال کند.', '1405-08-21', participants);
    expect(mentioned.minutes.actions[0].owner).toBe('');
    const explicit = analyzeTranscript('اقدام: مالک: محمدی، فایل را ارسال کند.', '1405-08-21', participants);
    expect(explicit.minutes.actions[0].owner).toBe('محمدی');
  });

  it('resolves an unambiguous partial name', () => {
    const result = analyzeTranscript('مریم باید فایل را ارسال کند.', '1405-08-21', ['سارا محمدی', 'مریم محمدی']);
    expect(result.minutes.actions[0].owner).toBe('مریم محمدی');
  });

  it('resolves a punctuation-ended deadline in an action', () => {
    const result = analyzeTranscript('علی: من فایل را ارسال می‌کنم تا فردا.', '1405-08-21', []);
    expect(result.minutes.actions[0].due).toBe('1405-08-22');
  });

  it('uses the speaker for a first-person action', () => {
    const result = analyzeTranscript(
      'سارا محمدی: من تا سه‌شنبه گزارش را ارسال می‌کنم.',
      '1405-08-21',
      [],
    );
    const action = result.minutes.actions[0];
    expect(action.owner).toBe('سارا محمدی');
    expect(action.due).toBe('1405-08-26');
  });

  it('does not guess an owner for first-person plural work', () => {
    const result = analyzeTranscript(
      'سارا محمدی: باید گزارش را تا فردا ارسال کنیم.',
      '1405-08-21',
      [],
    );
    expect(result.minutes.actions[0].owner).toBe('');
    expect(result.minutes.actions[0].due).toBe('1405-08-22');
  });

  it('accepts an explicit action prefix', () => {
    const result = analyzeTranscript(
      'سارا محمدی: اقدام: نگار تا فردا گزارش را ارسال کند.',
      '1405-08-21',
      ['نگار احمدی', 'سارا محمدی'],
    );
    const action = result.minutes.actions[0];
    expect(action.owner).toBe('نگار احمدی');
    expect(action.due).toBe('1405-08-22');
    expect(action.confidence).toBe('high');
  });

  it('ignores proposals as actions', () => {
    const result = analyzeTranscript(
      'سارا محمدی: پیشنهاد می‌کنم صفحهٔ فرود بازنویسی شود.',
      '1405-08-21',
      [],
    );
    expect(result.minutes.actions).toHaveLength(0);
  });

  it('handles an unlabeled transcript', () => {
    const result = analyzeTranscript('باید گزارش را تا فردا ارسال کنیم.', '1405-08-21', []);
    expect(result.warnings.some((warning) => warning.includes('گوینده'))).toBe(true);
    expect(result.minutes.actions[0].owner).toBe('');
  });

  it('marks questions and askedBy', () => {
    const result = analyzeTranscript(
      'علی رضایی: آیا نسخهٔ موبایل هم منتشر می‌شود؟',
      '1405-08-21',
      [],
    );
    expect(result.minutes.questions[0].askedBy).toBe('علی رضایی');
  });

  it('deduplicates repeated lines', () => {
    const line = 'سارا محمدی: تصمیم گرفتیم انتشار به تعویق بیفتد.';
    const result = analyzeTranscript(`${line}\n${line}`, '1405-08-21', []);
    expect(result.minutes.decisions).toHaveLength(1);
  });

  it('derives topics from the meeting title when no topic is stated', () => {
    const result = analyzeTranscript(
      'عنوان: جلسهٔ بودجه\n\nسارا محمدی: گزارش را تا فردا ارسال می‌کنم.',
      '1405-08-21',
      [],
    );
    expect(result.minutes.topics[0].title).toBe('جلسهٔ بودجه');
  });
});
