import { useEffect, useState, type ReactNode } from "react";
import { ensureSeeded } from "@/lib/repo";

/**
 * Everything that touches IndexedDB must render after hydration only.
 * Also performs the one-time first-run seed.
 */
export function DataGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureSeeded()
      .then(() => !cancelled && setReady(true))
      .catch((e: unknown) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="glass rounded-2xl p-6 text-sm text-destructive">
        Local database unavailable: {error}
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass h-28 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  return <>{children}</>;
}
