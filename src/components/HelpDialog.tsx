import { APP_VERSION, CONTACT_EMAIL, REPO_URL, SITE_URL } from '../constants';
import { Icon } from './Icon';
import { Modal } from './Modal';

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
  onInstall: () => void;
  canInstall: boolean;
}

const SHORTCUTS: Array<[string, string]> = [
  ['N', 'جلسهٔ جدید'],
  ['Ctrl + Enter', 'تحلیل رونوشت'],
  ['?', 'باز کردن همین راهنما'],
  ['Esc', 'بستن پنجره‌ها'],
];

export function HelpDialog({ open, onClose, onInstall, canInstall }: HelpDialogProps) {
  return (
    <Modal
      open={open}
      title="راهنمای NoxaPlus Meet"
      subtitle="از رونوشت خام به صورت‌جلسهٔ قابل اجرا، کاملاً محلی."
      size="lg"
      onClose={onClose}
      footer={
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            بستن
          </button>
          {canInstall ? (
            <button type="button" className="btn btn--primary" onClick={onInstall}>
              <Icon name="install" size={17} />
              نصب روی دستگاه
            </button>
          ) : null}
        </div>
      }
    >
      <div className="help">
        <section className="help__section">
          <h3 className="help__title">
            <Icon name="book" size={18} />
            شروع سریع
          </h3>
          <ol className="help__steps">
            <li>یک جلسهٔ جدید بسازید یا یکی از نمونه‌های آماده را باز کنید.</li>
            <li>
              رونوشت خام را در پنل راست بچسبانید؛ هر خط بهتر است با «نام گوینده:» شروع شود.
            </li>
            <li>
              دکمهٔ «تحلیل رونوشت» را بزنید تا خلاصه، تصمیم‌ها، اقدام‌ها، پرسش‌ها و ریسک‌ها ساخته
              شوند.
            </li>
            <li>
              مسئول، مهلت و وضعیت اقدام‌ها را ویرایش کنید و از بخش خروجی، Markdown یا HTML بگیرید.
            </li>
          </ol>
        </section>

        <section className="help__section">
          <h3 className="help__title">
            <Icon name="wand" size={18} />
            موتور قاعده‌محور چگونه کار می‌کند؟
          </h3>
          <p>
            NoxaPlus Meet از الگوهای زبانی فارسی برای یافتن نشانه‌های تصمیم («تصمیم گرفتیم»،
            «توافق شد»)، اقدام («باید»، «لطفاً»، «اقدام:»)، پرسش، ریسک و موضوع استفاده می‌کند. سپس
            نام مسئول را از متن یا فهرست حاضرین تشخیص می‌دهد و مهلت‌هایی مثل «تا پنجشنبه»، «پایان
            هفته» یا «۲۵ آبان» را نسبت به تاریخ جلسه به تقویم جلالی تبدیل می‌کند.
          </p>
          <ul className="help__list">
            <li>
              برای دقت بیشتر، هر جمله را در یک خط و با نام گوینده بنویسید؛ مثلاً «سارا: علی تا
              پنجشنبه باید گزارش را ارسال کند.»
            </li>
            <li>می‌توانید در ابتدای رونوشت «عنوان:»، «تاریخ:»، «مدت:» و «حاضرین:» را بنویسید.</li>
            <li>هر مورد استخراج‌شده به جملهٔ مبدأ لینک است؛ روی «جمله» بزنید تا در رونوشت پیدا شود.</li>
            <li>همهٔ موارد را می‌توانید ویرایش، حذف یا دستی اضافه کنید؛ موتور فقط نقطهٔ شروع است.</li>
          </ul>
        </section>

        <section className="help__section">
          <h3 className="help__title">
            <Icon name="sliders" size={18} />
            میان‌برهای صفحه‌کلید
          </h3>
          <div className="shortcuts">
            {SHORTCUTS.map(([key, label]) => (
              <div key={key} className="shortcuts__row">
                <kbd>{key}</kbd>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="help__section help__section--privacy">
          <h3 className="help__title">
            <Icon name="shield" size={18} />
            حریم خصوصی
          </h3>
          <p>
            رونوشت جلسه‌ها حساس هستند. همهٔ پردازش، ذخیره‌سازی و خروجی‌گیری در همین مرورگر انجام
            می‌شود؛ هیچ متن یا فراداده‌ای به اینترنت ارسال نمی‌شود، هیچ حساب کاربری یا کلید API
            لازم نیست و هیچ ابزار ردیابی در برنامه وجود ندارد. برای انتقال بین دستگاه‌ها از پشتیبان
            JSON در تنظیمات استفاده کنید.
          </p>
        </section>

        <section className="help__section">
          <h3 className="help__title">
            <Icon name="sparkles" size={18} />
            درباره سازنده
          </h3>
          <p>
            NoxaPlus Meet نسخهٔ {APP_VERSION} است و توسط <strong>NoxaPlus</strong> طراحی و توسعه
            داده شده است. این برنامه آزاد و متن‌باز با مجوز MIT منتشر می‌شود.
          </p>
          <div className="help__links">
            <a href={SITE_URL} target="_blank" rel="noreferrer">
              <Icon name="globe" size={15} /> وب‌سایت رسمی
            </a>
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              <Icon name="github" size={15} /> مخزن GitHub
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`}>
              <Icon name="mail" size={15} /> {CONTACT_EMAIL}
            </a>
          </div>
        </section>
      </div>
    </Modal>
  );
}
