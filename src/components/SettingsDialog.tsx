import { useEffect, useRef, useState } from 'react';
import { APP_VERSION, CONTACT_EMAIL, REPO_URL, SITE_URL } from '../constants';
import { parseBackup, serializeBackup } from '../core/storage';
import type { MeetSettings, MeetState, Theme } from '../core/types';
import { downloadText } from '../download';
import { formatCount } from '../format';
import type { ToastTone } from '../hooks/useToasts';
import { ConfirmDialog } from './ConfirmDialog';
import { Icon } from './Icon';
import { Modal } from './Modal';
import { Switch } from './Switch';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  settings: MeetSettings;
  state: MeetState;
  setTheme: (theme: Theme) => void;
  setAutoAnalyze: (value: boolean) => void;
  importState: (state: MeetState) => void;
  resetAll: () => void;
  notify: (message: string, tone?: ToastTone) => void;
  canInstall: boolean;
  install: () => void;
}

const THEMES: Array<{ value: Theme; label: string; icon: 'sun' | 'moon' }> = [
  { value: 'light', label: 'روشن', icon: 'sun' },
  { value: 'dark', label: 'تیره', icon: 'moon' },
];

export function SettingsDialog({
  open,
  onClose,
  settings,
  state,
  setTheme,
  setAutoAnalyze,
  importState,
  resetAll,
  notify,
  canInstall,
  install,
}: SettingsDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const importRequestRef = useRef(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<MeetState | null>(null);

  useEffect(() => {
    if (!open) {
      setConfirmReset(false);
      setPendingRestore(null);
    }
    return () => {
      // Ignore file reads that finish after closing or unmounting settings.
      importRequestRef.current += 1;
    };
  }, [open]);

  const meetingCount = state.meetings.length;
  const totalWords = state.meetings.reduce((sum, meeting) => sum + (meeting.stats?.words ?? 0), 0);
  const totalActions = state.meetings.reduce((sum, meeting) => sum + meeting.minutes.actions.length, 0);

  const handleBackup = () => {
    const date = new Date().toISOString().slice(0, 10);
    downloadText(
      `noxaplus-meet-backup-${date}.json`,
      serializeBackup(state),
      'application/json',
    );
    notify('پشتیبان JSON دانلود شد.');
  };

  const handleImport = async (file: File) => {
    const request = ++importRequestRef.current;
    if (file.size > 10 * 1024 * 1024) {
      notify('حجم فایل پشتیبان بیش از حد مجاز است.', 'error');
      return;
    }
    try {
      const text = await file.text();
      if (request !== importRequestRef.current) return;
      const result = parseBackup(text);
      if ('error' in result) {
        notify(result.error, 'error');
        return;
      }
      setConfirmReset(false);
      setPendingRestore(result.state);
    } catch {
      if (request === importRequestRef.current) {
        notify('خواندن فایل پشتیبان ممکن نشد.', 'error');
      }
    }
  };

  return (
    <>
      <Modal
        open={open}
        title="تنظیمات"
        subtitle="ظاهر، رفتار تحلیل و نگهداری داده‌های محلی."
        size="md"
        onClose={onClose}
        footer={
          <div className="modal__actions">
            <button type="button" className="btn btn--primary" onClick={onClose}>
              بستن
            </button>
          </div>
        }
      >
        <div className="settings">
          <section className="settings__section">
            <h3 className="settings__title">
              <Icon name="sun" size={17} /> ظاهر
              </h3>
            <div className="settings__row">
              <div>
                <p className="settings__label">پوستهٔ برنامه</p>
                <p className="settings__desc">روشن برای روز و تیره برای محیط کم‌نور.</p>
              </div>
              <div className="segmented">
                {THEMES.map((theme) => (
                  <button
                    key={theme.value}
                    type="button"
                    className={`segmented__btn${settings.theme === theme.value ? ' is-active' : ''}`}
                    aria-pressed={settings.theme === theme.value}
                    onClick={() => setTheme(theme.value)}
                  >
                    <Icon name={theme.icon} size={15} /> {theme.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="settings__section">
            <h3 className="settings__title">
              <Icon name="sliders" size={17} /> تحلیل
            </h3>
            <Switch
              checked={settings.autoAnalyze}
              onChange={setAutoAnalyze}
              label="تحلیل خودکار رونوشت"
              description="با تغییر رونوشت جلسه، صورت‌جلسه پس از یک وقفهٔ کوتاه دوباره ساخته می‌شود."
            />
            <p className="settings__hint">
              تحلیل خودکار، ویرایش‌های دستی صورت‌جلسه را با نتیجهٔ تازه جایگزین می‌کند.
            </p>
          </section>

          <section className="settings__section">
            <h3 className="settings__title">
              <Icon name="download" size={17} /> پشتیبان و بازیابی
            </h3>
            <div className="settings__stat">
              <span>{formatCount(meetingCount)} جلسه</span>
              <span>{formatCount(totalWords)} واژه</span>
              <span>{formatCount(totalActions)} اقدام</span>
            </div>
            <div className="settings__row">
              <div>
                <p className="settings__label">فایل پشتیبان JSON</p>
                <p className="settings__desc">همهٔ جلسه‌ها، صورت‌جلسه‌ها و تنظیمات را در یک فایل ذخیره می‌کند.</p>
              </div>
              <div className="settings__buttons">
                <button type="button" className="btn btn--tiny" onClick={handleBackup}>
                  <Icon name="download" size={15} /> دانلود
                </button>
                <button type="button" className="btn btn--tiny" onClick={() => inputRef.current?.click()}>
                  <Icon name="upload" size={15} /> بازیابی
                </button>
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".json,application/json"
              className="visually-hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void handleImport(file);
              }}
            />
          </section>

          {canInstall ? (
            <section className="settings__section">
              <h3 className="settings__title">
                <Icon name="install" size={17} /> نصب روی دستگاه
              </h3>
              <div className="settings__row">
                <div>
                  <p className="settings__label">NoxaPlus Meet را نصب کنید</p>
                  <p className="settings__desc">اجرای مستقل، آیکون در میزکار و دسترسی آفلاین.</p>
                </div>
                <button type="button" className="btn btn--tiny btn--primary" onClick={install}>
                  نصب برنامه
                </button>
              </div>
            </section>
          ) : null}

          <section className="settings__section settings__section--danger">
            <h3 className="settings__title">
              <Icon name="alert" size={17} /> حذف داده‌ها
            </h3>
            <div className="settings__row">
              <div>
                <p className="settings__label">پاک‌کردن همهٔ جلسه‌ها</p>
                <p className="settings__desc">
                  همهٔ داده‌ها از حافظهٔ محلی پاک می‌شود. پیش از ادامه، پشتیبان بگیرید.
                </p>
              </div>
              <button
                type="button"
                className="btn btn--tiny btn--danger"
                onClick={() => {
                  importRequestRef.current += 1;
                  setPendingRestore(null);
                  setConfirmReset(true);
                }}
              >
                <Icon name="trash" size={15} /> پاک‌کردن
              </button>
            </div>
          </section>

          <section className="settings__section settings__section--about">
            <div className="settings__about">
              <p className="settings__brand">NoxaPlus Meet · نسخهٔ {APP_VERSION}</p>
              <p className="settings__desc">
                ساختهٔ NoxaPlus · متن‌باز با مجوز MIT · بدون حساب کاربری، بدون ردیابی.
              </p>
              <div className="settings__links">
                <a href={SITE_URL} target="_blank" rel="noreferrer">
                  <Icon name="globe" size={14} /> www.noxaplus.ir
                </a>
                <a href={REPO_URL} target="_blank" rel="noreferrer">
                  <Icon name="github" size={14} /> GitHub
                </a>
                <a href={`mailto:${CONTACT_EMAIL}`}>
                  <Icon name="mail" size={14} /> {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </section>
        </div>
      </Modal>

      <ConfirmDialog
        open={open && pendingRestore !== null}
        title="بازیابی پشتیبان و جایگزینی داده‌ها؟"
        message="همهٔ جلسه‌ها، صورت‌جلسه‌ها و تنظیمات فعلی با داده‌های این پشتیبان جایگزین می‌شوند؛ داده‌ها ادغام نمی‌شوند. برای حفظ داده‌های فعلی انصراف دهید و ابتدا پشتیبان بگیرید."
        confirmLabel="بله، جایگزین و بازیابی کن"
        onConfirm={() => {
          if (!pendingRestore) return;
          importState(pendingRestore);
          notify('پشتیبان با موفقیت بازیابی شد.');
        }}
        onClose={() => setPendingRestore(null)}
      />

      <ConfirmDialog
        open={open && confirmReset}
        title="پاک‌کردن همهٔ داده‌ها؟"
        message="همهٔ جلسه‌ها و صورت‌جلسه‌های ذخیره‌شده در این مرورگر حذف می‌شوند. این کار قابل بازگشت نیست."
        confirmLabel="بله، پاک کن"
        onConfirm={() => {
          resetAll();
          onClose();
          notify('همهٔ داده‌های محلی پاک شد.', 'info');
        }}
        onClose={() => setConfirmReset(false)}
      />
    </>
  );
}
