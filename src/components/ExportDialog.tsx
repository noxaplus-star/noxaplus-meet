import { useEffect, useState } from 'react';
import { minutesToHtml, minutesToMarkdown, suggestedFilename } from '../core/export';
import { formatDate } from '../format';
import { downloadText, openHtmlDocument } from '../download';
import type { Meeting } from '../core/types';
import type { ToastTone } from '../hooks/useToasts';
import { Icon } from './Icon';
import { Modal } from './Modal';

interface ExportDialogProps {
  open: boolean;
  meeting: Meeting | null;
  onClose: () => void;
  notify: (message: string, tone?: ToastTone) => void;
}

type ExportTab = 'markdown' | 'html';

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return new Promise((resolve, reject) => {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    if (ok) resolve();
    else reject(new Error('copy failed'));
  });
}

function printHtml(html: string): boolean {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.title = 'چاپ صورت‌جلسه';
  frame.style.position = 'fixed';
  frame.style.right = '-10000px';
  frame.style.bottom = '0';
  frame.style.width = '1px';
  frame.style.height = '1px';
  frame.srcdoc = html;
  frame.onload = () => {
    window.setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    }, 120);
  };
  document.body.appendChild(frame);
  window.setTimeout(() => frame.remove(), 120_000);
  return true;
}

export function ExportDialog({ open, meeting, onClose, notify }: ExportDialogProps) {
  const [tab, setTab] = useState<ExportTab>('markdown');

  useEffect(() => {
    if (open) setTab('markdown');
  }, [open]);

  if (!meeting) return null;

  const markdown = minutesToMarkdown(meeting);
  const html = minutesToHtml(meeting);
  const content = tab === 'markdown' ? markdown : html;
  const filename = suggestedFilename(meeting, tab === 'markdown' ? 'md' : 'html');

  const handleCopy = async () => {
    try {
      await copyText(content);
      notify('محتوای خروجی کپی شد.');
    } catch {
      notify('کپی در این مرورگر انجام نشد؛ از دانلود استفاده کنید.', 'warning');
    }
  };

  const handleDownload = () => {
    downloadText(
      filename,
      content,
      tab === 'markdown' ? 'text/markdown' : 'text/html',
    );
    notify(`فایل ${tab === 'markdown' ? 'Markdown' : 'HTML'} دانلود شد.`);
  };

  return (
    <Modal
      open={open}
      title="خروجی صورت‌جلسه"
      subtitle={`${meeting.meta.title} · ${formatDate(meeting.meta.date)}`}
      size="lg"
      onClose={onClose}
      footer={
        <div className="modal__actions modal__actions--split">
          <span className="modal__note">
            <Icon name="lock" size={14} /> خروجی فقط روی همین دستگاه ساخته می‌شود.
          </span>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              بستن
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                printHtml(html);
                notify('پنجرهٔ چاپ باز شد؛ می‌توانید PDF ذخیره کنید.', 'info');
              }}
            >
              <Icon name="printer" size={16} />
              چاپ / PDF
            </button>
          </div>
        </div>
      }
    >
      <div className="export">
        <div className="export__bar">
          <div className="segmented" role="tablist" aria-label="قالب خروجی">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'markdown'}
              className={`segmented__btn${tab === 'markdown' ? ' is-active' : ''}`}
              onClick={() => setTab('markdown')}
            >
              <Icon name="file-text" size={15} /> Markdown
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'html'}
              className={`segmented__btn${tab === 'html' ? ' is-active' : ''}`}
              onClick={() => setTab('html')}
            >
              <Icon name="globe" size={15} /> HTML مستقل
            </button>
          </div>
          <div className="export__tools">
            <button type="button" className="btn btn--tiny btn--ghost" onClick={handleCopy}>
              <Icon name="copy" size={15} /> کپی
            </button>
            {tab === 'html' ? (
              <button
                type="button"
                className="btn btn--tiny btn--ghost"
                onClick={() => {
                  if (openHtmlDocument(html)) notify('پیش‌نمایش HTML در تب جدید باز شد.', 'info');
                  else notify('مرورگر پنجرهٔ جدید را مسدود کرد.', 'warning');
                }}
              >
                <Icon name="eye" size={15} /> پیش‌نمایش
              </button>
            ) : null}
            <button type="button" className="btn btn--tiny btn--primary" onClick={handleDownload}>
              <Icon name="download" size={15} /> دانلود
            </button>
          </div>
        </div>

        <pre className={`export__preview${tab === 'html' ? ' export__preview--ltr' : ''}`} dir={tab === 'html' ? 'ltr' : 'rtl'}>
          {content}
        </pre>

        <div className="export__hint">
          <Icon name="info" size={16} />
          <p>
            Markdown برای ویکی و مستندات، HTML برای اشتراک یا چاپ، و PDF از پنجرهٔ چاپ مرورگر ساخته
            می‌شود. نام پیشنهادی فایل: <code dir="ltr">{filename}</code>
          </p>
        </div>
      </div>
    </Modal>
  );
}
