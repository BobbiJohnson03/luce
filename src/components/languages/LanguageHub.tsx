"use client";

import { useState } from "react";
import Link from "next/link";
import type { LanguageProfile } from "@/lib/languages/types";
import { LanguageProfileDialog } from "./LanguageProfileDialog";

function levelSummary(profile: LanguageProfile): string {
  if (profile.current_cefr && profile.target_cefr) {
    return `${profile.current_cefr} → ${profile.target_cefr}`;
  }
  if (profile.current_cefr) return `Current level ${profile.current_cefr}`;
  if (profile.target_cefr) return `Target level ${profile.target_cefr}`;
  return "Levels not set";
}

export function LanguageHub({ profiles }: { profiles: LanguageProfile[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="animate-fade-up flex flex-col gap-6 py-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm tracking-[0.3em] text-muted">LANGUAGES</p>
          <h1 className="mt-3 text-4xl font-light tracking-tight sm:text-5xl">
            Your languages
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            A focused space for every language you are learning.
          </p>
        </div>
        {profiles.length > 0 && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-fit rounded-full border border-border-strong px-5 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            + Add language
          </button>
        )}
      </div>

      {profiles.length === 0 ? (
        <section className="animate-fade-up rounded-2xl border border-border bg-surface/50 px-6 py-14 text-center sm:px-10 sm:py-20 [animation-delay:0.08s]">
          <p className="text-xs tracking-[0.25em] text-muted">YOUR LANGUAGE SPACE</p>
          <h2 className="mt-4 text-2xl font-light tracking-tight">No languages yet.</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            Build a calm home for the languages you are learning and the goals you
            want to reach.
          </p>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-7 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Add language
          </button>
        </section>
      ) : (
        <div className="animate-fade-up divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/40 [animation-delay:0.08s]">
          {profiles.map((profile) => (
            <Link
              key={profile.id}
              href={`/languages/${profile.id}`}
              className="group flex flex-col gap-5 px-5 py-5 transition-colors hover:bg-surface sm:flex-row sm:items-center sm:justify-between sm:px-7"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h2 className="text-2xl font-light tracking-tight">
                    {profile.language_name}
                  </h2>
                  <span className="text-sm text-muted-strong">
                    {levelSummary(profile)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">
                  Primary translation: {profile.translation_language_name}
                  {profile.daily_goal_minutes
                    ? ` · ${profile.daily_goal_minutes} min daily`
                    : ""}
                </p>
              </div>
              <span className="shrink-0 text-sm text-muted transition-colors group-hover:text-foreground">
                Continue →
              </span>
            </Link>
          ))}
        </div>
      )}

      <LanguageProfileDialog
        open={adding}
        onClose={() => setAdding(false)}
      />
    </div>
  );
}
