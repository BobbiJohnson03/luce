"use client";

import { useActionState } from "react";
import type { AuthState } from "@/app/auth/actions";
import { useI18n } from "@/components/i18n/I18nProvider";

type AuthAction = (
  prev: AuthState,
  formData: FormData,
) => Promise<AuthState>;

export function AuthForm({
  action,
  submitLabel,
  confirmPassword = false,
}: {
  action: AuthAction;
  submitLabel: string;
  confirmPassword?: boolean;
}) {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    null,
  );

  // After a successful sign-up with email confirmation enabled there is no
  // session yet — show a clear "check your inbox" panel instead of the form.
  if (state?.notice) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface px-6 py-10 text-center"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          className="text-accent"
          aria-hidden="true"
        >
          <path
            d="M3 7l9 6 9-6M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-base text-foreground">
          {t("auth.confirmEmailTitle")}
        </p>
        <p className="text-sm text-muted">{state.notice}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-xs tracking-[0.2em] text-muted">
          {t("auth.email")}
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder={t("auth.emailPlaceholder")}
          className="rounded-lg border border-border bg-surface px-4 py-3 text-foreground outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-xs tracking-[0.2em] text-muted">
          {t("auth.password")}
        </span>
        <input
          type="password"
          name="password"
          required
          minLength={6}
          autoComplete={confirmPassword ? "new-password" : "current-password"}
          placeholder="••••••••"
          className="rounded-lg border border-border bg-surface px-4 py-3 text-foreground outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
        />
      </label>

      {confirmPassword && (
        <label className="flex flex-col gap-2">
          <span className="text-xs tracking-[0.2em] text-muted">
            {t("auth.confirmPassword")}
          </span>
          <input
            type="password"
            name="confirmPassword"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="••••••••"
            className="rounded-lg border border-border bg-surface px-4 py-3 text-foreground outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
          />
        </label>
      )}

      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "..." : submitLabel}
      </button>
    </form>
  );
}
