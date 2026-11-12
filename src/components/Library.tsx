import { useMemo, useState } from 'react';
import { APP_VERSION } from '../constants';
import { isAnalysisStale } from '../core/model';
import { normalizeForCompare } from '../core/normalize';
import { SAMPLES } from '../core/sample';
import { formatJalaliKey } from '../core/jalali';
import type { Meeting } from '../core/types';
import type { MeetController } from '../hooks/useMeet';
import { formatCount } from '../format';
import { Icon } from './Icon';
import { Logo } from './Logo';

interface LibraryProps {
  controller: MeetController;
  open: boolean;
  onClose: () => void;
  onNew: () => void;
  onDelete: (meeting: Meeting) => void;
  onDuplicate: (id: string) => void;
  onSelect: (id: string) => void;
  onOpenSample: (sampleId: string) => void;
}

function meetingSummary(meeting: Meeting): string {
  if (!meeting.stats) return 'بدون تحلیل';
  const actions = meeting.minutes.actions.length;
  if (actions === 0) return 'بدون اقدام';
  return `${formatCount(actions)} اقدام`;
}

export function Library({
  controller,
  open,
  onClose,
  onNew,
  onDelete,
  onDuplicate,
  onSelect,
  onOpenSample,
}: LibraryProps) {
  const [query, setQuery] = useState('');
  const meetings = controller.state.meetings;

  const filtered = useMemo(() => {
    const needle = normalizeForCompare(query);
    const sorted = [...meetings].sort(
      (a, b) => b.meta.date.localeCompare(a.meta.date) || b.updatedAt - a.updatedAt,
    );
    if (!needle) return sorted;
    return sorted.filter((meeting) =>
      [meeting.meta.title, ...meeting.meta.participants, meeting.meta.chair, meeting.meta.date]
        .map(normalizeForCompare)
        .some((value) => value.includes(needle)),
    );
  }, [meetings, query]);

  return (
    <aside className={`library${open ? ' library--open' : ''}`} aria-label="کتابخانهٔ جلسه‌ها">
      <div className="library__head">
        <Logo size={40} />
        <button type="button" className="icon-btn library__close" onClick={onClose} aria-label="بستن کتابخانه">
          <Icon name="close" />
        </button>
      </div>

      <button type="button" className="btn btn--primary library__new" onClick={onNew}>
        <Icon name="plus" size={18} /> جلسهٔ جدید
      </button>

      <label className="search">
        <Icon name="search" size={16} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="جست‌وجوی جلسه یا حاضرین…"
          aria-label="جست‌وجوی جلسه"
        />
        {query ? (
          <button type="button" className="search__clear" onClick={() => setQuery('')} aria-label="پاک‌کردن جست‌وجو">
            <Icon name="close" size={13} />
          </button>
        ) : null}
      </label>

      <div className="library__label">
        <span>جلسه‌ها</span>
        <span className="library__count">{formatCount(meetings.length)}</span>
      </div>

      <div className="library__list">
        {filtered.length === 0 ? (
          <div className="library__empty">
            <Icon name="search" size={22} />
            <p>جلسه‌ای با این جست‌وجو پیدا نشد.</p>
          </div>
        ) : (
          filtered.map((meeting) => {
            const active = meeting.id === controller.activeId;
            const stale = isAnalysisStale(meeting);
            return (
              <div key={meeting.id} className={`meeting-item${active ? ' meeting-item--active' : ''}`}>
                <button
                  type="button"
                  className="meeting-item__main"
                  onClick={() => onSelect(meeting.id)}
                  aria-current={active ? 'true' : undefined}
                >
                  <span className="meeting-item__top">
                    <span className="meeting-item__title">{meeting.meta.title}</span>
                    {stale ? <span className="dot dot--warn" title="نیازمند تحلیل مجدد" /> : null}
                  </span>
                  <span className="meeting-item__meta">
                    <span>
                      <Icon name="calendar" size={13} />
                      {formatJalaliKey(meeting.meta.date, { style: 'short' })}
                    </span>
                    <span>
                      <Icon name="zap" size={13} />
                      {meetingSummary(meeting)}
                    </span>
                  </span>
                </button>
                <div className="meeting-item__tools">
                  <button
                    type="button"
                    className="icon-btn icon-btn--tiny"
                    title="ساخت نسخهٔ کپی"
                    aria-label={`کپی ${meeting.meta.title}`}
                    onClick={() => onDuplicate(meeting.id)}
                  >
                    <Icon name="copy" size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--tiny icon-btn--danger"
                    title="حذف جلسه"
                    aria-label={`حذف ${meeting.meta.title}`}
                    onClick={() => onDelete(meeting)}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <details className="library__samples">
        <summary>
          <span>
            <Icon name="sparkles" size={16} /> نمونه‌های آماده
          </span>
          <span className="library__badge">۳</span>
        </summary>
        <div className="library__sample-list">
          {SAMPLES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              className="sample-btn"
              onClick={() => onOpenSample(sample.id)}
            >
              <span className="sample-btn__name">{sample.name}</span>
              <span className="sample-btn__desc">{sample.description}</span>
            </button>
          ))}
        </div>
      </details>

      <footer className="library__foot">
        <p className="library__privacy">
          <Icon name="lock" size={13} /> همهٔ داده‌ها روی همین دستگاه می‌مانند.
        </p>
        <p className="library__version">
          NoxaPlus Meet · نسخهٔ {APP_VERSION}
        </p>
      </footer>
    </aside>
  );
}
