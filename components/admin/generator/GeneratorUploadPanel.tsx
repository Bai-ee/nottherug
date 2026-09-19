'use client';

import type { RefObject } from 'react';
import type { PhotoUpload } from '@/lib/photos/types';

export type UploadPhase = 'idle' | 'uploading' | 'success' | 'error';

/** Same dropzone treatment as the Photos page's PhotoUploadPanel: a `.card`
 * drop target with the paper-ticket `.btn-primary` file picker. The uploads
 * grid uses `.grid-4` (already collapses to 2/1 columns on tablet/mobile via
 * app/globals.css) instead of a custom auto-fill track. */
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
    <div className="section-sm" id="admin-gen-upload-section">
      <div
        id="admin-gen-upload-zone"
        className="card card-pad card-hover"
        onClick={() => !isUploading && onChooseClick()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          textAlign: 'center',
          cursor: isUploading ? 'default' : 'pointer',
          marginBottom: 16,
          outline: dragOver ? '2px solid var(--sage)' : undefined,
          outlineOffset: dragOver ? -4 : undefined,
        }}
      >
        <p className="label" style={{ margin: 0 }}>Tap to choose from camera roll or drag an image</p>
        <p className="form-note" style={{ margin: 0 }}>JPEG · PNG · HEIC · camera library supported</p>

        {isUploading && (
          <div style={{ width: '100%', maxWidth: 280 }}>
            <div style={{ width: '100%', height: 3, background: 'var(--light-gray)', overflow: 'hidden' }}>
              <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--sage-dark)', transition: 'width 200ms' }} />
            </div>
            <p className="form-note" style={{ marginTop: 6 }}>Uploading…</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        id="admin-gen-upload-input"
        style={{ display: 'none' }}
        type="file"
        accept="image/*"
        onChange={onFileChange}
      />

      {uploadPhase === 'success' && <p className="form-note text-sage" id="admin-gen-upload-ok">{uploadMsg}</p>}
      {uploadPhase === 'error' && <p className="form-note text-terra" id="admin-gen-upload-err">Error: {uploadMsg}</p>}

      {deleteError && (
        <div id="admin-gen-delete-err" style={{ marginBottom: 12 }}>
          <p className="form-note text-terra" style={{ margin: 0 }}>Could not delete {deleteError.fileName}: {deleteError.message}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onRetryDelete}>Retry</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onDismissDeleteError}>Dismiss</button>
          </div>
        </div>
      )}

      {uploads.length > 0 && (
        <>
          <div className="grid-4" id="admin-gen-uploads-grid">
            {uploads.slice(0, visibleCount).map((u) => {
              const isActive = selectedUploadId === u.id;
              return (
                <div
                  key={u.id}
                  className="card"
                  onClick={() => onSelectUpload(u.id)}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    cursor: 'pointer',
                    outline: isActive ? '2px solid var(--sage-dark)' : undefined,
                    outlineOffset: isActive ? -2 : undefined,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={u.thumbnailURL ?? u.downloadURL}
                    alt={u.fileName}
                    title={u.thumbnailStatus === 'failed' ? `Thumbnail failed: ${u.thumbnailError ?? 'unknown error'}` : u.fileName}
                    loading="lazy"
                    decoding="async"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => { e.stopPropagation(); onRequestDelete(u); }}
                    style={{ position: 'absolute', top: 4, right: 4, padding: '2px 8px' }}
                  >✕</button>
                </div>
              );
            })}
          </div>
          {visibleCount < uploads.length && (
            <button type="button" className="btn btn-outline btn-sm" id="admin-gen-load-more" style={{ width: '100%', marginTop: 12, justifyContent: 'center' }} onClick={onShowMore}>
              Load more ({uploads.length - visibleCount} remaining)
            </button>
          )}
        </>
      )}
    </div>
  );
}
