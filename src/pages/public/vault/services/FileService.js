/**
 * FileService - Core Abstraction Layer for Supabase Storage.
 *
 * STRICT RULE: All Supabase SDK calls live exclusively inside this service.
 * UI components, renderers, and utilities must never reference `supabase` directly.
 */

import { detectMimeInfo, getExtension } from '../utils/mimeUtils.js';
import { getCachedUrl, setCachedUrl, getStarredSet, getPinnedSet } from '../utils/storageUtils.js';

export class FileService {
  /**
   * Initializes the FileService with Supabase credentials and configuration.
   * @param {Object} config - Central VAULT_CONFIG object
   */
  constructor(config) {
    this.config = config;
    this.bucketName = config.bucketName || 'MEG';

    console.log('[FileService] Initializing Supabase Storage client...', {
      url: config.supabaseUrl,
      bucket: this.bucketName,
      keyPrefix: config.supabaseKey ? config.supabaseKey.substring(0, 14) + '...' : 'Missing'
    });

    // Verify Supabase library availability from global scope
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      const err = new Error('Supabase client SDK library (window.supabase) not loaded on page.');
      console.error('[FileService] Critical Error:', err);
      throw err;
    }

    this.client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    this.permissions = {
      canRead: true,
      canWrite: true,
      canDelete: true,
    };
  }

  /**
   * Lists all files and subfolders in a bucket folder path.
   * Logs raw Supabase response, status, and errors for debugging.
   * @param {string} [folderPath='']
   * @returns {Promise<{ items: Array, totalSize: number, totalFiles: number, rawData: Array, error: string|null, status: number }>}
   */
  async listFiles(folderPath = '') {
    const cleanPath = folderPath ? folderPath.replace(/^\/+|\/+$/g, '') : '';
    console.log(`[FileService] Querying Supabase Storage bucket "${this.bucketName}", path: "${cleanPath}"...`);

    try {
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .list(cleanPath, {
          limit: 1000,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        });

      console.log('[FileService] Supabase Storage raw list response:', {
        bucket: this.bucketName,
        path: cleanPath,
        data,
        error
      });

      if (error) {
        console.error('[FileService] Supabase Storage returned error:', error);
        return {
          items: [],
          totalSize: 0,
          totalFiles: 0,
          rawData: [],
          error: error.message || error.error || JSON.stringify(error),
          status: error.status || 500
        };
      }

      if (!data) {
        console.warn('[FileService] listFiles returned null data');
        return {
          items: [],
          totalSize: 0,
          totalFiles: 0,
          rawData: [],
          error: 'Supabase storage list() returned null response',
          status: 500
        };
      }

      console.info(`[FileService] Supabase storage list() succeeded with ${data.length} item(s) in "${cleanPath || 'root'}".`);

      const starredSet = getStarredSet();
      const pinnedSet = getPinnedSet();

      let totalSize = 0;
      let totalFiles = 0;

      const items = data.map(file => {
        // In Supabase storage, folders have null metadata or id
        const isFolder = !file.id || file.metadata === null || file.metadata === undefined;
        const relativePath = cleanPath ? `${cleanPath}/${file.name}` : file.name;
        const ext = isFolder ? '' : getExtension(file.name);
        const mimeInfo = isFolder
          ? { mime: 'folder', category: 'folder', label: 'FOLDER' }
          : detectMimeInfo(file.name, file.metadata?.mimetype);

        const size = isFolder ? 0 : (file.metadata?.size || 0);
        if (!isFolder) {
          totalSize += size;
          totalFiles += 1;
        }

        const publicUrl = isFolder ? '' : this.getFilePublicUrl(relativePath);

        return {
          id: file.id || relativePath,
          name: file.name,
          relativePath,
          folderPath: cleanPath,
          isFolder,
          size,
          updatedAt: file.updated_at || file.created_at || new Date().toISOString(),
          extension: ext,
          mimeType: mimeInfo.mime,
          category: mimeInfo.category,
          label: mimeInfo.label,
          url: publicUrl,
          isStarred: starredSet.has(relativePath),
          isPinned: pinnedSet.has(relativePath),
        };
      });

      return { items, totalSize, totalFiles, rawData: data, error: null, status: 200 };
    } catch (err) {
      console.error('[FileService] Exception during listFiles execution:', err);
      return {
        items: [],
        totalSize: 0,
        totalFiles: 0,
        rawData: [],
        error: err.message || 'Exception connecting to Supabase Storage',
        status: 500
      };
    }
  }

  /**
   * Gets public URL for a given file path in the bucket.
   * @param {string} filePath
   * @returns {string} Public URL
   */
  getFilePublicUrl(filePath) {
    const cached = getCachedUrl(filePath);
    if (cached) return cached;

    const { data } = this.client.storage.from(this.bucketName).getPublicUrl(filePath);
    const url = data?.publicUrl || '';
    if (url) {
      setCachedUrl(filePath, url);
    }
    return url;
  }

  /**
   * Attempts to generate a signed URL if public access is restricted.
   * @param {string} filePath
   * @param {number} [expiresIn=3600]
   * @returns {Promise<string>} Signed URL or public fallback
   */
  async getSignedUrl(filePath, expiresIn = 3600) {
    try {
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error || !data?.signedUrl) {
        return this.getFilePublicUrl(filePath);
      }
      return data.signedUrl;
    } catch (_) {
      return this.getFilePublicUrl(filePath);
    }
  }

  /**
   * Uploads a file object into the target folder path in the bucket.
   * @param {File|Blob} fileObj
   * @param {string} targetFolderPath
   * @param {Object} [options={ upsert: false }]
   * @returns {Promise<{ success: boolean, path: string|null, error: string|null }>}
   */
  async uploadFile(fileObj, targetFolderPath = '', options = { upsert: false }) {
    try {
      const cleanFolder = targetFolderPath ? targetFolderPath.replace(/^\/+|\/+$/g, '') : '';
      const filePath = cleanFolder ? `${cleanFolder}/${fileObj.name}` : fileObj.name;

      console.log(`[FileService] Uploading file "${filePath}" (${fileObj.size} bytes)...`);

      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .upload(filePath, fileObj, {
          cacheControl: '3600',
          upsert: options.upsert !== undefined ? options.upsert : false,
        });

      console.log('[FileService] Upload response:', { data, error });

      if (error) {
        if (error.statusCode === '403' || error.message?.includes('policy')) {
          this.permissions.canWrite = false;
          return { success: false, path: null, error: 'Write permission denied by storage security policy.' };
        }
        return { success: false, path: null, error: error.message || 'Upload failed.' };
      }

      return { success: true, path: data.path, error: null };
    } catch (err) {
      console.error('[FileService] Exception during upload:', err);
      return { success: false, path: null, error: err.message || 'Upload process encountered an error.' };
    }
  }

  /**
   * Triggers browser direct file download.
   * @param {string} filePath
   * @param {string} fileName
   */
  async downloadFile(filePath, fileName) {
    try {
      const publicUrl = this.getFilePublicUrl(filePath);
      const res = await fetch(publicUrl);
      if (!res.ok) throw new Error('Download fetch failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName || filePath.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return true;
    } catch (_) {
      window.open(this.getFilePublicUrl(filePath), '_blank');
      return true;
    }
  }

  /**
   * Renames/moves a file or path in the bucket.
   * @param {string} oldPath
   * @param {string} newPath
   * @returns {Promise<{ success: boolean, error: string|null }>}
   */
  async renameFile(oldPath, newPath) {
    try {
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .move(oldPath, newPath);

      if (error) {
        if (error.statusCode === '403' || error.message?.includes('policy')) {
          this.permissions.canWrite = false;
          return { success: false, error: 'Rename permission denied by bucket security policy.' };
        }
        return { success: false, error: error.message || 'Failed to rename file.' };
      }

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err.message || 'Rename failed.' };
    }
  }

  /**
   * Deletes one or more files from the bucket.
   * @param {Array<string>} filePaths
   * @returns {Promise<{ success: boolean, error: string|null }>}
   */
  async deleteFiles(filePaths) {
    try {
      const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
      if (paths.length === 0) return { success: true, error: null };

      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .remove(paths);

      if (error) {
        if (error.statusCode === '403' || error.message?.includes('policy')) {
          this.permissions.canDelete = false;
          return { success: false, error: 'Delete permission denied by bucket security policy.' };
        }
        return { success: false, error: error.message || 'Failed to delete files.' };
      }

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err.message || 'Delete operation failed.' };
    }
  }
}
