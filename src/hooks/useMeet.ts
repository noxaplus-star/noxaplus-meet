import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyzeTranscript } from '../core/analyze';
import { createId } from '../core/ids';
import {
  createEmptyState,
  createMeeting,
  duplicateMeeting as duplicateMeetingModel,
  emptyMinutes,
  isAnalysisStale,
  isSameTitle,
  prefersDark,
} from '../core/model';
import { metadataDate, parseTranscript } from '../core/transcript';
import { sampleById } from '../core/sample';
import { loadState, saveStateIfUnchanged, STORAGE_KEY } from '../core/storage';
import type {
  ActionItem,
  ActionStatus,
  Confidence,
  Decision,
  Meeting,
  MeetingMeta,
  MeetState,
  Minutes,
  QuestionItem,
  Risk,
  SummaryLine,
  Theme,
  TopicItem,
} from '../core/types';

export type MinutesSection = keyof Minutes;

export type MinutesItem =
  | SummaryLine
  | Decision
  | ActionItem
  | QuestionItem
  | Risk
  | TopicItem;

export interface ItemDraft {
  text?: string;
  title?: string;
  owner?: string;
  due?: string | null;
  askedBy?: string;
}

export interface ItemPatch extends ItemDraft {
  status?: ActionStatus;
  confidence?: Confidence;
}

export interface FocusRequest {
  index: number;
  nonce: number;
}

export type AnalyzeOutcome = 'ok' | 'empty' | 'missing';

function buildMeetingFromSample(sampleId: string): Meeting | null {
  const sample = sampleById(sampleId);
  if (!sample) return null;
  const parsed = parseTranscript(sample.transcript);
  const meeting = createMeeting({
    title: parsed.metadata.title ?? sample.name,
    date: metadataDate(parsed.metadata) || undefined,
    transcript: sample.transcript,
    participants: parsed.metadata.participants,
  });
  const result = analyzeTranscript(meeting.transcript, meeting.meta.date, meeting.meta.participants);
  meeting.minutes = result.minutes;
  meeting.stats = result.stats;
  meeting.meta.startTime = parsed.metadata.startTime ?? '';
  meeting.meta.durationMins = parsed.metadata.durationMins;
  meeting.meta.chair = parsed.metadata.chair ?? '';
  return meeting;
}

interface BootData {
  state: MeetState;
  warning: string | null;
  seeded: boolean;
  recoveryData: string | null;
  revision: string | null;
}

function boot(): BootData {
  const loaded = loadState();
  if (loaded.state) return { state: loaded.state, warning: loaded.warning, seeded: false, recoveryData: null, revision: loaded.revision };
  const meeting = buildMeetingFromSample('product-weekly') ?? createMeeting();
  const state: MeetState = {
    version: 1,
    meetings: [meeting],
    activeId: meeting.id,
    settings: { theme: prefersDark() ? 'dark' : 'light', autoAnalyze: false },
    updatedAt: Date.now(),
  };
  return { state, warning: loaded.warning, seeded: true, recoveryData: loaded.recoveryData ?? null, revision: loaded.revision };
}

function uniqueTitle(title: string, meetings: Meeting[]): string {
  const base = title.trim() || 'جلسهٔ بدون عنوان';
  if (!meetings.some((meeting) => isSameTitle(meeting.meta.title, base))) return base;
  let index = 2;
  while (meetings.some((meeting) => isSameTitle(meeting.meta.title, `${base} (${index})`))) {
    index += 1;
  }
  return `${base} (${index})`;
}

function withMeeting(
  state: MeetState,
  id: string | null,
  updater: (meeting: Meeting) => Meeting,
): MeetState {
  if (!id) return state;
  let found = false;
  const meetings = state.meetings.map((meeting) => {
    if (meeting.id !== id) return meeting;
    found = true;
    return { ...updater(meeting), updatedAt: Date.now() };
  });
  if (!found) return state;
  return { ...state, meetings, updatedAt: Date.now() };
}

function patchItem<T extends { id: string }>(items: T[], id: string, patch: Partial<T>): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

function patchMinutes(minutes: Minutes, section: MinutesSection, id: string, patch: ItemPatch): Minutes {
  switch (section) {
    case 'summary': {
      const next: Partial<SummaryLine> = {};
      if (patch.text !== undefined) next.text = patch.text;
      return { ...minutes, summary: patchItem(minutes.summary, id, next) };
    }
    case 'decisions': {
      const next: Partial<Decision> = {};
      if (patch.text !== undefined) next.text = patch.text;
      if (patch.confidence !== undefined) next.confidence = patch.confidence;
      return { ...minutes, decisions: patchItem(minutes.decisions, id, next) };
    }
    case 'actions': {
      const next: Partial<ActionItem> = {};
      if (patch.text !== undefined) next.text = patch.text;
      if (patch.owner !== undefined) next.owner = patch.owner;
      if (patch.due !== undefined) next.due = patch.due;
      if (patch.status !== undefined) next.status = patch.status;
      if (patch.confidence !== undefined) next.confidence = patch.confidence;
      return { ...minutes, actions: patchItem(minutes.actions, id, next) };
    }
    case 'questions': {
      const next: Partial<QuestionItem> = {};
      if (patch.text !== undefined) next.text = patch.text;
      if (patch.askedBy !== undefined) next.askedBy = patch.askedBy;
      return { ...minutes, questions: patchItem(minutes.questions, id, next) };
    }
    case 'risks': {
      const next: Partial<Risk> = {};
      if (patch.text !== undefined) next.text = patch.text;
      if (patch.confidence !== undefined) next.confidence = patch.confidence;
      return { ...minutes, risks: patchItem(minutes.risks, id, next) };
    }
    case 'topics': {
      const next: Partial<TopicItem> = {};
      if (patch.title !== undefined) next.title = patch.title;
      return { ...minutes, topics: patchItem(minutes.topics, id, next) };
    }
    default:
      return minutes;
  }
}

function addToMinutes(minutes: Minutes, section: MinutesSection, draft: ItemDraft): Minutes | null {
  const text = (draft.text ?? draft.title ?? '').trim();
  if (!text) return null;
  const id = createId(section);
  const base = { id, text, source: -1, confidence: 'high' as Confidence };
  switch (section) {
    case 'summary':
      return { ...minutes, summary: [...minutes.summary, { id, text, source: -1 }] };
    case 'decisions':
      return { ...minutes, decisions: [...minutes.decisions, base] };
    case 'actions':
      return {
        ...minutes,
        actions: [
          ...minutes.actions,
          {
            ...base,
            text,
            owner: draft.owner?.trim() ?? '',
            due: draft.due ?? null,
            status: 'open',
          },
        ],
      };
    case 'questions':
      return {
        ...minutes,
        questions: [...minutes.questions, { ...base, askedBy: draft.askedBy?.trim() ?? '' }],
      };
    case 'risks':
      return { ...minutes, risks: [...minutes.risks, base] };
    case 'topics':
      return { ...minutes, topics: [...minutes.topics, { id, title: text, source: -1 }] };
    default:
      return null;
  }
}

function appendToMinutes(minutes: Minutes, section: MinutesSection, item: MinutesItem): Minutes {
  switch (section) {
    case 'summary':
      return { ...minutes, summary: [...minutes.summary, item as SummaryLine] };
    case 'decisions':
      return { ...minutes, decisions: [...minutes.decisions, item as Decision] };
    case 'actions':
      return { ...minutes, actions: [...minutes.actions, item as ActionItem] };
    case 'questions':
      return { ...minutes, questions: [...minutes.questions, item as QuestionItem] };
    case 'risks':
      return { ...minutes, risks: [...minutes.risks, item as Risk] };
    case 'topics':
      return { ...minutes, topics: [...minutes.topics, item as TopicItem] };
    default:
      return minutes;
  }
}

function removeFromMinutes(minutes: Minutes, section: MinutesSection, id: string): Minutes {  switch (section) {
    case 'summary':
      return { ...minutes, summary: minutes.summary.filter((item) => item.id !== id) };
    case 'decisions':
      return { ...minutes, decisions: minutes.decisions.filter((item) => item.id !== id) };
    case 'actions':
      return { ...minutes, actions: minutes.actions.filter((item) => item.id !== id) };
    case 'questions':
      return { ...minutes, questions: minutes.questions.filter((item) => item.id !== id) };
    case 'risks':
      return { ...minutes, risks: minutes.risks.filter((item) => item.id !== id) };
    case 'topics':
      return { ...minutes, topics: minutes.topics.filter((item) => item.id !== id) };
    default:
      return minutes;
  }
}

export function useMeet() {
  const bootRef = useRef<BootData | null>(null);
  if (!bootRef.current) bootRef.current = boot();
  const bootData = bootRef.current;

  const [state, setState] = useState<MeetState>(bootData.state);
  const [storageWarning, setStorageWarning] = useState(bootData.warning);
  const [recoveryData, setRecoveryData] = useState(bootData.recoveryData);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const stateRef = useRef(state);
  const revisionRef = useRef(bootData.revision);
  const conflictRef = useRef(false);
  const toastShownRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const reportConflict = useCallback(() => {
    conflictRef.current = true;
    setStorageWarning('داده‌ها در تب دیگری تغییر کرده‌اند؛ ذخیرهٔ این تب متوقف شد. از دفتر فعلی پشتیبان بگیرید، سپس صفحه را بازخوانی کنید.');
  }, []);

  const persist = useCallback(async () => {
    if (recoveryData !== null || conflictRef.current) return;
    if (!navigator.locks) {
      setStorageWarning('ذخیرهٔ امن در این مرورگر در دسترس نیست؛ از نسخهٔ جدید مرورگر استفاده کنید و پیش از بستن صفحه پشتیبان بگیرید.');
      return;
    }
    try {
      await navigator.locks.request(STORAGE_KEY, () => {
        if (conflictRef.current) return;
        const result = saveStateIfUnchanged(stateRef.current, revisionRef.current);
        if (result.status === 'saved') {
          revisionRef.current = result.revision;
          setStorageWarning(null);
        } else if (result.status === 'conflict') {
          reportConflict();
        } else {
          setStorageWarning('ذخیره در حافظهٔ مرورگر انجام نشد؛ پیش از بستن صفحه، فایل پشتیبان بگیرید.');
        }
      });
    } catch {
      setStorageWarning('ذخیره در حافظهٔ مرورگر انجام نشد؛ پیش از بستن صفحه، فایل پشتیبان بگیرید.');
    }
  }, [recoveryData, reportConflict]);

  useEffect(() => {
    const timer = window.setTimeout(() => void persist(), 250);
    return () => window.clearTimeout(timer);
  }, [state, persist]);

  useEffect(() => {
    const flush = () => void persist();
    const onStorage = (event: StorageEvent) => {
      if ((event.key === STORAGE_KEY || event.key === null) && loadState().revision !== revisionRef.current) {
        reportConflict();
      }
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('storage', onStorage);
    };
  }, [persist, reportConflict]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = state.settings.theme;
    root.style.colorScheme = state.settings.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', state.settings.theme === 'dark' ? '#0f1522' : '#f4f2ec');
  }, [state.settings.theme]);

  const apply = useCallback((updater: (prev: MeetState) => MeetState) => {
    setState(updater);
  }, []);

  const activeMeeting = useMemo(
    () => state.meetings.find((meeting) => meeting.id === state.activeId) ?? null,
    [state.meetings, state.activeId],
  );

  const stale = activeMeeting ? isAnalysisStale(activeMeeting) : false;

  const createBlank = useCallback(
    (meta: Partial<MeetingMeta> = {}) => {
      const meeting = createMeeting({
        title: meta.title,
        date: meta.date,
        participants: meta.participants,
      });
      meeting.meta.startTime = meta.startTime ?? '';
      meeting.meta.durationMins = meta.durationMins ?? null;
      meeting.meta.chair = meta.chair ?? '';
      apply((prev) => ({
        ...prev,
        meetings: [{ ...meeting, meta: { ...meeting.meta, title: uniqueTitle(meeting.meta.title, prev.meetings) } }, ...prev.meetings],
        activeId: meeting.id,
        updatedAt: Date.now(),
      }));
      return meeting;
    },
    [apply],
  );

  const createFromSample = useCallback(
    (sampleId: string) => {
      const built = buildMeetingFromSample(sampleId);
      if (!built) return null;
      apply((prev) => ({
        ...prev,
        meetings: [
          { ...built, meta: { ...built.meta, title: uniqueTitle(built.meta.title, prev.meetings) } },
          ...prev.meetings,
        ],
        activeId: built.id,
        updatedAt: Date.now(),
      }));
      return built;
    },
    [apply],
  );

  const selectMeeting = useCallback(
    (id: string) => {
      apply((prev) => (prev.meetings.some((meeting) => meeting.id === id) ? { ...prev, activeId: id } : prev));
      setFocusRequest(null);
    },
    [apply],
  );

  const duplicateMeeting = useCallback(
    (id: string) => {
      const current = stateRef.current;
      const source = current.meetings.find((meeting) => meeting.id === id);
      if (!source) return null;
      const copy = duplicateMeetingModel(source);
      apply((prev) => {
        const index = prev.meetings.findIndex((meeting) => meeting.id === id);
        const meetings = [...prev.meetings];
        meetings.splice(index + 1, 0, copy);
        return { ...prev, meetings, activeId: copy.id, updatedAt: Date.now() };
      });
      return copy;
    },
    [apply],
  );

  const deleteMeeting = useCallback(
    (id: string) => {
      apply((prev) => {
        const index = prev.meetings.findIndex((meeting) => meeting.id === id);
        if (index < 0) return prev;
        let meetings = prev.meetings.filter((meeting) => meeting.id !== id);
        let activeId = prev.activeId;
        if (activeId === id) {
          const neighbor = prev.meetings[index + 1] ?? prev.meetings[index - 1] ?? null;
          activeId = neighbor?.id ?? null;
        }
        if (meetings.length === 0) {
          const fresh = createMeeting();
          meetings = [fresh];
          activeId = fresh.id;
        }
        return { ...prev, meetings, activeId, updatedAt: Date.now() };
      });
    },
    [apply],
  );

  const updateMeta = useCallback(
    (id: string, patch: Partial<MeetingMeta>) => {
      apply((prev) =>
        withMeeting(prev, id, (meeting) => ({ ...meeting, meta: { ...meeting.meta, ...patch } })),
      );
    },
    [apply],
  );

  const setTranscript = useCallback(
    (text: string) => {
      apply((prev) => withMeeting(prev, prev.activeId, (meeting) => ({ ...meeting, transcript: text })));
    },
    [apply],
  );

  const analyze = useCallback(
    (id?: string): AnalyzeOutcome => {
      const current = stateRef.current;
      const targetId = id ?? current.activeId;
      if (!targetId) return 'missing';
      const meeting = current.meetings.find((item) => item.id === targetId);
      if (!meeting) return 'missing';
      if (!meeting.transcript.trim()) return 'empty';
      const participants = meeting.meta.participants.length ? meeting.meta.participants : parseTranscript(meeting.transcript).metadata.participants;
      const result = analyzeTranscript(meeting.transcript, meeting.meta.date, participants);
      apply((prev) =>
        withMeeting(prev, targetId, (item) => ({
          ...item,
          minutes: result.minutes,
          stats: result.stats,
          meta: {
            ...item.meta,
            startTime: item.meta.startTime || result.metadata.startTime || '',
            durationMins: item.meta.durationMins ?? result.metadata.durationMins,
            chair: item.meta.chair || result.metadata.chair || '',
            participants: item.meta.participants.length
              ? item.meta.participants
              : result.metadata.participants,
          },
        })),
      );
      return 'ok';
    },
    [apply],
  );

  useEffect(() => {
    if (!state.settings.autoAnalyze || !activeMeeting?.stats || !stale) return;
    const meetingId = activeMeeting.id;
    const timer = window.setTimeout(() => analyze(meetingId), 1_400);
    return () => window.clearTimeout(timer);
  }, [state, activeMeeting, stale, analyze]);

  const clearMinutes = useCallback(() => {
    apply((prev) =>
      withMeeting(prev, prev.activeId, (meeting) => ({ ...meeting, minutes: emptyMinutes(), stats: null })),
    );
  }, [apply]);

  const updateItem = useCallback(
    (section: MinutesSection, id: string, patch: ItemPatch) => {
      apply((prev) =>
        withMeeting(prev, prev.activeId, (meeting) => ({
          ...meeting,
          minutes: patchMinutes(meeting.minutes, section, id, patch),
        })),
      );
    },
    [apply],
  );

  const addItem = useCallback(
    (section: MinutesSection, draft: ItemDraft) => {
      const text = (draft.text ?? draft.title ?? '').trim();
      if (!text) return false;
      apply((prev) =>
        withMeeting(prev, prev.activeId, (meeting) => {
          const minutes = addToMinutes(meeting.minutes, section, draft);
          return minutes ? { ...meeting, minutes } : meeting;
        }),
      );
      return true;
    },
    [apply],
  );

  const removeItem = useCallback(
    (section: MinutesSection, id: string) => {
      apply((prev) =>
        withMeeting(prev, prev.activeId, (meeting) => ({
          ...meeting,
          minutes: removeFromMinutes(meeting.minutes, section, id),
        })),
      );
    },
    [apply],
  );

  const restoreItem = useCallback(
    (section: MinutesSection, item: MinutesItem, meetingId?: string) => {
      apply((prev) =>
        withMeeting(prev, meetingId ?? prev.activeId, (meeting) => ({
          ...meeting,
          minutes: appendToMinutes(meeting.minutes, section, item),
        })),
      );
    },
    [apply],
  );

  const toggleAction = useCallback(
    (id: string) => {
      apply((prev) =>
        withMeeting(prev, prev.activeId, (meeting) => ({
          ...meeting,
          minutes: {
            ...meeting.minutes,
            actions: meeting.minutes.actions.map((action) =>
              action.id === id
                ? { ...action, status: action.status === 'open' ? 'done' : 'open' }
                : action,
            ),
          },
        })),
      );
    },
    [apply],
  );

  const setTheme = useCallback(
    (theme: Theme) => {
      apply((prev) => ({ ...prev, settings: { ...prev.settings, theme }, updatedAt: Date.now() }));
    },
    [apply],
  );

  const setAutoAnalyze = useCallback(
    (value: boolean) => {
      apply((prev) => ({
        ...prev,
        settings: { ...prev.settings, autoAnalyze: value },
        updatedAt: Date.now(),
      }));
    },
    [apply],
  );

  const jumpToSource = useCallback((source: number) => {
    const current = stateRef.current;
    const meeting = current.meetings.find((item) => item.id === current.activeId);
    if (source < 0 || !meeting || isAnalysisStale(meeting)) return;
    setFocusRequest({ index: source, nonce: Date.now() });
  }, []);

  const clearFocus = useCallback(() => setFocusRequest(null), []);

  const importState = useCallback(
    (next: MeetState) => {
      revisionRef.current = loadState().revision;
      conflictRef.current = false;
      setRecoveryData(null);
      apply(() => next);
      setFocusRequest(null);
    },
    [apply],
  );

  const resetAll = useCallback(() => {
    const fresh = createEmptyState();
    fresh.settings = { ...stateRef.current.settings };
    revisionRef.current = loadState().revision;
    conflictRef.current = false;
    setRecoveryData(null);
    apply(() => fresh);
    setFocusRequest(null);
  }, [apply]);

  const claimBootNotice = useCallback(() => {
    if (!bootData.seeded || toastShownRef.current) return false;
    toastShownRef.current = true;
    return true;
  }, [bootData.seeded]);

  return {
    state,
    activeMeeting,
    activeId: state.activeId,
    settings: state.settings,
    stale,
    focusRequest,
    storageWarning,
    recoveryData,
    seeded: bootData.seeded,
    claimBootNotice,
    createBlank,
    createFromSample,
    selectMeeting,
    duplicateMeeting,
    deleteMeeting,
    updateMeta,
    setTranscript,
    analyze,
    clearMinutes,
    updateItem,
    addItem,
    removeItem,
    restoreItem,
    toggleAction,
    setTheme,
    setAutoAnalyze,
    jumpToSource,
    clearFocus,
    importState,
    resetAll,
  };
}

export type MeetController = ReturnType<typeof useMeet>;
