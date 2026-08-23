import { ReviewSetupClient } from "@/components/languages/ReviewSetupClient";
import { loadLanguageProfile } from "@/lib/languages/server";
import {
  countDueReviewCards,
  loadActiveReviewSession,
} from "@/lib/languages/srs/review-server";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function ReviewSetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ profileId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profileId } = await params;
  const { supabase, userId, profile } = await loadLanguageProfile(profileId);
  if (!profile) return null;

  const source = firstParam((await searchParams).from) || "overview";

  const [dueCount, activeSession] = await Promise.all([
    countDueReviewCards(supabase, userId, profileId),
    loadActiveReviewSession(supabase, userId, profileId),
  ]);

  return (
    <ReviewSetupClient
      profileId={profileId}
      dueCount={dueCount}
      hasActiveSession={Boolean(activeSession)}
      launchSource={source.slice(0, 60)}
    />
  );
}
