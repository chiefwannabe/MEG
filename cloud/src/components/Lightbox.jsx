import { useEffect, useCallback } from 'react';

function getCloudinaryUrl(publicId, { width, quality = 'auto', format = 'auto' } = {}) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const transforms = [`q_${quality}`, `f_${format}`];
  if (width) transforms.push(`w_${width}`);
  transforms.push('c_limit');
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms.join(',')}/${publicId}`;
}

export default function Lightbox({ image, index, total, onClose, onNav }) {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') onNav(-1);
    if (e.key === 'ArrowRight') onNav(1);
  }, [onClose, onNav]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const highResUrl = getCloudinaryUrl(image.public_id, { width: 1920 });
  const downloadUrl = getCloudinaryUrl(image.public_id, { quality: 100, format: image.format });

  const handleDownload = async () => {
    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${image.public_id.split('/').pop()}.${image.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <div className="lightbox" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <div className="lightbox-header">
          <span className="lightbox-counter">{index + 1} / {total}</span>
          <div className="lightbox-actions">
            <button className="lightbox-btn" onClick={handleDownload} aria-label="Download">
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <path d="M12 5v10m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 17h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <button className="lightbox-btn" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="lightbox-image-container">
          {index > 0 && (
            <button className="lightbox-nav prev" onClick={() => onNav(-1)} aria-label="Previous">
              <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          <img
            src={highResUrl}
            alt={image.public_id.split('/').pop()}
            className="lightbox-img"
          />

          {index < total - 1 && (
            <button className="lightbox-nav next" onClick={() => onNav(1)} aria-label="Next">
              <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        <div className="lightbox-info">
          <span>{image.width} × {image.height}</span>
          <span>{image.format?.toUpperCase()}</span>
          <span>{(image.bytes / 1024).toFixed(1)} KB</span>
        </div>
      </div>
    </div>
  );
}
