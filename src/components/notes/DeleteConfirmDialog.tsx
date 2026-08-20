"use client";

import { Dialog } from "./Dialog";

export function DeleteConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={message}>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-4 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="rounded-full border border-red-500/40 px-4 py-1.5 text-sm text-red-400 transition-colors hover:border-red-500 hover:bg-red-500/10"
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
