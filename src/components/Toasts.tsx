import { createPortal } from 'react-dom';
import type { ToastItem, ToastTone } from '../hooks/useToasts';
import { Icon, type IconName } from './Icon';

const ICONS: Record<ToastTone, IconName> = {
  success: 'check-circle',
  info: 'info',
  warning: 'alert',
  error: 'alert',
};

interface ToastsProps {
  toasts: ToastItem[];
  dismiss: (id: string) => void;
}

export function Toasts({ toasts, dismiss }: ToastsProps) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`}>
          <span className="toast__icon">
            <Icon name={ICONS[toast.tone]} size={17} />
          </span>
          <p className="toast__message">{toast.message}</p>
          {toast.action ? (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                toast.action?.onClick();
                dismiss(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          ) : null}
          <button
            type="button"
            className="toast__close"
            onClick={() => dismiss(toast.id)}
            aria-label="بستن پیام"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
