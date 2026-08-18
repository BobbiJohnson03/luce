import Link from "next/link";

/**
 * Minimalist circular monogram, echoing the small mark in the reference site.
 * "L" for Luce, drawn as a light stroke inside a thin circle.
 */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      aria-label="Luce — home"
      className="group inline-flex items-center gap-3"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong transition-colors group-hover:border-accent">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M4 2.5V11.5H10"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            className="text-muted-strong transition-colors group-hover:text-accent"
          />
        </svg>
      </span>
      <span className="text-sm tracking-[0.2em] text-muted-strong transition-colors group-hover:text-foreground">
        LUCE
      </span>
    </Link>
  );
}
