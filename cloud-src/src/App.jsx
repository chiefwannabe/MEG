import { useState, useCallback } from 'react';
import Header from './components/Header';
import GalleryControls from './components/GalleryControls';
import Gallery from './components/Gallery';
import Lightbox from './components/Lightbox';
import UploadModal from './components/UploadModal';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE || '';

function App() {
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [allImages, setAllImages] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [activeTab, setActiveTab] = useState('images');

  const handleImageClick = useCallback((image, index) => {
    setLightboxImage(image);
    setLightboxIndex(index);
  }, []);

  const handleLightboxClose = useCallback(() => {
    setLightboxImage(null);
    setLightboxIndex(-1);
  }, []);

  const handleLightboxNav = useCallback((direction) => {
    setLightboxIndex((prev) => {
      const next = prev + direction;
      if (next < 0 || next >= allImages.length) return prev;
      setLightboxImage(allImages[next]);
      return next;
    });
  }, [allImages]);

  const handleUploadComplete = useCallback((newImage) => {
    setAllImages((prev) => [newImage, ...prev]);
  }, []);

  const handleImagesLoaded = useCallback((images, append) => {
    if (append) {
      setAllImages((prev) => [...prev, ...images]);
    } else {
      setAllImages(images);
    }
  }, []);

  return (
    <div className="app">
      <Header onUploadClick={() => setShowUpload(true)} />
      <GalleryControls activeTab={activeTab} onTabChange={setActiveTab} />
      <Gallery
        apiBase={API_BASE}
        onImageClick={handleImageClick}
        onImagesLoaded={handleImagesLoaded}
      />
      {lightboxImage && (
        <Lightbox
          image={lightboxImage}
          index={lightboxIndex}
          total={allImages.length}
          onClose={handleLightboxClose}
          onNav={handleLightboxNav}
        />
      )}
      {showUpload && (
        <UploadModal
          apiBase={API_BASE}
          onClose={() => setShowUpload(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}
    </div>
  );
}

export default App;
