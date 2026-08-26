import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { fetchTemplate, sendChatMessage } from "@/lib/api";
import Home from "@/app/page";
import {
  MNDA_COVERPAGE_MARKDOWN,
  MNDA_STANDARD_TERMS_MARKDOWN,
} from "../fixtures/templates";

vi.mock("@/lib/api", () => ({
  fetchTemplate: vi.fn(async (filename: string) => ({
    name: filename,
    description: "",
    filename,
    content:
      filename.endsWith("coverpage.md")
        ? MNDA_COVERPAGE_MARKDOWN
        : MNDA_STANDARD_TERMS_MARKDOWN,
  })),
  sendChatMessage: vi.fn(async () => ({ reply: "Thanks!", nda_fields: {} })),
}));

async function setup() {
  const user = userEvent.setup();
  const view = render(<Home />);
  const preview = await screen.findByRole("article");
  return { user, preview, ...view };
}

async function sendUserMessage(
  user: ReturnType<typeof userEvent.setup>,
  text: string,
  response: { reply: string; nda_fields: Record<string, unknown> },
) {
  vi.mocked(sendChatMessage).mockResolvedValueOnce(response);
  await user.type(screen.getByRole("textbox", { name: /message/i }), text);
  await user.click(screen.getByRole("button", { name: /Send/i }));
  await screen.findByText(response.reply);
}

describe("Mutual NDA creator page", () => {
  it("renders the app header and download action", async () => {
    await setup();

    expect(screen.getByText("Prelegal")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Download PDF/i }),
    ).toBeInTheDocument();
  });

  it("links to the template catalog", async () => {
    await setup();

    expect(screen.getByRole("link", { name: /Browse Templates/i })).toHaveAttribute(
      "href",
      "/templates",
    );
  });

  it("renders the AI chat and preview side by side", async () => {
    await setup();

    expect(
      screen.getByRole("textbox", { name: /message/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Which two companies are signing this agreement\?/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Mutual Non-Disclosure Agreement"),
    ).toBeInTheDocument();
  });

  it("loads standard terms content served by the backend into the preview", async () => {
    await setup();

    const listItems = screen.getAllByRole("listitem");
    expect(listItems.length).toBeGreaterThanOrEqual(11);
    expect(within(listItems[0]).getByText("Introduction")).toBeInTheDocument();
  });

  it("shows an error state with retry when template loading fails", async () => {
    vi.mocked(fetchTemplate).mockRejectedValueOnce(new Error("backend down"));

    render(<Home />);

    expect(
      await screen.findByText(/Unable to load template content\./),
    ).toBeInTheDocument();

    vi.mocked(fetchTemplate).mockRejectedValueOnce(new Error("still down"));
    await userEvent.click(screen.getByRole("button", { name: /Retry/i }));

    expect(
      await screen.findByText(/Unable to load template content\./),
    ).toBeInTheDocument();
  });

  it("triggers the browser print dialog for PDF download", async () => {
    const printSpy = vi.fn();
    window.print = printSpy;
    const { user } = await setup();

    await user.click(screen.getByRole("button", { name: /Download PDF/i }));

    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it("reflects chat-provided party names into the document signature block", async () => {
    const { user, preview } = await setup();

    await sendUserMessage(user, "Acme Corp and Globex LLC are signing.", {
      reply: "Got it.",
      nda_fields: { party1Name: "Acme Corp", party2Name: "Globex LLC" },
    });

    const table = within(preview).getByRole("table");
    const companyRow = within(table)
      .getAllByRole("row")
      .find((row) => within(row).queryByText("Company") !== null);

    expect(companyRow).toBeDefined();
    expect(within(companyRow!).getByText("Acme Corp")).toBeInTheDocument();
    expect(within(companyRow!).getByText("Globex LLC")).toBeInTheDocument();
    expect(within(companyRow!).queryByText("[Party 1]")).toBeNull();
    expect(within(companyRow!).queryByText("[Party 2]")).toBeNull();
  });

  it("updates the MNDA term language from a chat response", async () => {
    const { user, preview } = await setup();

    expect(within(preview).getByText(/Expires 1 year from Effective Date\./))
      .toBeInTheDocument();

    await sendUserMessage(user, "It continues until terminated.", {
      reply: "Noted.",
      nda_fields: { mndaTerm: "until-terminated" },
    });

    expect(
      within(preview).getByText(
        /Continues until terminated in accordance with the terms of the MNDA\./,
      ),
    ).toBeInTheDocument();
  });

  it("updates confidentiality language when the chat confirms perpetuity", async () => {
    const { user, preview } = await setup();

    await sendUserMessage(user, "Protection should last forever.", {
      reply: "Done.",
      nda_fields: { confidentialityTerm: "perpetuity" },
    });

    const heading = within(preview).getByRole("heading", {
      name: "Term of Confidentiality",
    });
    expect(heading.nextElementSibling?.textContent).toContain("In perpetuity");
  });

  it("formats a chat-provided effective date in the preview", async () => {
    const { user, preview } = await setup();

    expect(within(preview).getByText("[Today's date]")).toBeInTheDocument();

    await sendUserMessage(user, "Start on December 1st, 2026.", {
      reply: "Set.",
      nda_fields: { effectiveDate: "2026-12-01" },
    });

    expect(within(preview).getByText("December 1, 2026")).toBeInTheDocument();
  });

  it("keeps placeholders visible until fields are filled", async () => {
    const { preview } = await setup();

    expect(within(preview).getByText("[Party 1]")).toBeInTheDocument();
    expect(
      within(preview).getByText("[Purpose not specified]"),
    ).toBeInTheDocument();
  });
});
