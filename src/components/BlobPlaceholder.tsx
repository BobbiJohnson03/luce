/**
 * Placeholder for the future Spline 3D element.
 *
 * The reference site has a glossy white blob at its center. Since Luce is a
 * dark "light" themed app, this stands in as a soft glowing orb until the real
 * Spline scene is wired in (planned for a later stage — see README, Etap 6).
 *
 * To swap in Spline later: replace the inner markup with
 * <Spline scene="https://prod.spline.design/....../scene.splinecode" />
 * (package: @splinetool/react-spline).
 */
export function BlobPlaceholder({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none relative aspect-square w-full max-w-[520px] ${className}`}
      aria-hidden="true"
      data-spline-slot="hero"
    >
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full bg-accent/10 blur-3xl" />
      {/* Core orb (theme-aware gradient defined in globals.css) */}
      <div className="luce-orb absolute inset-[12%] animate-[luce-fade-up_1s_ease-out] rounded-full" />
      {/* Inner highlight */}
      <div className="luce-orb-highlight absolute inset-[26%] rounded-full blur-md" />
    </div>
  );
}
