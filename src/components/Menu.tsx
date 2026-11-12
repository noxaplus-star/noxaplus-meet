import { useEffect, useRef, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export interface MenuItem {
  label: string;
  icon?: IconName;
  hint?: string;
  danger?: boolean;
  onSelect: () => void;
}

interface MenuProps {
  items: MenuItem[];
  label: string;
  icon?: IconName;
  align?: 'start' | 'end';
  className?: string;
  children?: ReactNode;
}

export function Menu({ items, label, icon = 'more', align = 'start', className = '', children }: MenuProps) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        ref.current.open = false;
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector<HTMLElement>('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <details ref={ref} className={`menu ${className}`}>
      <summary className="menu__trigger" aria-label={label} title={label}>
        {children ?? <Icon name={icon} size={18} />}
      </summary>
      <div className={`menu__pop menu__pop--${align}`} role="menu">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            className={`menu__item${item.danger ? ' menu__item--danger' : ''}`}
            onClick={() => {
              ref.current?.removeAttribute('open');
              item.onSelect();
            }}
          >
            {item.icon ? <Icon name={item.icon} size={16} /> : null}
            <span className="menu__label">{item.label}</span>
            {item.hint ? <span className="menu__hint">{item.hint}</span> : null}
          </button>
        ))}
      </div>
    </details>
  );
}
