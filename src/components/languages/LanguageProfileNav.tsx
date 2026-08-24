"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";

const TABS = [
  { label: "languages.navOverview", segment: "" },
  { label: "languages.navVocabulary", segment: "/vocabulary" },
  { label: "languages.navTopics", segment: "/topics" },
  { label: "languages.navNotes", segment: "/notes" },
  { label: "languages.navPractice", segment: "/practice" },
] as const;

export function LanguageProfileNav({ profileId }: { profileId: string }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const base = `/languages/${profileId}`;

  return (
    <nav
      aria-label={t("languages.profileAria")}
      className="flex min-w-0 gap-5 sm:gap-7"
    >
      {TABS.map((tab) => {
        const href = `${base}${tab.segment}`;
        const active = tab.segment
          ? pathname.startsWith(href)
          : pathname === base || pathname === `${base}/`;

        return (
          <Link
            key={tab.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={[
              "border-b px-1 pb-3 text-sm transition-colors",
              active
                ? "border-accent text-foreground"
                : "border-transparent text-muted hover:text-foreground",
            ].join(" ")}
          >
            {t(tab.label)}
          </Link>
        );
      })}
    </nav>
  );
}
