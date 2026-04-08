import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TweetComposer } from "./TweetComposer";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("TweetComposer", () => {
  it("submits trimmed tweet", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            tweet: {
              id: "1",
              content: "hello",
              authorId: "u",
              createdAt: new Date().toISOString(),
              author: {
                id: "u",
                email: "e@e.com",
                username: "u",
                bio: "",
                avatarUrl: null,
                createdAt: new Date().toISOString(),
              },
              likeCount: 0,
              likedByMe: false,
            },
          })
        ),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TweetComposer />);
    fireEvent.change(screen.getByPlaceholderText(/happening/i), { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: /chirp/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string).content).toBe("hello");
  });
});
