'use client';

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
    <div className="ed-confirm-backdrop" id="admin-gen-confirm-backdrop" onClick={onCancel}>
      <div className="ed-confirm-modal" id="admin-gen-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ed-confirm-title">Delete photo?</div>
        <div className="ed-confirm-body">{fileName}</div>
        <div className="ed-confirm-actions">
          <button className="ed-confirm-cancel" onClick={onCancel}>Cancel</button>
          <button className="ed-confirm-delete" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
