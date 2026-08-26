import { describe, expect, it } from "vitest";
import {
  buildNoteAssetPath,
  NOTE_ASSET_BUCKET,
  NOTE_IMAGE_ERROR_KEYS,
  NOTE_IMAGE_MAX_BYTES,
  parseNoteAssetReference,
  toNoteAssetReference,
  validateNoteImage,
} from "./assets";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const NOTE_ID = "22222222-2222-4222-8222-222222222222";
const ASSET_ID = "33333333-3333-4333-8333-333333333333";

describe("Note image assets", () => {
  it.each([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
    ["image/gif", "gif"],
  ])("accepts %s", (type, extension) => {
    expect(validateNoteImage({ type, size: 1024 })).toEqual({
      ok: true,
      mimeType: type,
      extension,
    });
  });

  it("rejects unsupported image MIME types", () => {
    expect(validateNoteImage({ type: "image/svg+xml", size: 1024 })).toEqual({
      ok: false,
      error: "unsupported_type",
    });
    expect(NOTE_IMAGE_ERROR_KEYS.unsupported_type).toBe(
      "notes.imageUnsupported",
    );
  });

  it("accepts the size limit and rejects larger images", () => {
    expect(
      validateNoteImage({ type: "image/png", size: NOTE_IMAGE_MAX_BYTES }).ok,
    ).toBe(true);
    expect(
      validateNoteImage({
        type: "image/png",
        size: NOTE_IMAGE_MAX_BYTES + 1,
      }),
    ).toEqual({ ok: false, error: "too_large" });
  });

  it("constructs and parses a generated, owner-scoped reference", () => {
    const path = buildNoteAssetPath({
      userId: USER_ID,
      noteId: NOTE_ID,
      assetId: ASSET_ID,
      mimeType: "image/webp",
    });
    const reference = toNoteAssetReference(path);

    expect(path).toBe(`${USER_ID}/${NOTE_ID}/${ASSET_ID}.webp`);
    expect(reference).toBe(`${NOTE_ASSET_BUCKET}/${path}`);
    expect(parseNoteAssetReference(reference)).toBe(path);
  });

  it("rejects unsafe identities and non-Luce references", () => {
    expect(() =>
      buildNoteAssetPath({
        userId: "../another-user",
        noteId: NOTE_ID,
        assetId: ASSET_ID,
        mimeType: "image/png",
      }),
    ).toThrow("Invalid Note asset identity");
    expect(parseNoteAssetReference("https://example.com/image.png")).toBeNull();
    expect(
      parseNoteAssetReference(
        `${NOTE_ASSET_BUCKET}/${USER_ID}/${NOTE_ID}/../../image.png`,
      ),
    ).toBeNull();
  });
});
