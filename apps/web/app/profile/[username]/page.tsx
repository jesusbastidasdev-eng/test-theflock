"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { MeResponse, Tweet, UserPublic } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { TweetCard } from "@/components/TweetCard";

type ProfilePayload = {
  user: UserPublic;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isSelf: boolean;
};

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = typeof params.username === "string" ? params.username : "";
  const [me, setMe] = useState<MeResponse | null>(null);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [tab, setTab] = useState<"posts" | "followers" | "following">("posts");
  const [list, setList] = useState<UserPublic[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    setErr(null);
    apiFetch<MeResponse>("/api/auth/me")
      .then(setMe)
      .catch(() => setMe(null));
    apiFetch<ProfilePayload>(`/api/users/${encodeURIComponent(username)}`)
      .then(setProfile)
      .catch(() => setErr("User not found"));
  }, [username]);

  useEffect(() => {
    if (!username || tab !== "posts") return;
    apiFetch<{ tweets: Tweet[] }>(`/api/users/${encodeURIComponent(username)}/tweets`)
      .then((r) => setTweets(r.tweets))
      .catch(() => setTweets([]));
  }, [username, tab]);

  async function loadList(kind: "followers" | "following") {
    if (!username) return;
    const path =
      kind === "followers"
        ? `/api/users/${encodeURIComponent(username)}/followers`
        : `/api/users/${encodeURIComponent(username)}/following`;
    const res = await apiFetch<{ users: UserPublic[] }>(path);
    setList(res.users);
  }

  useEffect(() => {
    if (tab === "followers") void loadList("followers");
    if (tab === "following") void loadList("following");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadList uses username
  }, [tab, username]);

  async function toggleFollow() {
    if (!profile || !me || profile.isSelf) return;
    setErr(null);
    try {
      if (profile.isFollowing) {
        await apiFetch(`/api/users/${encodeURIComponent(username)}/follow`, { method: "DELETE" });
        setProfile((p) =>
          p
            ? {
                ...p,
                isFollowing: false,
                followerCount: Math.max(0, p.followerCount - 1),
              }
            : p
        );
      } else {
        await apiFetch(`/api/users/${encodeURIComponent(username)}/follow`, { method: "POST", body: "{}" });
        setProfile((p) =>
          p
            ? {
                ...p,
                isFollowing: true,
                followerCount: p.followerCount + 1,
              }
            : p
        );
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  }

  if (err && !profile) {
    return (
      <div>
        <p className="text-red-400">{err}</p>
        <button type="button" className="mt-4 text-[var(--accent)]" onClick={() => router.push("/search")}>
          Find users
        </button>
      </div>
    );
  }

  if (!profile) {
    return <p className="text-[var(--muted)]">Loading…</p>;
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <Avatar user={profile.user} size={72} />
          <div>
            <h1 className="text-2xl font-bold text-white">@{profile.user.username}</h1>
            <p className="text-sm text-[var(--muted)]">{profile.user.email}</p>
            {profile.user.bio ? <p className="mt-2 max-w-xl text-[15px] text-[var(--foreground)]">{profile.user.bio}</p> : null}
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--muted)]">
              <button type="button" className="hover:text-white" onClick={() => setTab("followers")}>
                <strong className="text-white">{profile.followerCount}</strong> Followers
              </button>
              <button type="button" className="hover:text-white" onClick={() => setTab("following")}>
                <strong className="text-white">{profile.followingCount}</strong> Following
              </button>
            </div>
          </div>
        </div>
        {me && !profile.isSelf ? (
          <button
            type="button"
            onClick={() => void toggleFollow()}
            className={`h-10 shrink-0 rounded-full px-5 text-sm font-semibold ${
              profile.isFollowing
                ? "border border-[var(--border)] text-white hover:bg-white/5"
                : "bg-[var(--accent)] text-white"
            }`}
          >
            {profile.isFollowing ? "Following" : "Follow"}
          </button>
        ) : null}
      </div>

      <div className="mt-6 flex gap-4 border-b border-[var(--border)] text-sm">
        <button
          type="button"
          className={`border-b-2 pb-2 ${tab === "posts" ? "border-[var(--accent)] text-white" : "border-transparent text-[var(--muted)]"}`}
          onClick={() => setTab("posts")}
        >
          Posts
        </button>
        <button
          type="button"
          className={`border-b-2 pb-2 ${tab === "followers" ? "border-[var(--accent)] text-white" : "border-transparent text-[var(--muted)]"}`}
          onClick={() => {
            setTab("followers");
            void loadList("followers");
          }}
        >
          Followers
        </button>
        <button
          type="button"
          className={`border-b-2 pb-2 ${tab === "following" ? "border-[var(--accent)] text-white" : "border-transparent text-[var(--muted)]"}`}
          onClick={() => {
            setTab("following");
            void loadList("following");
          }}
        >
          Following
        </button>
      </div>

      {tab === "posts" ? (
        <div className="mt-2">
          {tweets.length === 0 ? (
            <p className="py-8 text-[var(--muted)]">No posts yet.</p>
          ) : (
            tweets.map((t) => (
              <TweetCard key={t.id} tweet={t} currentUsername={me?.user.username} />
            ))
          )}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--border)]">
          {list.map((u) => (
            <li key={u.id} className="flex items-center gap-3 py-3">
              <Avatar user={u} />
              <Link href={`/profile/${u.username}`} className="font-medium text-white hover:underline">
                @{u.username}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {err ? <p className="mt-4 text-sm text-red-400">{err}</p> : null}
    </div>
  );
}
