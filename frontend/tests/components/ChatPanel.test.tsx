import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { ChatRequestError, sendChatMessage } from "@/lib/api";
import ChatPanel from "@/components/ChatPanel";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    sendChatMessage: vi.fn(async () => ({ reply: "ok", nda_fields: {} })),
  };
});

describe("ChatPanel", () => {
  beforeEach(() => {
    vi.mocked(sendChatMessage).mockClear();
  });

  function setup() {
    const user = userEvent.setup();
    const onFields = vi.fn();
    const view = render(<ChatPanel onFields={onFields} />);
    return { user, onFields, ...view };
  }

  it("renders the greeting and an empty composer", () => {
    setup();

    expect(
      screen.getByText(/Which two companies are signing this agreement\?/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /message/i })).toHaveValue("");
    expect(screen.getByRole("button", { name: /Send/i })).toBeDisabled();
  });

  it("sends the full conversation history including the greeting", async () => {
    const { user } = setup();

    await user.type(
      screen.getByRole("textbox", { name: /message/i }),
      "Acme Corp and Globex LLC",
    );
    await user.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() => {
      expect(sendChatMessage).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(sendChatMessage).mock.calls[0][0]).toEqual([
      {
        role: "assistant",
        content: expect.stringContaining("Mutual NDA"),
      },
      { role: "user", content: "Acme Corp and Globex LLC" },
    ]);
  });

  it("forwards field patches through onFields", async () => {
    vi.mocked(sendChatMessage).mockResolvedValueOnce({
      reply: "Confirmed.",
      nda_fields: { party1Name: "Acme Corp" },
    });
    const { user, onFields } = setup();

    await user.type(screen.getByRole("textbox", { name: /message/i }), "hi");
    await user.click(screen.getByRole("button", { name: /Send/i }));
    await screen.findByText("Confirmed.");

    await waitFor(() => {
      expect(onFields).toHaveBeenCalledWith({ party1Name: "Acme Corp" });
    });
  });

  it("shows an error banner and keeps the sent message when the request fails", async () => {
    vi.mocked(sendChatMessage).mockRejectedValueOnce(
      new Error("Chat request failed with status 502"),
    );
    const { user, onFields } = setup();

    await user.type(screen.getByRole("textbox", { name: /message/i }), "hello");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /The assistant couldn't respond/i,
    );
    expect(onFields).not.toHaveBeenCalled();
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("explains that chat is unconfigured when the server returns 503", async () => {
    vi.mocked(sendChatMessage).mockRejectedValueOnce(new ChatRequestError(503));
    const { user } = setup();

    await user.type(screen.getByRole("textbox", { name: /message/i }), "hello");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Chat isn't configured on the server/i,
    );
  });

  it("does not append an empty reply to the history", async () => {
    vi.mocked(sendChatMessage).mockResolvedValueOnce({
      reply: "   ",
      nda_fields: {},
    });
    const { user } = setup();

    await user.type(screen.getByRole("textbox", { name: /message/i }), "hello");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Send/i })).toBeDisabled();
    });

    await user.type(screen.getByRole("textbox", { name: /message/i }), "again");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() => {
      expect(sendChatMessage).toHaveBeenCalledTimes(2);
    });
    const secondCall = vi.mocked(sendChatMessage).mock.calls[1][0];
    expect(secondCall.every((message) => message.content.trim() !== "")).toBe(
      true,
    );
  });

  it("caps the replayed history at the server's message limit", async () => {
    vi.mocked(sendChatMessage).mockResolvedValue({
      reply: "ok",
      nda_fields: {},
    });
    const { user } = setup();

    for (let turn = 0; turn < 21; turn += 1) {
      await user.type(
        screen.getByRole("textbox", { name: /message/i }),
        `turn ${turn}`,
      );
      await user.click(screen.getByRole("button", { name: /Send/i }));
      await waitFor(() => {
        expect(sendChatMessage).toHaveBeenCalledTimes(turn + 1);
      });
    }

    const lastCall = vi.mocked(sendChatMessage).mock.calls.at(-1)![0];
    expect(lastCall.length).toBeLessThanOrEqual(40);
    expect(lastCall.at(-1)).toEqual({ role: "user", content: "turn 20" });
  });

  it("limits the composer to the server's per-message length", () => {
    setup();

    expect(screen.getByRole("textbox", { name: /message/i })).toHaveAttribute(
      "maxlength",
      "8000",
    );
  });

  it("disables the composer while a reply is pending", async () => {
    let resolveReply: (value: { reply: string; nda_fields: object }) => void;
    vi.mocked(sendChatMessage).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveReply = resolve;
      }),
    );
    const { user } = setup();

    await user.type(screen.getByRole("textbox", { name: /message/i }), "hi");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/Thinking/i);
    expect(screen.getByRole("button", { name: /Send/i })).toBeDisabled();

    resolveReply!({ reply: "done", nda_fields: {} });
    await screen.findByText("done");
    expect(screen.queryByRole("status")).toBeNull();
  });
});
