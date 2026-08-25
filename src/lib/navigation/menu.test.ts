import { describe, expect, it } from "vitest";
import {
  getActiveMenuIndex,
  getActiveMenuSection,
  getMenuItemPresentation,
  moveMenuSelection,
  type MenuItem,
} from "./menu";

const items: MenuItem[] = [
  { id: "overview", label: "Overview", href: "/dashboard" },
  { id: "calendar", label: "Calendar", href: "/dashboard#calendar" },
  { id: "tasks", label: "Tasks", href: "/dashboard#todos" },
  { id: "notes", label: "Notes", href: "/notes" },
  { id: "languages", label: "Languages", href: "/languages" },
];

describe("global menu", () => {
  it.each([
    ["/dashboard", "", "overview"],
    ["/calendar", "", "calendar"],
    ["/tasks", "", "tasks"],
    ["/dashboard", "#calendar", "calendar"],
    ["/dashboard", "#todos", "tasks"],
    ["/notes", "", "notes"],
    ["/notes", "#calendar", "notes"],
    ["/notes/11111111-1111-4111-8111-111111111111", "", "notes"],
    ["/languages", "", "languages"],
    ["/languages/profile-id/topics/topic-id", "", "languages"],
  ] as const)("maps %s%s to %s", (pathname, hash, expected) => {
    expect(getActiveMenuSection(pathname, hash)).toBe(expected);
  });

  it("finds the matching item index", () => {
    expect(getActiveMenuIndex(items, "/notes/note-id")).toBe(3);
    expect(getActiveMenuIndex(items, "/languages/profile-id")).toBe(4);
  });

  it("moves one item at a time without wrapping past an edge", () => {
    expect(moveMenuSelection(2, -1, items.length)).toBe(1);
    expect(moveMenuSelection(2, 1, items.length)).toBe(3);
    expect(moveMenuSelection(0, -1, items.length)).toBe(0);
    expect(moveMenuSelection(4, 1, items.length)).toBe(4);
  });

  it("recedes items according to distance from the center", () => {
    expect(getMenuItemPresentation(0)).toEqual({ scale: 1, opacity: 1 });
    expect(getMenuItemPresentation(-1)).toEqual({
      scale: 0.92,
      opacity: 0.68,
    });
    expect(getMenuItemPresentation(2)).toEqual({
      scale: 0.85,
      opacity: 0.42,
    });
    expect(getMenuItemPresentation(4)).toEqual({
      scale: 0.79,
      opacity: 0.18,
    });
  });
});
