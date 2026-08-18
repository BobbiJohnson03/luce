/**
 * Whether Supabase env vars are present. Lets the app degrade gracefully
 * (show a setup notice) instead of crashing before keys are added.
 */
export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
