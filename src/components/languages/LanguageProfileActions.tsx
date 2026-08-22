"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveLanguageProfile } from "@/app/languages/actions";
import { Dialog } from "@/components/notes/Dialog";
import { DropdownMenu } from "@/components/notes/DropdownMenu";
import { useToast } from "@/components/notes/Toast";
import type { LanguageProfile } from "@/lib/languages/types";
import { LanguageProfileDialog } from "./LanguageProfileDialog";

export function LanguageProfileActions({ profile }: { profile: LanguageProfile }) {
  const router = useRouter();
  const toast = useToast();
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
      toast.success(`${profile.language_name} was archived.`);
      setConfirmingArchive(false);
      router.push("/languages");
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu
        label="Profile settings"
        items={[
          { label: "Edit profile", onSelect: () => setEditing(true) },
          {
            label: "Archive profile",
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
            Profile settings
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
        title={`Archive ${profile.language_name}?`}
        description="It will leave your active Languages Hub, but its profile and future learning history will remain safe. You can start this language again later."
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmingArchive(false)}
            disabled={pending}
            className="rounded-full px-4 py-1.5 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            Keep profile
          </button>
          <button
            type="button"
            onClick={archive}
            disabled={pending}
            className="rounded-full border border-red-500/40 px-4 py-1.5 text-sm text-red-400 transition-colors hover:border-red-500 hover:bg-red-500/10 disabled:opacity-50"
          >
            {pending ? "Archiving…" : "Archive profile"}
          </button>
        </div>
      </Dialog>
    </>
  );
}
