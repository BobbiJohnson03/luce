"use client";

import { useActionState } from "react";
import type { AuthState } from "@/app/auth/actions";

type AuthAction = (
  prev: AuthState,
  formData: FormData,
) => Promise<AuthState>;

export function AuthForm({
  action,
  submitLabel,
}: {
  action: AuthAction;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-xs tracking-[0.2em] text-muted">EMAIL</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="tu@esempio.com"
          className="rounded-lg border border-border bg-surface px-4 py-3 text-foreground outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-xs tracking-[0.2em] text-muted">HASŁO</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="rounded-lg border border-border bg-surface px-4 py-3 text-foreground outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
        />
      </label>

      {state?.error && (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      )}
      {state?.notice && (
        <p className="text-sm text-accent" role="status">
          {state.notice}
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
