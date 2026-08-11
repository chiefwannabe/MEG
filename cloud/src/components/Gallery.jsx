import { useState, useEffect, useRef, useCallback } from 'react';

function getCloudinaryUrl(publicId, { width, quality = 'auto', format = 'auto' } = {}) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const transforms = [`q_${quality}`, `f_${format}`];
  if (width) transforms.push(`w_${width}`);
  transforms.push('c_limit');
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms.join(',')}/${publicId}`;
}

function SkeletonCard({ height }) {
  return (
    <div className="skeleton-card" style={{ paddingBottom: `${height}%` }}>
      <div className="skeleton-shimmer" />
    </div>
  );
}

function GalleryImage({ image, index, onClick }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  const aspectRatio = (image.height / image.width) * 100;
  const thumbUrl = getCloudinaryUrl(image.public_id, { width: 400 });

  if (error) {
    return (
      <div className="gallery-item error-item" ref={imgRef}>
        <div className="error-placeholder" style={{ paddingBottom: `${Math.min(aspectRatio, 150)}%` }}>
          <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
            <path d="m9 9 6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`gallery-item ${loaded ? 'loaded' : ''}`}
      ref={imgRef}
      onClick={() => onClick(image, index)}
    >
      <div className="gallery-item-inner" style={{ paddingBottom: `${Math.min(aspectRatio, 180)}%` }}>
        {!loaded && <div className="skeleton-shimmer" />}
        {inView && (
          <img
            src={thumbUrl}
            alt={image.public_id.split('/').pop()}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            className={`gallery-img ${loaded ? 'visible' : ''}`}
            loading="lazy"
            decoding="async"
          />
        )}
        <div className="gallery-overlay">
          <div className="overlay-actions">
            <span className="overlay-format">{image.format?.toUpperCase()}</span>
            <span className="overlay-size">{image.width}×{image.height}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Gallery({ apiBase, onImageClick, onImagesLoaded }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef(null);
  const fetchingRef = useRef(false);

  const fetchImages = useCallback(async (cursor = null) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const params = new URLSearchParams({ max_results: '30' });
      if (cursor) params.append('next_cursor', cursor);

      const res = await fetch(`${apiBase}/api/images?${params}`);
      if (!res.ok) throw new Error('Failed to fetch images');

      const data = await res.json();

      if (cursor) {
        setImages((prev) => [...prev, ...data.images]);
        onImagesLoaded(data.images, true);
      } else {
        setImages(data.images);
        onImagesLoaded(data.images, false);
      }

      setNextCursor(data.next_cursor);
      setHasMore(!!data.next_cursor);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [apiBase, onImagesLoaded]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !fetchingRef.current) {
          setLoadingMore(true);
          fetchImages(nextCursor);
        }
      },
      { rootMargin: '600px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, nextCursor, fetchImages]);

  if (loading) {
    return (
      <div className="gallery-container">
        <div className="masonry">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} height={Math.random() * 60 + 80} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gallery-container">
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
            <path d="m9 9 6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
          </svg>
          <p className="empty-title">Connection Error</p>
          <p className="empty-subtitle">{error}</p>
          <button className="retry-btn" onClick={() => { setError(null); setLoading(true); fetchImages(); }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="gallery-container">
        <div className="empty-state">
          <svg viewBox="0 0 80 80" fill="none" width="80" height="80">
            <rect x="8" y="12" width="64" height="48" rx="8" stroke="currentColor" strokeWidth="2" opacity="0.15"/>
            <circle cx="24" cy="28" r="6" stroke="currentColor" strokeWidth="2" opacity="0.2"/>
            <path d="M8 48l16-12 12 10 14-18 22 20" stroke="currentColor" strokeWidth="2" opacity="0.15" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M36 68l4-4 4 4" stroke="currentColor" strokeWidth="2" opacity="0.3" strokeLinecap="round"/>
            <path d="M40 68v-8" stroke="currentColor" strokeWidth="2" opacity="0.3" strokeLinecap="round"/>
          </svg>
          <p className="empty-title">No images yet</p>
          <p className="empty-subtitle">Upload your first image to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gallery-container">
      <div className="masonry">
        {images.map((image, index) => (
          <GalleryImage
            key={image.public_id}
            image={image}
            index={index}
            onClick={onImageClick}
          />
        ))}
      </div>
      {loadingMore && (
        <div className="loading-more">
          <div className="spinner" />
        </div>
      )}
      {hasMore && <div ref={sentinelRef} className="scroll-sentinel" />}
    </div>
  );
}
