import type { RendererName } from '@/lib/media/createRenderer';
import type { LogoPlacement } from '@/lib/media/types';

// ─── Storage paths ────────────────────────────────────────────────────────────

export const STORAGE_PATHS = {
  originals:  'photos/originals',
  thumbnails: 'photos/thumbnails',
  rendered:   'photos/rendered',
  logos:      'photos/logos',
} as const;

// ─── Firestore collections ────────────────────────────────────────────────────

export const COLLECTIONS = {
  photoUploads: 'photoUploads',
  photoRenders: 'photoRenders',
} as const;

// ─── Upload record ────────────────────────────────────────────────────────────

export type UploadStatus = 'pending' | 'complete' | 'error';

export interface PhotoUpload {
  id: string;
  storagePath: string;      // e.g. photos/originals/abc123.jpg
  downloadURL: string;
  thumbnailURL?: string;    // ~300px wide JPEG for grid display
  fileName: string;
  contentType: string;
  width: number;
  height: number;
  uploadedBy: string;       // admin email
  uploadedAt: string;       // ISO timestamp
  status: UploadStatus;
}

// ─── Render record ────────────────────────────────────────────────────────────

export type RenderStatus = 'pending' | 'complete' | 'error';

export interface PhotoRender {
  id: string;
  sourcePhotoId: string;
  sourceStoragePath: string;
  logoStoragePath: string;
  renderStoragePath: string;
  renderDownloadURL: string;
  placement: LogoPlacement;
  rendererUsed: RendererName;
  createdBy: string;        // admin email
  createdAt: string;        // ISO timestamp
  status: RenderStatus;
}
