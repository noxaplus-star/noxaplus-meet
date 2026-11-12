import type { ReactNode } from 'react';

export type IconName =
  | 'plus'
  | 'menu'
  | 'close'
  | 'search'
  | 'settings'
  | 'help'
  | 'download'
  | 'upload'
  | 'trash'
  | 'copy'
  | 'check'
  | 'check-circle'
  | 'alert'
  | 'clock'
  | 'users'
  | 'target'
  | 'flag'
  | 'file-text'
  | 'printer'
  | 'refresh'
  | 'edit'
  | 'more'
  | 'sun'
  | 'moon'
  | 'sparkles'
  | 'shield'
  | 'globe'
  | 'github'
  | 'mail'
  | 'book'
  | 'sliders'
  | 'install'
  | 'mic'
  | 'clipboard'
  | 'calendar'
  | 'chevron-left'
  | 'chevron-right'
  | 'arrow-left'
  | 'arrow-right'
  | 'list'
  | 'layers'
  | 'wand'
  | 'eye'
  | 'external'
  | 'undo'
  | 'info'
  | 'zap'
  | 'user'
  | 'lock'
  | 'quote';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

function content(name: IconName): ReactNode {
  switch (name) {
    case 'plus':
      return <path d="M12 5v14M5 12h14" />;
    case 'menu':
      return <path d="M4 7h16M4 12h16M4 17h16" />;
    case 'close':
      return <path d="M6 6l12 12M18 6L6 18" />;
    case 'search':
      return (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="M16.5 16.5L21 21" />
        </>
      );
    case 'settings':
      return (
        <>
          <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="8" cy="17" r="2" />
        </>
      );
    case 'help':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.6 9a2.6 2.6 0 1 1 3.7 2.4c-.8.4-1.3 1-1.3 1.9v.3" />
          <path d="M12 17.2v.1" />
        </>
      );
    case 'download':
      return <path d="M12 4v11m-5-4 5 5 5-5M5 20h14" />;
    case 'upload':
      return <path d="M12 16V5m-5 4 5-5 5 5M5 20h14" />;
    case 'trash':
      return (
        <>
          <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
          <path d="M10 11v6M14 11v6" />
        </>
      );
    case 'copy':
      return (
        <>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5h10" />
        </>
      );
    case 'check':
      return <path d="M5 13l4 4L19 7" />;
    case 'check-circle':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12l2.5 2.5L16.5 9" />
        </>
      );
    case 'alert':
      return (
        <>
          <path d="M12 3l9.5 17H2.5z" />
          <path d="M12 9v5M12 17.2v.1" />
        </>
      );
    case 'clock':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
        </>
      );
    case 'users':
      return (
        <>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
          <circle cx="17.5" cy="9" r="2.5" />
          <path d="M17.5 14.5c2.2.2 3.5 2 3.5 4.5" />
        </>
      );
    case 'target':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.3" />
        </>
      );
    case 'flag':
      return (
        <>
          <path d="M5 21V4" />
          <path d="M5 4c4-2 7 2 14 0v9c-7 2-10-2-14 0" />
        </>
      );
    case 'file-text':
      return (
        <>
          <path d="M6 2h8l5 5v15H6z" />
          <path d="M14 2v5h5M9 13h6M9 17h6" />
        </>
      );
    case 'printer':
      return (
        <>
          <path d="M7 8V3h10v5" />
          <rect x="4" y="8" width="16" height="8" rx="2" />
          <path d="M7 16h10v5H7z" />
        </>
      );
    case 'refresh':
      return (
        <>
          <path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4" />
          <path d="M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4" />
        </>
      );
    case 'edit':
      return <path d="M4 20h4L20 8l-4-4L4 16zM14 6l4 4" />;
    case 'more':
      return (
        <>
          <circle cx="12" cy="5.5" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="12" cy="18.5" r="1.3" fill="currentColor" stroke="none" />
        </>
      );
    case 'sun':
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      );
    case 'moon':
      return <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />;
    case 'sparkles':
      return (
        <>
          <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
          <path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
        </>
      );
    case 'shield':
      return (
        <>
          <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
          <path d="M9 12l2 2 4-4" />
        </>
      );
    case 'globe':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c3 3 3 15 0 18-3-3-3-15 0-18z" />
        </>
      );
    case 'github':
      return (
        <path
          fill="currentColor"
          stroke="none"
          d="M12 2a10 10 0 0 0-3.16 19.49c.5.1.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"
        />
      );
    case 'mail':
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M4 7l8 6 8-6" />
        </>
      );
    case 'book':
      return (
        <>
          <path d="M12 6c-2-2-5-2-8-1v14c3-1 6-1 8 1 2-2 5-2 8-1V5c-3-1-6-1-8 1z" />
          <path d="M12 6v14" />
        </>
      );
    case 'sliders':
      return (
        <>
          <path d="M6 4v6M6 14v6M12 4v10M12 18v2M18 4v2M18 10v10" />
          <circle cx="6" cy="12" r="2" />
          <circle cx="12" cy="16" r="2" />
          <circle cx="18" cy="8" r="2" />
        </>
      );
    case 'install':
      return (
        <>
          <rect x="6" y="2" width="12" height="20" rx="3" />
          <path d="M11 18h2M12 6v6m-2.5-2.5L12 12l2.5-2.5" />
        </>
      );
    case 'mic':
      return (
        <>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
        </>
      );
    case 'clipboard':
      return (
        <>
          <rect x="6" y="4" width="12" height="17" rx="2" />
          <path d="M9 4V3h6v1M9 11h6M9 15h4" />
        </>
      );
    case 'calendar':
      return (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18" />
          <path d="M8 14h.1M12 14h.1M16 14h.1M8 17.5h.1M12 17.5h.1" />
        </>
      );
    case 'chevron-left':
      return <path d="M14.5 6L8.5 12l6 6" />;
    case 'chevron-right':
      return <path d="M9.5 6l6 6-6 6" />;
    case 'arrow-left':
      return <path d="M19 12H5m6-7-7 7 7 7" />;
    case 'arrow-right':
      return <path d="M5 12h14m-6-7 7 7-7 7" />;
    case 'list':
      return (
        <>
          <path d="M8 6h12M8 12h12M8 18h12" />
          <path d="M4 6h.1M4 12h.1M4 18h.1" />
        </>
      );
    case 'layers':
      return (
        <>
          <path d="M12 3l9 5-9 5-9-5z" />
          <path d="M3 13l9 5 9-5M3 17l9 5 9-5" />
        </>
      );
    case 'wand':
      return (
        <>
          <path d="M4 20L15 9" />
          <path d="M17 3l.6 1.7L19.3 5.3l-1.7.6L17 7.6l-.6-1.7-1.7-.6 1.7-.6z" />
          <path d="M13 5l.8 2.2L16 8l-2.2.8L13 11l-.8-2.2L10 8l2.2-.8z" />
        </>
      );
    case 'eye':
      return (
        <>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </>
      );
    case 'external':
      return <path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5" />;
    case 'undo':
      return (
        <>
          <path d="M3 8v6h6" />
          <path d="M3.5 14a9 9 0 1 0 2.4-7.4L3 9" />
        </>
      );
    case 'info':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 7.8v.1" />
        </>
      );
    case 'zap':
      return <path d="M13 2L4 14h7l-1 8 9-12h-7z" />;
    case 'user':
      return (
        <>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
        </>
      );
    case 'lock':
      return (
        <>
          <rect x="5" y="10" width="14" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
        </>
      );
    case 'quote':
      return (
        <>
          <path d="M10 7H5v5h5v1c0 2-1.3 3.3-3.5 4" />
          <path d="M19 7h-5v5h5v1c0 2-1.3 3.3-3.5 4" />
        </>
      );
    default:
      return null;
  }
}

export function Icon({ name, size = 18, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {content(name)}
    </svg>
  );
}
