"use client";

import Link from "next/link";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Tweet } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

export function TweetCard({
  tweet: initial,
  currentUsername,
  onDeleted,
}: {
  tweet: Tweet;
  currentUsername?: string;
  onDeleted?: (id: string) => void;
}) {
  const [tweet, setTweet] = useState(initial);
  const [busy, setBusy] = useState(false);

  const isOwner = currentUsername === tweet.author.username;

  async function toggleLike() {
    setBusy(true);
    try {
      if (tweet.likedByMe) {
        const r = await apiFetch<{ likeCount: number; likedByMe: boolean }>(
          `/api/tweets/${tweet.id}/like`,
          { method: "DELETE" }
        );
        setTweet((t) => ({ ...t, likeCount: r.likeCount, likedByMe: r.likedByMe }));
      } else {
        const r = await apiFetch<{ likeCount: number; likedByMe: boolean }>(
          `/api/tweets/${tweet.id}/like`,
          { method: "POST", body: "{}" }
        );
        setTweet((t) => ({ ...t, likeCount: r.likeCount, likedByMe: r.likedByMe }));
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this post?")) return;
    setBusy(true);
    try {
      await apiFetch<{ ok: boolean }>(`/api/tweets/${tweet.id}`, { method: "DELETE" });
      onDeleted?.(tweet.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="flex gap-3 border-b border-[var(--border)] py-4">
      <Link href={`/profile/${tweet.author.username}`} className="shrink-0">
        <Avatar user={tweet.author} size={44} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <Link href={`/profile/${tweet.author.username}`} className="font-semibold text-white hover:underline">
            @{tweet.author.username}
          </Link>
          <time className="text-[var(--muted)]" dateTime={tweet.createdAt}>
            {new Date(tweet.createdAt).toLocaleString()}
          </time>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-snug text-[var(--foreground)]">
          {tweet.content}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggleLike()}
            className={`text-sm ${tweet.likedByMe ? "text-red-400" : "text-[var(--muted)]"} hover:opacity-80`}
          >
            {tweet.likedByMe ? "♥" : "♡"} {tweet.likeCount}
          </button>
          {isOwner ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="text-sm text-red-400 hover:underline"
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
