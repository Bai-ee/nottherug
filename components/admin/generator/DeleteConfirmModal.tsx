'use client';

/** Delete confirmation. `.btn-accent` (terracotta) is the system's one
 * destructive-action accent, reused here for the confirm button instead of a
 * new red. */
export function DeleteConfirmModal({
  fileName,
  onCancel,
  onConfirm,
}: {
  fileName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      id="admin-gen-confirm-backdrop"
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20, 18, 14, 0.6)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        className="card card-pad"
        id="admin-gen-confirm-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'calc(100% - 48px)', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <h3 style={{ margin: 0 }}>Delete photo?</h3>
        <p className="form-note" style={{ margin: 0, wordBreak: 'break-all', textAlign: 'left' }}>{fileName}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-accent btn-sm" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
