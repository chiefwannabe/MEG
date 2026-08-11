import { BaseRenderer } from './BaseRenderer.js';
import { MIME_CATEGORIES } from '../utils/mimeUtils.js';

export class AudioRenderer extends BaseRenderer {
  supports(file) {
    return file && file.category === MIME_CATEGORIES.AUDIO;
  }

  renderPreview(file) {
    const container = document.createElement('div');
    container.className = 'vault-preview-audio-wrapper';
    
    container.innerHTML = `
      <div class="audio-disc-icon">🎵</div>
      <h3>${file.name}</h3>
    `;

    const audio = document.createElement('audio');
    audio.src = file.url;
    audio.controls = true;
    audio.preload = 'metadata';
    audio.className = 'vault-preview-audio';

    container.appendChild(audio);
    return container;
  }

  renderIcon(file) {
    const el = document.createElement('div');
    el.className = 'vault-file-icon vault-icon-audio';
    el.innerHTML = '<span class="icon-emoji">🎵</span>';
    return el;
  }
}
