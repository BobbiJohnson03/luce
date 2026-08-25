"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { BlockNoteView } from "@blocknote/mantine";
import {
  EmbedTab,
  FilePanelController,
  type FilePanelProps,
  UploadTab,
  useBlockNoteEditor,
  useComponentsContext,
  useCreateBlockNote,
  useDictionary,
} from "@blocknote/react";
import type { PartialBlock } from "@blocknote/core";
import { en as blockNoteEn, pl as blockNotePl } from "@blocknote/core/locales";
import {
  type CSSProperties,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { NoteContent } from "@/lib/notes/types";
import { createClient } from "@/lib/supabase/client";
import {
  buildNoteAssetPath,
  NOTE_ASSET_BUCKET,
  NOTE_ASSET_SIGNED_URL_TTL_SECONDS,
  NOTE_IMAGE_ERROR_KEYS,
  parseNoteAssetReference,
  toNoteAssetReference,
  validateNoteImage,
} from "@/lib/notes/assets";
import { useToast } from "./Toast";

const SIGNED_URL_REFRESH_MARGIN_MS = 5 * 60 * 1000;

/** Keep upload controls image-only while preserving URL embedding for all of
 * BlockNote's existing file blocks. This is the native FilePanel composition,
 * with no DOM interception around paste, drop, or the device picker. */
function LuceFilePanel({ blockId }: FilePanelProps) {
  const Components = useComponentsContext()!;
  const editor = useBlockNoteEditor();
  const dictionary = useDictionary();
  const [loading, setLoading] = useState(false);
  const block = editor.getBlock(blockId);

  const tabs = [
    ...(block?.type === "image"
      ? [
          {
            name: dictionary.file_panel.upload.title,
            tabPanel: <UploadTab blockId={blockId} setLoading={setLoading} />,
          },
        ]
      : []),
    {
      name: dictionary.file_panel.embed.title,
      tabPanel: <EmbedTab blockId={blockId} />,
    },
  ];
  const [previousBlockId, setPreviousBlockId] = useState(blockId);
  const [openTab, setOpenTab] = useState(tabs[0].name);
  if (previousBlockId !== blockId) {
    setPreviousBlockId(blockId);
    setOpenTab(tabs[0].name);
  }

  return (
    <Components.FilePanel.Root
      className="bn-panel"
      defaultOpenTab={tabs[0].name}
      openTab={openTab}
      setOpenTab={setOpenTab}
      tabs={tabs}
      loading={loading}
    />
  );
}

/**
 * Thin BlockNote wrapper. Uses the default schema, which natively provides every
 * MVP block (paragraph, headings, bullet/numbered/check lists, quote, divider,
 * code block and table) plus the "/" slash menu and drag handles.
 *
 * The editor is uncontrolled: it is initialised once from `initialContent` and
 * reports changes upward via `onChange`. This is intentional so React re-renders
 * (e.g. sidebar revalidations) never reset the user's in-progress editing.
 */
export function NoteEditor({
  noteId,
  initialContent,
  onChange,
}: {
  noteId: string;
  initialContent: NoteContent;
  onChange: (blocks: NoteContent) => void;
}) {
  const { resolvedTheme } = useTheme();
  const { locale, t } = useI18n();
  const toast = useToast();
  const supabase = useMemo(() => createClient(), []);
  const pendingUploads = useRef(new Set<string>());
  const signedUrls = useRef(
    new Map<string, { url: string; refreshAt: number }>(),
  );
  const reportedResolutionFailures = useRef(new Set<string>());

  const dictionary = useMemo(() => {
    const base = locale === "pl" ? blockNotePl : blockNoteEn;
    return {
      ...base,
      file_panel: {
        upload: {
          ...base.file_panel.upload,
          title: t("notes.imageUploadTitle"),
          file_placeholder: {
            ...base.file_panel.upload.file_placeholder,
            image: t("notes.imageUpload"),
          },
          upload_error: t("notes.imageUploadFailed"),
        },
        embed: {
          ...base.file_panel.embed,
          title: t("notes.imageEmbedTitle"),
          embed_button: {
            ...base.file_panel.embed.embed_button,
            image: t("notes.imageEmbed"),
          },
          url_placeholder: t("notes.imageUrlPlaceholder"),
        },
      },
    };
  }, [locale, t]);

  const uploadFile = useCallback(
    async (file: File) => {
      const validation = validateNoteImage(file);
      if (!validation.ok) {
        toast.error(t(NOTE_IMAGE_ERROR_KEYS[validation.error]));
        throw new Error(validation.error);
      }

      const fingerprint = [
        file.name,
        file.type,
        file.size,
        file.lastModified,
      ].join(":");
      if (pendingUploads.current.has(fingerprint)) {
        toast.error(t("notes.imageUploadInProgress"));
        throw new Error("duplicate_upload");
      }
      pendingUploads.current.add(fingerprint);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) throw authError ?? new Error("Unauthenticated");

        const objectPath = buildNoteAssetPath({
          userId: user.id,
          noteId,
          assetId: crypto.randomUUID(),
          mimeType: validation.mimeType,
        });
        const { error } = await supabase.storage
          .from(NOTE_ASSET_BUCKET)
          .upload(objectPath, file, {
            cacheControl: "3600",
            contentType: validation.mimeType,
            upsert: false,
          });
        if (error) throw error;

        return toNoteAssetReference(objectPath);
      } catch (error) {
        console.error("Note image upload failed:", error);
        toast.error(t("notes.imageUploadFailed"));
        throw error;
      } finally {
        pendingUploads.current.delete(fingerprint);
      }
    },
    [noteId, supabase, t, toast],
  );

  const resolveFileUrl = useCallback(
    async (reference: string) => {
      const objectPath = parseNoteAssetReference(reference);
      if (!objectPath) return reference;

      const cached = signedUrls.current.get(objectPath);
      if (cached && cached.refreshAt > Date.now()) return cached.url;

      const { data, error } = await supabase.storage
        .from(NOTE_ASSET_BUCKET)
        .createSignedUrl(objectPath, NOTE_ASSET_SIGNED_URL_TTL_SECONDS);
      if (error || !data?.signedUrl) {
        if (!reportedResolutionFailures.current.has(objectPath)) {
          reportedResolutionFailures.current.add(objectPath);
          toast.error(t("notes.imageResolveFailed"));
        }
        throw error ?? new Error("Signed URL unavailable");
      }

      reportedResolutionFailures.current.delete(objectPath);
      signedUrls.current.set(objectPath, {
        url: data.signedUrl,
        refreshAt:
          Date.now() +
          NOTE_ASSET_SIGNED_URL_TTL_SECONDS * 1000 -
          SIGNED_URL_REFRESH_MARGIN_MS,
      });
      return data.signedUrl;
    },
    [supabase, t, toast],
  );

  const editor = useCreateBlockNote({
    // BlockNote rejects an empty array; use undefined to start with a blank doc.
    initialContent:
      initialContent && initialContent.length > 0
        ? (initialContent as PartialBlock[])
        : undefined,
    dictionary,
    uploadFile,
    resolveFileUrl,
  });

  return (
    <div
      className="min-w-0 max-w-full"
      style={
        {
          "--luce-image-uploading-label": JSON.stringify(
            t("notes.imageUploading"),
          ),
        } as CSSProperties
      }
    >
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme}
        onChange={() => onChange(editor.document as NoteContent)}
        className="luce-blocknote"
        filePanel={false}
      >
        <FilePanelController filePanel={LuceFilePanel} />
      </BlockNoteView>
    </div>
  );
}
