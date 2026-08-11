import { BaseRenderer } from './BaseRenderer.js';
import { MIME_CATEGORIES } from '../utils/mimeUtils.js';

export class VideoRenderer extends BaseRenderer {
  supports(file) {
    return file && file.category === MIME_CATEGORIES.VIDEO;
  }

  renderPreview(file) {
    const container = document.createElement('div');
    container.className = 'vault-preview-video-wrapper';
    
    const video = document.createElement('video');
    video.src = file.url;
    video.controls = true;
    video.autoplay = false;
    video.preload = 'metadata';
    video.className = 'vault-preview-video';

    container.appendChild(video);
    return container;
  }

  renderIcon(file) {
    const el = document.createElement('div');
    el.className = 'vault-file-icon vault-icon-video';
    el.innerHTML = '<span class="icon-emoji">🎥</span>';
    return el;
  }
}
