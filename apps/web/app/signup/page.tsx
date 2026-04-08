"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { MeResponse } from "@/lib/types";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await apiFetch<MeResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, username, bio }),
      });
      router.replace("/");
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold text-white">Create account</h1>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-[var(--muted)]" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--muted)]" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            required
            minLength={2}
            maxLength={32}
            pattern="[a-zA-Z0-9_]+"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--muted)]" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--muted)]" htmlFor="bio">
            Bio
          </label>
          <input
            id="bio"
            maxLength={160}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        {err ? <p className="text-sm text-red-400">{err}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-[var(--accent)] py-2 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Creating…" : "Sign up"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--accent)] hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
