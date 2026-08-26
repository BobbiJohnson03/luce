"use client";

import { useMemo, useState } from "react";
import type { CalendarEvent } from "@/lib/types";
import { addEvent, deleteEvent } from "@/app/dashboard/actions";
import { useI18n } from "@/components/i18n/I18nProvider";

function iso(year: number, month: number, day: number) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function Calendar({ events }: { events: CalendarEvent[] }) {
  const { localeTag, t } = useI18n();
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
  const monthLabel = new Intl.DateTimeFormat(localeTag, {
    month: "long",
    year: "numeric",
  }).format(view);
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(localeTag, { weekday: "short", timeZone: "UTC" })
      .format(new Date(Date.UTC(2024, 0, 1 + index)))
      .replace(".", ""),
  );
  const [selectedYear, selectedMonth, selectedDay] = selected
    .split("-")
    .map(Number);
  const selectedLabel = new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(selectedYear, selectedMonth - 1, selectedDay));

  return (
    <div>
      {/* Month header */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-light">
          {monthLabel}
        </span>
        <div className="flex items-center gap-1">
          <button
            aria-label={t("calendar.previousMonth")}
            onClick={() => setView(new Date(year, month - 1, 1))}
            className="rounded-md px-2 py-1 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            ‹
          </button>
          <button
            aria-label={t("calendar.nextMonth")}
            onClick={() => setView(new Date(year, month + 1, 1))}
            className="rounded-md px-2 py-1 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            ›
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] tracking-wide text-muted">
        {weekdays.map((d) => (
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
        <p className="text-xs tracking-[0.2em] text-muted">{selectedLabel}</p>

        <ul className="mt-3 flex flex-col gap-2">
          {selectedEvents.length === 0 && (
            <li className="text-sm text-muted">{t("calendar.noEvents")}</li>
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
                  aria-label={t("calendar.deleteEvent")}
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
            placeholder={t("calendar.newEvent")}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
          />
          <input
            name="note"
            placeholder={t("calendar.noteOptional")}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
          />
          <button
            type="submit"
            className="self-start rounded-full border border-border-strong px-4 py-1.5 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            {t("calendar.add")}
          </button>
        </form>
      </div>
    </div>
  );
}
