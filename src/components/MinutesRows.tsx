import { useState, type FormEvent } from 'react';
import { confidenceLabel } from '../core/export';
import { compareDates, formatJalaliKey, parseJalaliKey, todayJalali } from '../core/jalali';
import type { ActionItem, Confidence, QuestionItem, TopicItem } from '../core/types';
import { parseDueField } from '../due';
import { formatCount } from '../format';
import type { ItemPatch, MinutesItem } from '../hooks/useMeet';
import { Icon } from './Icon';

interface Handlers {
  onUpdate: (id: string, patch: ItemPatch) => void;
  onDelete: (item: MinutesItem) => void;
  onJump: (source: number) => void;
}

interface TextRowProps {
  id: string;
  text: string;
  source: number;
}

export function ConfidenceChip({ confidence }: { confidence: Confidence }) {
  const high = confidence === 'high';
  return (
    <span
      className={`chip ${high ? 'chip--ok' : 'chip--warn'}`}
      title={confidenceLabel(confidence)}
    >
      <Icon name={high ? 'check' : 'eye'} size={12} />
      {high ? 'قطعی' : 'بازبینی'}
    </span>
  );
}

export function SourceChip({ source, onJump }: { source: number; onJump: (source: number) => void }) {
  if (source < 0) {
    return (
      <span className="chip chip--manual">
        <Icon name="edit" size={12} /> دستی
      </span>
    );
  }
  return (
    <button
      type="button"
      className="chip chip--source"
      onClick={() => onJump(source)}
      title="انتخاب این جمله در رونوشت"
    >
      <Icon name="target" size={12} /> جمله {formatCount(source + 1)}
    </button>
  );
}

interface SourceRowProps extends Handlers {
  item: TextRowProps;
  index: number;
  confidence?: Confidence;
  variant?: 'summary' | 'decision' | 'risk';
}

export function SourceRow({ item, index, confidence, variant = 'decision', onUpdate, onDelete, onJump }: SourceRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const [error, setError] = useState('');

  const start = () => {
    setDraft(item.text);
    setError('');
    setEditing(true);
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) {
      setError('متن نمی‌تواند خالی باشد.');
      return;
    }
    onUpdate(item.id, { text });
    setEditing(false);
  };

  return (
    <article className={`source-row source-row--${variant}`}>
      <span className="source-row__index" aria-hidden="true">
        {variant === 'summary' ? <Icon name="quote" size={14} /> : formatCount(index + 1)}
      </span>
      <div className="source-row__body">
        {editing ? (
          <form className="item-edit" onSubmit={save}>
            <textarea
              className="input textarea"
              rows={2}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              autoFocus
            />
            {error ? <p className="form__error">{error}</p> : null}
            <div className="item-edit__actions">
              <button type="button" className="btn btn--tiny btn--ghost" onClick={() => setEditing(false)}>
                انصراف
              </button>
              <button type="submit" className="btn btn--tiny btn--primary" disabled={!draft.trim()}>
                ذخیره
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="source-row__text">{item.text}</p>
            <div className="item-meta">
              {confidence ? <ConfidenceChip confidence={confidence} /> : null}
              <SourceChip source={item.source} onJump={onJump} />
            </div>
          </>
        )}
      </div>
      {!editing ? (
        <div className="item-tools">
          <button type="button" className="icon-btn icon-btn--tiny" onClick={start} aria-label="ویرایش مورد">
            <Icon name="edit" size={14} />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--tiny icon-btn--danger"
            onClick={() => onDelete(confidence ? { ...item, confidence } : item)}
            aria-label="حذف مورد"
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      ) : null}
    </article>
  );
}

interface QuestionRowProps extends Handlers {
  item: QuestionItem;
  index: number;
}

export function QuestionRow({ item, index, onUpdate, onDelete, onJump }: QuestionRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const [askedBy, setAskedBy] = useState(item.askedBy);
  const [error, setError] = useState('');

  const start = () => {
    setDraft(item.text);
    setAskedBy(item.askedBy);
    setError('');
    setEditing(true);
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) {
      setError('متن پرسش نمی‌تواند خالی باشد.');
      return;
    }
    onUpdate(item.id, { text, askedBy: askedBy.trim() });
    setEditing(false);
  };

  return (
    <article className="source-row source-row--question">
      <span className="source-row__index source-row__index--question" aria-hidden="true">
        {formatCount(index + 1)}
      </span>
      <div className="source-row__body">
        {editing ? (
          <form className="item-edit" onSubmit={save}>
            <textarea
              className="input textarea"
              rows={2}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              autoFocus
            />
            <input
              className="input"
              value={askedBy}
              onChange={(event) => setAskedBy(event.target.value)}
              placeholder="پرسشگر (اختیاری)"
            />
            {error ? <p className="form__error">{error}</p> : null}
            <div className="item-edit__actions">
              <button type="button" className="btn btn--tiny btn--ghost" onClick={() => setEditing(false)}>
                انصراف
              </button>
              <button type="submit" className="btn btn--tiny btn--primary" disabled={!draft.trim()}>
                ذخیره
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="source-row__text">{item.text}</p>
            <div className="item-meta">
              {item.askedBy ? (
                <span className="chip">
                  <Icon name="user" size={12} /> {item.askedBy}
                </span>
              ) : null}
              <ConfidenceChip confidence={item.confidence} />
              <SourceChip source={item.source} onJump={onJump} />
            </div>
          </>
        )}
      </div>
      {!editing ? (
        <div className="item-tools">
          <button type="button" className="icon-btn icon-btn--tiny" onClick={start} aria-label="ویرایش پرسش">
            <Icon name="edit" size={14} />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--tiny icon-btn--danger"
            onClick={() => onDelete(item)}
            aria-label="حذف پرسش"
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      ) : null}
    </article>
  );
}

interface TopicRowProps extends Handlers {
  item: TopicItem;
}

export function TopicRow({ item, onUpdate, onDelete, onJump }: TopicRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);

  const save = (event: FormEvent) => {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    onUpdate(item.id, { title });
    setEditing(false);
  };

  return (
    <div className="topic-row">
      {editing ? (
        <form className="topic-row__edit" onSubmit={save}>
          <input
            className="input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoFocus
          />
          <button type="submit" className="btn btn--tiny btn--primary" disabled={!draft.trim()}>
            ذخیره
          </button>
          <button type="button" className="btn btn--tiny btn--ghost" onClick={() => setEditing(false)}>
            انصراف
          </button>
        </form>
      ) : (
        <>
          <span className="topic-row__label">
            <Icon name="layers" size={14} /> {item.title}
          </span>
          <span className="topic-row__tools">
            <SourceChip source={item.source} onJump={onJump} />
            <button
              type="button"
              className="icon-btn icon-btn--tiny"
              onClick={() => {
                setDraft(item.title);
                setEditing(true);
              }}
              aria-label="ویرایش موضوع"
            >
              <Icon name="edit" size={13} />
            </button>
            <button
              type="button"
              className="icon-btn icon-btn--tiny icon-btn--danger"
              onClick={() => onDelete(item)}
              aria-label="حذف موضوع"
            >
              <Icon name="trash" size={13} />
            </button>
          </span>
        </>
      )}
    </div>
  );
}

interface ActionRowProps extends Handlers {
  item: ActionItem;
  meetingDate: string;
  onToggle: (id: string) => void;
}

export function ActionRow({ item, meetingDate, onUpdate, onDelete, onJump, onToggle }: ActionRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const [owner, setOwner] = useState(item.owner);
  const [due, setDue] = useState(item.due ? formatJalaliKey(item.due, { style: 'short' }) : '');
  const [status, setStatus] = useState<ActionItem['status']>(item.status);
  const [error, setError] = useState('');

  const dueDate = item.due ? parseJalaliKey(item.due) : null;
  const overdue =
    item.status === 'open' && dueDate ? compareDates(dueDate, todayJalali()) < 0 : false;

  const start = () => {
    setDraft(item.text);
    setOwner(item.owner);
    setDue(item.due ? formatJalaliKey(item.due, { style: 'short' }) : '');
    setStatus(item.status);
    setError('');
    setEditing(true);
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) {
      setError('متن اقدام نمی‌تواند خالی باشد.');
      return;
    }
    const parsed = parseDueField(due, meetingDate);
    if (!parsed.ok) {
      setError(parsed.error ?? 'مهلت معتبر نیست.');
      return;
    }
    onUpdate(item.id, { text, owner: owner.trim(), due: parsed.due, status });
    setEditing(false);
  };

  return (
    <article className={`action-row${item.status === 'done' ? ' action-row--done' : ''}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={item.status === 'done'}
        disabled={editing}
        className={`action-check${item.status === 'done' ? ' action-check--on' : ''}`}
        onClick={() => onToggle(item.id)}
        aria-label={item.status === 'done' ? 'بازگرداندن به حالت باز' : 'علامت‌گذاری به‌عنوان انجام‌شده'}
      >
        <Icon name="check" size={13} />
      </button>

      <div className="action-row__body">
        {editing ? (
          <form className="item-edit" onSubmit={save}>
            <textarea
              className="input textarea"
              rows={2}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              autoFocus
            />
            <div className="form__grid form__grid--three">
              <label className="field field--tight">
                <span className="field__label">مسئول</span>
                <input
                  className="input"
                  value={owner}
                  onChange={(event) => setOwner(event.target.value)}
                  placeholder="نام مسئول"
                />
              </label>
              <label className="field field--tight">
                <span className="field__label">مهلت</span>
                <input
                  className="input input--ltr"
                  value={due}
                  onChange={(event) => setDue(event.target.value)}
                  placeholder="پنجشنبه یا ۱۴۰۵/۰۹/۰۱"
                  inputMode="text"
                />
              </label>
              <label className="field field--tight">
                <span className="field__label">وضعیت</span>
                <select
                  className="input"
                  value={status}
                  onChange={(event) => setStatus(event.target.value === 'done' ? 'done' : 'open')}
                >
                  <option value="open">باز</option>
                  <option value="done">انجام‌شده</option>
                </select>
              </label>
            </div>
            {error ? <p className="form__error">{error}</p> : null}
            <div className="item-edit__actions">
              <button type="button" className="btn btn--tiny btn--ghost" onClick={() => setEditing(false)}>
                انصراف
              </button>
              <button type="submit" className="btn btn--tiny btn--primary" disabled={!draft.trim()}>
                ذخیره
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="action-row__text">{item.text}</p>
            <div className="item-meta">
              <span className={`chip${item.owner ? '' : ' chip--muted'}`}>
                <Icon name="user" size={12} /> {item.owner || 'بدون مسئول'}
              </span>
              <span
                className={`chip${item.due ? '' : ' chip--muted'}${overdue ? ' chip--danger' : ''}`}
              >
                <Icon name="calendar" size={12} />
                {item.due ? formatJalaliKey(item.due, { style: 'long' }) : 'بدون مهلت'}
              </span>
              {overdue ? <span className="chip chip--danger">مهلت گذشته</span> : null}
              {item.status === 'done' ? (
                <span className="chip chip--ok">
                  <Icon name="check" size={12} /> انجام‌شده
                </span>
              ) : null}
              <ConfidenceChip confidence={item.confidence} />
              <SourceChip source={item.source} onJump={onJump} />
            </div>
          </>
        )}
      </div>

      {!editing ? (
        <div className="item-tools">
          <button type="button" className="icon-btn icon-btn--tiny" onClick={start} aria-label="ویرایش اقدام">
            <Icon name="edit" size={14} />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--tiny icon-btn--danger"
            onClick={() => onDelete(item)}
            aria-label="حذف اقدام"
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      ) : null}
    </article>
  );
}
