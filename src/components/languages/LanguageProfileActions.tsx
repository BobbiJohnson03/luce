"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveLanguageProfile } from "@/app/languages/actions";
import { Dialog } from "@/components/notes/Dialog";
import { DropdownMenu } from "@/components/notes/DropdownMenu";
import { useToast } from "@/components/notes/Toast";
import type { LanguageProfile } from "@/lib/languages/types";
import { LanguageProfileDialog } from "./LanguageProfileDialog";
import { useI18n } from "@/components/i18n/I18nProvider";
import { getLanguageDisplayName } from "@/lib/languages/catalog";

export function LanguageProfileActions({ profile }: { profile: LanguageProfile }) {
  const router = useRouter();
  const toast = useToast();
  const { locale, t } = useI18n();
  const languageName = getLanguageDisplayName(profile.language_code, locale);
  const [editing, setEditing] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [pending, startTransition] = useTransition();

  function archive() {
    startTransition(async () => {
      const result = await archiveLanguageProfile(profile.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("languages.archivedToast", { language: languageName }));
      setConfirmingArchive(false);
      router.push("/languages");
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu
        label={t("languages.profileSettings")}
        items={[
          { label: t("languages.editProfile"), onSelect: () => setEditing(true) },
          {
            label: t("languages.archiveProfile"),
            danger: true,
            onSelect: () => setConfirmingArchive(true),
          },
        ]}
        trigger={({ toggle, ref, open }) => (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            aria-haspopup="menu"
            aria-expanded={open}
            className="rounded-full border border-border-strong px-4 py-1.5 text-sm text-muted-strong transition-colors hover:border-accent hover:text-foreground"
          >
            {t("languages.profileSettings")}
          </button>
        )}
      />

      <LanguageProfileDialog
        open={editing}
        onClose={() => setEditing(false)}
        profile={profile}
      />

      <Dialog
        open={confirmingArchive}
        onClose={() => {
          if (!pending) setConfirmingArchive(false);
        }}
        title={t("languages.archiveTitle", { language: languageName })}
        description={t("languages.archiveDescription")}
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmingArchive(false)}
            disabled={pending}
            className="rounded-full px-4 py-1.5 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            {t("languages.keepProfile")}
          </button>
          <button
            type="button"
            onClick={archive}
            disabled={pending}
            className="rounded-full border border-danger/40 px-4 py-1.5 text-sm text-danger transition-colors hover:border-danger hover:bg-danger/10 disabled:opacity-50"
          >
            {pending
              ? t("languages.archiving")
              : t("languages.archiveProfile")}
          </button>
        </div>
      </Dialog>
    </>
  );
}
