import type { TranslationKey } from "@/lib/i18n/translations";

export const NOTE_ASSET_BUCKET = "note-assets";
export const NOTE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const NOTE_ASSET_SIGNED_URL_TTL_SECONDS = 60 * 60;

export const NOTE_IMAGE_MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

export type NoteImageMimeType = keyof typeof NOTE_IMAGE_MIME_EXTENSIONS;
export type NoteImageValidationError = "unsupported_type" | "too_large";

export const NOTE_IMAGE_ERROR_KEYS: Record<
  NoteImageValidationError,
  TranslationKey
> = {
  unsupported_type: "notes.imageUnsupported",
  too_large: "notes.imageTooLarge",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ASSET_REFERENCE_PATTERN =
  /^note-assets\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.(jpg|jpeg|png|webp|gif)$/i;

export function validateNoteImage(file: { type: string; size: number }):
  | { ok: true; mimeType: NoteImageMimeType; extension: string }
  | { ok: false; error: NoteImageValidationError } {
  if (!(file.type in NOTE_IMAGE_MIME_EXTENSIONS)) {
    return { ok: false, error: "unsupported_type" };
  }
  if (file.size > NOTE_IMAGE_MAX_BYTES) {
    return { ok: false, error: "too_large" };
  }

  const mimeType = file.type as NoteImageMimeType;
  return {
    ok: true,
    mimeType,
    extension: NOTE_IMAGE_MIME_EXTENSIONS[mimeType],
  };
}

export function buildNoteAssetPath({
  userId,
  noteId,
  assetId,
  mimeType,
}: {
  userId: string;
  noteId: string;
  assetId: string;
  mimeType: NoteImageMimeType;
}) {
  if (
    !UUID_PATTERN.test(userId) ||
    !UUID_PATTERN.test(noteId) ||
    !UUID_PATTERN.test(assetId)
  ) {
    throw new Error("Invalid Note asset identity");
  }

  return `${userId}/${noteId}/${assetId}.${NOTE_IMAGE_MIME_EXTENSIONS[mimeType]}`;
}

export function toNoteAssetReference(objectPath: string) {
  return `${NOTE_ASSET_BUCKET}/${objectPath}`;
}

export function parseNoteAssetReference(reference: string) {
  const match = ASSET_REFERENCE_PATTERN.exec(reference);
  if (!match) return null;

  const [, userId, noteId, assetId] = match;
  if (
    !UUID_PATTERN.test(userId) ||
    !UUID_PATTERN.test(noteId) ||
    !UUID_PATTERN.test(assetId)
  ) {
    return null;
  }
  return reference.slice(`${NOTE_ASSET_BUCKET}/`.length);
}
