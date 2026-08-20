"use client";

import { useState } from "react";
import type { NoteFolder, NoteSummary } from "@/lib/notes/types";
import { ToastProvider } from "./Toast";
import { NotesStoreProvider } from "./NotesStore";
import { NotesActionsProvider } from "./NotesActions";
import { NotesSidebar } from "./NotesSidebar";
import { CloseIcon } from "./icons";

/**
 * Client root of the Notes workspace. Wires the toast, data store and action
 * providers, then lays out the sidebar + main content. On desktop it is a fixed
 * two-column layout; on narrow screens the sidebar collapses into a drawer.
 */
export function NotesShell({
  folders,
  notes,
  children,
}: {
  folders: NoteFolder[];
  notes: NoteSummary[];
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <ToastProvider>
      <NotesStoreProvider folders={folders} notes={notes}>
        <NotesActionsProvider>
          <div className="flex min-h-0 flex-1">
            {/* Desktop sidebar */}
            <aside className="hidden w-72 shrink-0 border-r border-border px-4 py-5 md:flex md:flex-col">
              <NotesSidebar />
            </aside>

            {/* Mobile drawer */}
            {drawerOpen && (
              <div className="fixed inset-0 z-[60] md:hidden">
                <div
                  className="absolute inset-0 bg-background/70 backdrop-blur-sm"
                  onClick={() => setDrawerOpen(false)}
                />
                <div className="animate-fade-up absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col border-r border-border bg-surface px-4 py-5">
                  <div className="mb-2 flex justify-end">
                    <button
                      onClick={() => setDrawerOpen(false)}
                      aria-label="Close notes menu"
                      className="rounded-md p-1 text-muted transition-colors hover:text-foreground"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                  <NotesSidebar onNavigate={() => setDrawerOpen(false)} />
                </div>
              </div>
            )}

            {/* Main content */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-3 px-4 py-3 md:hidden">
                <button
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open notes menu"
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-strong transition-colors hover:text-foreground"
                >
                  <span className="flex flex-col gap-1">
                    <span className="block h-px w-4 bg-current" />
                    <span className="block h-px w-4 bg-current" />
                  </span>
                  Notes
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            </div>
          </div>
        </NotesActionsProvider>
      </NotesStoreProvider>
    </ToastProvider>
  );
}
