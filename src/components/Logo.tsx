interface LogoProps {
  size?: number;
  showText?: boolean;
}

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="NoxaPlus Meet"
      className="logo-mark"
    >
      <defs>
        <linearGradient id="meet-mark-bg" x1="8" y1="4" x2="42" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#233457" />
          <stop offset="1" stopColor="#111b30" />
        </linearGradient>
        <linearGradient id="meet-mark-check" x1="18" y1="22" x2="33" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3dbfae" />
          <stop offset="1" stopColor="#2a9d8f" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#meet-mark-bg)" />
      <path
        d="M16.5 11.5h15a6.5 6.5 0 0 1 6.5 6.5v6.4a6.5 6.5 0 0 1-6.5 6.5h-7.9l-6.8 5.4 1.3-5.7a6.5 6.5 0 0 1-4.1-6.1V18a6.5 6.5 0 0 1 6.5-6.5z"
        fill="#fffaf0"
      />
      <circle cx="31.6" cy="18.4" r="2.1" fill="#e4572e" />
      <path
        d="M17.6 25.2l3.5 3.5 7.8-8"
        fill="none"
        stroke="url(#meet-mark-check)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15.5 35.2l-3.4 2.7.8-3.9" fill="#233457" opacity=".9" />
      <circle cx="10.8" cy="10.8" r="1.6" fill="#e9b44c" />
    </svg>
  );
}

export function Logo({ size = 42, showText = true }: LogoProps) {
  return (
    <div className="logo">
      <LogoMark size={size} />
      {showText ? (
        <div className="logo__text">
          <span className="logo__name">
            Noxa<span className="logo__plus">Plus</span>
          </span>
          <span className="logo__product">Meet · صورت‌جلسهٔ هوشمند</span>
        </div>
      ) : null}
    </div>
  );
}
