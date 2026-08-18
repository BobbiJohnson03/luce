"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

// ── Events (kalendarz) ──────────────────────────────────────────────────────
export async function addEvent(formData: FormData) {
  const event_date = String(formData.get("event_date") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!event_date || !title) return;

  const { supabase, user } = await requireUser();
  await supabase
    .from("events")
    .insert({ user_id: user.id, event_date, title, note: note || null });

  revalidatePath("/dashboard");
}

export async function deleteEvent(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("events").delete().eq("id", id);
  revalidatePath("/dashboard");
}

// ── Todos (zadania) ─────────────────────────────────────────────────────────
export async function addTodo(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const { supabase, user } = await requireUser();
  await supabase.from("todos").insert({ user_id: user.id, title });
  revalidatePath("/dashboard");
}

export async function toggleTodo(id: string, done: boolean) {
  const { supabase } = await requireUser();
  await supabase.from("todos").update({ done }).eq("id", id);
  revalidatePath("/dashboard");
}

export async function deleteTodo(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("todos").delete().eq("id", id);
  revalidatePath("/dashboard");
}
