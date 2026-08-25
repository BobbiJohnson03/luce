export type MenuSection =
  | "overview"
  | "calendar"
  | "tasks"
  | "notes"
  | "languages";

export type MenuItem = {
  id: MenuSection;
  label: string;
  href: string;
};

export function getActiveMenuSection(
  pathname: string,
  hash = "",
): MenuSection {
  if (pathname === "/calendar") return "calendar";
  if (pathname === "/tasks") return "tasks";
  if (pathname === "/dashboard") {
    if (hash === "#calendar") return "calendar";
    if (hash === "#todos") return "tasks";
    return "overview";
  }
  if (pathname === "/notes" || pathname.startsWith("/notes/")) return "notes";
  if (pathname === "/languages" || pathname.startsWith("/languages/")) {
    return "languages";
  }
  return "overview";
}

export function getActiveMenuIndex(
  items: MenuItem[],
  pathname: string,
  hash = "",
) {
  const section = getActiveMenuSection(pathname, hash);
  const index = items.findIndex((item) => item.id === section);
  return index >= 0 ? index : 0;
}

export function moveMenuSelection(
  currentIndex: number,
  direction: -1 | 1,
  itemCount: number,
) {
  if (itemCount <= 0) return 0;
  return Math.min(itemCount - 1, Math.max(0, currentIndex + direction));
}

export function getMenuItemPresentation(distance: number) {
  const absoluteDistance = Math.abs(distance);
  if (absoluteDistance === 0) return { scale: 1, opacity: 1 };
  if (absoluteDistance === 1) return { scale: 0.92, opacity: 0.68 };
  if (absoluteDistance === 2) return { scale: 0.85, opacity: 0.42 };
  return { scale: 0.79, opacity: 0.18 };
}
