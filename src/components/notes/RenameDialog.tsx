"use client";

import { useState } from "react";
import { Dialog } from "./Dialog";
import { useI18n } from "@/components/i18n/I18nProvider";

export function RenameDialog({
  open,
  initialValue,
  label,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initialValue: string;
  label: string;
  onClose: () => void;
  onSubmit: (value: string) => void;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState(initialValue);

  // Reset the field to the target's name each time the dialog transitions open
  // (adjusting state during render, as recommended, instead of via an effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setValue(initialValue);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title={label}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
          placeholder={t("notes.namePlaceholder")}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            className="rounded-full border border-border-strong px-4 py-1.5 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            {t("common.save")}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
