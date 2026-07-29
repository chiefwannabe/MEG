/**
 * RendererRegistry - Extensible Manager for File Type Renderers.
 * Allows adding support for new file types dynamically without modifying existing code.
 */

import { ImageRenderer } from './ImageRenderer.js';
import { VideoRenderer } from './VideoRenderer.js';
import { AudioRenderer } from './AudioRenderer.js';
import { PdfRenderer } from './PdfRenderer.js';
import { CodeRenderer } from './CodeRenderer.js';
import { TextRenderer } from './TextRenderer.js';
import { ArchiveRenderer } from './ArchiveRenderer.js';
import { DocumentRenderer } from './DocumentRenderer.js';
import { GenericRenderer } from './GenericRenderer.js';

export class RendererRegistry {
  constructor() {
    /** @type {Array<import('./BaseRenderer').BaseRenderer>} */
    this.renderers = [
      new ImageRenderer(),
      new VideoRenderer(),
      new AudioRenderer(),
      new PdfRenderer(),
      new CodeRenderer(),
      new TextRenderer(),
      new ArchiveRenderer(),
      new DocumentRenderer(),
    ];
    this.fallback = new GenericRenderer();
  }

  /**
   * Registers a new custom FileRenderer plugin at runtime.
   * @param {import('./BaseRenderer').BaseRenderer} rendererPlugin
   */
  registerRenderer(rendererPlugin) {
    if (rendererPlugin && typeof rendererPlugin.supports === 'function') {
      this.renderers.unshift(rendererPlugin);
    }
  }

  /**
   * Finds the first renderer plugin supporting the file, or returns the GenericRenderer fallback.
   * @param {Object} file - Vault file object
   * @returns {import('./BaseRenderer').BaseRenderer}
   */
  getRenderer(file) {
    if (!file) return this.fallback;
    const match = this.renderers.find(r => r.supports(file));
    return match || this.fallback;
  }
}

// Export singleton instance
export const rendererRegistry = new RendererRegistry();
