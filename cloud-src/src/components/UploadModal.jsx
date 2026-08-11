import { useState, useRef, useCallback } from 'react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export default function UploadModal({ apiBase, onClose, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const validateFile = (f) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError('Unsupported format. Use JPG, PNG, WEBP, GIF, or AVIF.');
      return false;
    }
    if (f.size > MAX_SIZE) {
      setError('File too large. Max 50MB.');
      return false;
    }
    return true;
  };

  const handleFile = useCallback((f) => {
    setError(null);
    if (!validateFile(f)) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${apiBase}/api/upload`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      const result = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });

      onUploadComplete(result);
      onClose();
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Upload Image</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {!preview ? (
          <div
            className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <svg viewBox="0 0 48 48" fill="none" width="48" height="48">
              <rect x="6" y="10" width="36" height="28" rx="6" stroke="currentColor" strokeWidth="2" opacity="0.25"/>
              <path d="M20 30l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
              <path d="M24 30v-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
            </svg>
            <p className="drop-text">Drag & drop an image here</p>
            <p className="drop-subtext">or click to browse</p>
            <p className="drop-formats">JPG, PNG, WEBP, GIF, AVIF — up to 50MB</p>
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif,.avif"
              onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
              hidden
            />
          </div>
        ) : (
          <div className="upload-preview">
            <img src={preview} alt="Preview" className="preview-img" />
            <div className="preview-info">
              <span className="preview-name">{file.name}</span>
              <span className="preview-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            {uploading && (
              <div className="progress-container">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="progress-text">{progress}%</span>
              </div>
            )}
          </div>
        )}

        {error && <p className="upload-error">{error}</p>}

        <div className="modal-footer">
          {preview && !uploading && (
            <button className="btn-secondary" onClick={() => { setFile(null); setPreview(null); setError(null); }}>
              Change
            </button>
          )}
          <button
            className="btn-primary"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
