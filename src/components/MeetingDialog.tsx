import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { parseNumber, toLatinDigits } from '../core/digits';
import { formatJalali, jalaliKey, parseJalaliKey, todayJalali } from '../core/jalali';
import { sanitizeParticipantsText } from '../core/model';
import type { Meeting, MeetingMeta } from '../core/types';
import { Modal } from './Modal';

interface MeetingDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  meeting: Meeting | null;
  onClose: () => void;
  onCreate: (meta: Partial<MeetingMeta>) => void;
  onUpdate: (id: string, meta: Partial<MeetingMeta>) => void;
}

interface FormState {
  title: string;
  date: string;
  startTime: string;
  duration: string;
  chair: string;
  participants: string;
}

const todayKey = () => formatJalali(todayJalali(), { style: 'short' });

const emptyForm = (): FormState => ({
  title: '',
  date: todayKey(),
  startTime: '',
  duration: '',
  chair: '',
  participants: '',
});

function formFromMeeting(meeting: Meeting): FormState {
  return {
    title: meeting.meta.title,
    date: formatJalali(parseJalaliKey(meeting.meta.date) ?? todayJalali(), { style: 'short' }),
    startTime: meeting.meta.startTime,
    duration: meeting.meta.durationMins ? String(meeting.meta.durationMins) : '',
    chair: meeting.meta.chair,
    participants: meeting.meta.participants.join('، '),
  };
}

export function MeetingDialog({ open, mode, meeting, onClose, onCreate, onUpdate }: MeetingDialogProps) {
  const ids = useId();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState('');
  const meetingRef = useRef(meeting);
  meetingRef.current = meeting;
  const meetingId = meeting?.id;

  useEffect(() => {
    if (!open) return;
    const currentMeeting = meetingRef.current;
    setForm(mode === 'edit' && currentMeeting ? formFromMeeting(currentMeeting) : emptyForm());
    setError('');
  }, [open, mode, meetingId]);

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setError('عنوان جلسه را وارد کنید.');
      return;
    }
    const parsedDate = parseJalaliKey(form.date.trim());
    if (!parsedDate) {
      setError('تاریخ را به شکل ۱۴۰۵/۰۸/۲۱ وارد کنید.');
      return;
    }
    let durationMins: number | null = null;
    if (form.duration.trim()) {
      const parsed = parseNumber(form.duration);
      if (!parsed || parsed > 1_440) {
        setError('مدت جلسه باید عددی بین ۱ تا ۱۴۴۰ دقیقه باشد.');
        return;
      }
      durationMins = parsed;
    }
    let startTime = toLatinDigits(form.startTime.trim()).replace(/[.،]/g, ':');
    if (startTime) {
      const time = /^(\d{1,2}):(\d{2})$/.exec(startTime);
      if (!time || Number(time[1]) > 23 || Number(time[2]) > 59) {
        setError('ساعت شروع را به شکل ۱۴:۳۰ وارد کنید.');
        return;
      }
      startTime = `${time[1].padStart(2, '0')}:${time[2]}`;
    }
    const meta: Partial<MeetingMeta> = {
      title,
      date: jalaliKey(parsedDate),
      startTime,
      durationMins,
      chair: form.chair.trim(),
      participants: sanitizeParticipantsText(form.participants),
    };
    if (mode === 'edit' && meeting) onUpdate(meeting.id, meta);
    else onCreate(meta);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={mode === 'edit' ? 'ویرایش جلسه' : 'جلسهٔ جدید'}
      subtitle="این اطلاعات در سرصفحهٔ صورت‌جلسه و خروجی‌ها استفاده می‌شود."
      size="md"
      onClose={onClose}
      footer={
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            انصراف
          </button>
          <button type="submit" form={`${ids}-form`} className="btn btn--primary">
            {mode === 'edit' ? 'ذخیرهٔ تغییرات' : 'ساخت جلسه'}
          </button>
        </div>
      }
    >
      <form id={`${ids}-form`} className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label className="field__label" htmlFor={`${ids}-title`}>
            عنوان جلسه
          </label>
          <input
            id={`${ids}-title`}
            className="input"
            value={form.title}
            onChange={(event) => update('title', event.target.value)}
            placeholder="مثلاً بازبینی هفتگی محصول"
            maxLength={120}
            data-autofocus={mode === 'create' ? true : undefined}
          />
        </div>

        <div className="form__grid">
          <div className="field">
            <label className="field__label" htmlFor={`${ids}-date`}>
              تاریخ جلسه
            </label>
            <div className="field__inline">
              <input
                id={`${ids}-date`}
                className="input input--ltr"
                value={form.date}
                onChange={(event) => update('date', event.target.value)}
                placeholder="۱۴۰۵/۰۸/۲۱"
                inputMode="numeric"
              />
              <button type="button" className="btn btn--tiny" onClick={() => update('date', todayKey())}>
                امروز
              </button>
            </div>
            <span className="field__hint">مهلت‌های نسبی نسبت به این تاریخ محاسبه می‌شوند.</span>
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${ids}-time`}>
              ساعت شروع <span className="field__optional">اختیاری</span>
            </label>
            <input
              id={`${ids}-time`}
              className="input input--ltr"
              value={form.startTime}
              onChange={(event) => update('startTime', event.target.value)}
              placeholder="۱۴:۳۰"
              inputMode="numeric"
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${ids}-duration`}>
              مدت (دقیقه) <span className="field__optional">اختیاری</span>
            </label>
            <input
              id={`${ids}-duration`}
              className="input"
              value={form.duration}
              onChange={(event) => update('duration', event.target.value)}
              placeholder="۴۵"
              inputMode="numeric"
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${ids}-chair`}>
              رئیس جلسه <span className="field__optional">اختیاری</span>
            </label>
            <input
              id={`${ids}-chair`}
              className="input"
              value={form.chair}
              onChange={(event) => update('chair', event.target.value)}
              placeholder="نام رئیس جلسه"
            />
          </div>
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`${ids}-people`}>
            حاضرین <span className="field__optional">اختیاری</span>
          </label>
          <textarea
            id={`${ids}-people`}
            className="input textarea textarea--short"
            value={form.participants}
            onChange={(event) => update('participants', event.target.value)}
            placeholder="سارا محمدی، علی رضایی، مریم کاظمی"
            rows={2}
          />
          <span className="field__hint">نام‌ها را با ویرگول جدا کنید؛ برای تشخیص مسئول اقدام‌ها استفاده می‌شوند.</span>
        </div>

        {error ? (
          <p className="form__error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
