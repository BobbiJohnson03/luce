"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastKind = "error" | "success" | "info";
type ToastItem = { id: number; message: string; kind: ToastKind };

type ToastApi = {
  toast: (message: string, kind?: ToastKind) => void;
  error: (message: string) => void;
  success: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Tiny toast system (Luce has none of its own). Non-blocking, bottom-right,
 * auto-dismissing. Used for surfacing failed CRUD / autosave errors instead of
 * browser alert().
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = nextId.current++;
      setItems((prev) => [...prev, { id, message, kind }]);
      window.setTimeout(() => remove(id), kind === "error" ? 6000 : 3500);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      error: (m) => toast(m, "error"),
      success: (m) => toast(m, "success"),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-full max-w-xs flex-col gap-2"
        aria-live="polite"
        role="status"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={[
              "animate-fade-up pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface-2 px-4 py-3 text-sm shadow-lg shadow-black/30",
              t.kind === "error"
                ? "border-red-500/30 text-red-300"
                : t.kind === "success"
                  ? "border-border text-foreground"
                  : "border-border text-muted-strong",
            ].join(" ")}
          >
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              aria-label="Dismiss"
              className="text-muted transition-colors hover:text-foreground"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
