import { useEffect, useId, useState, type FormEvent } from 'react';
import { parseDueField } from '../due';
import { formatCount } from '../format';
import type { ItemDraft, MeetController, MinutesSection } from '../hooks/useMeet';
import type { ToastAction, ToastTone } from '../hooks/useToasts';
import { Icon, type IconName } from './Icon';
import { Menu } from './Menu';
import { ActionRow, QuestionRow, SourceRow, TopicRow } from './MinutesRows';

export type Notify = (message: string, tone?: ToastTone, action?: ToastAction) => void;

interface MinutesPanelProps {
  controller: MeetController;
  notify: Notify;
  onOpenExport: () => void;
  onEditMeeting: () => void;
  onRequestClearMinutes: () => void;
  onRequestDeleteMeeting: () => void;
  onAnalyze: () => void;
  onJumpSource: (source: number) => void;
}

interface TabDef {
  key: MinutesSection;
  label: string;
  icon: IconName;
  description: string;
  emptyTitle: string;
  emptyHint: string;
}

const TABS: TabDef[] = [
  {
    key: 'summary',
    label: 'خلاصه',
    icon: 'sparkles',
    description: 'چند جملهٔ کلیدی که روایت فشردهٔ جلسه را می‌سازند.',
    emptyTitle: 'خلاصه‌ای ساخته نشده است',
    emptyHint: 'رونوشت را تحلیل کنید یا یک جملهٔ کلیدی دستی اضافه کنید.',
  },
  {
    key: 'decisions',
    label: 'تصمیم‌ها',
    icon: 'flag',
    description: 'آنچه تیم به آن رسید؛ قابل ویرایش و بازبینی.',
    emptyTitle: 'تصمیمی پیدا نشد',
    emptyHint: 'جمله‌هایی مثل «تصمیم گرفتیم…» یا «توافق شد…» به این بخش می‌آیند.',
  },
  {
    key: 'actions',
    label: 'اقدام‌ها',
    icon: 'zap',
    description: 'کارهای بعدی با مسئول، مهلت و وضعیت پیگیری.',
    emptyTitle: 'اقدامی ثبت نشده است',
    emptyHint: 'جمله‌هایی مثل «باید…»، «لطفاً…» یا «اقدام:» به این بخش تبدیل می‌شوند.',
  },
  {
    key: 'questions',
    label: 'پرسش‌ها',
    icon: 'help',
    description: 'پرسش‌های باز یا نیازمند پاسخ که نباید گم شوند.',
    emptyTitle: 'پرسش بازی پیدا نشد',
    emptyHint: 'جمله‌های پرسشی رونوشت به‌طور خودکار اینجا جمع می‌شوند.',
  },
  {
    key: 'risks',
    label: 'ریسک‌ها',
    icon: 'alert',
    description: 'نگرانی‌ها و تهدیدهایی که باید پایش شوند.',
    emptyTitle: 'ریسکی پیدا نشد',
    emptyHint: 'جمله‌های دارای «ریسک»، «خطر» یا «نگرانی» در این بخش می‌آیند.',
  },
  {
    key: 'topics',
    label: 'موضوع‌ها',
    icon: 'layers',
    description: 'سرفصل‌های اصلی گفت‌وگو در جلسه.',
    emptyTitle: 'موضوعی استخراج نشد',
    emptyHint: 'موضوع‌های جلسه را دستی اضافه کنید تا ساختار صورت‌جلسه کامل شود.',
  },
];

type ActionFilter = 'all' | 'open' | 'done';

const FILTERS: Array<{ value: ActionFilter; label: string }> = [
  { value: 'all', label: 'همه' },
  { value: 'open', label: 'باز' },
  { value: 'done', label: 'انجام‌شده' },
];

function countFor(controller: MeetController, tab: MinutesSection): number {
  const minutes = controller.activeMeeting?.minutes;
  if (!minutes) return 0;
  return minutes[tab].length;
}

interface NewItemFormProps {
  section: MinutesSection;
  meetingDate: string;
  owners: string[];
  onAdd: (draft: ItemDraft) => boolean;
  onClose: () => void;
}

function NewItemForm({ section, meetingDate, owners, onAdd, onClose }: NewItemFormProps) {
  const listId = useId();
  const [text, setText] = useState('');
  const [owner, setOwner] = useState('');
  const [due, setDue] = useState('');
  const [askedBy, setAskedBy] = useState('');
  const [error, setError] = useState('');

  const textLabel =
    section === 'topics'
      ? 'عنوان موضوع'
      : section === 'questions'
        ? 'متن پرسش'
        : section === 'actions'
          ? 'شرح اقدام'
          : section === 'risks'
            ? 'شرح ریسک'
            : section === 'decisions'
              ? 'متن تصمیم'
              : 'جملهٔ خلاصه';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) {
      setError('متن نمی‌تواند خالی باشد.');
      return;
    }
    let dueKey: string | null = null;
    if (section === 'actions' && due.trim()) {
      const parsed = parseDueField(due, meetingDate);
      if (!parsed.ok) {
        setError(parsed.error ?? 'مهلت معتبر نیست.');
        return;
      }
      dueKey = parsed.due;
    }
    const draft: ItemDraft =
      section === 'topics'
        ? { title: value }
        : section === 'actions'
          ? { text: value, owner, due: dueKey }
          : section === 'questions'
            ? { text: value, askedBy }
            : { text: value };
    if (onAdd(draft)) onClose();
  };

  return (
    <form className="new-item" onSubmit={submit}>
      <div className="new-item__head">
        <span>
          <Icon name="plus" size={15} /> افزودن دستی
        </span>
        <button type="button" className="icon-btn icon-btn--tiny" onClick={onClose} aria-label="بستن فرم">
          <Icon name="close" size={14} />
        </button>
      </div>
      <textarea
        className="input textarea"
        rows={2}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={textLabel}
        aria-label={textLabel}
        autoFocus
      />
      {section === 'actions' ? (
        <div className="form__grid">
          <label className="field field--tight">
            <span className="field__label">مسئول</span>
            <input
              className="input"
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              placeholder="نام مسئول"
              list={listId}
            />
            <datalist id={listId}>
              {owners.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
          <label className="field field--tight">
            <span className="field__label">مهلت</span>
            <input
              className="input"
              value={due}
              onChange={(event) => setDue(event.target.value)}
              placeholder="پنجشنبه یا ۱۴۰۵/۰۹/۰۱"
            />
            <span className="field__hint">نسبت به تاریخ جلسه محاسبه می‌شود.</span>
          </label>
        </div>
      ) : null}
      {section === 'questions' ? (
        <label className="field field--tight">
          <span className="field__label">پرسشگر (اختیاری)</span>
          <input
            className="input"
            value={askedBy}
            onChange={(event) => setAskedBy(event.target.value)}
            placeholder="نام پرسشگر"
            list={listId}
          />
          <datalist id={listId}>
            {owners.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>
      ) : null}
      {error ? <p className="form__error">{error}</p> : null}
      <div className="new-item__actions">
        <button type="button" className="btn btn--tiny btn--ghost" onClick={onClose}>
          انصراف
        </button>
        <button type="submit" className="btn btn--tiny btn--primary" disabled={!text.trim()}>
          <Icon name="plus" size={14} /> افزودن
        </button>
      </div>
    </form>
  );
}

export function MinutesPanel({
  controller,
  notify,
  onOpenExport,
  onEditMeeting,
  onRequestClearMinutes,
  onRequestDeleteMeeting,
  onAnalyze,
  onJumpSource,
}: MinutesPanelProps) {
  const meeting = controller.activeMeeting;
  const [activeTab, setActiveTab] = useState<MinutesSection>('summary');
  const [adding, setAdding] = useState(false);
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');

  useEffect(() => {
    setAdding(false);
    setActionFilter('all');
  }, [meeting?.id]);

  useEffect(() => {
    setAdding(false);
  }, [activeTab]);

  if (!meeting) {
    return (
      <section className="pane pane--minutes" aria-label="صورت‌جلسه">
        <div className="empty-block empty-block--large">
          <span className="empty-block__icon">
            <Icon name="clipboard" size={26} />
          </span>
          <h3>جلسه‌ای انتخاب نشده است</h3>
          <p>یک جلسه بسازید یا از کتابخانه یکی را انتخاب کنید.</p>
        </div>
      </section>
    );
  }

  const minutes = meeting.minutes;
  const tab = TABS.find((item) => item.key === activeTab) ?? TABS[0];
  const doneCount = minutes.actions.filter((action) => action.status === 'done').length;
  const totalActions = minutes.actions.length;
  const progress = totalActions ? Math.round((doneCount / totalActions) * 100) : 0;
  const filteredActions = minutes.actions.filter((action) =>
    actionFilter === 'all' ? true : action.status === actionFilter,
  );
  const owners = meeting.meta.participants;

  const moreItems = [
    { label: 'تحلیل مجدد رونوشت', icon: 'refresh' as const, onSelect: onAnalyze },
    { label: 'ویرایش مشخصات جلسه', icon: 'edit' as const, onSelect: onEditMeeting },
    { label: 'پاک‌کردن صورت‌جلسه', icon: 'undo' as const, onSelect: onRequestClearMinutes },
    {
      label: 'حذف جلسه',
      icon: 'trash' as const,
      danger: true,
      onSelect: onRequestDeleteMeeting,
    },
  ];

  const deleteItem = (section: MinutesSection, item: { id: string }) => {
    const meetingId = meeting.id;
    if (section === 'summary') {
      const target = minutes.summary.find((entry) => entry.id === item.id);
      controller.removeItem(section, item.id);
      if (target) {
        notify('جملهٔ خلاصه حذف شد.', 'info', {
          label: 'واگرد',
          onClick: () => controller.restoreItem(section, target, meetingId),
        });
      }
      return;
    }
    const pools: Record<Exclude<MinutesSection, 'summary'>, Array<{ id: string }>> = {
      decisions: minutes.decisions,
      actions: minutes.actions,
      questions: minutes.questions,
      risks: minutes.risks,
      topics: minutes.topics,
    };
    const target = pools[section].find((entry) => entry.id === item.id);
    controller.removeItem(section, item.id);
    if (target) {
      notify('مورد حذف شد.', 'info', {
        label: 'واگرد',
        onClick: () =>
          controller.restoreItem(
            section,
            target as Parameters<typeof controller.restoreItem>[1],
            meetingId,
          ),
      });
    }
  };

  const addItem = (draft: ItemDraft): boolean => {
    const added = controller.addItem(activeTab, draft);
    if (added) notify('مورد جدید به صورت‌جلسه اضافه شد.');
    return added;
  };

  const openAdd = () => {
    setAdding(true);
    setActionFilter('all');
  };

  const jumpToSource = (source: number) => {
    if (controller.stale) {
      notify('رونوشت تغییر کرده است؛ برای ارجاع دقیق، ابتدا تحلیل مجدد انجام دهید.', 'warning');
      return;
    }
    onJumpSource(source);
  };

  const renderRows = () => {
    switch (activeTab) {
      case 'summary':
        return minutes.summary.map((item, index) => (
          <SourceRow
            key={item.id}
            item={item}
            index={index}
            variant="summary"
            onUpdate={(id, patch) => controller.updateItem('summary', id, patch)}
            onDelete={(entry) => deleteItem('summary', entry)}
            onJump={jumpToSource}
          />
        ));
      case 'decisions':
        return minutes.decisions.map((item, index) => (
          <SourceRow
            key={item.id}
            item={item}
            index={index}
            confidence={item.confidence}
            variant="decision"
            onUpdate={(id, patch) => controller.updateItem('decisions', id, patch)}
            onDelete={(entry) => deleteItem('decisions', entry)}
            onJump={jumpToSource}
          />
        ));
      case 'risks':
        return minutes.risks.map((item, index) => (
          <SourceRow
            key={item.id}
            item={item}
            index={index}
            confidence={item.confidence}
            variant="risk"
            onUpdate={(id, patch) => controller.updateItem('risks', id, patch)}
            onDelete={(entry) => deleteItem('risks', entry)}
            onJump={jumpToSource}
          />
        ));
      case 'questions':
        return minutes.questions.map((item, index) => (
          <QuestionRow
            key={item.id}
            item={item}
            index={index}
            onUpdate={(id, patch) => controller.updateItem('questions', id, patch)}
            onDelete={(entry) => deleteItem('questions', entry)}
            onJump={jumpToSource}
          />
        ));
      case 'topics':
        return minutes.topics.map((item) => (
          <TopicRow
            key={item.id}
            item={item}
            onUpdate={(id, patch) => controller.updateItem('topics', id, patch)}
            onDelete={(entry) => deleteItem('topics', entry)}
            onJump={jumpToSource}
          />
        ));
      case 'actions':
        return filteredActions.map((item) => (
          <ActionRow
            key={item.id}
            item={item}
            meetingDate={meeting.meta.date}
            onUpdate={(id, patch) => controller.updateItem('actions', id, patch)}
            onDelete={(entry) => deleteItem('actions', entry)}
            onJump={jumpToSource}
            onToggle={controller.toggleAction}
          />
        ));
      default:
        return null;
    }
  };

  const rendered = renderRows();
  const hasRows = Array.isArray(rendered) ? rendered.length > 0 : false;
  const isFilteredEmpty = activeTab === 'actions' && totalActions > 0 && !hasRows;

  return (
    <section className="pane pane--minutes" aria-label="صورت‌جلسه">
      <header className="pane__head">
        <div>
          <p className="eyebrow">
            <Icon name="clipboard" size={14} /> نتیجهٔ موتور محلی
          </p>
          <h2 className="pane__title">
            صورت‌جلسه
            {controller.stale ? <span className="badge badge--warn">نیازمند بازبینی</span> : null}
          </h2>
        </div>
        <div className="pane__tools">
          <button type="button" className="btn btn--small btn--export" onClick={onOpenExport}>
            <Icon name="download" size={15} />
            <span>خروجی</span>
          </button>
          <Menu items={moreItems} label="بیشتر" align="end" className="menu--labeled">
            <span className="menu__trigger-text">
              <Icon name="more" size={16} />
              <span>بیشتر</span>
            </span>
          </Menu>
        </div>
      </header>

      {meeting.stats ? (
        <div className="overview">
          <div className="overview__stats">
            <div className="overview__stat">
              <span>واژه</span>
              <strong>{formatCount(meeting.stats.words)}</strong>
            </div>
            <div className="overview__stat">
              <span>گوینده</span>
              <strong>{formatCount(meeting.stats.speakers)}</strong>
            </div>
            <div className="overview__stat">
              <span>مطالعه</span>
              <strong>
                {formatCount(meeting.stats.readingMinutes)}
                <small>دقیقه</small>
              </strong>
            </div>
          </div>
          <div className="overview__progress">
            <div className="overview__progress-head">
              <span>پیشرفت اقدام‌ها</span>
              <span>
                {formatCount(doneCount)} از {formatCount(totalActions)}
              </span>
            </div>
            <div
              className="progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <span className="progress__bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      ) : (
        <div className="analyze-callout">
          <span className="analyze-callout__icon">
            <Icon name="wand" size={20} />
          </span>
          <div className="analyze-callout__text">
            <strong>صورت‌جلسه هنوز ساخته نشده است.</strong>
            <p>
              {meeting.transcript.trim()
                ? 'رونوشت آماده است؛ با یک کلیک خلاصه، تصمیم‌ها و اقدام‌ها را استخراج کنید.'
                : 'ابتدا رونوشت جلسه را در پنل کنار وارد کنید.'}
            </p>
          </div>
          <button
            type="button"
            className="btn btn--primary btn--small"
            onClick={onAnalyze}
            disabled={!meeting.transcript.trim()}
          >
            <Icon name="wand" size={15} /> تحلیل رونوشت
          </button>
        </div>
      )}

      <div className="tabs" role="tablist" aria-label="بخش‌های صورت‌جلسه">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={activeTab === item.key}
            className={`tab${activeTab === item.key ? ' is-active' : ''}`}
            onClick={() => setActiveTab(item.key)}
          >
            <Icon name={item.icon} size={14} />
            <span>{item.label}</span>
            <span className={`tab__count${countFor(controller, item.key) === 0 ? ' is-zero' : ''}`}>
              {formatCount(countFor(controller, item.key))}
            </span>
          </button>
        ))}
      </div>

      <div className="minutes-body" role="tabpanel" aria-label={tab.label}>
        <div className="section-head">
          <div className="section-head__text">
            <h3>{tab.label}</h3>
            <p>{tab.description}</p>
          </div>
          <button
            type="button"
            className={`btn btn--tiny ${adding ? 'btn--ghost' : 'btn--outline'}`}
            onClick={() => (adding ? setAdding(false) : openAdd())}
          >
            <Icon name={adding ? 'close' : 'plus'} size={14} />
            {adding ? 'بستن' : 'افزودن دستی'}
          </button>
        </div>

        {activeTab === 'actions' && totalActions > 0 ? (
          <div className="filter-row" role="group" aria-label="فیلتر اقدام‌ها">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={`filter-chip${actionFilter === filter.value ? ' is-active' : ''}`}
                onClick={() => setActionFilter(filter.value)}
              >
                {filter.label}
                {filter.value !== 'all' ? (
                  <span>
                    {formatCount(
                      minutes.actions.filter((action) => action.status === filter.value).length,
                    )}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}

        {adding ? (
          <NewItemForm
            key={activeTab}
            section={activeTab}
            meetingDate={meeting.meta.date}
            owners={owners}
            onAdd={addItem}
            onClose={() => setAdding(false)}
          />
        ) : null}

        {hasRows ? <div className="item-list">{rendered}</div> : null}

        {!adding && !hasRows ? (
          isFilteredEmpty ? (
            <div className="inline-empty">
              <Icon name="sliders" size={18} />
              <p>در این فیلتر اقدامی وجود ندارد.</p>
              <button type="button" className="btn btn--tiny btn--ghost" onClick={() => setActionFilter('all')}>
                نمایش همه
              </button>
            </div>
          ) : (
            <div className="empty-block">
              <span className="empty-block__icon">
                <Icon name={tab.icon} size={24} />
              </span>
              <h4>{tab.emptyTitle}</h4>
              <p>{tab.emptyHint}</p>
              <div className="empty-block__actions">
                <button type="button" className="btn btn--tiny btn--outline" onClick={openAdd}>
                  <Icon name="plus" size={14} /> افزودن دستی
                </button>
                <button
                  type="button"
                  className="btn btn--tiny btn--ghost"
                  onClick={onAnalyze}
                  disabled={!meeting.transcript.trim()}
                >
                  <Icon name="refresh" size={14} /> تحلیل رونوشت
                </button>
              </div>
            </div>
          )
        ) : null}
      </div>
    </section>
  );
}
