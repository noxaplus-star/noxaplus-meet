import { useEffect, useRef, useState } from 'react';
import { APP_NAME } from './constants';
import { serializeBackup } from './core/storage';
import { downloadText } from './download';
import type { Meeting, MeetingMeta } from './core/types';
import { toPersianDigits } from './core/digits';
import { formatCount, formatDate, durationLabel } from './format';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { useMeet } from './hooks/useMeet';
import { useToasts } from './hooks/useToasts';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ExportDialog } from './components/ExportDialog';
import { HelpDialog } from './components/HelpDialog';
import { Icon } from './components/Icon';
import { Library } from './components/Library';
import { MeetingDialog } from './components/MeetingDialog';
import { MinutesPanel } from './components/MinutesPanel';
import { SettingsDialog } from './components/SettingsDialog';
import { Toasts } from './components/Toasts';
import { TranscriptPanel } from './components/TranscriptPanel';

type MobilePane = 'transcript' | 'minutes';

type ConfirmState =
  | { kind: 'delete-meeting'; meeting: Meeting }
  | { kind: 'clear-transcript' }
  | { kind: 'clear-minutes' }
  | { kind: 'reanalyze' }
  | null;

interface DialogState {
  open: boolean;
  mode: 'create' | 'edit';
}

export default function App() {
  const controller = useMeet();
  const { toasts, push, dismiss } = useToasts();
  const { canInstall, install } = useInstallPrompt();

  const [pane, setPane] = useState<MobilePane>('minutes');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [meetingDialog, setMeetingDialog] = useState<DialogState>({ open: false, mode: 'create' });
  const [exportOpen, setExportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const meeting = controller.activeMeeting;
  const controllerRef = useRef(controller);
  controllerRef.current = controller;
  const analyzeRef = useRef<() => void>(() => undefined);

  const performAnalyze = () => {
    const outcome = controller.analyze();
    if (outcome === 'ok') {
      push('صورت‌جلسه از رونوشت ساخته شد.');
      setPane('minutes');
    } else if (outcome === 'empty') {
      push('برای تحلیل، ابتدا رونوشت جلسه را وارد کنید.', 'warning');
    } else {
      push('جلسه‌ای برای تحلیل پیدا نشد.', 'error');
    }
  };
  const runAnalyze = () => {
    if (meeting && Object.values(meeting.minutes).some((rows) => rows.length > 0)) {
      setConfirm({ kind: 'reanalyze' });
      return;
    }
    performAnalyze();
  };
  analyzeRef.current = runAnalyze;

  const bootNoticeRef = useRef(false);
  useEffect(() => {
    if (bootNoticeRef.current) return;
    bootNoticeRef.current = true;
    const current = controllerRef.current;
    if (current.storageWarning) push(current.storageWarning, 'warning');
    if (current.claimBootNotice()) {
      const timer = window.setTimeout(
        () => push('یک نمونهٔ جلسه برای شروع بارگذاری شد؛ می‌توانید رونوشت خودتان را جای آن بگذارید.', 'info'),
        500,
      );
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [push]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modalOpen = document.querySelector('.modal-layer') !== null;
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        if (modalOpen) return;
        if (!controllerRef.current.activeMeeting?.transcript.trim()) return;
        event.preventDefault();
        analyzeRef.current();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (modalOpen) return;
      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        setMeetingDialog({ open: true, mode: 'create' });
      } else if (event.key === '?') {
        event.preventDefault();
        setHelpOpen(true);
      } else if (event.key === 'Escape') {
        setLibraryOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleCreate = (meta: Partial<MeetingMeta>) => {
    const created = controller.createBlank(meta);
    setLibraryOpen(false);
    setPane('transcript');
    push(`«${created.meta.title}» ساخته شد.`);
  };

  const handleUpdate = (id: string, meta: Partial<MeetingMeta>) => {
    controller.updateMeta(id, meta);
    push('مشخصات جلسه به‌روز شد.');
  };

  const handleSelect = (id: string) => {
    controller.selectMeeting(id);
    setLibraryOpen(false);
    setPane('minutes');
  };

  const handleDuplicate = (id: string) => {
    const copy = controller.duplicateMeeting(id);
    if (!copy) return;
    setLibraryOpen(false);
    setPane('minutes');
    push('نسخهٔ کپی جلسه ساخته شد.');
  };

  const handleSample = (sampleId: string) => {
    const created = controller.createFromSample(sampleId);
    if (!created) {
      push('نمونهٔ انتخابی پیدا نشد.', 'error');
      return;
    }
    setLibraryOpen(false);
    setPane('minutes');
    push(`نمونهٔ «${created.meta.title}» با صورت‌جلسهٔ آماده باز شد.`);
  };

  const openEdit = () => {
    if (!meeting) return;
    setMeetingDialog({ open: true, mode: 'edit' });
  };

  const confirmCopy = (() => {
    if (!confirm) return null;
    if (confirm.kind === 'delete-meeting') {
      return {
        title: 'حذف این جلسه؟',
        message: `«${confirm.meeting.meta.title}» و صورت‌جلسهٔ آن از این دستگاه حذف می‌شود.`,
        confirmLabel: 'حذف جلسه',
      };
    }
    if (confirm.kind === 'reanalyze') {
      return {
        title: 'بازسازی صورت‌جلسه؟',
        message: 'تحلیل مجدد همهٔ صورت‌جلسه، ویرایش‌های دستی و وضعیت اقدام‌ها را جایگزین می‌کند. برای نگهداری نسخهٔ فعلی، ابتدا خروجی بگیرید یا جلسه را کپی کنید.',
        confirmLabel: 'تحلیل و جایگزینی',
      };
    }
    if (confirm.kind === 'clear-transcript') {
      return {
        title: 'پاک‌کردن رونوشت؟',
        message: 'متن رونوشت و صورت‌جلسهٔ فعلی پاک می‌شوند؛ مشخصات جلسه حفظ می‌شود.',
        confirmLabel: 'پاک کن',
      };
    }
    return {
      title: 'پاک‌کردن صورت‌جلسه؟',
      message: 'همهٔ خلاصه، تصمیم‌ها، اقدام‌ها، پرسش‌ها و ریسک‌ها پاک می‌شوند؛ رونوشت دست‌نخورده می‌ماند.',
      confirmLabel: 'پاک کن',
    };
  })();

  const handleConfirm = () => {
    if (!confirm) return;
    if (confirm.kind === 'reanalyze') {
      performAnalyze();
    } else if (confirm.kind === 'delete-meeting') {
      controller.deleteMeeting(confirm.meeting.id);
      push('جلسه حذف شد.', 'info');
    } else if (confirm.kind === 'clear-transcript') {
      controller.setTranscript('');
      controller.clearMinutes();
      setPane('transcript');
      push('رونوشت و صورت‌جلسه پاک شدند.', 'info');
    } else {
      controller.clearMinutes();
      push('صورت‌جلسه پاک شد؛ رونوشت دست‌نخورده است.', 'info');
    }
  };

  return (
    <div className="app">
      <Library
        controller={controller}
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onNew={() => {
          setLibraryOpen(false);
          setMeetingDialog({ open: true, mode: 'create' });
        }}
        onDelete={(item) => setConfirm({ kind: 'delete-meeting', meeting: item })}
        onDuplicate={handleDuplicate}
        onSelect={handleSelect}
        onOpenSample={handleSample}
      />
      {libraryOpen ? (
        <button
          type="button"
          className="drawer-scrim"
          aria-label="بستن کتابخانه"
          onClick={() => setLibraryOpen(false)}
        />
      ) : null}

      <div className="shell">
        <header className="topbar">
          <div className="topbar__start">
            <button
              type="button"
              className="icon-btn topbar__menu"
              onClick={() => setLibraryOpen(true)}
              aria-label="باز کردن کتابخانه"
            >
              <Icon name="menu" size={20} />
            </button>
            <div className="topbar__heading">
              <p className="topbar__eyebrow">{APP_NAME}</p>
              <div className="topbar__title-row">
                <h1 className="topbar__title" title={meeting?.meta.title}>
                  {meeting?.meta.title ?? 'دفتر صورت‌جلسه'}
                </h1>
                {meeting ? (
                  <button
                    type="button"
                    className="icon-btn icon-btn--tiny"
                    onClick={openEdit}
                    aria-label="ویرایش مشخصات جلسه"
                    title="ویرایش مشخصات"
                  >
                    <Icon name="edit" size={14} />
                  </button>
                ) : null}
              </div>
              {meeting ? (
                <div className="topbar__meta">
                  <span>
                    <Icon name="calendar" size={13} />
                    {formatDate(meeting.meta.date)}
                  </span>
                  {meeting.meta.durationMins ? (
                    <span>
                      <Icon name="clock" size={13} />
                      {durationLabel(meeting.meta.durationMins)}
                    </span>
                  ) : null}
                  {meeting.meta.startTime ? (
                    <span>
                      <Icon name="target" size={13} />
                      {toPersianDigits(meeting.meta.startTime)}
                    </span>
                  ) : null}
                  {meeting.meta.participants.length ? (
                    <span>
                      <Icon name="users" size={13} />
                      {formatCount(meeting.meta.participants.length)} حاضر
                    </span>
                  ) : null}
                </div>
              ) : (
                <p className="topbar__meta">جلسه‌ای انتخاب نشده است.</p>
              )}
            </div>
          </div>

          <div className="topbar__actions">
            <span className="save-chip">
              <Icon name={controller.storageWarning ? 'alert' : 'lock'} size={12} />
              {controller.storageWarning ? 'ذخیره نشد' : 'ذخیرهٔ محلی'}
            </span>
            <button
              type="button"
              className="btn btn--primary btn--small topbar__analyze"
              onClick={runAnalyze}
              disabled={!meeting?.transcript.trim()}
            >
              <Icon name="wand" size={15} />
              <span className="topbar__analyze-label">تحلیل</span>
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setHelpOpen(true)}
              aria-label="راهنما"
              title="راهنما (?)"
            >
              <Icon name="help" size={18} />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setSettingsOpen(true)}
              aria-label="تنظیمات"
              title="تنظیمات"
            >
              <Icon name="settings" size={18} />
            </button>
          </div>
        </header>

        {controller.storageWarning ? (
          <div className="storage-notice notice notice--warn" role="alert">
            <Icon name="alert" size={18} />
            <p>
              {controller.recoveryData !== null
                ? 'دادهٔ قبلی خوانده نشد و دست‌نخورده نگه داشته شده است؛ ذخیرهٔ خودکار متوقف است. دادهٔ قبلی را دریافت کنید، سپس از تنظیمات پشتیبان سالم را بازیابی یا دفتر را بازنشانی کنید.'
                : controller.storageWarning}
            </p>
            {controller.recoveryData !== null ? (
              <button type="button" className="btn btn--tiny" onClick={() => downloadText('noxaplus-meet-recovery.json', controller.recoveryData ?? '', 'application/json')}>دریافت دادهٔ قبلی</button>
            ) : null}
            <button type="button" className="btn btn--tiny" onClick={() => downloadText('noxaplus-meet-backup.json', serializeBackup(controller.state), 'application/json')}>پشتیبان دفتر فعلی</button>
          </div>
        ) : null}

        <main className={`workspace workspace--${pane}`}>
          <TranscriptPanel
            meeting={meeting}
            autoAnalyze={controller.settings.autoAnalyze}
            stale={controller.stale}
            focusRequest={controller.focusRequest}
            onFocusHandled={controller.clearFocus}
            onAnalyze={runAnalyze}
            onTranscriptChange={controller.setTranscript}
            onToggleAuto={controller.setAutoAnalyze}
            onCreateSample={handleSample}
            onRequestClear={() => setConfirm({ kind: 'clear-transcript' })}
          />
          <MinutesPanel
            onJumpSource={(source) => {
              setPane('transcript');
              controller.jumpToSource(source);
            }}
            controller={controller}
            notify={push}
            onOpenExport={() => setExportOpen(true)}
            onEditMeeting={openEdit}
            onRequestClearMinutes={() => setConfirm({ kind: 'clear-minutes' })}
            onRequestDeleteMeeting={() => {
              if (meeting) setConfirm({ kind: 'delete-meeting', meeting });
            }}
            onAnalyze={runAnalyze}
          />
        </main>

        <nav className="mobile-nav" aria-label="پیمایش بخش‌ها">
          <button
            type="button"
            className={`mobile-nav__btn${pane === 'transcript' ? ' is-active' : ''}`}
            onClick={() => setPane('transcript')}
          >
            <Icon name="mic" size={19} />
            <span>رونوشت</span>
          </button>
          <button
            type="button"
            className={`mobile-nav__btn${pane === 'minutes' ? ' is-active' : ''}`}
            onClick={() => setPane('minutes')}
          >
            <Icon name="clipboard" size={19} />
            <span>صورت‌جلسه</span>
            {meeting && meeting.minutes.actions.length > 0 ? (
              <span className="mobile-nav__badge">{formatCount(meeting.minutes.actions.length)}</span>
            ) : null}
          </button>
          <button type="button" className="mobile-nav__btn" onClick={() => setLibraryOpen(true)}>
            <Icon name="list" size={19} />
            <span>جلسه‌ها</span>
          </button>
        </nav>
      </div>

      <Toasts toasts={toasts} dismiss={dismiss} />

      <MeetingDialog
        open={meetingDialog.open}
        mode={meetingDialog.mode}
        meeting={meetingDialog.mode === 'edit' ? meeting : null}
        onClose={() => setMeetingDialog((prev) => ({ ...prev, open: false }))}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <ExportDialog
        open={exportOpen}
        meeting={meeting}
        onClose={() => setExportOpen(false)}
        notify={push}
      />

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={controller.settings}
        state={controller.state}
        setTheme={controller.setTheme}
        setAutoAnalyze={controller.setAutoAnalyze}
        importState={controller.importState}
        resetAll={controller.resetAll}
        notify={push}
        canInstall={canInstall}
        install={() => {
          void install();
        }}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onInstall={() => {
          void install();
        }}
        canInstall={canInstall}
      />

      <ConfirmDialog
        open={Boolean(confirmCopy)}
        title={confirmCopy?.title ?? ''}
        message={confirmCopy?.message ?? ''}
        confirmLabel={confirmCopy?.confirmLabel}
        onConfirm={handleConfirm}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
