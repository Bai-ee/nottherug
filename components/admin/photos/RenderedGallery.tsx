'use client';

import type { PhotoRender } from '@/lib/photos/types';

/** Rendered-output gallery. Same truthful-delete contract as PhotoLibrary. */
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
    return <div className="ph-empty">No rendered outputs yet.</div>;
  }

  return (
    <div className="ph-gallery" id="admin-photos-rendered-gallery">
      {renders.map((r) => (
        <div key={r.id} className="ph-rendered-item">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ph-gallery-img" src={r.renderDownloadURL} alt={r.id} />
          {deleteErrors[r.id] ? <div className="ph-item-error">{deleteErrors[r.id]}</div> : null}
          <div className="ph-rendered-actions">
            <a
              className="ph-rendered-download"
              href={r.renderDownloadURL}
              download={`render-${r.id}.jpg`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download
            </a>
            <button
              className="ph-btn-ghost ph-btn"
              style={{ fontSize: '10px', padding: '5px 10px' }}
              onClick={() => onReRender(r)}
            >
              Re-render
            </button>
            <button className="ph-btn-delete" onClick={() => onDelete(r)}>
              {deleteErrors[r.id] ? 'Retry delete' : 'Delete'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
