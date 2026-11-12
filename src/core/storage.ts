import { parseJalaliKey } from './jalali';
import type {
  ActionItem,
  AnalysisStats,
  BackupFile,
  Confidence,
  MeetState,
  Meeting,
  Minutes,
  QuestionItem,
  SourceItem,
  SummaryLine,
  TopicItem,
} from './types';

export const STORAGE_KEY = 'noxaplus-meet-state-v1';
export const BACKUP_APP = 'NoxaPlus Meet';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isConfidence(value: unknown): value is Confidence {
  return value === 'high' || value === 'medium';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isSource(value: unknown): value is number {
  return value === -1 || isNonNegativeInteger(value);
}

function validateSourceItem(value: unknown, label: string): SourceItem | string {
  if (!isRecord(value) || !isNonEmptyString(value.id)) return `${label} شناسهٔ معتبر ندارد.`;
  if (!isNonEmptyString(value.text)) return `${label} متن معتبر ندارد.`;
  if (!isSource(value.source)) return `${label} ارجاع معتبر ندارد.`;
  if (!isConfidence(value.confidence)) return `${label} سطح اطمینان معتبر ندارد.`;
  return {
    id: value.id,
    text: value.text.trim(),
    source: value.source,
    confidence: value.confidence,
  };
}

function validateSummaryLine(value: unknown): SummaryLine | string {
  if (!isRecord(value) || !isNonEmptyString(value.id)) return 'یکی از خطوط خلاصه معتبر نیست.';
  if (!isNonEmptyString(value.text)) return 'متن یکی از خطوط خلاصه خالی است.';
  if (!isSource(value.source)) return 'ارجاع یکی از خطوط خلاصه معتبر نیست.';
  return { id: value.id, text: value.text.trim(), source: value.source };
}

function validateAction(value: unknown): ActionItem | string {
  const base = validateSourceItem(value, 'یکی از اقدام‌ها');
  if (typeof base === 'string') return base;
  const record = value as UnknownRecord;
  if (typeof record.owner !== 'string') return 'مسئول یکی از اقدام‌ها معتبر نیست.';
  if (record.due !== null && (typeof record.due !== 'string' || !parseJalaliKey(record.due))) {
    return 'مهلت یکی از اقدام‌ها معتبر نیست.';
  }
  if (record.status !== 'open' && record.status !== 'done') return 'وضعیت یکی از اقدام‌ها معتبر نیست.';
  return {
    ...base,
    owner: record.owner.trim(),
    due: record.due as string | null,
    status: record.status,
  };
}

function validateQuestion(value: unknown): QuestionItem | string {
  const base = validateSourceItem(value, 'یکی از پرسش‌ها');
  if (typeof base === 'string') return base;
  const record = value as UnknownRecord;
  if (typeof record.askedBy !== 'string') return 'پرسشگر یکی از پرسش‌ها معتبر نیست.';
  return { ...base, askedBy: record.askedBy.trim() };
}

function validateTopic(value: unknown): TopicItem | string {
  if (!isRecord(value) || !isNonEmptyString(value.id)) return 'یکی از موضوع‌ها معتبر نیست.';
  if (!isNonEmptyString(value.title)) return 'عنوان یکی از موضوع‌ها خالی است.';
  if (!isSource(value.source)) return 'ارجاع یکی از موضوع‌ها معتبر نیست.';
  return { id: value.id, title: value.title.trim(), source: value.source };
}

function validateMinutes(value: unknown): Minutes | string {
  if (!isRecord(value)) return 'ساختار صورت‌جلسه معتبر نیست.';
  if (!Array.isArray(value.summary)) return 'خلاصهٔ صورت‌جلسه معتبر نیست.';
  if (!Array.isArray(value.decisions)) return 'فهرست تصمیم‌ها معتبر نیست.';
  if (!Array.isArray(value.actions)) return 'فهرست اقدام‌ها معتبر نیست.';
  if (!Array.isArray(value.questions)) return 'فهرست پرسش‌ها معتبر نیست.';
  if (!Array.isArray(value.risks)) return 'فهرست ریسک‌ها معتبر نیست.';
  if (!Array.isArray(value.topics)) return 'فهرست موضوع‌ها معتبر نیست.';

  const summary: SummaryLine[] = [];
  for (const item of value.summary) {
    const line = validateSummaryLine(item);
    if (typeof line === 'string') return line;
    summary.push(line);
  }

  const decisions: SourceItem[] = [];
  for (const item of value.decisions) {
    const decision = validateSourceItem(item, 'یکی از تصمیم‌ها');
    if (typeof decision === 'string') return decision;
    decisions.push(decision);
  }

  const actions: ActionItem[] = [];
  for (const item of value.actions) {
    const action = validateAction(item);
    if (typeof action === 'string') return action;
    actions.push(action);
  }

  const questions: QuestionItem[] = [];
  for (const item of value.questions) {
    const question = validateQuestion(item);
    if (typeof question === 'string') return question;
    questions.push(question);
  }

  const risks: SourceItem[] = [];
  for (const item of value.risks) {
    const risk = validateSourceItem(item, 'یکی از ریسک‌ها');
    if (typeof risk === 'string') return risk;
    risks.push(risk);
  }

  const topics: TopicItem[] = [];
  for (const item of value.topics) {
    const topic = validateTopic(item);
    if (typeof topic === 'string') return topic;
    topics.push(topic);
  }

  return { summary, decisions, actions, questions, risks, topics };
}

function validateStats(value: unknown): AnalysisStats | string {
  if (!isRecord(value)) return 'آمار تحلیل معتبر نیست.';
  if (!isNonNegativeInteger(value.chars) || !isNonNegativeInteger(value.words)) {
    return 'آمار حجم متن معتبر نیست.';
  }
  if (!isNonNegativeInteger(value.sentences) || !isNonNegativeInteger(value.speakers)) {
    return 'آمار جمله‌ها یا گویندگان معتبر نیست.';
  }
  if (!isPositiveInteger(value.readingMinutes)) return 'زمان مطالعه معتبر نیست.';
  if (!isNonNegativeInteger(value.analyzedAt)) return 'زمان تحلیل معتبر نیست.';
  if (!isNonEmptyString(value.signature)) return 'امضای تحلیل معتبر نیست.';
  if (!isPositiveInteger(value.engineVersion)) return 'نسخهٔ موتور تحلیل معتبر نیست.';
  return {
    chars: value.chars,
    words: value.words,
    sentences: value.sentences,
    speakers: value.speakers,
    readingMinutes: value.readingMinutes,
    analyzedAt: value.analyzedAt,
    signature: value.signature,
    engineVersion: value.engineVersion,
  };
}

function validateMeeting(value: unknown, index: number): Meeting | string {
  if (!isRecord(value) || !isNonEmptyString(value.id)) return `جلسهٔ شمارهٔ ${index + 1} شناسه ندارد.`;
  if (!isNonNegativeInteger(value.createdAt) || !isNonNegativeInteger(value.updatedAt)) {
    return 'زمان ساخت یا ویرایش یکی از جلسه‌ها معتبر نیست.';
  }
  if (typeof value.transcript !== 'string') return 'رونوشت یکی از جلسه‌ها معتبر نیست.';
  if (!isRecord(value.meta)) return 'اطلاعات یکی از جلسه‌ها معتبر نیست.';

  const meta = value.meta;
  if (typeof meta.title !== 'string') return 'عنوان یکی از جلسه‌ها معتبر نیست.';
  if (typeof meta.date !== 'string' || !parseJalaliKey(meta.date)) {
    return 'تاریخ یکی از جلسه‌ها معتبر نیست.';
  }
  if (typeof meta.startTime !== 'string') return 'ساعت شروع یکی از جلسه‌ها معتبر نیست.';
  if (
    meta.durationMins !== null &&
    (!isPositiveInteger(meta.durationMins) || meta.durationMins > 24 * 60)
  ) {
    return 'مدت یکی از جلسه‌ها معتبر نیست.';
  }
  if (!isStringArray(meta.participants)) return 'فهرست حاضرین یکی از جلسه‌ها معتبر نیست.';
  if (typeof meta.chair !== 'string') return 'رئیس یکی از جلسه‌ها معتبر نیست.';

  const minutes = validateMinutes(value.minutes);
  if (typeof minutes === 'string') return minutes;

  let stats: AnalysisStats | null = null;
  if (value.stats !== null) {
    const parsed = validateStats(value.stats);
    if (typeof parsed === 'string') return parsed;
    stats = parsed;
  }

  return {
    id: value.id,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    meta: {
      title: meta.title.trim() || 'جلسهٔ بدون عنوان',
      date: meta.date,
      startTime: meta.startTime,
      durationMins: meta.durationMins as number | null,
      participants: meta.participants.map((name) => name.trim()).filter(Boolean),
      chair: meta.chair.trim(),
    },
    transcript: value.transcript,
    minutes,
    stats,
  };
}

export type MeetStateValidation = { ok: true; state: MeetState } | { ok: false; error: string };

export function validateState(value: unknown): MeetStateValidation {
  if (!isRecord(value)) return { ok: false, error: 'ساختار فایل معتبر نیست.' };
  if (value.version !== 1) return { ok: false, error: 'نسخهٔ فایل پشتیبان پشتیبانی نمی‌شود.' };
  if (!Array.isArray(value.meetings) || value.meetings.length === 0) {
    return { ok: false, error: 'حداقل یک جلسه لازم است.' };
  }
  if (!isRecord(value.settings)) return { ok: false, error: 'تنظیمات معتبر نیست.' };
  if (!isNonNegativeInteger(value.updatedAt)) return { ok: false, error: 'زمان به‌روزرسانی معتبر نیست.' };

  const meetings: Meeting[] = [];
  const ids = new Set<string>();
  for (const [index, item] of value.meetings.entries()) {
    const meeting = validateMeeting(item, index);
    if (typeof meeting === 'string') return { ok: false, error: meeting };
    if (ids.has(meeting.id)) return { ok: false, error: 'شناسهٔ جلسهٔ تکراری وجود دارد.' };
    ids.add(meeting.id);
    meetings.push(meeting);
  }

  if (value.activeId !== null && (typeof value.activeId !== 'string' || !ids.has(value.activeId))) {
    return { ok: false, error: 'جلسهٔ فعال معتبر نیست.' };
  }

  const settings = value.settings;
  if (settings.theme !== 'light' && settings.theme !== 'dark') {
    return { ok: false, error: 'تم انتخاب‌شده معتبر نیست.' };
  }
  if (typeof settings.autoAnalyze !== 'boolean') {
    return { ok: false, error: 'تنظیم تحلیل خودکار معتبر نیست.' };
  }

  return {
    ok: true,
    state: {
      version: 1,
      meetings,
      activeId: value.activeId as string | null,
      settings: { theme: settings.theme, autoAnalyze: settings.autoAnalyze },
      updatedAt: value.updatedAt,
    },
  };
}

function resolveStorage(storage?: StorageLike): StorageLike | undefined {
  if (storage) return storage;
  if (typeof window === 'undefined') return undefined;
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export interface LoadResult {
  state: MeetState | null;
  warning: string | null;
  recoveryData?: string;
  revision: string | null;
}

export function loadState(storage?: StorageLike): LoadResult {
  const store = resolveStorage(storage);
  if (!store) return { state: null, warning: 'حافظهٔ مرورگر در دسترس نیست.', revision: null };
  let raw: string | null = null;
  try {
    raw = store.getItem(STORAGE_KEY);
    if (raw === null) return { state: null, warning: null, revision: raw };
    const parsed: unknown = JSON.parse(raw);
    const result = validateState(parsed);
    if (!result.ok) return { state: null, warning: result.error, recoveryData: raw, revision: raw };
    return { state: result.state, warning: null, revision: raw };
  } catch {
    return { state: null, warning: 'دادهٔ ذخیره‌شده خوانده نشد.', ...(raw !== null ? { recoveryData: raw } : {}), revision: raw };
  }
}

export type SaveResult = { status: 'saved'; revision: string } | { status: 'conflict' | 'unavailable' };

export function saveStateIfUnchanged(state: MeetState, revision: string | null, storage?: StorageLike): SaveResult {
  const store = resolveStorage(storage);
  if (!store) return { status: 'unavailable' };
  try {
    if (store.getItem(STORAGE_KEY) !== revision) return { status: 'conflict' };
    const next = JSON.stringify(state);
    if (next !== revision) store.setItem(STORAGE_KEY, next);
    return { status: 'saved', revision: next };
  } catch {
    return { status: 'unavailable' };
  }
}

export function saveState(state: MeetState, storage?: StorageLike): boolean {
  const store = resolveStorage(storage);
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearState(storage?: StorageLike): void {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // Private modes can deny storage; the in-memory workspace still works.
  }
}

export function createBackup(state: MeetState, exportedAt = new Date()): BackupFile {
  return {
    app: BACKUP_APP,
    version: 1,
    exportedAt: exportedAt.toISOString(),
    state,
  };
}

export function serializeBackup(state: MeetState, exportedAt = new Date()): string {
  return JSON.stringify(createBackup(state, exportedAt), null, 2);
}

export function parseBackup(text: string): { state: MeetState } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: 'فایل پشتیبان JSON معتبر نیست.' };
  }
  if (!isRecord(parsed) || parsed.app !== BACKUP_APP) {
    return { error: 'این فایل پشتیبان NoxaPlus Meet نیست.' };
  }
  if (parsed.version !== 1) return { error: 'نسخهٔ فایل پشتیبان پشتیبانی نمی‌شود.' };
  const result = validateState(parsed.state);
  if (!result.ok) return { error: result.error };
  return { state: result.state };
}
