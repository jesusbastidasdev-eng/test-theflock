"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Tweet } from "@/lib/types";

export function TweetComposer({ onPosted }: { onPosted?: (t: Tweet) => void }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const left = 280 - text.length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSending(true);
    try {
      const res = await apiFetch<{ tweet: Tweet }>("/api/tweets", {
        method: "POST",
        body: JSON.stringify({ content: text }),
      });
      setText("");
      onPosted?.(res.tweet);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="border-b border-[var(--border)] pb-4">
      <label className="sr-only" htmlFor="tweet">
        What is happening?
      </label>
      <textarea
        id="tweet"
        rows={3}
        maxLength={280}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What is happening?"
        className="mt-2 w-full resize-none rounded-xl border border-[var(--border)] bg-black/30 p-3 text-[15px] outline-none focus:ring-2 focus:ring-sky-500"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className={`text-sm ${left < 0 ? "text-red-400" : "text-[var(--muted)]"}`}>{left}</span>
        <button
          type="submit"
          disabled={sending || text.trim().length === 0}
          className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {sending ? "Posting…" : "Chirp"}
        </button>
      </div>
      {err ? <p className="mt-2 text-sm text-red-400">{err}</p> : null}
    </form>
  );
}
