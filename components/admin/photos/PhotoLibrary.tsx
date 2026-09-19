'use client';

import type { PhotoUpload } from '@/lib/photos/types';

const TILT_CLASSES = ['polaroid-tilt-left', 'polaroid-tilt-right'];

/**
 * Originals gallery. A row is only ever removed from this list after the
 * delete API confirms `ok: true` — see onDelete in the parent page. When a
 * delete fails (pending_cleanup / metadata_delete_failed) the row stays
 * here with its error and a retry action instead of silently disappearing.
 *
 * Thumbnails use the homepage's polaroid / polaroid-window / polaroid-caption
 * vocabulary — the natural fit for a photo library.
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
    return <p className="form-note" id="admin-photos-originals-empty">No uploads yet.</p>;
  }

  return (
    <div className="grid-3" id="admin-photos-originals-gallery">
      {uploads.map((u, i) => (
        <figure
          key={u.id}
          className={`polaroid ${TILT_CLASSES[i % TILT_CLASSES.length]}`}
          onClick={() => onSelect(u.id)}
          style={{ cursor: 'pointer', margin: 0 }}
        >
          <div className="polaroid-window" style={{ aspectRatio: '1' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={u.downloadURL}
              alt={u.fileName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
          <figcaption className="polaroid-caption">
            {u.fileName}
            <br />
            <span className="form-note" style={{ margin: 0 }}>{u.width}×{u.height}</span>
          </figcaption>

          {selectedUploadId === u.id ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
              <span className="badge badge-sage">Selected</span>
            </div>
          ) : null}
          {u.thumbnailStatus === 'failed' ? (
            <p className="form-note text-terra" style={{ padding: '6px 4px 0' }}>
              Thumbnail failed{u.thumbnailError ? `: ${u.thumbnailError}` : ''}
            </p>
          ) : null}
          {deleteErrors[u.id] ? <p className="form-note text-terra" style={{ padding: '6px 4px 0' }}>{deleteErrors[u.id]}</p> : null}

          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
            <button
              type="button"
              className="btn btn-sm admin-btn-secondary"
              onClick={(e) => { e.stopPropagation(); onDelete(u); }}
            >
              {deleteErrors[u.id] ? 'Retry delete' : 'Delete'}
            </button>
          </div>
        </figure>
      ))}
    </div>
  );
}
