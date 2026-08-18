"use client";

import { useOptimistic, useRef, useTransition } from "react";
import type { Todo } from "@/lib/types";
import { addTodo, toggleTodo, deleteTodo } from "@/app/dashboard/actions";
import { useCheckSound } from "@/lib/useCheckSound";

export function TodoList({ todos }: { todos: Todo[] }) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    todos,
    (state, { id, done }: { id: string; done: boolean }) =>
      state.map((t) => (t.id === id ? { ...t, done } : t)),
  );
  const playCheck = useCheckSound();
  const formRef = useRef<HTMLFormElement>(null);

  function onToggle(todo: Todo) {
    const next = !todo.done;
    if (next) playCheck();
    startTransition(async () => {
      setOptimistic({ id: todo.id, done: next });
      await toggleTodo(todo.id, next);
    });
  }

  const remaining = optimistic.filter((t) => !t.done).length;

  return (
    <div>
      {/* Add todo */}
      <form
        ref={formRef}
        action={async (formData) => {
          await addTodo(formData);
          formRef.current?.reset();
        }}
        className="flex gap-2"
      >
        <input
          name="title"
          required
          placeholder="Nowe zadanie…"
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-full border border-border-strong px-4 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          Dodaj
        </button>
      </form>

      {/* List */}
      <ul className="mt-5 flex flex-col gap-1">
        {optimistic.length === 0 && (
          <li className="py-2 text-sm text-muted">Brak zadań. Cisza i spokój.</li>
        )}
        {optimistic.map((todo) => (
          <li
            key={todo.id}
            className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2"
          >
            <button
              onClick={() => onToggle(todo)}
              role="checkbox"
              aria-checked={todo.done}
              aria-label={todo.title}
              className={[
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                todo.done
                  ? "border-accent bg-accent text-background"
                  : "border-border-strong text-transparent hover:border-accent",
              ].join(" ")}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2.5 6.5l2.5 2.5 4.5-5.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <span
              className={[
                "flex-1 text-sm transition-colors",
                todo.done ? "text-muted line-through" : "text-foreground",
              ].join(" ")}
            >
              {todo.title}
            </span>

            <form action={deleteTodo.bind(null, todo.id)}>
              <button
                type="submit"
                aria-label="Usuń zadanie"
                className="text-muted opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
              >
                ✕
              </button>
            </form>
          </li>
        ))}
      </ul>

      {optimistic.length > 0 && (
        <p className="mt-4 text-xs tracking-wide text-muted">
          {remaining} {remaining === 1 ? "zadanie" : "zadań"} do zrobienia
        </p>
      )}
    </div>
  );
}
