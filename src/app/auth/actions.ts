"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AuthState = { error?: string; notice?: string } | null;

const NOT_CONFIGURED = {
  error: "Supabase nie jest jeszcze skonfigurowany (uzupełnij .env.local).",
};

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { error: "Podaj e-mail i hasło." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Nieprawidłowy e-mail lub hasło." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function register(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { error: "Podaj e-mail i hasło." };
  }
  if (password.length < 6) {
    return { error: "Hasło musi mieć co najmniej 6 znaków." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is enabled in Supabase, there's no session yet.
  if (!data.session) {
    return {
      notice: "Sprawdź skrzynkę — wysłaliśmy link potwierdzający rejestrację.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
