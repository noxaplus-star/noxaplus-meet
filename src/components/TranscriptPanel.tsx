import { useEffect, useMemo, useRef } from 'react';
import { SAMPLES } from '../core/sample';
import { sentenceAt } from '../core/transcript';
import { parseTranscript } from '../core/transcript';
import { formatDate } from '../format';
import type { FocusRequest } from '../hooks/useMeet';
import type { Meeting } from '../core/types';
import { Icon } from './Icon';
import { Menu } from './Menu';

interface TranscriptPanelProps {
  meeting: Meeting | null;
  autoAnalyze: boolean;
  stale: boolean;
  focusRequest: FocusRequest | null;
  onFocusHandled: () => void;
  onAnalyze: () => void;
  onTranscriptChange: (text: string) => void;
  onToggleAuto: (value: boolean) => void;
  onCreateSample: (sampleId: string) => void;
  onRequestClear: () => void;
}

const PLACEHOLDER = `عنوان: جلسهٔ هفتگی محصول
تاریخ: ۱۴۰۵/۰۸/۲۱
حاضرین: سارا محمدی، علی رضایی

سارا محمدی: دستور جلسه امروز بررسی نسخهٔ بعدی است.
علی رضایی: تصمیم گرفتیم انتشار به پنجشنبه موکول شود.
سارا محمدی: علی تا سه‌شنبه هر دو باگ را رفع می‌کند.`;

export function TranscriptPanel({
  meeting,
  autoAnalyze,
  stale,
  focusRequest,
  onFocusHandled,
  onAnalyze,
  onTranscriptChange,
  onToggleAuto,
  onCreateSample,
  onRequestClear,
}: TranscriptPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const transcript = meeting?.transcript ?? '';
  const parsed = useMemo(() => parseTranscript(transcript), [transcript]);
  const wordsCount = useMemo(
    () => (transcript.trim() ? transcript.trim().split(/\s+/).length : 0),
    [transcript],
  );
  const lineCount = useMemo(
    () => (transcript.trim() ? transcript.split(/\r?\n/).filter((line) => line.trim()).length : 0),
    [transcript],
  );

  useEffect(() => {
    if (!focusRequest) return;
    if (stale || !meeting) {
      onFocusHandled();
      return;
    }
    const sentence = sentenceAt(parsed, focusRequest.index);
    const area = textareaRef.current;
    if (!area) return;
    if (!sentence) {
      onFocusHandled();
      return;
    }
    area.focus();
    area.setSelectionRange(sentence.start, Math.min(sentence.end, area.value.length));
    const ratio = sentence.start / Math.max(1, area.value.length);
    area.scrollTop = Math.max(0, ratio * area.scrollHeight - area.clientHeight * 0.45);
    onFocusHandled();
  }, [focusRequest, parsed, meeting, stale, onFocusHandled]);

  const sampleItems = SAMPLES.map((sample) => ({
    label: sample.name,
    hint: sample.description,
    icon: 'file-text' as const,
    onSelect: () => onCreateSample(sample.id),
  }));

  return (
    <section className="pane pane--transcript" aria-label="رونوشت جلسه">
      <header className="pane__head">
        <div>
          <p className="eyebrow">
            <Icon name="mic" size={14} /> منبع جلسه
          </p>
          <h2 className="pane__title">رونوشت خام</h2>
        </div>
        <div className="pane__tools">
          <Menu
            items={sampleItems}
            label="بارگذاری نمونه"
            align="end"
            className="menu--labeled"
          >
            <span className="menu__trigger-text">
              <Icon name="sparkles" size={15} />
              نمونه
            </span>
          </Menu>
          <button
            type="button"
            className="icon-btn"
            onClick={onRequestClear}
            disabled={!transcript}
            aria-label="پاک‌کردن رونوشت"
            title="پاک‌کردن رونوشت"
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
      </header>

      <div className="transcript-toolbar">
        <div className="transcript-stats">
          <span>
            <Icon name="list" size={13} /> {wordsCount.toLocaleString('fa-IR')} واژه
          </span>
          <span>
            <Icon name="users" size={13} /> {parsed.speakers.length.toLocaleString('fa-IR')} گوینده
          </span>
          <span className="transcript-stats__muted">
            {lineCount.toLocaleString('fa-IR')} خط · {transcript.length.toLocaleString('fa-IR')} نویسه
          </span>
        </div>
        <div className="transcript-actions">
          <label className="mini-switch" title="تحلیل خودکار پس از تغییر رونوشت">
            <input
              type="checkbox"
              checked={autoAnalyze}
              onChange={(event) => onToggleAuto(event.target.checked)}
            />
            <span className="mini-switch__track">
              <span className="mini-switch__thumb" />
            </span>
            <span className="mini-switch__label">خودکار</span>
          </label>
          <button
            type="button"
            className="btn btn--primary btn--analyze"
            onClick={onAnalyze}
            disabled={!transcript.trim()}
          >
            <Icon name="wand" size={16} />
            {meeting?.stats ? 'تحلیل مجدد' : 'تحلیل رونوشت'}
          </button>
        </div>
      </div>

      {stale ? (
        <div className="notice notice--warn" role="status">
          <Icon name="alert" size={16} />
          <p>
            رونوشت پس از آخرین تحلیل تغییر کرده است؛ انتخاب جملهٔ منبع تا تحلیل مجدد در دسترس نیست.
            {autoAnalyze ? ' تحلیل خودکار به‌زودی انجام می‌شود.' : ' دوباره تحلیل کنید.'}
          </p>
          <button type="button" className="btn btn--tiny" onClick={onAnalyze} disabled={!transcript.trim()}>
            تحلیل مجدد
          </button>
        </div>
      ) : null}

      <div className="editor">
        <div className="editor__bar">
          <span className="editor__label">
            <span className="window-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            متن جلسه
          </span>
          <span className="editor__hint">هر خط با «نام گوینده:» شروع شود</span>
        </div>
        <textarea
          ref={textareaRef}
          className="editor__area"
          value={transcript}
          onChange={(event) => onTranscriptChange(event.target.value)}
          placeholder={PLACEHOLDER}
          spellCheck={false}
          dir="rtl"
          aria-label="متن رونوشت جلسه"
        />
        <div className="editor__foot">
          {parsed.warnings.length > 0 && transcript.trim() ? (
            <details className="warnings">
              <summary>
                <Icon name="info" size={14} />
                {parsed.warnings.length.toLocaleString('fa-IR')} نکته دربارهٔ ساختار رونوشت
              </summary>
              <ul>
                {parsed.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </details>
          ) : (
            <p className="editor__tip">
              <Icon name="lock" size={13} /> متن فقط در حافظهٔ محلی مرورگر ذخیره می‌شود.
            </p>
          )}
          {meeting ? (
            <p className="editor__date">
              مبنای مهلت‌ها: <strong>{formatDate(meeting.meta.date)}</strong>
            </p>
          ) : null}
        </div>
      </div>

      {!transcript.trim() ? (
        <div className="transcript-start">
          <Icon name="sparkles" size={18} />
          <p>
            رونوشت ندارید؟ یکی از <strong>نمونه‌های آماده</strong> را باز کنید تا خروجی موتور را
            ببینید.
          </p>
          <Menu items={sampleItems} label="نمونه‌های آماده" align="end" className="menu--labeled">
            <span className="btn btn--tiny btn--ghost">
              <Icon name="sparkles" size={14} /> انتخاب نمونه
            </span>
          </Menu>
        </div>
      ) : null}
    </section>
  );
}
