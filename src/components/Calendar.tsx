"use client";

import { useMemo, useState } from "react";
import type { CalendarEvent } from "@/lib/types";
import { addEvent, deleteEvent } from "@/app/dashboard/actions";

const WEEKDAYS = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

function iso(year: number, month: number, day: number) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function Calendar({ events }: { events: CalendarEvent[] }) {
  const today = new Date();
  const [view, setView] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selected, setSelected] = useState(
    () => iso(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  const year = view.getFullYear();
  const month = view.getMonth();

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = map.get(e.event_date) ?? [];
      list.push(e);
      map.set(e.event_date, list);
    }
    return map;
  }, [events]);

  // Monday-first grid.
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedEvents = eventsByDate.get(selected) ?? [];
  const todayIso = iso(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div>
      {/* Month header */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-light">
          {MONTHS[month]} {year}
        </span>
        <div className="flex items-center gap-1">
          <button
            aria-label="Poprzedni miesiąc"
            onClick={() => setView(new Date(year, month - 1, 1))}
            className="rounded-md px-2 py-1 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            ‹
          </button>
          <button
            aria-label="Następny miesiąc"
            onClick={() => setView(new Date(year, month + 1, 1))}
            className="rounded-md px-2 py-1 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            ›
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] tracking-wide text-muted">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`b${i}`} />;
          const date = iso(year, month, day);
          const hasEvents = eventsByDate.has(date);
          const isSelected = date === selected;
          const isToday = date === todayIso;
          return (
            <button
              key={date}
              onClick={() => setSelected(date)}
              className={[
                "relative aspect-square rounded-lg text-sm transition-colors",
                isSelected
                  ? "bg-accent text-background"
                  : "text-foreground hover:bg-surface-2",
                isToday && !isSelected ? "ring-1 ring-border-strong" : "",
              ].join(" ")}
            >
              {day}
              {hasEvents && (
                <span
                  className={[
                    "absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full",
                    isSelected ? "bg-background" : "bg-accent",
                  ].join(" ")}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      <div className="mt-6 border-t border-border pt-5">
        <p className="text-xs tracking-[0.2em] text-muted">{selected}</p>

        <ul className="mt-3 flex flex-col gap-2">
          {selectedEvents.length === 0 && (
            <li className="text-sm text-muted">Brak wydarzeń tego dnia.</li>
          )}
          {selectedEvents.map((e) => (
            <li
              key={e.id}
              className="group flex items-start justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2"
            >
              <div>
                <p className="text-sm text-foreground">{e.title}</p>
                {e.note && <p className="text-xs text-muted">{e.note}</p>}
              </div>
              <form action={deleteEvent.bind(null, e.id)}>
                <button
                  type="submit"
                  aria-label="Usuń wydarzenie"
                  className="text-muted opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                >
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>

        {/* Add event */}
        <form
          action={async (formData) => {
            await addEvent(formData);
          }}
          className="mt-4 flex flex-col gap-2"
        >
          <input type="hidden" name="event_date" value={selected} />
          <input
            name="title"
            required
            placeholder="Nowe wydarzenie…"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
          />
          <input
            name="note"
            placeholder="Notatka (opcjonalnie)"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
          />
          <button
            type="submit"
            className="self-start rounded-full border border-border-strong px-4 py-1.5 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            Dodaj
          </button>
        </form>
      </div>
    </div>
  );
}
