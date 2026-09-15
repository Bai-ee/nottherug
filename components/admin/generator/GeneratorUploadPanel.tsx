'use client';

import type { RefObject } from 'react';
import type { PhotoUpload } from '@/lib/photos/types';

export type UploadPhase = 'idle' | 'uploading' | 'success' | 'error';

export function GeneratorUploadPanel({
  fileInputRef,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  onChooseClick,
  isUploading,
  uploadPhase,
  uploadProgress,
  uploadMsg,
  uploads,
  visibleCount,
  onShowMore,
  selectedUploadId,
  onSelectUpload,
  onRequestDelete,
  deleteError,
  onRetryDelete,
  onDismissDeleteError,
}: {
  fileInputRef: RefObject<HTMLInputElement | null>;
  dragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChooseClick: () => void;
  isUploading: boolean;
  uploadPhase: UploadPhase;
  uploadProgress: number;
  uploadMsg: string;
  uploads: PhotoUpload[];
  visibleCount: number;
  onShowMore: () => void;
  selectedUploadId: string | null;
  onSelectUpload: (id: string) => void;
  onRequestDelete: (upload: PhotoUpload) => void;
  deleteError: { fileName: string; message: string } | null;
  onRetryDelete: () => void;
  onDismissDeleteError: () => void;
}) {
  return (
    <div className="ed-upload-section" id="admin-gen-upload-section">
      <div
        id="admin-gen-upload-zone"
        className={`ed-upload-zone${dragOver ? ' ed-upload-zone-drag' : ''}`}
        onClick={() => !isUploading && onChooseClick()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="ed-upload-zone-icon">[↑]</div>
        <div className="ed-upload-zone-label">Tap to choose from camera roll or drag an image</div>
        <div className="ed-upload-zone-hint">JPEG · PNG · HEIC · camera library supported</div>
        {isUploading && (
          <div style={{ width: '100%', maxWidth: 280 }}>
            <div className="ed-upload-prog-shell">
              <div className="ed-upload-prog-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
            <div className="ed-upload-prog-label">Uploading…</div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        className="ed-upload-input"
        type="file"
        accept="image/*"
        onChange={onFileChange}
      />

      {uploadPhase === 'success' && <div className="ed-upload-ok" id="admin-gen-upload-ok">{uploadMsg}</div>}
      {uploadPhase === 'error' && <div className="ed-upload-err" id="admin-gen-upload-err">Error: {uploadMsg}</div>}

      {deleteError && (
        <div className="ed-upload-err" id="admin-gen-delete-err">
          Could not delete {deleteError.fileName}: {deleteError.message}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="ed-reset-btn" onClick={onRetryDelete}>Retry</button>
            <button className="ed-reset-btn" onClick={onDismissDeleteError}>Dismiss</button>
          </div>
        </div>
      )}

      {uploads.length > 0 && (
        <>
          <div className="ed-uploads-grid" id="admin-gen-uploads-grid">
            {uploads.slice(0, visibleCount).map((u) => (
              <div
                key={u.id}
                className={`ed-upload-item${selectedUploadId === u.id ? ' ed-upload-item-selected' : ''}`}
                onClick={() => onSelectUpload(u.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={u.thumbnailURL ?? u.downloadURL}
                  alt={u.fileName}
                  title={u.thumbnailStatus === 'failed' ? `Thumbnail failed: ${u.thumbnailError ?? 'unknown error'}` : u.fileName}
                  loading="lazy"
                  decoding="async"
                />
                <button
                  className="ed-upload-item-del"
                  onClick={(e) => { e.stopPropagation(); onRequestDelete(u); }}
                >✕</button>
              </div>
            ))}
          </div>
          {visibleCount < uploads.length && (
            <button className="ed-load-more" id="admin-gen-load-more" onClick={onShowMore}>
              Load more ({uploads.length - visibleCount} remaining)
            </button>
          )}
        </>
      )}
    </div>
  );
}
