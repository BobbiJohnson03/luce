"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getI18n } from "@/lib/i18n/server";

export type AuthState = { error?: string; notice?: string } | null;

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { t } = await getI18n();
  if (!isSupabaseConfigured()) return { error: t("auth.notConfigured") };
  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { error: t("auth.credentialsRequired") };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: t("auth.invalidCredentials") };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function register(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { t } = await getI18n();
  if (!isSupabaseConfigured()) return { error: t("auth.notConfigured") };
  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { error: t("auth.credentialsRequired") };
  }
  if (password.length < 6) {
    return { error: t("auth.passwordTooShort") };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    console.error("Registration failed:", error);
    return { error: t("auth.registrationFailed") };
  }

  // If email confirmation is enabled in Supabase, there's no session yet.
  if (!data.session) {
    return {
      notice: t("auth.confirmEmail"),
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
