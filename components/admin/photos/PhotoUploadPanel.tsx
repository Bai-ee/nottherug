'use client';

import type { RefObject } from 'react';

export type UploadPhase = 'idle' | 'uploading' | 'success' | 'error';

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
        className={`ph-upload-zone${dragOver ? ' ph-upload-zone-drag' : ''}`}
        onClick={() => !isUploading && onChooseClick()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="ph-upload-zone-icon">[↑]</div>
        <div className="ph-upload-zone-label">Tap to choose from camera roll or drag an image</div>
        <div className="ph-upload-zone-hint">JPEG · PNG · HEIC · camera library supported</div>
        <button
          className="ph-btn"
          disabled={isUploading}
          onClick={(e) => { e.stopPropagation(); onChooseClick(); }}
        >
          {isUploading ? 'Uploading…' : 'Choose Photo'}
        </button>

        {uploadPhase === 'uploading' && (
          <div style={{ width: '100%', maxWidth: 320 }}>
            <div className="ph-progress-bar-shell">
              <div className="ph-progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
            <div className="ph-progress-label">Uploading…</div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        className="ph-upload-input"
        type="file"
        accept="image/*"
        onChange={onFileChange}
      />

      {uploadPhase === 'success' && <div className="ph-status-ok" id="admin-photos-upload-success">{uploadMsg}</div>}
      {uploadPhase === 'error' && <div className="ph-status-err" id="admin-photos-upload-error">Error: {uploadMsg}</div>}
    </>
  );
}
