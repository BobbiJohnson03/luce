"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startPracticeSession } from "@/app/languages/[profileId]/practice/actions";
import { useToast } from "@/components/notes/Toast";
import { topicPathLabels } from "@/lib/languages/topics";
import {
  type PracticeMode,
  type PracticeSize,
} from "@/lib/languages/srs/practice";
import type { LanguageTopic } from "@/lib/languages/types";

const MODES: { value: PracticeMode; label: string; hint: string }[] = [
  { value: "recall", label: "Recall", hint: "See the term, recall the meaning" },
  { value: "reverse", label: "Reverse", hint: "See the meaning, recall the term" },
  { value: "mixed", label: "Mixed", hint: "A blend of both directions" },
];

const SIZES: { value: PracticeSize; label: string }[] = [
  { value: 10, label: "10" },
  { value: 20, label: "20" },
  { value: "all", label: "All" },
];

function Segment<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 rounded-full border border-border p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={[
              "rounded-full px-4 py-1.5 text-sm transition-colors",
              active
                ? "bg-surface-2 text-foreground"
                : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function PracticeSetupClient({
  profileId,
  topics,
  initialTopicId,
}: {
  profileId: string;
  topics: LanguageTopic[];
  initialTopicId: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const validInitialTopic =
    initialTopicId && topics.some((t) => t.id === initialTopicId)
      ? initialTopicId
      : "";

  const [mode, setMode] = useState<PracticeMode>("recall");
  const [size, setSize] = useState<PracticeSize>(10);
  const [scope, setScope] = useState<"all" | "topic">(
    validInitialTopic ? "topic" : "all",
  );
  const [topicId, setTopicId] = useState<string>(validInitialTopic);

  const topicLabels = topicPathLabels(topics);
  const modeHint = MODES.find((m) => m.value === mode)?.hint ?? "";

  function start() {
    setError("");
    const chosenTopic = scope === "topic" ? topicId : null;
    if (scope === "topic" && !chosenTopic) {
      setError("Choose a topic to practise.");
      return;
    }
    startTransition(async () => {
      const result = await startPracticeSession(profileId, mode, size, chosenTopic);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      router.push(`/languages/${profileId}/practice/${result.sessionId}`);
    });
  }

  return (
    <div className="mx-auto w-full max-w-lg py-10">
      <p className="text-xs tracking-[0.3em] text-muted">PRACTICE</p>
      <h2 className="mt-4 text-2xl font-light tracking-tight">
        Practise without changing your review schedule.
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Extra, pressure-free study. Your attempts are saved, but your due dates
        stay exactly as they are.
      </p>

      <div className="mt-10 space-y-8">
        <div>
          <p className="text-xs tracking-[0.2em] text-muted">MODE</p>
          <div className="mt-3">
            <Segment
              ariaLabel="Practice mode"
              options={MODES.map((m) => ({ value: m.value, label: m.label }))}
              value={mode}
              onChange={setMode}
            />
          </div>
          <p className="mt-2 text-xs text-muted">{modeHint}</p>
        </div>

        <div>
          <p className="text-xs tracking-[0.2em] text-muted">SCOPE</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Segment
              ariaLabel="Practice scope"
              options={[
                { value: "all", label: "All vocabulary" },
                { value: "topic", label: "Topic" },
              ]}
              value={scope}
              onChange={setScope}
            />
            {scope === "topic" && (
              <select
                aria-label="Topic"
                value={topicId}
                onChange={(event) => setTopicId(event.target.value)}
                className="rounded-xl border border-border bg-surface/50 px-4 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
              >
                <option value="">Select a topic…</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topicLabels.get(topic.id) ?? topic.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {scope === "topic" && topics.length === 0 && (
            <p className="mt-2 text-xs text-muted">
              You have no topics yet. Add topics to practise by topic.
            </p>
          )}
        </div>

        <div>
          <p className="text-xs tracking-[0.2em] text-muted">SESSION SIZE</p>
          <div className="mt-3">
            <Segment
              ariaLabel="Session size"
              options={SIZES.map((s) => ({
                value: String(s.value),
                label: s.label,
              }))}
              value={String(size)}
              onChange={(value) =>
                setSize(value === "all" ? "all" : (Number(value) as PracticeSize))
              }
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div>
          <button
            type="button"
            onClick={start}
            disabled={pending}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Starting…" : "Start practice →"}
          </button>
        </div>
      </div>
    </div>
  );
}
