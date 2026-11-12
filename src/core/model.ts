import { createId } from './ids';
import { formatJalali, jalaliKey, isValidJalaliDate, parseJalaliKey, todayJalali } from './jalali';
import { hashText, normalizeForCompare } from './normalize';
import type { Meeting, MeetState, Minutes } from './types';

export const APP_VERSION = 1;

export function emptyMinutes(): Minutes {
  return { summary: [], decisions: [], actions: [], questions: [], risks: [], topics: [] };
}

export function createMeeting(options: {
  title?: string;
  date?: string;
  transcript?: string;
  participants?: string[];
} = {}): Meeting {
  const now = Date.now();
  const today = jalaliKey(todayJalali());
  const date = options.date && parseJalaliKey(options.date) ? options.date : today;
  return {
    id: createId('meeting'),
    createdAt: now,
    updatedAt: now,
    meta: {
      title: options.title?.trim() || 'جلسهٔ بدون عنوان',
      date,
      startTime: '',
      durationMins: null,
      participants: options.participants ?? [],
      chair: '',
    },
    transcript: options.transcript ?? '',
    minutes: emptyMinutes(),
    stats: null,
  };
}

export function cloneMinutes(minutes: Minutes): Minutes {
  return {
    summary: minutes.summary.map((item) => ({ ...item, id: createId('summary') })),
    decisions: minutes.decisions.map((item) => ({ ...item, id: createId('decision') })),
    actions: minutes.actions.map((item) => ({ ...item, id: createId('action') })),
    questions: minutes.questions.map((item) => ({ ...item, id: createId('question') })),
    risks: minutes.risks.map((item) => ({ ...item, id: createId('risk') })),
    topics: minutes.topics.map((item) => ({ ...item, id: createId('topic') })),
  };
}

export function duplicateMeeting(meeting: Meeting): Meeting {
  const now = Date.now();
  const today = formatJalali(todayJalali(), { style: 'long' });
  return {
    ...meeting,
    id: createId('meeting'),
    createdAt: now,
    updatedAt: now,
    meta: { ...meeting.meta, title: `${meeting.meta.title} — کپی ${today}` },
    minutes: cloneMinutes(meeting.minutes),
    stats: meeting.stats ? { ...meeting.stats } : null,
  };
}

export function createEmptyState(): MeetState {
  const meeting = createMeeting();
  return {
    version: APP_VERSION,
    meetings: [meeting],
    activeId: meeting.id,
    settings: { theme: prefersDark() ? 'dark' : 'light', autoAnalyze: false },
    updatedAt: Date.now(),
  };
}

export function prefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
}

export function analysisSignature(transcript: string, meetingDate: string, participants: string[]): string {
  const normalizedParticipants = [...new Set(participants.map(normalizeForCompare).filter(Boolean))];
  return `${transcript}|${meetingDate}|${JSON.stringify(normalizedParticipants)}`;
}

export function meetingSignature(meeting: Meeting): string {
  return analysisSignature(meeting.transcript, meeting.meta.date, meeting.meta.participants);
}

export function isAnalysisStale(meeting: Meeting): boolean {
  if (!meeting.stats) return false;
  return meeting.stats.signature !== hashText(meetingSignature(meeting));
}

export function participantList(meeting: Meeting): string[] {
  return meeting.meta.participants.map((name) => name.trim()).filter((name) => name.length > 0);
}

export function uniqueParticipants(participants: string[]): string[] {
  return [...new Set(participants.map((name) => name.trim()).filter(Boolean))];
}

export function sanitizeParticipantsText(value: string): string[] {
  return uniqueParticipants(value.split(/[،,;؛\n]/));
}

export function isSameTitle(a: string, b: string): boolean {
  return normalizeForCompare(a) === normalizeForCompare(b);
}

export function validateMeetingDate(key: string): boolean {
  const date = parseJalaliKey(key);
  return Boolean(date && isValidJalaliDate(date.jy, date.jm, date.jd));
}
