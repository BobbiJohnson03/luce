"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Overview", segment: "" },
  { label: "Vocabulary", segment: "/vocabulary" },
  { label: "Topics", segment: "/topics" },
] as const;

export function LanguageProfileNav({ profileId }: { profileId: string }) {
  const pathname = usePathname();
  const base = `/languages/${profileId}`;

  return (
    <nav aria-label="Language profile" className="flex min-w-0 gap-5 sm:gap-7">
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
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
