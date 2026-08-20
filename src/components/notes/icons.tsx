/**
 * Small, stroke-based icons drawn to match Luce's existing hand-rolled SVGs
 * (see Logo / MenuOverlay): thin 1.2–1.6 strokes, rounded caps, currentColor.
 * Kept local to the notes module so we don't pull in an icon dependency.
 */
type IconProps = {
  className?: string;
  size?: number;
};

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

export function ChevronIcon({ className, size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}

export function FolderIcon({ className, size = 15 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.2c.4 0 .8.16 1.06.44L8 4.5h4.5A1.5 1.5 0 0 1 14 6v5.5A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5z" />
    </svg>
  );
}

export function DocIcon({ className, size = 15 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M4 2.5h5L12 5.5v8a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5z" />
      <path d="M8.5 2.6V5.5H12" />
    </svg>
  );
}

export function StarIcon({
  className,
  size = 14,
  filled = false,
}: IconProps & { filled?: boolean }) {
  return (
    <svg
      {...base(size)}
      className={className}
      fill={filled ? "currentColor" : "none"}
      aria-hidden="true"
    >
      <path d="M8 2.2l1.7 3.5 3.8.5-2.8 2.7.7 3.8L8 11.6 4.6 13l.7-3.8L2.5 6.5l3.8-.5z" />
    </svg>
  );
}

export function PlusIcon({ className, size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

export function SearchIcon({ className, size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <circle cx="7" cy="7" r="3.8" />
      <path d="M10 10l3 3" />
    </svg>
  );
}

export function MoreIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <circle cx="4" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TrashIcon({ className, size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M3 4.5h10M6.5 4.5V3.2c0-.4.3-.7.7-.7h1.6c.4 0 .7.3.7.7v1.3M4.5 4.5l.5 8c0 .4.3.7.7.7h4.6c.4 0 .7-.3.7-.7l.5-8" />
    </svg>
  );
}

export function CloseIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function EditIcon({ className, size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M11 2.8l2.2 2.2M9.5 4.3l2.2 2.2L5.8 12H3.6v-2.2z" />
    </svg>
  );
}

export function MoveIcon({ className, size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M8 2.5v11M2.5 8h11M8 2.5L6 4.5M8 2.5l2 2M8 13.5l-2-2M8 13.5l2-2M2.5 8l2-2M2.5 8l2 2M13.5 8l-2-2M13.5 8l-2 2" />
    </svg>
  );
}
