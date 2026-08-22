"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getLanguageOption } from "@/lib/languages/catalog";
import { CEFR_LEVELS, type CefrLevel } from "@/lib/languages/types";

export type LanguageProfileActionResult =
  | { ok: true; profileId: string }
  | { ok: false; error: string };

type ProfileSettings = {
  translation_language_code: string;
  translation_language_name: string;
  current_cefr: CefrLevel | null;
  target_cefr: CefrLevel | null;
  daily_goal_minutes: number | null;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

function readCefr(value: FormDataEntryValue | null): CefrLevel | null | false {
  const level = String(value ?? "").trim().toUpperCase();
  if (!level) return null;
  return CEFR_LEVELS.includes(level as CefrLevel)
    ? (level as CefrLevel)
    : false;
}

function readSettings(
  formData: FormData,
): { ok: true; data: ProfileSettings } | { ok: false; error: string } {
  const translationLanguage = getLanguageOption(
    String(formData.get("translation_language_code") ?? ""),
  );
  if (!translationLanguage) {
    return { ok: false, error: "Choose a primary translation language." };
  }

  const currentCefr = readCefr(formData.get("current_cefr"));
  const targetCefr = readCefr(formData.get("target_cefr"));
  if (currentCefr === false || targetCefr === false) {
    return { ok: false, error: "Choose a valid CEFR level." };
  }

  const dailyGoalRaw = String(formData.get("daily_goal_minutes") ?? "").trim();
  let dailyGoal: number | null = null;
  if (dailyGoalRaw) {
    if (!/^\d+$/.test(dailyGoalRaw)) {
      return { ok: false, error: "Daily goal must be a whole number of minutes." };
    }
    dailyGoal = Number(dailyGoalRaw);
    if (dailyGoal < 1 || dailyGoal > 1440) {
      return { ok: false, error: "Daily goal must be between 1 and 1440 minutes." };
    }
  }

  return {
    ok: true,
    data: {
      translation_language_code: translationLanguage.code,
      translation_language_name: translationLanguage.name,
      current_cefr: currentCefr,
      target_cefr: targetCefr,
      daily_goal_minutes: dailyGoal,
    },
  };
}

function failed(error: unknown): LanguageProfileActionResult {
  console.error("Language profile mutation failed:", error);
  return { ok: false, error: "The profile could not be saved. Please try again." };
}

export async function createLanguageProfile(
  formData: FormData,
): Promise<LanguageProfileActionResult> {
  try {
    const language = getLanguageOption(
      String(formData.get("language_code") ?? ""),
    );
    if (!language) return { ok: false, error: "Choose a language to learn." };

    const settings = readSettings(formData);
    if (!settings.ok) return settings;

    const { supabase, user } = await requireUser();
    const { data: lastProfile, error: positionError } = await supabase
      .from("language_profiles")
      .select("position")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (positionError) throw positionError;

    const { data, error } = await supabase
      .from("language_profiles")
      .insert({
        user_id: user.id,
        language_code: language.code,
        language_name: language.name,
        ...settings.data,
        position: (lastProfile?.position ?? -1) + 1,
      })
      .select("id")
      .single();

    if (error?.code === "23505") {
      return {
        ok: false,
        error: `You already have an active ${language.name} profile.`,
      };
    }
    if (error) throw error;

    revalidatePath("/languages");
    return { ok: true, profileId: data.id };
  } catch (error) {
    return failed(error);
  }
}

export async function updateLanguageProfile(
  profileId: string,
  formData: FormData,
): Promise<LanguageProfileActionResult> {
  try {
    const settings = readSettings(formData);
    if (!settings.ok) return settings;

    const { supabase, user } = await requireUser();
    const { data, error } = await supabase
      .from("language_profiles")
      .update(settings.data)
      .eq("id", profileId)
      .eq("user_id", user.id)
      .is("archived_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, error: "This language profile is unavailable." };

    revalidatePath("/languages");
    revalidatePath(`/languages/${profileId}`);
    return { ok: true, profileId };
  } catch (error) {
    return failed(error);
  }
}

export async function archiveLanguageProfile(
  profileId: string,
): Promise<LanguageProfileActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase
      .from("language_profiles")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", profileId)
      .eq("user_id", user.id)
      .is("archived_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, error: "This language profile is unavailable." };

    revalidatePath("/languages");
    revalidatePath(`/languages/${profileId}`);
    return { ok: true, profileId };
  } catch (error) {
    return failed(error);
  }
}
