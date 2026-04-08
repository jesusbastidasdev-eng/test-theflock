import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SearchPage from "./page";

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("SearchPage", () => {
  it("searches users after debounce", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            users: [
              {
                id: "1",
                email: "x@y.co",
                username: "testuser",
                bio: "",
                avatarUrl: null,
                createdAt: new Date().toISOString(),
              },
            ],
          })
        ),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SearchPage />);
    fireEvent.change(screen.getByPlaceholderText(/username or email/i), { target: { value: "test" } });

    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
    expect(String((fetchMock.mock.calls[0] as [string])[0])).toContain("/api/users/search");
  });
});
