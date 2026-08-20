"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchNotes } from "@/app/notes/actions";
import { folderPathNames } from "@/lib/notes/tree";
import type { NoteSummary } from "@/lib/notes/types";
import { useNotesStore } from "./NotesStore";
import { SearchIcon } from "./icons";

export function NotesSearch({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const store = useNotesStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NoteSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);
  const reqId = useRef(0);
  const timer = useRef<number | null>(null);

  // Clear any pending debounce timer on unmount (no setState in this effect).
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  // Debounced search is driven from the change handler (an event), which keeps
  // all state updates out of effects.
  function onChange(value: string) {
    setQuery(value);
    if (timer.current) window.clearTimeout(timer.current);

    const q = value.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const id = ++reqId.current;
    timer.current = window.setTimeout(async () => {
      const res = await searchNotes(q);
      if (id !== reqId.current) return; // a newer query superseded this one

      // Server matches title + content; also surface notes whose ancestor
      // folder name matches so folder-name searches return the notes inside.
      const lower = q.toLowerCase();
      const serverHits = res.ok ? res.data : [];
      const byId = new Map(serverHits.map((n) => [n.id, n]));
      for (const n of store.notes) {
        if (byId.has(n.id)) continue;
        const path = folderPathNames(store.folders, n.folder_id);
        if (path.some((name) => name.toLowerCase().includes(lower))) {
          byId.set(n.id, n);
        }
      }
      setResults([...byId.values()]);
      setLoading(false);
    }, 250);
  }

  function open(id: string) {
    setQuery("");
    setResults([]);
    setActive(false);
    onNavigate?.();
    router.push(`/notes/${id}`);
  }

  const showPanel = active && query.trim().length > 0;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 transition-colors focus-within:border-accent">
        <SearchIcon className="shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setActive(true)}
          onBlur={() => window.setTimeout(() => setActive(false), 120)}
          placeholder="Search notes…"
          aria-label="Search notes"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/60"
        />
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 z-40 mt-1 max-h-80 overflow-y-auto rounded-xl border border-border bg-surface-2 p-1 shadow-lg shadow-black/30">
          {loading && <p className="px-3 py-2 text-sm text-muted">Searching…</p>}
          {!loading && results.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted">No notes found.</p>
          )}
          {results.map((n) => {
            const path = folderPathNames(store.folders, n.folder_id);
            return (
              <button
                key={n.id}
                // onMouseDown so it fires before the input blur closes the panel.
                onMouseDown={(e) => {
                  e.preventDefault();
                  open(n.id);
                }}
                className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface"
              >
                <span className="truncate text-sm text-foreground">
                  {n.title || "Untitled"}
                </span>
                <span className="truncate text-xs text-muted">
                  {["Notes", ...path].join(" / ")}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
