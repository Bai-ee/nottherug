'use client';

import type { PhotoUpload } from '@/lib/photos/types';

/**
 * Originals gallery. A row is only ever removed from this list after the
 * delete API confirms `ok: true` — see onDelete in the parent page. When a
 * delete fails (pending_cleanup / metadata_delete_failed) the row stays
 * here with its error and a retry action instead of silently disappearing.
 */
export function PhotoLibrary({
  uploads,
  selectedUploadId,
  onSelect,
  onDelete,
  deleteErrors,
}: {
  uploads: PhotoUpload[];
  selectedUploadId: string | null;
  onSelect: (id: string) => void;
  onDelete: (upload: PhotoUpload) => void;
  deleteErrors: Record<string, string>;
}) {
  if (uploads.length === 0) {
    return <div className="ph-empty">No uploads yet.</div>;
  }

  return (
    <div className="ph-gallery" id="admin-photos-originals-gallery">
      {uploads.map((u) => (
        <div
          key={u.id}
          className={`ph-gallery-item${selectedUploadId === u.id ? ' ph-gallery-item-selected' : ''}`}
          onClick={() => onSelect(u.id)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ph-gallery-img" src={u.downloadURL} alt={u.fileName} />
          <div className="ph-gallery-meta">
            <div className="ph-gallery-name">{u.fileName}</div>
            <div className="ph-gallery-dim">{u.width}×{u.height}</div>
          </div>
          {u.thumbnailStatus === 'failed' ? (
            <div className="ph-item-error">Thumbnail failed{u.thumbnailError ? `: ${u.thumbnailError}` : ''}</div>
          ) : null}
          {deleteErrors[u.id] ? <div className="ph-item-error">{deleteErrors[u.id]}</div> : null}
          <div style={{ padding: '0 12px 10px', display: 'flex', gap: 6 }}>
            <button
              className="ph-btn-delete"
              onClick={(e) => { e.stopPropagation(); onDelete(u); }}
            >
              {deleteErrors[u.id] ? 'Retry delete' : 'Delete'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
