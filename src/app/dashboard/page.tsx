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

export default function DashboardPage() {
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
          <p className="text-sm text-muted">
            Wkrótce — zapisywanie ważnych wydarzeń i notatek per dzień (Etap 4).
          </p>
        </Panel>

        <Panel id="todos" eyebrow="TO-DO" title="Zadania">
          <p className="text-sm text-muted">
            Wkrótce — listy zadań z checkboxami i dźwiękiem przy odhaczaniu
            (Etap 5).
          </p>
        </Panel>
      </div>
    </div>
  );
}
