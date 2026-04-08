"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { UserPublic } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.trim().length < 1) {
      setUsers([]);
      return;
    }
    const t = setTimeout(() => {
      setBusy(true);
      apiFetch<{ users: UserPublic[] }>(`/api/users/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => setUsers(r.users))
        .catch(() => setUsers([]))
        .finally(() => setBusy(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <h1 className="text-xl font-bold text-white">Search users</h1>
      <input
        type="search"
        placeholder="Username or email…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mt-4 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500"
      />
      {busy ? <p className="mt-3 text-sm text-[var(--muted)]">Searching…</p> : null}
      <ul className="mt-4 divide-y divide-[var(--border)]">
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
      {!busy && q.trim().length >= 1 && users.length === 0 ? (
        <p className="mt-6 text-center text-[var(--muted)]">No users found.</p>
      ) : null}
    </div>
  );
}
