/**
 * Centralized Configuration for MEG Cloud File Vault.
 * All vault parameters, Supabase endpoint credentials, performance thresholds,
 * and feature flags are defined here.
 */
export const VAULT_CONFIG = {
  // Supabase Connection Settings
  supabaseUrl: 'https://gsibskfwepfxurhgkbjx.supabase.co',
  supabaseKey: 'sb_publishable_6xWYO-7zHSUHXuYqB3PDVQ_h9STPNQO',
  bucketName: 'MEG',

  // Auto Refresh & Synchronization Settings
  autoRefreshIntervalMs: 30000, // 30 seconds
  signedUrlExpirySeconds: 3600,  // 1 hour

  // Performance & Virtualization Thresholds
  itemsPerPage: 50,              // Chunk size for batch rendering
  virtualizationThreshold: 100,  // Enable viewport virtualization if item count > threshold

  // Feature Flags & Behavior Controls
  uploadConflictMode: 'ask',     // 'ask' | 'overwrite' | 'rename' | 'skip'
  enableUpload: true,
  enableDelete: true,
  enableRename: true,
  enableMultiSelect: true,
  enableContextMenu: true,
  maxUploadSizeMb: 500,          // 500 MB max file size limit

  // UI Defaults
  defaultView: 'grid',           // 'grid' | 'list'
  defaultSortBy: 'name',         // 'name' | 'date' | 'size' | 'type'
  defaultSortOrder: 'asc',       // 'asc' | 'desc'
};
