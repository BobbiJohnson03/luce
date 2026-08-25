"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { LocaleSelector } from "@/components/i18n/LocaleSelector";
import {
  useTheme,
  type ThemePreference,
} from "@/components/theme/ThemeProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import {
  getActiveMenuIndex,
  getMenuItemPresentation,
  moveMenuSelection,
  type MenuItem,
} from "@/lib/navigation/menu";

const ITEM_SPACING_REM = 4;
const WHEEL_THRESHOLD = 42;
const WHEEL_COOLDOWN_MS = 180;
const SWIPE_THRESHOLD_PX = 38;

function AppearanceControl() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const options: { value: ThemePreference; label: string }[] = [
    { value: "system", label: t("appearance.system") },
    { value: "light", label: t("appearance.light") },
    { value: "dark", label: t("appearance.dark") },
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-xs tracking-[0.25em] text-muted">
        {t("appearance.label")}
      </span>
      <div
        role="radiogroup"
        aria-label={t("appearance.aria")}
        className="flex items-center gap-1 rounded-full border border-border p-1"
      >
        {options.map((option) => {
          const active = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(option.value)}
              className={[
                "rounded-full px-4 py-1.5 text-sm transition-colors",
                active
                  ? "bg-surface-2 text-foreground"
                  : "text-muted hover:text-foreground",
              ].join(" ")}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LanguageControl() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-xs uppercase tracking-[0.25em] text-muted">
        {t("locale.label")}
      </span>
      <LocaleSelector variant="menu" />
    </div>
  );
}

/** Full-screen global navigation with a restrained, typographic wheel. */
export function MenuOverlay({ items }: { items: MenuItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeIndex, setActiveIndex] = useState(() =>
    getActiveMenuIndex(items, pathname),
  );
  const { t } = useI18n();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const wheelDelta = useRef(0);
  const lastWheelMove = useRef(0);
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);

  const moveSelection = useCallback(
    (direction: -1 | 1) => {
      setSelectedIndex((current) =>
        moveMenuSelection(current, direction, items.length),
      );
    },
    [items.length],
  );

  function openMenu() {
    const nextActiveIndex = getActiveMenuIndex(
      items,
      pathname,
      window.location.hash,
    );
    setActiveIndex(nextActiveIndex);
    setSelectedIndex(nextActiveIndex);
    setOpen(true);
  }

  function closeMenu({ restoreFocus = true } = {}) {
    setOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() =>
      itemRefs.current[selectedIndex]?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [open, selectedIndex]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleOverlayKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = Array.from(
      overlayRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleNavigationKeyDown(
    event: ReactKeyboardEvent<HTMLElement>,
  ) {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(event.key === "ArrowUp" ? -1 : 1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      itemRefs.current[selectedIndex]?.click();
    }
  }

  function handleWheel(event: ReactWheelEvent<HTMLElement>) {
    event.preventDefault();
    wheelDelta.current += event.deltaY;
    const now = Date.now();
    if (
      Math.abs(wheelDelta.current) < WHEEL_THRESHOLD ||
      now - lastWheelMove.current < WHEEL_COOLDOWN_MS
    ) {
      return;
    }
    moveSelection(wheelDelta.current > 0 ? 1 : -1);
    wheelDelta.current = 0;
    lastWheelMove.current = now;
  }

  function handleTouchStart(event: ReactTouchEvent<HTMLElement>) {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }

  function handleTouchEnd(event: ReactTouchEvent<HTMLElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const elapsed = Date.now() - start.time;
    if (
      elapsed > 700 ||
      Math.abs(deltaY) < SWIPE_THRESHOLD_PX ||
      Math.abs(deltaY) <= Math.abs(deltaX)
    ) {
      return;
    }
    event.preventDefault();
    moveSelection(deltaY < 0 ? 1 : -1);
  }

  return (
    <>
      <button
        ref={menuButtonRef}
        type="button"
        onClick={openMenu}
        aria-label={t("menu.open")}
        aria-expanded={open}
        className="flex flex-col gap-1.5 p-1 text-muted transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        <span className="block h-px w-6 bg-current" />
        <span className="block h-px w-6 bg-current" />
      </button>

      {open && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("menu.navigation")}
          onKeyDown={handleOverlayKeyDown}
          className="fixed inset-0 z-50 flex min-h-0 flex-col overflow-y-auto overscroll-contain bg-background/95 backdrop-blur-sm"
        >
          <div className="flex shrink-0 items-center justify-end px-6 py-5 sm:px-10 sm:py-6">
            <button
              type="button"
              onClick={() => closeMenu()}
              aria-label={t("menu.close")}
              className="p-2 text-muted transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M4 4l14 14M18 4L4 18"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <nav
            aria-label={t("menu.navigation")}
            onKeyDown={handleNavigationKeyDown}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative min-h-56 flex-1 overflow-hidden touch-pan-x sm:min-h-72"
          >
            {items.map((item, index) => {
              const distance = index - selectedIndex;
              const presentation = getMenuItemPresentation(distance);
              const selected = index === selectedIndex;
              return (
                <a
                  key={item.id}
                  ref={(element) => {
                    itemRefs.current[index] = element;
                  }}
                  href={item.href}
                  aria-current={
                    index === activeIndex
                      ? item.id === "calendar" || item.id === "tasks"
                        ? "location"
                        : "page"
                      : undefined
                  }
                  tabIndex={selected ? 0 : -1}
                  onFocus={() => setSelectedIndex(index)}
                  onClick={() => closeMenu({ restoreFocus: false })}
                  className="absolute left-1/2 top-1/2 w-[min(88vw,30rem)] -translate-x-1/2 py-2 text-center text-3xl font-light tracking-tight text-foreground outline-none transition-[transform,opacity,color] duration-200 ease-out focus-visible:underline focus-visible:decoration-accent focus-visible:decoration-1 focus-visible:underline-offset-8 motion-reduce:transition-none sm:text-4xl"
                  style={{
                    opacity: presentation.opacity,
                    transform: `translate(-50%, calc(-50% + ${distance * ITEM_SPACING_REM}rem)) scale(${presentation.scale})`,
                  }}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="flex shrink-0 flex-col items-center justify-center gap-7 border-t border-border/70 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 sm:flex-row sm:gap-12 sm:px-10 sm:pb-10 sm:pt-8">
            <AppearanceControl />
            <span aria-hidden="true" className="hidden h-12 w-px bg-border sm:block" />
            <LanguageControl />
          </div>
        </div>
      )}
    </>
  );
}
