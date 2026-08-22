"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createLanguageProfile,
  updateLanguageProfile,
} from "@/app/languages/actions";
import { Dialog } from "@/components/notes/Dialog";
import { useToast } from "@/components/notes/Toast";
import { LANGUAGE_OPTIONS } from "@/lib/languages/catalog";
import { CEFR_LEVELS, type LanguageProfile } from "@/lib/languages/types";

const fieldClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent disabled:cursor-not-allowed disabled:opacity-60";

export function LanguageProfileDialog({
  open,
  onClose,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  profile?: LanguageProfile;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const editing = Boolean(profile);

  function close() {
    if (pending) return;
    setError("");
    onClose();
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = profile
        ? await updateLanguageProfile(profile.id, formData)
        : await createLanguageProfile(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success(profile ? "Language profile updated." : "Language profile created.");
      setError("");
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={editing ? "Profile settings" : "Add language"}
      description={
        editing
          ? "Keep the language itself fixed and adjust how you want to study it."
          : "Create a quiet space for one language. You can refine it later."
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        {profile ? (
          <div>
            <p className="text-xs tracking-[0.18em] text-muted">LANGUAGE</p>
            <div className="mt-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm">
              {profile.language_name}
              <span className="ml-2 text-xs text-muted">{profile.language_code}</span>
            </div>
          </div>
        ) : (
          <label className="flex flex-col gap-2">
            <span className="text-xs tracking-[0.18em] text-muted">LANGUAGE</span>
            <select name="language_code" required defaultValue="" className={fieldClass}>
              <option value="" disabled>
                Choose a language
              </option>
              {LANGUAGE_OPTIONS.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-xs tracking-[0.18em] text-muted">
            PRIMARY TRANSLATION LANGUAGE
          </span>
          <select
            name="translation_language_code"
            required
            defaultValue={profile?.translation_language_code ?? ""}
            className={fieldClass}
          >
            <option value="" disabled>
              Choose a language
            </option>
            {LANGUAGE_OPTIONS.map((language) => (
              <option key={language.code} value={language.code}>
                {language.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs tracking-[0.18em] text-muted">CURRENT LEVEL</span>
            <select
              name="current_cefr"
              defaultValue={profile?.current_cefr ?? ""}
              className={fieldClass}
            >
              <option value="">Not set</option>
              {CEFR_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs tracking-[0.18em] text-muted">TARGET LEVEL</span>
            <select
              name="target_cefr"
              defaultValue={profile?.target_cefr ?? ""}
              className={fieldClass}
            >
              <option value="">Not set</option>
              {CEFR_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-xs tracking-[0.18em] text-muted">
            DAILY GOAL <span className="tracking-normal">· optional minutes</span>
          </span>
          <input
            type="number"
            name="daily_goal_minutes"
            min={1}
            max={1440}
            step={1}
            defaultValue={profile?.daily_goal_minutes ?? ""}
            placeholder="e.g. 20"
            className={`${fieldClass} placeholder:text-muted/60`}
          />
        </label>

        {error && (
          <p role="alert" className="text-sm leading-relaxed text-red-400">
            {error}
          </p>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            disabled={pending}
            className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Saving…" : editing ? "Save changes" : "Add language"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
