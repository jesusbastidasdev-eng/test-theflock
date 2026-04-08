"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { MeResponse } from "@/lib/types";

export function AppHeader() {
  const pathname = usePathname();
  const [me, setMe] = useState<MeResponse | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    apiFetch<MeResponse>("/api/auth/me")
      .then((u) => {
        if (!cancelled) setMe(u);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function logout() {
    await apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST", body: "{}" });
    setMe(null);
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4 sm:px-6 md:max-w-2xl lg:max-w-3xl">
        <Link href="/" className="text-lg font-bold tracking-tight text-white">
          Chirp
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)] sm:gap-4">
          <Link href="/search" className="hover:text-[var(--accent)]">
            Search
          </Link>
          {me?.user ? (
            <>
              <Link href={`/profile/${me.user.username}`} className="hover:text-[var(--accent)]">
                @{me.user.username}
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-full border border-[var(--border)] px-3 py-1 text-white hover:bg-white/5"
              >
                Log out
              </button>
            </>
          ) : me === null ? (
            <>
              <Link href="/login" className="hover:text-[var(--accent)]">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-[var(--accent)] px-3 py-1 font-medium text-white hover:opacity-90"
              >
                Sign up
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
