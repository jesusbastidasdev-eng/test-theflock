import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

beforeEach(() => {
  replace.mockClear();
  refresh.mockClear();
  vi.unstubAllGlobals();
});

describe("LoginPage", () => {
  it("submits email and password", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            user: {
              id: "u1",
              email: "a@b.co",
              username: "a",
              bio: "",
              avatarUrl: null,
              createdAt: new Date().toISOString(),
            },
          })
        ),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.co" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "Password123!" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/auth/login");
    expect(init.method).toBe("POST");
  });
});
