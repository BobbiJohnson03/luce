import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent, Todo } from "@/lib/types";
import { Calendar } from "@/components/Calendar";
import { TodoList } from "@/components/TodoList";

function Panel({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-border bg-surface/60 p-6 backdrop-blur-sm"
    >
      <p className="text-[0.7rem] tracking-[0.3em] text-muted">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-light tracking-tight">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: events }, { data: todos }] = await Promise.all([
    supabase
      .from("events")
      .select("id, event_date, title, note")
      .order("event_date", { ascending: true }),
    supabase
      .from("todos")
      .select("id, title, done")
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="animate-fade-up py-8">
        <p className="text-sm tracking-[0.3em] text-muted">CENTRO DI COMANDO</p>
        <h1 className="mt-3 text-4xl font-light tracking-tight sm:text-5xl">
          La tua Luce
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel id="calendar" eyebrow="CALENDARIO" title="Kalendarz">
          <Calendar events={(events as CalendarEvent[]) ?? []} />
        </Panel>

        <Panel id="todos" eyebrow="TO-DO" title="Zadania">
          <TodoList todos={(todos as Todo[]) ?? []} />
        </Panel>
      </div>

      <Link
        href="/notes"
        id="notes"
        className="mt-6 flex scroll-mt-24 items-center justify-between rounded-2xl border border-border bg-surface/60 p-6 backdrop-blur-sm transition-colors hover:border-border-strong hover:bg-surface"
      >
        <div>
          <p className="text-[0.7rem] tracking-[0.3em] text-muted">NOTE</p>
          <h2 className="mt-1 text-xl font-light tracking-tight">
            Notatki i wiedza
          </h2>
          <p className="mt-2 text-sm text-muted">
            Foldery, notatki, tabele i listy — Twoja osobista baza wiedzy.
          </p>
        </div>
        <span className="text-muted transition-colors group-hover:text-foreground">
          →
        </span>
      </Link>
    </div>
  );
}
