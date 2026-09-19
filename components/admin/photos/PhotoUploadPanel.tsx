'use client';

import type { RefObject } from 'react';

export type UploadPhase = 'idle' | 'uploading' | 'success' | 'error';

/** Upload dropzone — a marketing `.card` acting as the drop target, with the
 * terracotta `.btn-accent` for the file picker. Drag-over feedback and the
 * progress meter reuse existing tokens (var(--sage), var(--light-gray)) via
 * inline layout styles rather than new CSS. */
export function PhotoUploadPanel({
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
}) {
  return (
    <>
      <div
        id="admin-photos-upload-zone"
        className="card card-pad card-hover"
        onClick={() => !isUploading && onChooseClick()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          textAlign: 'center',
          cursor: isUploading ? 'default' : 'pointer',
          outline: dragOver ? '2px solid var(--sage)' : undefined,
          outlineOffset: dragOver ? -4 : undefined,
        }}
      >
        <p className="label" style={{ margin: 0 }}>Tap to choose from camera roll or drag an image</p>
        <p className="form-note" style={{ margin: 0 }}>JPEG · PNG · HEIC · camera library supported</p>
        <button
          type="button"
          className="btn btn-accent btn-sm"
          disabled={isUploading}
          onClick={(e) => { e.stopPropagation(); onChooseClick(); }}
        >
          {isUploading ? 'Uploading…' : 'Choose Photo'}
        </button>

        {uploadPhase === 'uploading' && (
          <div id="admin-photos-upload-progress" style={{ width: '100%', maxWidth: 320 }}>
            <div id="admin-photos-upload-progress-shell" style={{ width: '100%', height: 4, background: 'var(--light-gray)', overflow: 'hidden' }}>
              <div
                id="admin-photos-upload-progress-fill"
                style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--sage-dark)', transition: 'width 200ms' }}
              />
            </div>
            <p className="form-note" style={{ marginTop: 8 }}>Uploading…</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        id="admin-photos-upload-input"
        style={{ display: 'none' }}
        type="file"
        accept="image/*"
        onChange={onFileChange}
      />

      {uploadPhase === 'success' && <p className="form-note text-sage" id="admin-photos-upload-success">{uploadMsg}</p>}
      {uploadPhase === 'error' && <p className="form-note text-terra" id="admin-photos-upload-error">Error: {uploadMsg}</p>}
    </>
  );
}
