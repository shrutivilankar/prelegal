import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { fetchTemplate } from "@/lib/api";
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
}));

async function setup() {
  const user = userEvent.setup();
  const view = render(<Home />);
  const preview = await screen.findByRole("article");
  return { user, preview, ...view };
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

  it("renders the form and preview side by side", async () => {
    await setup();

    expect(
      screen.getByLabelText(/Party 1 Company Name/i),
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

  it("reflects typed party names into the document signature block", async () => {
    const { user, preview } = await setup();

    await user.type(screen.getByLabelText(/Party 1 Company Name/i), "Acme Corp");
    await user.type(screen.getByLabelText(/Party 2 Company Name/i), "Globex LLC");

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

  it("updates the MNDA term in the preview when the radio changes", async () => {
    const { user, preview } = await setup();

    expect(within(preview).getByText(/Expires 1 year from Effective Date\./))
      .toBeInTheDocument();

    await user.click(
      screen.getByRole("radio", { name: /Continues until terminated/i }),
    );

    expect(
      within(preview).getByText(
        /Continues until terminated in accordance with the terms of the MNDA\./,
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("MNDA term in years")).toBeDisabled();
  });

  it("updates confidentiality language when perpetuity is selected", async () => {
    const { user, preview } = await setup();

    await user.click(screen.getByRole("radio", { name: /In perpetuity/i }));

    const heading = within(preview).getByRole("heading", {
      name: "Term of Confidentiality",
    });
    expect(heading.nextElementSibling?.textContent).toContain("In perpetuity");
  });

  it("formats the effective date live as the user picks one", async () => {
    const { user, preview } = await setup();

    expect(within(preview).getByText("[Today's date]")).toBeInTheDocument();

    await user.type(
      screen.getByLabelText(/Effective Date/i),
      "2026-12-01",
    );

    expect(within(preview).getByText(/December \d+, 2026/)).toBeInTheDocument();
  });

  it("keeps placeholders visible until fields are filled", async () => {
    const { preview } = await setup();

    expect(within(preview).getByText("[Party 1]")).toBeInTheDocument();
    expect(
      within(preview).getByText("[Purpose not specified]"),
    ).toBeInTheDocument();
  });
});
