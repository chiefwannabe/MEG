export default function GalleryControls({ activeTab, onTabChange }) {
  return (
    <div className="gallery-controls">
      <h2 className="gallery-title">Top Day</h2>
      <div className="gallery-tabs">
        <button
          className={`tab-btn ${activeTab === 'images' ? 'active' : ''}`}
          onClick={() => onTabChange('images')}
        >
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2"/>
            <circle cx="8.5" cy="8.5" r="2" fill="currentColor"/>
            <path d="m6 18 4-5 3 3 3-4 4 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Images
        </button>
        <button
          className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`}
          onClick={() => onTabChange('videos')}
        >
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
            <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="2"/>
            <path d="m10 9 5 3-5 3V9z" fill="currentColor"/>
          </svg>
          Videos
        </button>
      </div>
    </div>
  );
}
