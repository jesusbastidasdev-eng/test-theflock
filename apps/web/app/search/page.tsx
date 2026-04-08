"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { UserPublic } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

type SearchResponse = { users: UserPublic[]; nextSkip: number | null };

/** Small page size so infinite scroll is visible with the seeded ~11 users (requirement: ≥10). */
const PAGE_LIMIT = 5;
const DEBOUNCE_MS = 250;

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [nextSkip, setNextSkip] = useState<number | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  /** Scroll root so infinite load only runs after the user scrolls inside this area (not the whole page). */
  const scrollRootRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q]);

  const fetchPage = useCallback(async (skip: number, keyword: string) => {
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_LIMIT));
    params.set("skip", String(skip));
    if (keyword.length >= 1) params.set("q", keyword);
    return apiFetch<SearchResponse>(`/api/users/search?${params.toString()}`);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingInitial(true);
    void fetchPage(0, debouncedQ)
      .then((r) => {
        if (cancelled) return;
        setUsers(r.users);
        setNextSkip(r.nextSkip);
      })
      .catch(() => {
        if (!cancelled) {
          setUsers([]);
          setNextSkip(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingInitial(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, fetchPage]);

  const loadMore = useCallback(() => {
    if (nextSkip === null || loadingMore || loadingInitial) return;
    setLoadingMore(true);
    void fetchPage(nextSkip, debouncedQ)
      .then((r) => {
        setUsers((prev) => {
          const seen = new Set(prev.map((u) => u.id));
          const appended = r.users.filter((u) => !seen.has(u.id));
          return [...prev, ...appended];
        });
        setNextSkip(r.nextSkip);
      })
      .catch(() => undefined)
      .finally(() => setLoadingMore(false));
  }, [nextSkip, loadingMore, loadingInitial, debouncedQ, fetchPage]);

  useEffect(() => {
    const root = scrollRootRef.current;
    const el = sentinelRef.current;
    if (!root || !el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [e] = entries;
        if (e?.isIntersecting) loadMore();
      },
      { root, rootMargin: "80px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, users.length, nextSkip]);

  return (
    <div>
      <h1 className="text-xl font-bold text-white">Search users</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {debouncedQ.length < 1
          ? "Everyone on Chirp — scroll to load more."
          : "Filter by username or email — scroll for more matches."}
      </p>
      <input
        type="search"
        placeholder="Username or email"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mt-4 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500"
      />
      {loadingInitial ? <p className="mt-3 text-sm text-[var(--muted)]">Loading…</p> : null}
      <div
        ref={scrollRootRef}
        className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-[var(--border)] sm:max-h-96"
        aria-label="User results list"
      >
        <ul className="divide-y divide-[var(--border)] px-2 sm:px-3">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 py-3">
              <Avatar user={u} />
              <Link href={`/profile/${u.username}`} className="font-medium text-white hover:underline">
                @{u.username}
              </Link>
              <span className="truncate text-sm text-[var(--muted)]">{u.email}</span>
            </li>
          ))}
        </ul>
        <div ref={sentinelRef} className="h-px w-full shrink-0" aria-hidden />
        {loadingMore ? (
          <p className="py-3 text-center text-sm text-[var(--muted)]">Loading more…</p>
        ) : null}
      </div>
      {nextSkip !== null && !loadingInitial ? (
        <p className="mt-2 text-center text-xs text-[var(--muted)]">Scroll the list to load more.</p>
      ) : null}
      {!loadingInitial && debouncedQ.length >= 1 && users.length === 0 ? (
        <p className="mt-6 text-center text-[var(--muted)]">No users found.</p>
      ) : null}
      {!loadingInitial && debouncedQ.length < 1 && users.length === 0 ? (
        <p className="mt-6 text-center text-[var(--muted)]">No users yet.</p>
      ) : null}
    </div>
  );
}
