import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import SearchPage from "./page";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.unstubAllGlobals();
  globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
});

const userJson = {
  id: "1",
  email: "x@y.co",
  username: "testuser",
  bio: "",
  avatarUrl: null,
  createdAt: new Date().toISOString(),
};

function mockFetch(ok: boolean, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe("SearchPage", () => {
  it("loads all users when keyword is empty", async () => {
    const fetchMock = mockFetch(true, { users: [userJson], nextSkip: null });
    vi.stubGlobal("fetch", fetchMock);

    render(<SearchPage />);

    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
    const url = String((fetchMock.mock.calls[0] as [string])[0]);
    expect(url).toContain("/api/users/search");
    expect(url).toContain("skip=0");
    expect(url).not.toContain("q=");
  });

  it("searches users after debounce when typing", async () => {
    const fetchMock = mockFetch(true, { users: [userJson], nextSkip: null });
    vi.stubGlobal("fetch", fetchMock);

    render(<SearchPage />);
    fireEvent.change(screen.getByPlaceholderText(/username or email/i), { target: { value: "test" } });

    await waitFor(
      () => {
        const urls = fetchMock.mock.calls.map((c) => String((c as [string])[0]));
        expect(urls.some((u) => u.includes("q=test"))).toBe(true);
      },
      { timeout: 3000 }
    );
  });
});
