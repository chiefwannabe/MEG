/**
 * Centralized MIME Type and Category Registry.
 * Provides extension-to-MIME mapping, category categorization, and detection helpers.
 * Never hardcode MIME strings directly in component files.
 */

export const MIME_CATEGORIES = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  PDF: 'pdf',
  TEXT: 'text',
  CODE: 'code',
  ARCHIVE: 'archive',
  DOCUMENT: 'document',
  APK: 'apk',
  ISO: 'iso',
  FOLDER: 'folder',
  GENERIC: 'generic',
};

/**
 * Extension to MIME type and Category mapping database.
 */
export const MIME_REGISTRY = {
  // Images
  jpg: { mime: 'image/jpeg', category: MIME_CATEGORIES.IMAGE, label: 'JPG' },
  jpeg: { mime: 'image/jpeg', category: MIME_CATEGORIES.IMAGE, label: 'JPEG' },
  png: { mime: 'image/png', category: MIME_CATEGORIES.IMAGE, label: 'PNG' },
  gif: { mime: 'image/gif', category: MIME_CATEGORIES.IMAGE, label: 'GIF' },
  webp: { mime: 'image/webp', category: MIME_CATEGORIES.IMAGE, label: 'WEBP' },
  svg: { mime: 'image/svg+xml', category: MIME_CATEGORIES.IMAGE, label: 'SVG' },
  bmp: { mime: 'image/bmp', category: MIME_CATEGORIES.IMAGE, label: 'BMP' },
  ico: { mime: 'image/x-icon', category: MIME_CATEGORIES.IMAGE, label: 'ICO' },

  // Videos
  mp4: { mime: 'video/mp4', category: MIME_CATEGORIES.VIDEO, label: 'MP4' },
  webm: { mime: 'video/webm', category: MIME_CATEGORIES.VIDEO, label: 'WEBM' },
  mov: { mime: 'video/quicktime', category: MIME_CATEGORIES.VIDEO, label: 'MOV' },
  mkv: { mime: 'video/x-matroska', category: MIME_CATEGORIES.VIDEO, label: 'MKV' },
  avi: { mime: 'video/x-msvideo', category: MIME_CATEGORIES.VIDEO, label: 'AVI' },
  ogv: { mime: 'video/ogg', category: MIME_CATEGORIES.VIDEO, label: 'OGV' },

  // Audio
  mp3: { mime: 'audio/mpeg', category: MIME_CATEGORIES.AUDIO, label: 'MP3' },
  wav: { mime: 'audio/wav', category: MIME_CATEGORIES.AUDIO, label: 'WAV' },
  ogg: { mime: 'audio/ogg', category: MIME_CATEGORIES.AUDIO, label: 'OGG' },
  m4a: { mime: 'audio/mp4', category: MIME_CATEGORIES.AUDIO, label: 'M4A' },
  aac: { mime: 'audio/aac', category: MIME_CATEGORIES.AUDIO, label: 'AAC' },
  flac: { mime: 'audio/flac', category: MIME_CATEGORIES.AUDIO, label: 'FLAC' },

  // PDF
  pdf: { mime: 'application/pdf', category: MIME_CATEGORIES.PDF, label: 'PDF' },

  // Text
  txt: { mime: 'text/plain', category: MIME_CATEGORIES.TEXT, label: 'TXT' },
  md: { mime: 'text/markdown', category: MIME_CATEGORIES.TEXT, label: 'MD' },
  json: { mime: 'application/json', category: MIME_CATEGORIES.TEXT, label: 'JSON' },
  xml: { mime: 'text/xml', category: MIME_CATEGORIES.TEXT, label: 'XML' },
  csv: { mime: 'text/csv', category: MIME_CATEGORIES.TEXT, label: 'CSV' },
  log: { mime: 'text/plain', category: MIME_CATEGORIES.TEXT, label: 'LOG' },

  // Code
  js: { mime: 'text/javascript', category: MIME_CATEGORIES.CODE, label: 'JS' },
  ts: { mime: 'text/typescript', category: MIME_CATEGORIES.CODE, label: 'TS' },
  jsx: { mime: 'text/javascript', category: MIME_CATEGORIES.CODE, label: 'JSX' },
  tsx: { mime: 'text/typescript', category: MIME_CATEGORIES.CODE, label: 'TSX' },
  html: { mime: 'text/html', category: MIME_CATEGORIES.CODE, label: 'HTML' },
  css: { mime: 'text/css', category: MIME_CATEGORIES.CODE, label: 'CSS' },
  py: { mime: 'text/x-python', category: MIME_CATEGORIES.CODE, label: 'PYTHON' },
  cpp: { mime: 'text/x-c++', category: MIME_CATEGORIES.CODE, label: 'C++' },
  c: { mime: 'text/x-c', category: MIME_CATEGORIES.CODE, label: 'C' },
  h: { mime: 'text/x-c-header', category: MIME_CATEGORIES.CODE, label: 'HEADER' },
  java: { mime: 'text/x-java', category: MIME_CATEGORIES.CODE, label: 'JAVA' },
  php: { mime: 'text/x-php', category: MIME_CATEGORIES.CODE, label: 'PHP' },
  go: { mime: 'text/x-go', category: MIME_CATEGORIES.CODE, label: 'GO' },
  rs: { mime: 'text/rust', category: MIME_CATEGORIES.CODE, label: 'RUST' },
  sql: { mime: 'text/x-sql', category: MIME_CATEGORIES.CODE, label: 'SQL' },
  sh: { mime: 'text/x-sh', category: MIME_CATEGORIES.CODE, label: 'SH' },

  // Archives
  zip: { mime: 'application/zip', category: MIME_CATEGORIES.ARCHIVE, label: 'ZIP' },
  rar: { mime: 'application/x-rar-compressed', category: MIME_CATEGORIES.ARCHIVE, label: 'RAR' },
  '7z': { mime: 'application/x-7z-compressed', category: MIME_CATEGORIES.ARCHIVE, label: '7Z' },
  tar: { mime: 'application/x-tar', category: MIME_CATEGORIES.ARCHIVE, label: 'TAR' },
  gz: { mime: 'application/gzip', category: MIME_CATEGORIES.ARCHIVE, label: 'GZ' },

  // Office & Documents
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: MIME_CATEGORIES.DOCUMENT, label: 'DOCX' },
  doc: { mime: 'application/msword', category: MIME_CATEGORIES.DOCUMENT, label: 'DOC' },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', category: MIME_CATEGORIES.DOCUMENT, label: 'PPTX' },
  ppt: { mime: 'application/vnd.ms-powerpoint', category: MIME_CATEGORIES.DOCUMENT, label: 'PPT' },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', category: MIME_CATEGORIES.DOCUMENT, label: 'XLSX' },
  xls: { mime: 'application/vnd.ms-excel', category: MIME_CATEGORIES.DOCUMENT, label: 'XLS' },
  odt: { mime: 'application/vnd.oasis.opendocument.text', category: MIME_CATEGORIES.DOCUMENT, label: 'ODT' },

  // APK & ISO
  apk: { mime: 'application/vnd.android.package-archive', category: MIME_CATEGORIES.APK, label: 'APK' },
  iso: { mime: 'application/x-iso9660-image', category: MIME_CATEGORIES.ISO, label: 'ISO' },
  img: { mime: 'application/octet-stream', category: MIME_CATEGORIES.ISO, label: 'IMG' },
  dmg: { mime: 'application/x-apple-diskimage', category: MIME_CATEGORIES.ISO, label: 'DMG' },
};

/**
 * Extracts normalized file extension from a filename string.
 * @param {string} filename
 * @returns {string}
 */
export function getExtension(filename) {
  if (!filename || typeof filename !== 'string') return '';
  const cleanName = filename.split('?')[0].split('#')[0];
  const parts = cleanName.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * Detects MIME information and category for a given file name or provided mime type.
 * @param {string} filename
 * @param {string} [providedMime]
 * @returns {{ mime: string, category: string, label: string }}
 */
export function detectMimeInfo(filename, providedMime = '') {
  const ext = getExtension(filename);
  if (MIME_REGISTRY[ext]) {
    return MIME_REGISTRY[ext];
  }

  // Fallback checking provided MIME string if present
  if (providedMime.startsWith('image/')) return { mime: providedMime, category: MIME_CATEGORIES.IMAGE, label: ext.toUpperCase() || 'IMG' };
  if (providedMime.startsWith('video/')) return { mime: providedMime, category: MIME_CATEGORIES.VIDEO, label: ext.toUpperCase() || 'VID' };
  if (providedMime.startsWith('audio/')) return { mime: providedMime, category: MIME_CATEGORIES.AUDIO, label: ext.toUpperCase() || 'AUD' };
  if (providedMime === 'application/pdf') return { mime: providedMime, category: MIME_CATEGORIES.PDF, label: 'PDF' };
  if (providedMime.startsWith('text/')) return { mime: providedMime, category: MIME_CATEGORIES.TEXT, label: ext.toUpperCase() || 'TXT' };

  return {
    mime: providedMime || 'application/octet-stream',
    category: MIME_CATEGORIES.GENERIC,
    label: ext.toUpperCase() || 'FILE'
  };
}
