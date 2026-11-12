import { useCallback, useEffect, useRef, useState } from 'react';
import { createId } from '../core/ids';

export type ToastTone = 'success' | 'info' | 'warning' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
}

const DURATION = 3_800;

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: ToastTone = 'success', action?: ToastAction) => {
      const id = createId('toast');
      setToasts((prev) => [...prev.slice(-2), { id, message, tone, action }]);
      const timer = window.setTimeout(() => dismiss(id), action ? DURATION + 2_200 : DURATION);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => window.clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  return { toasts, push, dismiss };
}
