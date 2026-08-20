"use client";

import { useEffect, useRef, useState } from "react";

export type MenuItem = {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
};

/**
 * A small dropdown / context menu anchored to a trigger button. Closes on
 * outside click, Escape or selection. Used for folder & note actions.
 */
export function DropdownMenu({
  trigger,
  items,
  align = "end",
  label,
}: {
  trigger: (props: {
    open: boolean;
    toggle: () => void;
    ref: React.Ref<HTMLButtonElement>;
  }) => React.ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v), ref: triggerRef })}
      {open && (
        <div
          role="menu"
          aria-label={label}
          className={[
            "absolute z-50 mt-1 min-w-[10rem] overflow-hidden rounded-xl border border-border bg-surface-2 p-1 shadow-lg shadow-black/30",
            align === "end" ? "right-0" : "left-0",
          ].join(" ")}
        >
          {items.map((item, i) => (
            <button
              key={i}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={[
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                item.danger
                  ? "text-red-400 hover:bg-red-500/10"
                  : "text-muted-strong hover:bg-surface hover:text-foreground",
              ].join(" ")}
            >
              {item.icon && (
                <span className="shrink-0 opacity-80">{item.icon}</span>
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
