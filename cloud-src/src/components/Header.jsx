export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand">
          <svg className="header-logo" viewBox="0 0 24 24" fill="none" width="22" height="22">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#e8553a" opacity="0.9"/>
            <path d="M2 17l10 5 10-5" stroke="#e8553a" strokeWidth="2" fill="none" opacity="0.5"/>
            <path d="M2 12l10 5 10-5" stroke="#e8553a" strokeWidth="2" fill="none" opacity="0.7"/>
          </svg>
          <span className="header-title">Cloud</span>
        </div>

        <div className="header-search">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" width="16" height="16">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
            <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="search-placeholder">Log in to start creating...</span>
          <svg className="filter-icon" viewBox="0 0 24 24" fill="none" width="16" height="16">
            <path d="M3 6h18M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    </header>
  );
}
