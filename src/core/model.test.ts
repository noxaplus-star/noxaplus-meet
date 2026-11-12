import { describe, expect, it } from 'vitest';
import { analyzeTranscript } from './analyze';
import {
  cloneMinutes,
  createEmptyState,
  createMeeting,
  duplicateMeeting,
  emptyMinutes,
  isAnalysisStale,
  isSameTitle,
  meetingSignature,
  participantList,
  sanitizeParticipantsText,
  uniqueParticipants,
  validateMeetingDate,
} from './model';
import { SAMPLES } from './sample';

describe('meeting model', () => {
  it('creates meetings with safe defaults', () => {
    const meeting = createMeeting();
    expect(meeting.meta.title).toBe('جلسهٔ بدون عنوان');
    expect(validateMeetingDate(meeting.meta.date)).toBe(true);
    expect(meeting.transcript).toBe('');
    expect(meeting.stats).toBeNull();
    expect(meeting.minutes.actions).toEqual([]);
    expect(meeting.id.startsWith('meeting-')).toBe(true);
  });

  it('keeps a valid supplied date and fallback for invalid dates', () => {
    expect(createMeeting({ date: '1405-08-21' }).meta.date).toBe('1405-08-21');
    expect(validateMeetingDate(createMeeting({ date: 'bad' }).meta.date)).toBe(true);
    expect(createMeeting({ title: '  ', date: '1405-08-21' }).meta.title).toBe('جلسهٔ بدون عنوان');
  });

  it('creates an empty state with an active meeting', () => {
    const state = createEmptyState();
    expect(state.meetings).toHaveLength(1);
    expect(state.activeId).toBe(state.meetings[0].id);
    expect(state.settings.autoAnalyze).toBe(false);
    expect(state.version).toBe(1);
  });

  it('duplicates meetings without sharing ids', () => {
    const meeting = createMeeting({ title: 'جلسهٔ اصلی', date: '1405-08-21' });
    const analysis = analyzeTranscript(SAMPLES[0].transcript, '1405-08-21', []);
    meeting.minutes = analysis.minutes;
    meeting.stats = analysis.stats;

    const copy = duplicateMeeting(meeting);
    expect(copy.id).not.toBe(meeting.id);
    expect(copy.meta.title).toContain('کپی');
    expect(copy.minutes.actions).toHaveLength(meeting.minutes.actions.length);
    expect(copy.minutes.actions[0].id).not.toBe(meeting.minutes.actions[0].id);
    expect(copy.minutes.actions[0].text).toBe(meeting.minutes.actions[0].text);
    expect(copy.stats).not.toBe(meeting.stats);
    expect(copy.stats?.signature).toBe(meeting.stats?.signature);
  });

  it('clones minutes with fresh ids', () => {
    const analysis = analyzeTranscript(SAMPLES[0].transcript, '1405-08-21', []);
    const clone = cloneMinutes(analysis.minutes);
    expect(clone.decisions).toHaveLength(analysis.minutes.decisions.length);
    expect(clone.decisions[0].id).not.toBe(analysis.minutes.decisions[0].id);
    expect(clone.decisions[0].text).toBe(analysis.minutes.decisions[0].text);
    expect(clone.actions[0].owner).toBe(analysis.minutes.actions[0].owner);
  });

  it('returns empty minutes', () => {
    const minutes = emptyMinutes();
    expect(Object.values(minutes).every((list) => list.length === 0)).toBe(true);
  });

  it('detects stale analysis', () => {
    const meeting = createMeeting({ date: '1405-08-21' });
    expect(isAnalysisStale(meeting)).toBe(false);

    const analysis = analyzeTranscript(SAMPLES[0].transcript, '1405-08-21', []);
    meeting.transcript = SAMPLES[0].transcript;
    meeting.stats = analysis.stats;
    expect(isAnalysisStale(meeting)).toBe(false);

    meeting.transcript += '\nیک خط جدید.';
    expect(isAnalysisStale(meeting)).toBe(true);

    meeting.transcript = SAMPLES[0].transcript;
    meeting.meta.date = '1405-08-22';
    expect(isAnalysisStale(meeting)).toBe(true);
  });

  it('builds a signature from transcript, date and normalized participants', () => {
    const meeting = createMeeting({ date: '1405-08-21', transcript: 'متن', participants: [' علي رضايي ', ''] });
    expect(meetingSignature(meeting)).toBe('متن|1405-08-21|["علی رضایی"]');
  });

  it('detects participant edits while keeping current analysis fresh', () => {
    const meeting = createMeeting({
      date: '1405-08-21', transcript: 'مریم باید فایل را ارسال کند.', participants: ['مریم محمدی'],
    });
    const analysis = analyzeTranscript(meeting.transcript, meeting.meta.date, meeting.meta.participants);
    meeting.stats = analysis.stats;
    expect(isAnalysisStale(meeting)).toBe(false);
    expect(analysis.minutes.actions[0].owner).toBe('مریم محمدی');
    for (const participants of [['مریم محمدی', 'سارا محمدی'], ['مریم کاظمی'], []]) {
      meeting.meta.participants = participants;
      expect(isAnalysisStale(meeting)).toBe(true);
      expect(analyzeTranscript(meeting.transcript, meeting.meta.date, participants).stats.signature).not.toBe(analysis.stats.signature);
    }
  });

  it('ignores equivalent participant spelling, whitespace and duplicates in signatures', () => {
    const meeting = createMeeting({
      date: '1405-08-21', transcript: 'علی باید فایل را ارسال کند.', participants: ['علی رضایی'],
    });
    meeting.stats = analyzeTranscript(meeting.transcript, meeting.meta.date, meeting.meta.participants).stats;
    meeting.meta.participants = [' علي   رضايي ', '', 'علی رضایی'];
    expect(isAnalysisStale(meeting)).toBe(false);
    expect(analyzeTranscript(meeting.transcript, meeting.meta.date, meeting.meta.participants).stats.signature).toBe(meeting.stats.signature);
  });

  it('normalises participant lists', () => {
    const meeting = createMeeting({
      participants: [' سارا محمدی ', '', 'علی رضایی'],
    });
    expect(participantList(meeting)).toEqual(['سارا محمدی', 'علی رضایی']);
    expect(sanitizeParticipantsText('سارا محمدی، علی رضایی، سارا محمدی')).toEqual([
      'سارا محمدی',
      'علی رضایی',
    ]);
    expect(sanitizeParticipantsText('نگار احمدی\nحسین توکلی')).toEqual([
      'نگار احمدی',
      'حسین توکلی',
    ]);
    expect(uniqueParticipants(['الف', ' ب ', 'الف', ''])).toEqual(['الف', 'ب']);
  });

  it('compares titles after normalisation', () => {
    expect(isSameTitle('جلسهٔ محصول', 'جلسه محصول')).toBe(true);
    expect(isSameTitle('جلسهٔ محصول', 'جلسهٔ فروش')).toBe(false);
  });

  it('validates Jalali meeting dates', () => {
    expect(validateMeetingDate('1405-08-21')).toBe(true);
    expect(validateMeetingDate('1404-12-30')).toBe(false);
    expect(validateMeetingDate('')).toBe(false);
  });
});
