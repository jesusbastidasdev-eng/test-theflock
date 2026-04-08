import type { UserPublic } from "@/lib/types";

function initials(username: string) {
  return username.slice(0, 2).toUpperCase();
}

export function Avatar({ user, size = 40 }: { user: Pick<UserPublic, "username" | "avatarUrl">; size?: number }) {
  const s = { width: size, height: size };
  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={user.avatarUrl} alt="" className="rounded-full bg-neutral-800 object-cover" style={s} />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-sky-900 text-xs font-semibold text-sky-100"
      style={s}
    >
      {initials(user.username)}
    </div>
  );
}
