"use client";

import { Dialog } from "./Dialog";
import { useI18n } from "@/components/i18n/I18nProvider";

export function DeleteConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
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
  const { t } = useI18n();
  return (
    <Dialog open={open} onClose={onClose} title={title} description={message}>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-4 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="rounded-full border border-danger/40 px-4 py-1.5 text-sm text-danger transition-colors hover:border-danger hover:bg-danger/10"
        >
          {confirmLabel ?? t("common.delete")}
        </button>
      </div>
    </Dialog>
  );
}
