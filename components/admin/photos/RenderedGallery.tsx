'use client';

import type { PhotoRender } from '@/lib/photos/types';

const TILT_CLASSES = ['polaroid-tilt-left', 'polaroid-tilt-right'];

/** Rendered-output gallery. Same truthful-delete contract as PhotoLibrary,
 * and the same polaroid vocabulary. */
export function RenderedGallery({
  renders,
  onReRender,
  onDelete,
  deleteErrors,
}: {
  renders: PhotoRender[];
  onReRender: (render: PhotoRender) => void;
  onDelete: (render: PhotoRender) => void;
  deleteErrors: Record<string, string>;
}) {
  if (renders.length === 0) {
    return <p className="form-note" id="admin-photos-rendered-empty">No rendered outputs yet.</p>;
  }

  return (
    <div className="grid-3" id="admin-photos-rendered-gallery">
      {renders.map((r, i) => (
        <figure key={r.id} className={`polaroid ${TILT_CLASSES[i % TILT_CLASSES.length]}`} style={{ margin: 0 }}>
          <div className="polaroid-window" style={{ aspectRatio: '1' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={r.renderDownloadURL}
              alt={r.id}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>

          {deleteErrors[r.id] ? <p className="form-note text-terra" style={{ padding: '10px 4px 0' }}>{deleteErrors[r.id]}</p> : null}

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingTop: 10 }}>
            <a
              className="btn btn-sm admin-btn-secondary"
              href={r.renderDownloadURL}
              download={`render-${r.id}.jpg`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download
            </a>
            <button type="button" className="btn btn-sm admin-btn-secondary" onClick={() => onReRender(r)}>Re-render</button>
            <button type="button" className="btn btn-sm admin-btn-secondary" onClick={() => onDelete(r)}>
              {deleteErrors[r.id] ? 'Retry delete' : 'Delete'}
            </button>
          </div>
        </figure>
      ))}
    </div>
  );
}
