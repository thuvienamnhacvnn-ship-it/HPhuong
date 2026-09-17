/**
 * One full-screen frame. On desktop every page is a stack of frames, each
 * exactly one viewport high; scrolling snaps and stops on every frame.
 * Content that can grow (long lists, legal text) scrolls inside its panel,
 * never the frame itself.
 */
export function Frame({
  children,
  className = "",
  label,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
  id?: string;
}) {
  return (
    <section className={`frame ${className}`} aria-label={label} id={id}>
      {children}
    </section>
  );
}
