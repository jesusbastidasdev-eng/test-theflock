"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { MeResponse, Tweet } from "@/lib/types";
import { TweetComposer } from "@/components/TweetComposer";
import { TweetCard } from "@/components/TweetCard";

type TimelineResponse = { tweets: Tweet[]; nextCursor: string | null };

export default function HomePage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadInitial = useCallback(async () => {
    const u = await apiFetch<MeResponse>("/api/auth/me").catch(() => null);
    if (!u) {
      router.replace("/login");
      return;
    }
    setMe(u);
    const tl = await apiFetch<TimelineResponse>("/api/timeline");
    setTweets(tl.tweets);
    setCursor(tl.nextCursor);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const tl = await apiFetch<TimelineResponse>(`/api/timeline?cursor=${encodeURIComponent(cursor)}`);
      setTweets((prev) => [...prev, ...tl.tweets]);
      setCursor(tl.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading || !me) {
    return <p className="text-[var(--muted)]">Loading…</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-white">Home</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">From people you follow — and you.</p>
      <div className="mt-6">
        <TweetComposer
          onPosted={(t) => {
            setTweets((prev) => [t, ...prev]);
          }}
        />
      </div>
      <section className="mt-4" aria-label="Timeline">
        {tweets.length === 0 ? (
          <p className="py-8 text-center text-[var(--muted)]">No posts yet. Follow someone or post something!</p>
        ) : (
          tweets.map((t) => (
            <TweetCard
              key={t.id}
              tweet={t}
              currentUsername={me.user.username}
              onDeleted={(id) => setTweets((prev) => prev.filter((x) => x.id !== id))}
            />
          ))
        )}
        {cursor ? (
          <div className="py-6 text-center">
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
