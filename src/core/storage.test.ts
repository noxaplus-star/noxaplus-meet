import { describe, expect, it } from 'vitest';
import { analyzeTranscript } from './analyze';
import { createEmptyState } from './model';
import { SAMPLES } from './sample';
import {
  BACKUP_APP,
  clearState,
  loadState,
  parseBackup,
  saveState,
  saveStateIfUnchanged,
  serializeBackup,
  STORAGE_KEY,
  validateState,
  type StorageLike,
} from './storage';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: StorageLike & { data: Map<string, string> } = {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
  return storage;
}

function sampleState() {
  const state = createEmptyState();
  const analysis = analyzeTranscript(SAMPLES[0].transcript, '1405-08-21', []);
  state.meetings[0] = {
    ...state.meetings[0],
    meta: {
      ...state.meetings[0].meta,
      title: 'جلسهٔ هفتگی محصول',
      date: '1405-08-21',
      durationMins: 45,
      participants: ['سارا محمدی', 'علی رضایی'],
      chair: 'سارا محمدی',
    },
    minutes: analysis.minutes,
    stats: analysis.stats,
  };
  state.updatedAt = Date.now();
  return state;
}

describe('state validation', () => {
  it('accepts a valid state', () => {
    const state = sampleState();
    const result = validateState(JSON.parse(JSON.stringify(state)));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.meetings[0].minutes.actions.length).toBeGreaterThan(0);
      expect(result.state.meetings[0].stats?.engineVersion).toBe(1);
    }
  });

  it('round-trips manual items in every section', () => {
    const state = sampleState();
    const minutes = state.meetings[0].minutes;
    minutes.summary.push({ id: 'manual-summary', text: 'خلاصه دستی', source: -1 });
    minutes.decisions.push({ id: 'manual-decision', text: 'تصمیم دستی', source: -1, confidence: 'high' });
    minutes.actions.push({ id: 'manual-action', text: 'اقدام دستی', source: -1, confidence: 'high', owner: 'علی', due: null, status: 'open' });
    minutes.questions.push({ id: 'manual-question', text: 'پرسش دستی؟', source: -1, confidence: 'high', askedBy: '' });
    minutes.risks.push({ id: 'manual-risk', text: 'ریسک دستی', source: -1, confidence: 'medium' });
    minutes.topics.push({ id: 'manual-topic', title: 'موضوع دستی', source: -1 });
    const parsed = parseBackup(serializeBackup(state));
    expect('state' in parsed).toBe(true);
    if ('state' in parsed) {
      for (const rows of Object.values(parsed.state.meetings[0].minutes)) {
        expect(rows.at(-1)?.source).toBe(-1);
      }
    }
    const store = memoryStorage();
    expect(saveState(state, store)).toBe(true);
    expect(loadState(store).state).not.toBeNull();
  });

  it('rejects malformed top-level data', () => {
    expect(validateState(null).ok).toBe(false);
    expect(validateState({ version: 2 }).ok).toBe(false);
    expect(validateState({ version: 1, meetings: [], settings: {}, updatedAt: 1 }).ok).toBe(false);
  });

  it('rejects duplicate meeting ids', () => {
    const state = sampleState();
    state.meetings.push({ ...state.meetings[0], id: state.meetings[0].id });
    const result = validateState(state);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('تکراری');
  });

  it('rejects an unknown active meeting', () => {
    const state = { ...sampleState(), activeId: 'missing' };
    const result = validateState(state);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('جلسهٔ فعال');
  });

  it('rejects invalid action deadlines and statuses', () => {
    const badDue = sampleState();
    badDue.meetings[0].minutes.actions[0].due = 'not-a-date';
    expect(validateState(badDue).ok).toBe(false);

    const badStatus = sampleState();
    badStatus.meetings[0].minutes.actions[0] = {
      ...badStatus.meetings[0].minutes.actions[0],
      status: 'later' as never,
    };
    expect(validateState(badStatus).ok).toBe(false);
  });

  it('rejects invalid stats and settings', () => {
    const badStats = sampleState();
    if (badStats.meetings[0].stats) badStats.meetings[0].stats.engineVersion = 0;
    expect(validateState(badStats).ok).toBe(false);

    const badTheme = sampleState();
    badTheme.settings.theme = 'sepia' as never;
    expect(validateState(badTheme).ok).toBe(false);

    const badAuto = sampleState();
    badAuto.settings.autoAnalyze = 'yes' as never;
    expect(validateState(badAuto).ok).toBe(false);
  });

  it('rejects invalid meeting metadata', () => {
    const badDate = sampleState();
    badDate.meetings[0].meta.date = '1405-08-40';
    expect(validateState(badDate).ok).toBe(false);

    const badDuration = sampleState();
    badDuration.meetings[0].meta.durationMins = 2000;
    expect(validateState(badDuration).ok).toBe(false);

    const badParticipants = sampleState();
    badParticipants.meetings[0].meta.participants = ['ok', 5] as never;
    expect(validateState(badParticipants).ok).toBe(false);
  });

  it('rejects malformed minutes entries', () => {
    const badSummary = sampleState();
    badSummary.meetings[0].minutes.summary[0].text = '   ';
    expect(validateState(badSummary).ok).toBe(false);

    const badQuestion = sampleState();
    badQuestion.meetings[0].minutes.questions[0].askedBy = 3 as never;
    expect(validateState(badQuestion).ok).toBe(false);

    const badTopic = sampleState();
    badTopic.meetings[0].minutes.topics[0].source = -2;
    expect(validateState(badTopic).ok).toBe(false);
  });
});

describe('local storage', () => {
  it('saves and loads state', () => {
    const storage = memoryStorage();
    const state = sampleState();
    expect(saveState(state, storage)).toBe(true);
    expect(storage.data.has(STORAGE_KEY)).toBe(true);

    const loaded = loadState(storage);
    expect(loaded.warning).toBeNull();
    expect(loaded.state?.meetings[0].id).toBe(state.meetings[0].id);
    expect(loaded.state?.meetings[0].minutes.actions[0].owner).toBe(
      state.meetings[0].minutes.actions[0].owner,
    );
  });

  it('rejects a stale tab without overwriting newer data', () => {
    const store = memoryStorage();
    const initial = sampleState();
    saveState(initial, store);
    const revision = loadState(store).revision;
    const newer = structuredClone(initial);
    newer.meetings[0].transcript = 'ویرایش در تب جدید';
    const result = saveStateIfUnchanged(newer, revision, store);
    expect(result.status).toBe('saved');
    expect(saveStateIfUnchanged(initial, revision, store)).toEqual({ status: 'conflict' });
    expect(loadState(store).state?.meetings[0].transcript).toBe('ویرایش در تب جدید');
    if (result.status === 'saved') {
      expect(saveStateIfUnchanged(newer, result.revision, store).status).toBe('saved');
    }
  });

  it('detects deletion and another tab creating the initial workspace', () => {
    const store = memoryStorage();
    const state = sampleState();
    expect(saveStateIfUnchanged(state, null, store).status).toBe('saved');
    expect(saveStateIfUnchanged(state, null, store).status).toBe('conflict');
    const revision = loadState(store).revision;
    clearState(store);
    expect(saveStateIfUnchanged(state, revision, store).status).toBe('conflict');
  });

  it('preserves exact persisted revisions and unavailable storage', () => {
    const raw = JSON.stringify(sampleState(), null, 2);
    expect(loadState(memoryStorage({ [STORAGE_KEY]: raw })).revision).toBe(raw);
    expect(saveStateIfUnchanged(sampleState(), null).status).toBe('unavailable');
    const store = memoryStorage();
    store.setItem = () => { throw new Error('quota'); };
    expect(saveStateIfUnchanged(sampleState(), null, store).status).toBe('unavailable');
    expect(store.getItem(STORAGE_KEY)).toBeNull();
  });

  it('returns null when nothing is stored', () => {
    const loaded = loadState(memoryStorage());
    expect(loaded).toEqual({ state: null, warning: null, revision: null });
  });

  it('warns about invalid JSON and invalid state', () => {
    expect(loadState(memoryStorage({ [STORAGE_KEY]: '{' })).warning).toContain('خوانده نشد');
    expect(loadState(memoryStorage({ [STORAGE_KEY]: '{"version":9}' })).warning).toContain(
      'پشتیبانی',
    );
  });

  it('retains unreadable storage for recovery', () => {
    for (const raw of ['{', '{"version":9}']) {
      const store = memoryStorage({ [STORAGE_KEY]: raw });
      const loaded = loadState(store);
      expect(loaded.state).toBeNull();
      expect(loaded.recoveryData).toBe(raw);
      expect(store.getItem(STORAGE_KEY)).toBe(raw);
    }
  });

  it('clears stored state', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: 'x' });
    clearState(storage);
    expect(storage.data.has(STORAGE_KEY)).toBe(false);
  });

  it('returns false or undefined when storage is unavailable', () => {
    expect(saveState(sampleState())).toBe(false);
    expect(loadState().state).toBeNull();
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    expect(loadState(throwing).warning).toContain('خوانده نشد');
    expect(saveState(sampleState(), throwing)).toBe(false);
    expect(() => clearState(throwing)).not.toThrow();
  });
});

describe('backup files', () => {
  it('serializes and parses a backup', () => {
    const state = sampleState();
    const text = serializeBackup(state, new Date('2026-11-12T10:00:00.000Z'));
    const parsedJson = JSON.parse(text);
    expect(parsedJson.app).toBe(BACKUP_APP);
    expect(parsedJson.exportedAt).toBe('2026-11-12T10:00:00.000Z');

    const parsed = parseBackup(text);
    expect('state' in parsed).toBe(true);
    if ('state' in parsed) {
      expect(parsed.state.meetings[0].meta.title).toBe('جلسهٔ هفتگی محصول');
    }
  });

  it('rejects foreign or broken backups', () => {
    expect(parseBackup('{')).toEqual({ error: 'فایل پشتیبان JSON معتبر نیست.' });
    const foreign = parseBackup('{"app":"Something Else"}');
    expect('error' in foreign ? foreign.error : '').toContain('NoxaPlus Meet');
    const future = parseBackup(`{"app":"${BACKUP_APP}","version":2}`);
    expect('error' in future ? future.error : '').toContain('پشتیبانی');
    const broken = parseBackup(`{"app":"${BACKUP_APP}","version":1,"state":{}}`);
    expect('error' in broken).toBe(true);
  });
});
