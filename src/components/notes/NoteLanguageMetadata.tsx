"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unlinkLanguageNote } from "@/app/languages/[profileId]/notes/actions";
import { LanguageNoteTopicsDialog } from "@/components/languages/LanguageNoteTopicsDialog";
import { Dialog } from "./Dialog";
import { useToast } from "./Toast";
import type {
  LanguageProfile,
  LanguageTopic,
  NoteLanguageAssociation,
} from "@/lib/languages/types";
import { useI18n } from "@/components/i18n/I18nProvider";
import { getLanguageDisplayName } from "@/lib/languages/catalog";

type TopicTarget = {
  profile: LanguageProfile;
  association?: NoteLanguageAssociation;
};

export function NoteLanguageMetadata({
  noteId,
  associations,
  profiles,
  topics,
}: {
  noteId: string;
  associations: NoteLanguageAssociation[];
  profiles: LanguageProfile[];
  topics: LanguageTopic[];
}) {
  const router = useRouter();
  const toast = useToast();
  const { locale, t } = useI18n();
  const [managing, setManaging] = useState(false);
  const [topicTarget, setTopicTarget] = useState<TopicTarget | null>(null);
  const [unlinkTarget, setUnlinkTarget] =
    useState<NoteLanguageAssociation | null>(null);
  const [pending, startTransition] = useTransition();

  function requestTopics(target: TopicTarget) {
    setManaging(false);
    setTopicTarget(target);
  }

  function requestUnlink(association: NoteLanguageAssociation) {
    setManaging(false);
    setUnlinkTarget(association);
  }

  function unlink() {
    if (!unlinkTarget) return;
    startTransition(async () => {
      const result = await unlinkLanguageNote(
        unlinkTarget.language_profile_id,
        unlinkTarget.link_id,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("notes.unlinkedToast", { language: unlinkTarget.language_name }));
      setUnlinkTarget(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="tracking-[0.14em]">{t("notes.languagesLabel")}</span>
        {associations.map((association) => {
          const topicNames = topics
            .filter(
              (topic) =>
                topic.language_profile_id === association.language_profile_id &&
                association.topic_ids.includes(topic.id),
            )
            .map((topic) => topic.name);
          return (
            <span
              key={association.link_id}
              className="rounded-full border border-border px-2.5 py-1 text-muted-strong"
            >
              {association.language_name}
              {topicNames.length > 0 ? ` · ${topicNames.join(", ")}` : ""}
            </span>
          );
        })}
        <button
          type="button"
          onClick={() => setManaging(true)}
          className="rounded-full px-2.5 py-1 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          {associations.length > 0
            ? t("notes.manageLanguages")
            : t("notes.linkLanguage")}
        </button>
      </div>

      <Dialog
        open={managing}
        onClose={() => setManaging(false)}
        title={t("notes.languagesTitle")}
        description={t("notes.languagesDescription")}
        panelClassName="max-w-xl"
      >
        {profiles.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted">
            {t("notes.createProfileFirst")}
          </p>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border">
            {profiles.map((profile) => {
              const association = associations.find(
                (item) => item.language_profile_id === profile.id,
              );
              return (
                <div
                  key={profile.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">
                      {getLanguageDisplayName(profile.language_code, locale)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {association
                        ? association.profile_archived_at
                          ? t("notes.linkedArchived")
                          : t(
                              association.topic_ids.length === 1
                                ? "notes.topicCountOne"
                                : "notes.topicCountOther",
                              { count: association.topic_ids.length },
                            )
                        : t("notes.notLinked")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {association ? (
                      <>
                        {!association.profile_archived_at && (
                          <button
                            type="button"
                            onClick={() =>
                              requestTopics({ profile, association })
                            }
                            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-strong transition-colors hover:border-accent hover:text-foreground"
                          >
                            {t("notes.editTopics")}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => requestUnlink(association)}
                          className="rounded-full px-3 py-1.5 text-xs text-danger transition-colors hover:bg-danger/10"
                        >
                          {t("notes.unlink")}
                        </button>
                      </>
                    ) : (
                      !profile.archived_at && (
                        <button
                          type="button"
                          onClick={() => requestTopics({ profile })}
                          className="rounded-full border border-border-strong px-4 py-1.5 text-xs text-foreground transition-colors hover:border-accent hover:text-accent"
                        >
                          {t("notes.link")}
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Dialog>

      {topicTarget && (
        <LanguageNoteTopicsDialog
          open
          onClose={() => setTopicTarget(null)}
          profileId={topicTarget.profile.id}
          profileName={getLanguageDisplayName(
            topicTarget.profile.language_code,
            locale,
          )}
          noteId={noteId}
          linkId={topicTarget.association?.link_id}
          topics={topics.filter(
            (topic) => topic.language_profile_id === topicTarget.profile.id,
          )}
          selectedTopicIds={topicTarget.association?.topic_ids ?? []}
        />
      )}

      <Dialog
        open={Boolean(unlinkTarget)}
        onClose={() => {
          if (!pending) setUnlinkTarget(null);
        }}
        title={t("notes.unlinkTitle", {
          language: unlinkTarget?.language_name ?? "",
        })}
        description={t("notes.unlinkDescription")}
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setUnlinkTarget(null)}
            disabled={pending}
            className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            {t("notes.keepLinked")}
          </button>
          <button
            type="button"
            onClick={unlink}
            disabled={pending}
            className="rounded-full border border-danger/40 px-4 py-2 text-sm text-danger transition-colors hover:border-danger hover:bg-danger/10 disabled:opacity-50"
          >
            {pending ? t("notes.unlinking") : t("notes.unlink")}
          </button>
        </div>
      </Dialog>
    </>
  );
}
